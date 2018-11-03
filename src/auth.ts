import * as fs from 'fs';
import * as path from 'path';

const projectsDirPath = path.join(__dirname, 'projects');
const configFilePath = path.join(__dirname, 'fireman-config.json');

const ensureProjectsDirCreated = () => {
  if (!fs.existsSync(projectsDirPath)) {
    fs.mkdirSync(projectsDirPath);
  }
};

export const getCurrentProject = (): any => {
  if (fs.existsSync(configFilePath)) {
    return require(configFilePath);
  }
};

export const setCurrentProject = (id: string, serviceAccountFilename: string) => {
  if (fs.existsSync(configFilePath)) {
    const config = require(configFilePath);
    config.currentProjectId = id;
    config.serviceAccountFilename = serviceAccountFilename;
    fs.writeFileSync(configFilePath, JSON.stringify(config));
  }
};

export const addCurrentProjectDb = (dbUrl: string) => {
  const currentProject = getCurrentProject();

  const serviceAccountFile = require(currentProject.serviceAccountFilename);

  serviceAccountFile.dbUrl = dbUrl;
  fs.writeFileSync(currentProject.serviceAccountFilename, JSON.stringify(serviceAccountFile));
};

export const addProjectFile = (path: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(path)) {
      const pathSplit = path.split('/');
      let newFilePath = projectsDirPath + "/" + pathSplit[pathSplit.length - 1];
      fs.copyFile(path, newFilePath, error => {
        if (error) reject(error);
        const project = require(newFilePath);
        setCurrentProject(project['project_id'], newFilePath);
        resolve();
      });
    } else {
      reject("The file does not exists");
    }
  });
};

export const getAuthenticatedProjects = (): string[] => {
  ensureProjectsDirCreated();
  const serviceAccountFiles = fs.readdirSync(projectsDirPath);
  const projects: string[] = [];
  if (serviceAccountFiles && serviceAccountFiles.length > 0) {
    for (const file of serviceAccountFiles) {
      const project = require(path.join(projectsDirPath, file));
      projects.push(project['project_id']);
    }
  }
  return projects;
};