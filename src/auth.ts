import * as fs from 'fs';
import * as path from 'path';

const projectsDirPath = path.join(__dirname, 'projects');
const configFilePath = path.join(__dirname, 'fireman-config.json');

const ensureProjectsDirCreated = () => {
  if (!fs.existsSync(projectsDirPath)) {
    fs.mkdirSync(projectsDirPath);
  }
};

export const getCurrentProject = (): string => {
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

export const addProjectFile = (path: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(path)) {
      fs.copyFile(path, projectsDirPath, error => {
        if (error) reject(error);
        const project = require(path);
        setCurrentProject(project['project_id'], path);
        resolve();
      });
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