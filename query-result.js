"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const parser = require("./parser/parser");
const serviceAccount = require('./nyous-763e4-firebase-adminsdk-5do8g-ca74abfcd3');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nyous-763e4.firebaseio.com',
});
const firestore = admin.firestore();
firestore.settings({ timestampsInSnapshots: true });
const getQueryType = (components) => components.filter(c => c.type === 'literal').length % 2 ?
    'collection' :
    'doc';
const parseQuery = (components) => {
    let query = firestore;
    let collection = true;
    let specificProperties = [];
    for (const component of components) {
        if (component.type === 'literal') {
            const url = component.value;
            if (collection) {
                collection = false;
                query = query.collection(url);
            }
            else {
                collection = true;
                query = query.doc(url);
            }
        }
        else if (component.type === 'all') {
            collection = true;
        }
        else if (component.type === 'collectionExpression') {
            for (const expressionComponent of component.components) {
                if (expressionComponent.type === 'where') {
                    query = query.where(expressionComponent.field, expressionComponent.operator, expressionComponent.value);
                }
            }
        }
        else if (component.type === 'documentExpression') {
            specificProperties = component.components;
        }
    }
    return { query, specificProperties };
};
const getResult = (queryType, query, specificProperties) => __awaiter(this, void 0, void 0, function* () {
    let result = {};
    if (queryType === 'doc') {
        const doc = yield query.get();
        if (doc.exists) {
            result = doc.data();
            if (specificProperties.length > 0) {
                const newRes = {};
                specificProperties.forEach(prop => {
                    newRes[prop] = result[prop];
                });
                result = newRes;
            }
        }
        else {
            throw Error("No such document");
        }
    }
    else {
        const querySnapshot = yield query.get();
        result = {};
        querySnapshot.forEach(doc => {
            result[doc.id] = {};
            const data = doc.data();
            if (specificProperties.length > 0) {
                specificProperties.forEach(p => {
                    result[doc.id][p] = data[p];
                });
            }
            else {
                result[doc.id] = data;
            }
        });
    }
    return result;
});
exports.query = (queryString, callback) => __awaiter(this, void 0, void 0, function* () {
    try {
        const components = parser.parse(queryString);
        const queryType = getQueryType(components);
        const { query, specificProperties } = parseQuery(components);
        if (callback) {
            if (queryType === 'doc') {
                query.onSnapshot((snapshot) => {
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
                    }
                    else {
                        callback(null, Error("No such document"));
                    }
                }, error => callback(null, error));
            }
            else {
                query.onSnapshot((snapshot) => {
                    let res = {};
                    snapshot.forEach((documentSnapshot) => {
                        if (documentSnapshot.exists) {
                            const data = documentSnapshot.data();
                            res[documentSnapshot.id] = {};
                            if (specificProperties.length > 0) {
                                specificProperties.forEach(p => {
                                    res[documentSnapshot.id][p] = data[p];
                                });
                            }
                            else {
                                res[documentSnapshot.id] = data;
                            }
                        }
                    });
                    callback(res, null);
                }, error => callback(null, error));
            }
        }
        else {
            return yield getResult(queryType, query, specificProperties);
        }
    }
    catch (e) {
        callback && callback(null, e);
        return Promise.reject(e);
    }
});
class Document {
}
exports.Document = Document;
class Collection {
}
exports.Collection = Collection;
//# sourceMappingURL=query-result.js.map