import * as FQLParser from '../../parser/parser';
import {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot
} from '@google-cloud/firestore';

import {Document} from "./document";
import * as auth from "../auth";
import * as FirebaseAdmin from "firebase-admin";
import {QueryResult} from "./query-result";
import {isArray} from "util";

export let unsubscribeListener;

export type onChangeListener = (result: QueryResult, error: Error) => void;

/**
 * This is useful in case of multiple queries and listeners, to avoid to trigger multiple listeners everytime
 */
let queryLock = false;

const executeQuery = async (initialReference, query, onChangeListener: onChangeListener) => {
  const {references, documentExpression, queryType, nestedQuery} = await parseQuery(initialReference, query);

  if (onChangeListener && nestedQuery) {
    throw new Error("-l option is not available for nested queries");
  }

  if (onChangeListener) {
    setListeners(queryType, references, documentExpression, onChangeListener);
  } else {
    return new QueryResult(await getResult(queryType, references), documentExpression);
  }
};

/**
 * Runs a query against Firebase database
 * @param queryString The FiremanQL query
 * @param onChangeListener The optional listener for changes (if this is provided then nothing is returned in the promise)
 */
export const query = async (queryString: string, onChangeListener?: onChangeListener): Promise<QueryResult> => {
  if (queryLock) return;
  queryLock = true;

  try {
    let query = FQLParser.parse(queryString);

    return await executeQuery(false, query, onChangeListener);
  } catch (e) {
    onChangeListener && onChangeListener(null, e);
    return Promise.reject(e);
  } finally {
    queryLock = false;
  }
};

function setListeners(queryType: QueryType, references: any[], documentExpression: boolean, onChangeListener: onChangeListener) {
  if (queryType === QueryType.DOCUMENT) {
    unsubscribeListener = references.map(ref => ref.onSnapshot((snapshot: DocumentSnapshot) => {
      if (snapshot.exists) {
        let document: Document = Document.fromDocumentReference(snapshot.ref);
        document.setData(snapshot);
        onChangeListener(new QueryResult([document], documentExpression), null);
      } else {
        onChangeListener(null, Error('No such document'));
      }
    }, error => onChangeListener(null, error)));
  } else {
    unsubscribeListener = references.map(ref => ref.onSnapshot((snapshot: QuerySnapshot) => {
      let documents: Document[] = [];
      snapshot.forEach((documentSnapshot: QueryDocumentSnapshot) => {
        if (documentSnapshot.exists) {
          let document: Document = Document.fromDocumentReference(documentSnapshot.ref);
          document.setData(documentSnapshot);
          documents.push(document);
        }
      });
      onChangeListener(new QueryResult(documents, documentExpression), null);
    }, error => onChangeListener(null, error)));
  }

  unsubscribeListener = () => unsubscribeListener.forEach(listener => listener());
}

enum ComponentType {
  LITERAL = 'literal',
  ALL = 'all',
  COLLECTION_EXPRESSION = 'collectionExpression',
  DOCUMENT_EXPRESSION = 'documentExpression',
}

export enum QueryType {
  DOCUMENT,
  COLLECTION,
}

let currentProject, serviceAccount, firestore;

const init = () => {
  currentProject = auth.getCurrentProject();
  serviceAccount = require(`../projects/${currentProject}`);
  FirebaseAdmin.initializeApp({
    credential: FirebaseAdmin.credential.cert(serviceAccount),
    databaseURL: serviceAccount.databaseURL,
  }, currentProject);
  firestore = FirebaseAdmin.firestore(FirebaseAdmin.app(currentProject));
  firestore.settings({timestampsInSnapshots: true});
};

const isCollection = (references: any[]) => {
  return references[0] instanceof CollectionReference || references[0] instanceof Firestore || references[0] instanceof Query;
};

const parseQuery = async (initialReference, components) => {
  let references: any[] = initialReference ? [initialReference] : [firestore];
  let documentExpression = false;
  let nestedQuery = false;
  let singleDoc = true;

  for (const component of components) {
    switch (component.type) {
      case ComponentType.LITERAL:
        const url = component.value;
        if (isCollection(references)) {
          if (!singleDoc) {
            nestedQuery = true;
            // @ts-ignore
            references = (await Promise.all<DocumentReference[]>(references.map((ref: CollectionReference) => ref.get()
                .then(querySnapshot => querySnapshot.docs.map(doc => doc.ref))))).reduce((p, n) => p.concat(n, []));
          }

          references = references.map(ref => ref.collection(url));
        } else {
          references = references.map(ref => ref.doc(url));
        }
        break;
      case ComponentType.ALL:
        singleDoc = false;
        break;
      case ComponentType.COLLECTION_EXPRESSION:
        singleDoc = false;

        for (const expressionComponent of component.components) {
          if (expressionComponent.type === 'where') {
            if (expressionComponent.operator === '!=') {
              references = [...references.map(ref => ref.where(
                  expressionComponent.field,
                  '<',
                  expressionComponent.value,
              )),
                ...references.map(ref => ref.where(
                    expressionComponent.field,
                    '>',
                    expressionComponent.value,
                ))]
            } else {
              references = references.map(ref => ref.where(
                  expressionComponent.field,
                  expressionComponent.operator,
                  expressionComponent.value,
              ));
            }
          } else if (expressionComponent.type === 'limit') {
            references = references.map(ref => ref.limit(expressionComponent.limit));
          } else if (expressionComponent.type === 'order') {
            references = references.map(ref => ref.orderBy(
                expressionComponent.field,
                expressionComponent.direction === 1 ? 'asc' : 'desc',
            ));
          }
        }
        break;
      case ComponentType.DOCUMENT_EXPRESSION:
        references = references.map(ref => ref.select(...component.components));
        documentExpression = true;
        break;
    }
  }

  const queryType = isArray(references) ? QueryType.COLLECTION : QueryType.DOCUMENT;
  return {
    references,
    documentExpression,
    queryType,
    nestedQuery,
  };
};

const getResult = async (queryType, references: any[]): Promise<Document[]> => {
  let documents: Document[] = [];

  if (queryType === QueryType.DOCUMENT) {
    const snapshots = await Promise.all(references.map((reference: DocumentReference) => reference.get()));
    snapshots.forEach(snapshot => {
      if (snapshot.exists) {
        const document: Document = Document.fromDocumentReference(references[0]);
        document.setData(snapshot);
        documents.push(document);
      } else {
        return [];
      }
    });
  } else {
    const snapshots: QuerySnapshot[] = await Promise.all(references.map(ref => ref.get()));
    await Promise.all(snapshots.map(snap => snap.docs.map(async (docSnapshot: QueryDocumentSnapshot) => {
      const document: Document = Document.fromDocumentReference(docSnapshot.ref);
      document.setData(docSnapshot);
      documents.push(document);
    })));
  }

  return documents;
};