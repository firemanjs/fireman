import * as admin from 'firebase-admin';
import * as parser from './parser/parser';
import {QueryDocumentSnapshot, QuerySnapshot} from '@google-cloud/firestore';
import DocumentSnapshot = admin.firestore.DocumentSnapshot;

const serviceAccount = require(
    './nyous-763e4-firebase-adminsdk-5do8g-ca74abfcd3');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nyous-763e4.firebaseio.com',
});
const firestore = admin.firestore();
firestore.settings({timestampsInSnapshots: true});

const getQueryType = (components) =>
    components.filter(
        c => c.type === 'literal').length % 2 ?
        'collection' :
        'doc';

const parseQuery = (components) => {
    let query: any = firestore;
    let collection = true;
    let specificProperties = [];

    for (const component of components) {
        if (component.type === 'literal') {
            const url = component.value;
            if (collection) {
                collection = false;
                query = query.collection(url);
            } else {
                collection = true;
                query = query.doc(url);
            }
        } else if (component.type === 'all') {
            collection = true;
        } else if (component.type === 'collectionExpression') {
            for (const expressionComponent of component.components) {
                if (expressionComponent.type === 'where') {
                    query = query.where(expressionComponent.field,
                        expressionComponent.operator,
                        expressionComponent.value);
                }
            }
        } else if (component.type === 'documentExpression') {
            specificProperties = component.components;
        }
    }
    return {query, specificProperties};
};

const getResult = async (queryType, query: any, specificProperties: any[]) => {
    let result: any = {};
    if (queryType === 'doc') {
        const doc = await query.get();
        if (doc.exists) {
            result = doc.data();
            if (specificProperties.length > 0) {
                const newRes = {};
                specificProperties.forEach(prop => {
                    newRes[prop] = result[prop];
                });
                result = newRes;
            }
        } else {
            throw Error("No such document");
        }
    } else {
        const querySnapshot = await query.get();
        result = {};
        querySnapshot.forEach(doc => {
            result[doc.id] = {};
            const data = doc.data();
            if (specificProperties.length > 0) {
                specificProperties.forEach(p => {
                    result[doc.id][p] = data[p];
                });
            } else {
                result[doc.id] = data;
            }
        });
    }
    return result;
};

export const query = async (queryString: string, callback?: (result: any, error: Error) => void): Promise<any> => {
    try {
        const components = parser.parse(queryString);
        const queryType = getQueryType(components);
        const {query, specificProperties} = parseQuery(components);

        if (callback) {
            if (queryType === 'doc') {
                query.onSnapshot((snapshot: DocumentSnapshot) => {
                    if (snapshot.exists) {
                        let res = snapshot.data();
                        if (specificProperties.length > 0) {
                            const newRes = {};
                            specificProperties.forEach(prop => {
                                newRes[prop] = res[prop];
                            });
                            res = newRes;
                        }
                        callback(res, null);
                    } else {
                        callback(null, Error("No such document"));
                    }
                }, error => callback(null, error));
            } else {
                query.onSnapshot((snapshot: QuerySnapshot) => {
                    let res: any = {};
                    snapshot.forEach((documentSnapshot: QueryDocumentSnapshot) => {
                        if (documentSnapshot.exists) {
                            const data = documentSnapshot.data();
                            res[documentSnapshot.id] = {};
                            if (specificProperties.length > 0) {
                                specificProperties.forEach(p => {
                                    res[documentSnapshot.id][p] = data[p];
                                });
                            } else {
                                res[documentSnapshot.id] = data;
                            }
                        }
                    });
                    callback(res, null);
                }, error => callback(null, error));
            }
        } else {
            return await getResult(queryType, query, specificProperties);
        }
    } catch (e) {
        callback && callback(null, e);
        return Promise.reject(e)
    }
};

export class Document {
    public queryRef: string;
    public id: string;
    public collections: Collection[];
    public data: any;
}

export class Collection {
    public queryRef: string;
    public id: string;
    get: () => any;
}