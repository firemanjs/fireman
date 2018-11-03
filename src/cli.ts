#!/usr/bin/env node

import * as auth from './auth';
import * as readLine from "readline";
import * as Firestore from "./firestore";

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const parseQueries = async (input): Promise<void> => {
  if (input === 'exit') process.exit();
  console.log(await Firestore.query(input));
};

const currentProject = auth.getCurrentProject();
if (!currentProject || !currentProject.serviceAccountFilename || !currentProject.currentProjectId) {
  rl.question('Enter a service file path: ', input => {
    auth.addProjectFile(input).then(_ => {
      console.log("Project added");
      rl.question('Enter the firestore database url: ', input => {
        auth.addCurrentProjectDb(input);
        console.log("Db added");
        rl.on('line', parseQueries);
      })
    }).catch(error => {
      console.error("Error adding project");
      console.error(error);
    })
  })
} else {
  rl.on('line', parseQueries);
}