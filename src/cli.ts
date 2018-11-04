#!/usr/bin/env node

import * as auth from './auth';
import * as readLine from "readline";
import * as Firestore from "./firestore";
import * as commander from "commander";
import {table} from 'table';
import chalk from "chalk";

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const parseQueries = async (input): Promise<void> => {
  if (input === 'exit') process.exit();
  else if (input === '') return;
  const result = await Firestore.query(input);

  if (result instanceof Array) {
    let tableData = [];
    result.forEach(doc => {
      let header = true;
      for (const prop in doc.data) {
        if (doc.data.hasOwnProperty(prop)) {
          if (header) {
            header = false;
            tableData.push([chalk.bold.red(doc.id), chalk.bold.cyan(prop), doc.data[prop]]);
          } else {
            tableData.push(["", chalk.bold.cyan(prop), doc.data[prop]]);
          }
        }
      }
    });

    if (tableData.length > 0) {
      console.log(table(tableData));
    } else {
      console.log("No records found");
    }
  }
};

let command = false;
commander.version('0.0.1')
    .command("project add <serviceAccountFilePath> <dbUrl>", "")
    .action((serviceAccountFilePath, dbUrl) => {
      command = true;
      console.log("command");
      auth.addProjectFile(serviceAccountFilePath).then(_ => {
        console.log("ok");
        auth.addCurrentProjectDb(dbUrl);
      }).catch(error => {
        console.error("Error adding project", error);
      });
    });
commander.parse(process.argv);

if (!command) {
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
}