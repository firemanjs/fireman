import * as FirebaseAdmin from 'firebase-admin';
import * as FQLParser from '../parser/parser';
import {DocumentSnapshot, QueryDocumentSnapshot, QuerySnapshot} from '@google-cloud/firestore';
import CollectionReference = FirebaseAdmin.firestore.CollectionReference;
import DocumentReference = FirebaseAdmin.firestore.DocumentReference;

const serviceAccount = require('../dist/projects/nyous-763e4-firebase-adminsdk-5do8g-ca74abfcd3.json');
FirebaseAdmin.initializeApp({
  credential: FirebaseAdmin.credential.cert(serviceAccount),
  databaseURL: 'https://nyous-763e4.firebaseio.com',
});
const firestore = FirebaseAdmin.firestore();
firestore.settings({timestampsInSnapshots: true});

export type onChangeListener = (result: Document[], error: Error) => void;

export enum ComponentType {
  LITERAL = 'literal',
  ALL = 'all',
  COLLECTION_EXPRESSION = 'collectionExpression',
  DOCUMENT_EXPRESSION = 'documentExpression',
}

export enum QueryType {
  DOCUMENT,
  COLLECTION,
}

const getQueryType = (components): QueryType =>
  components.filter(c => c.type === ComponentType.LITERAL)
    .length % 2 ?
    QueryType.COLLECTION :
    QueryType.DOCUMENT;

const parseQuery = (components) => {
  let reference: any = firestore;
  let collection = true;
  let specificProperties: string[] = [];

  for (const component of components) {
    switch (component.type) {
      case ComponentType.LITERAL:
        const url = component.value;
        if (collection) {
          collection = false;
          reference = reference.collection(url);
        } else {
          collection = true;
          reference = reference.doc(url);
        }
        break;
      case ComponentType.ALL:
        collection = true;
        break;
      case ComponentType.COLLECTION_EXPRESSION:
        if (reference instanceof CollectionReference) {
          for (const expressionComponent of component.components) {
            if (expressionComponent.type === 'where') {
              reference = (<CollectionReference>reference).where(
                expressionComponent.field,
                expressionComponent.operator,
                expressionComponent.value,
              );
            }
          }
        }
        break;
      case ComponentType.DOCUMENT_EXPRESSION:
        specificProperties = component.components;
        break;
    }
  }
  return {
    reference,
    specificProperties,
  };
};

const getResult = async (queryType, reference: any, specificProperties: string[]): Promise<Document[]> => {
  let documents: Document[] = [];
  if (queryType === QueryType.DOCUMENT) {
    const snapshot: DocumentSnapshot = await reference.get();
    if (snapshot.exists) {
      const document: Document = Document.fromDocumentReference(reference);
      document.setData(snapshot, specificProperties);
      documents.push(document);
    } else {
      throw new Error('No such document');
    }
  } else {
    const snapshot = await reference.get();
    snapshot.forEach((docSnapshot: QueryDocumentSnapshot) => {
      const document: Document = Document.fromDocumentReference(docSnapshot.ref);
      document.setData(docSnapshot, specificProperties);
      documents.push(document);
    });
  }
  return documents;
};


/**
 * Runs a query against Firebase database
 * @param queryString The FiremanQL query
 * @param onChangeListener The optional listener for changes (if this is provided then nothing is returned in the promise)
 */
export const query = async (queryString: string, onChangeListener?: onChangeListener): Promise<Document[] | void> => {
  try {
    const queryComponents = FQLParser.parse(queryString);
    const queryType: QueryType = getQueryType(queryComponents);
    const {reference, specificProperties} = parseQuery(queryComponents);

    if (onChangeListener) {
      if (queryType === QueryType.DOCUMENT) {
        reference.onSnapshot((snapshot: DocumentSnapshot) => {
          if (snapshot.exists) {
            let document: Document = Document.fromDocumentReference(snapshot.ref);
            document.setData(snapshot, specificProperties);
            onChangeListener([document], null);
          } else {
            onChangeListener(null, Error('No such document'));
          }
        }, error => onChangeListener(null, error));
      } else {
        reference.onSnapshot((snapshot: QuerySnapshot) => {
          let documents: Document[] = [];
          snapshot.forEach((documentSnapshot: QueryDocumentSnapshot) => {
            if (documentSnapshot.exists) {
              let document: Document = Document.fromDocumentReference(documentSnapshot.ref);
              document.setData(documentSnapshot, specificProperties);
              documents.push(document);
            }
          });
          onChangeListener(documents, null);
        }, error => onChangeListener(null, error));
      }
    } else {
      return await getResult(queryType, reference, specificProperties);
    }
  } catch (e) {
    onChangeListener && onChangeListener(null, e);
    return Promise.reject(e);
  }
};

export class Document {

  public queryRef: string;
  public id: string;
  public getCollections: () => Promise<Collection[]>;
  public data: any;

  static fromDocumentReference(reference: DocumentReference): Document {
    const document: Document = new Document();
    document.id = reference.id;
    document.queryRef = reference.path;
    document.getCollections = async () => {
      const collections: CollectionReference[] = await reference.getCollections();
      return collections.map((collection: CollectionReference) => {
        return Collection.fromCollectionReference(collection);
      });
    };
    return document;
  }

  setData(snapshot: DocumentSnapshot, specificProperties: string[]): void {
    this.data = {};
    let snapshotData: any = snapshot.data();
    if (specificProperties && specificProperties.length > 0) {
      specificProperties.forEach(p => {
        if (snapshotData.hasOwnProperty(p)) {
          this.data[p] = snapshotData[p];
        }
      });
    } else {
      this.data = snapshotData;
    }
  }

}

export class Collection {
  public queryRef: string;
  public id: string;
  get: () => Document[];

  static fromCollectionReference(reference: CollectionReference): Collection {
    const collection: Collection = new Collection();
    collection.id = reference.id;
    collection.queryRef = reference.path;
    // TODO collection.get = () => reference.listDocuments();
    return collection;
  }
}