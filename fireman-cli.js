const readLine = require('readline');
const parser = require('./parser/parser');

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', (input) => {
  if (input === 'exit') process.exit();

  console.log(parser.parse(`"${input}"`));
});