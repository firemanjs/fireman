import * as FirebaseAdmin from 'firebase-admin';
import {DocumentSnapshot, QueryDocumentSnapshot, QuerySnapshot} from '@google-cloud/firestore';
import CollectionReference = FirebaseAdmin.firestore.CollectionReference;
import {Document} from "./firestore";
import * as auth from "./auth";

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

export const getQueryType = (components): QueryType =>
    components.filter(c => c.type === ComponentType.LITERAL)
        .length % 2 ?
        QueryType.COLLECTION :
        QueryType.DOCUMENT;

let firebaseAppsInitialized = [];

export const parseQuery = (components) => {
  const currentProject = auth.getCurrentProject();
  let firestore: FirebaseFirestore.Firestore;
  if (!firebaseAppsInitialized.includes(currentProject.currentProjectId)) {
    const serviceAccount = currentProject.serviceAccountFilename;
    FirebaseAdmin.initializeApp({
      credential: FirebaseAdmin.credential.cert(serviceAccount),
      databaseURL: serviceAccount.databaseURL,
    }, currentProject.currentProjectId);
    firebaseAppsInitialized.push(currentProject.currentProjectId);
    firestore = FirebaseAdmin.firestore(FirebaseAdmin.app(currentProject.currentProjectId));
    firestore.settings({timestampsInSnapshots: true});
  }

  firestore = FirebaseAdmin.firestore(FirebaseAdmin.app(currentProject.currentProjectId));

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
            } else if (expressionComponent.type === 'order') {
              reference = (<CollectionReference>reference).orderBy(
                  expressionComponent.field,
                  expressionComponent.direction === 1 ? 'asc' : 'desc',
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

export const getResult = async (queryType, reference: any, specificProperties: string[]): Promise<Document[]> => {
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