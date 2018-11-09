#!/usr/bin/env node

import * as ora from 'ora';
import * as auth from './auth';
import * as readLine from "readline";
import * as Firestore from "./firestore/firestore";
import * as commander from "commander";
import {table} from 'table';
import chalk from "chalk";
import * as inquirer from 'inquirer';
import {unsubscribeListener} from "./firestore/firestore";
import {QueryResult} from './firestore/query-result';

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const commandError = () => {
  console.error('Invalid command %s\nSee --help for a list of available commands.', commander.args.join(' '));
  process.exit(1);
};

let spinner;
const listenForQueries = () => {
  const currentProject = auth.getCurrentProject();
  if (!currentProject) {
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
    rl.on('line', (input: string) => {

      unsubscribeListener && unsubscribeListener();

      spinner = ora('Querying data\n').start();

      const s = input.split(' ');
      if (s[s.length - 1] === '-l') {
        parseQueries(input.replace(' -l', ''), true).then(() => {
          spinner.stop();
        });
      } else {
        parseQueries(input).then(() => {
          spinner.stop();
        });
      }
    });
    console.log("🔥 Ready to get queries for project", chalk.yellow(currentProject));
  }
};

async function printResult(result: QueryResult) {
  let tableData = [];
  (await Promise.all(result.data.map(async doc => {
    let tableSection = [];
    let header = true;
    for (const prop in doc.data) {
      if (doc.data.hasOwnProperty(prop)) {
        if (header) {
          header = false;
          tableSection.push([chalk.bold.red(doc.id), chalk.bold.cyan(prop), doc.data[prop]]);
        } else {
          tableSection.push(["", chalk.bold.cyan(prop), doc.data[prop]]);
        }
      }
    }

    if (!result.documentExpression) {
      const collections = await doc.getCollections();
      if (collections && collections.length > 0) {
        tableSection.push(["", "Collections", collections.map(c => c.id).join(', ')]);
      }
    }

    return tableSection;
  }))).forEach(section => tableData.push(...section));

  spinner.stop();
  if (tableData.length > 0) {
    console.log(table(tableData));
    console.log(`${chalk.yellow(result.data.length.toString())} ${result.data.length === 1 ? 'result' : 'results'} found\n`);
  } else {
    console.log("No records found");
  }
}

const parseQueries = async (input, listen?: boolean): Promise<void> => {
  if (input === 'exit') process.exit();
  else if (input === '') return;

  try {
    if (listen) {
      await Firestore.query(input, (result, error) => {
        if (!result) return;
        if (error) {
          spinner.stop();
          console.error(chalk.red(error.message));
          return;
        }

        printResult(result);
      });
    } else {
      const result = await Firestore.query(input);

      if (result) {
        await printResult(result);
      }
    }
  } catch (e) {
    spinner.stop();
    console.error(chalk.red(e));
  }
};


commander.version('0.0.1');
commander.on('command:*', commandError);
commander.command('firestore [query]')
    .description('start fireman on firestore')
    .action((query) => {
      if (query)
        return parseQueries(query, true).then(() => process.exit(0));
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
