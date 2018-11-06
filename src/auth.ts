import * as fs from 'fs';
import * as Path from 'path';

const projectsDirPath = Path.join(__dirname, 'projects');
const configFilePath = Path.join(__dirname, 'fireman-config.json');

const ensureProjectsDirCreated = () => {
  if (!fs.existsSync(projectsDirPath)) {
    fs.mkdirSync(projectsDirPath);
  }
};

const ensureConfigFileCreated = () => {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify({}));
  }
};

ensureProjectsDirCreated();
ensureConfigFileCreated();

export const getCurrentProject = (): any => {
  if (fs.existsSync(configFilePath)) {
    return require(configFilePath);
  }
};

export const setCurrentProject = (id: string) => {
  if (fs.existsSync(configFilePath)) {
    const config = require(configFilePath);
    config.currentProjectId = id;
    fs.writeFileSync(configFilePath, JSON.stringify(config));
  }
};

export const addCurrentProjectDb = (dbUrl: string) => {
  const currentProject = getCurrentProject();

  const path = Path.join(projectsDirPath, currentProject.currentProjectId);
  const serviceAccountFile = require(path);

  serviceAccountFile.dbUrl = dbUrl;
  fs.writeFileSync(path + ".json", JSON.stringify(serviceAccountFile));
};

export const addProjectFile = (path: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(path)) {
      const project = require(path);
      const projectId = project['project_id'];
      let newFilePath = Path.join(projectsDirPath, projectId + ".json");
      fs.copyFile(path, newFilePath, error => {
        if (error) reject(error);
        setCurrentProject(projectId);
        resolve();
      });
    } else {
      reject("the file does not exists");
    }
  });
};

export const removeProject = (projectId: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const projects = getAuthenticatedProjects();
    const project = projects.find(p => p === projectId);
    if (project) {
      const currentProject = getCurrentProject();
      if (currentProject.currentProjectId === project) {
        const newProjects = projects.filter(p => p !== projectId);
        if (newProjects.length > 0) {
          setCurrentProject(newProjects[0])
        } else {
          fs.writeFileSync(configFilePath, JSON.stringify({}));
        }
      }
      fs.unlinkSync(Path.join(projectsDirPath, `${project}.json`));
    } else {
      reject("the file does not exists");
    }
  });
};

export const getAuthenticatedProjects = (): string[] => {
  ensureProjectsDirCreated();
  const serviceAccountFiles = fs.readdirSync(projectsDirPath);
  let projects: string[] = [];
  if (serviceAccountFiles && serviceAccountFiles.length > 0) {
    projects = serviceAccountFiles.map(s => s.replace('.json', ''));
  }
  return projects;
};