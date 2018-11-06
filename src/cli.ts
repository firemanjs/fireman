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

const commandError = () => {
  console.error('Invalid command %s\nSee --help for a list of available commands.', commander.args.join(' '));
  process.exit(1);
};

const listenForQueries = () => {
  const currentProject = auth.getCurrentProject();
  if (!currentProject || !currentProject.currentProjectId) {
    rl.question('Enter a service file Path: ', serviceFilePath => {
      rl.question('Enter the firestore database url: ', dbUrl => {
        auth.addProject(serviceFilePath, dbUrl).then(() => {
          console.log("Project added");
          rl.on('line', parseQueries);
        }).catch(error => {
          console.error("Error adding project");
          console.error(error);
        })
      })
    })
  } else {
    rl.on('line', parseQueries);
    console.log("🔥 Ready to get queries for project", chalk.yellow(currentProject.currentProjectId));
  }
};

const parseQueries = async (input): Promise<void> => {
  if (input === 'exit') process.exit();
  else if (input === '') return;

  let result;
  try {
    result = await Firestore.query(input);
  } catch (e) {
    console.error(chalk.red(e));
  }

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
      console.log(`${chalk.yellow(result.length.toString())} ${result.length === 1 ? 'result' : 'results'} found`);
    } else {
      console.log("No records found");
    }
  }
};


commander.version('0.0.1');
commander.on('command:*', commandError);
commander.command('firestore [query]')
    .description('start fireman on firestore')
    .action((query) => {
      if (query)
        return parseQueries(query).then(() => process.exit(0));
      else
        return listenForQueries();
    });
commander.command("project:use")
    .description("use another project")
    .action(async () => {
      const projects = auth.getAuthenticatedProjects();
      await inquirer.prompt({
        type: "list",
        name: "projectId",
        message: "Select the project to use",
        choices: projects,
      }).then((ans: any) => {
        auth.setCurrentProject(ans.projectId);
        // listenForQueries();
      }).catch(error => {
        console.error("Error switching project", error);
        process.exit(2);
      });
    });
commander.command("project:remove")
    .description("remove a project")
    .action(async () => {
      const projects = auth.getAuthenticatedProjects();
      await inquirer.prompt({
        type: "list",
        name: "projectId",
        message: "Select the project to remove",
        choices: projects,
      }).then(async (ans: any) => {
        await auth.removeProject(ans.projectId);
        // listenForQueries();
      }).catch(error => {
        console.error("Error removing project", error);
        process.exit(2);
      });
    });
commander.command("project:add <serviceAccountFilePath> <dbUrl>")
    .description("add project")
    .action((serviceAccountFilePath, dbUrl) => {
      auth.addProject(serviceAccountFilePath, dbUrl).then(() => {
        console.log("Project added");
        process.exit(0);
      }).catch(error => {
        console.error("Error adding project", error);
        process.exit(1);
      });
    });

commander.usage("<command>");
commander.parse(process.argv);

if (process.argv.length <= 2) {
  commandError();
}
