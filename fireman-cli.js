const serviceAccount = require(
    './nyous-763e4-firebase-adminsdk-5do8g-ca74abfcd3');
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nyous-763e4.firebaseio.com',
});
const firestore = admin.firestore();

const parser = require('./parser/parser');

const readLine = require('readline');
const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getQueryType = (components) =>
    components.filter(
        c => c.type === 'literal').length % 2 ?
        'collection' :
        'doc';

rl.on('line', async (input) => {
  if (input === 'exit') process.exit();

  try {
    const components = parser.parse(input);

    const queryType = getQueryType(components);

    let query = firestore;

    let url = '/';
    let collection = true;
    let specificProperties = [];
    for (const component of components) {
      if (component.type === 'literal') {
        url = `${component.value}/`;
        if (collection) {
          collection = false;
          query = query.collection(url);
        } else {
          collection = true;
          query = query.doc(url);
        }
      } else if (component.type === 'expression') {
        for (const expressionComponent of component.components) {
          if (expressionComponent.type === 'where') {
            query = query.where(expressionComponent.field,
                expressionComponent.operator,
                expressionComponent.value);
          }
        }
      } else if (component.type === 'property') {
        specificProperties.push(component.value);
      }
    }

    let result;
    if (queryType === 'doc') {
      const doc = await query.get();
      if (doc.exists) {
        result = doc.data();
        if (specificProperties.length > 0) {
          const newRes = {};
          specificProperties.forEach(p => {
            newRes[p] = result[p];
          });
          result = newRes;
        }
      } else {
        console.error('No such document');
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

    console.log(result);
    console.log();
  } catch (e) {
    console.error(e);
  }
});