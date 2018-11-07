import {getQueryType, getResult, onChangeListener, parseQuery, QueryType} from "./query";
import * as FQLParser from '../parser/parser';
import {DocumentSnapshot, QueryDocumentSnapshot, QuerySnapshot} from '@google-cloud/firestore';
import CollectionReference = FirebaseAdmin.firestore.CollectionReference;
import DocumentReference = FirebaseAdmin.firestore.DocumentReference;

import * as FirebaseAdmin from 'firebase-admin';

/**
 * Runs a query against Firebase database
 * @param queryString The FiremanQL query
 * @param onChangeListener The optional listener for changes (if this is provided then nothing is returned in the promise)
 */
export const query = async (queryString: string, onChangeListener?: onChangeListener): Promise<QueryResult> => {
  try {
    const queryComponents = FQLParser.parse(queryString);
    const queryType: QueryType = getQueryType(queryComponents);
    const {reference, specificProperties, documentExpression} = parseQuery(queryComponents);

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
      const result = await getResult(queryString, queryType, reference, specificProperties);
      return new QueryResult(result, documentExpression);
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


export class QueryResult {
  constructor(public data: Document[], public documentExpression: boolean) {
  }
}