#!/usr/bin/env node

import * as auth from './auth';
import * as readLine from "readline";
import * as Firestore from "./firestore";
import * as commander from "commander";
import {table} from 'table';
import chalk from "chalk";
import * as inquirer from 'inquirer';

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const listenForQueries = () => {
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
};

const parseQueries = async (input): Promise<void> => {
  if (input === 'exit') process.exit();
  else if (input === '') return;
  const result = await Firestore.query(input);

  if (result instanceof Array) {
    let tableData = [];
    for (let i = 0; i < result.length; ++i) {
      const doc = result[i];
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
      const collections = await doc.getCollections();
      if (collections && collections.length > 0) {
        tableData.push(["", "Collections", collections.map(c => c.id).join(', ')]);
      }
    }

    if (tableData.length > 0) {
      console.log(table(tableData));
      console.log(`${chalk.redBright(result.length.toString())} ${result.length === 1 ? 'result' : 'results'} found`);
    } else {
      console.log("No records found");
    }
  }
};

if (process.argv.length > 2) {
  commander.version('0.0.1');
  commander.command("project:use")
      .description("use another project")
      .action(async () => {
        const projects = auth.getAuthenticatedProjects();
        await inquirer.prompt({
          type: "list",
          name: "projectId",
          message: "Select the project to use",
          choices: projects.map(project => project.projectId),
        }).then((ans: any) => {
          const selectedProject = projects.find(project => project.projectId === ans.projectId);
          auth.setCurrentProject(selectedProject.projectId, selectedProject.serviceAccountFilename);
          listenForQueries();
        }).catch(error => {
          console.error("Error switching project", error);
          process.exit(2);
        });
      });
  commander.command("project:remove")
      .description("remove a project")
      .action(async () => {
        console.log("REMOVE");
        const projects = auth.getAuthenticatedProjects();
        await inquirer.prompt({
          type: "list",
          name: "projectId",
          message: "Select the project to remove",
          choices: projects.map(project => project.projectId),
        }).then(async (ans: any) => {
          const selectedProject = projects.find(project => project.projectId === ans.projectId);
          await auth.removeProject(selectedProject.projectId);
          listenForQueries();
        }).catch(error => {
          console.error("Error switching project", error);
          process.exit(2);
        });
      });
  commander.command("project:add <serviceAccountFilePath> <dbUrl>")
      .description("add project")
      .action((serviceAccountFilePath, dbUrl) => {
        auth.addProjectFile(serviceAccountFilePath).then(() => {
          auth.addCurrentProjectDb(dbUrl);
          console.log("Project added");
          listenForQueries();
        }).catch(error => {
          console.error("Error adding project", error);
          process.exit(1);
        });
      });
  commander.usage("[command]");
  commander.parse(process.argv);
} else {
  listenForQueries();
}
