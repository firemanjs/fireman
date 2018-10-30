import * as fs from 'fs';
import * as path from 'path';

const projectsDirPath = path.join(__dirname, 'projects');
const cacheFilePath = path.join(__dirname, 'fireman-cache.json');

const ensureProjectsDirCreated = () => {
  if (!fs.existsSync(projectsDirPath)) {
    fs.mkdirSync(projectsDirPath);
  }
};

export const getCurrentProjectId = (): string => {
  if (fs.existsSync(cacheFilePath)) {
    const cache = require(cacheFilePath);
    console.log(cache);
    return cache.currentProjectId;
  }
};

export const setCurrentProjectId = (id: string) => {

};

export const addProjectFile = (path: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(path)) {
      fs.copyFile(path, projectsDirPath, error => {
        if (error) reject(error);
        const project = require(path);
        setCurrentProjectId(project['project_id']);
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