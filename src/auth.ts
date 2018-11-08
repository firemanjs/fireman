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

export const getCurrentProject = (): string => {
  if (fs.existsSync(configFilePath)) {
    return require(configFilePath).currentProjectId;
  }
};

export const setCurrentProject = (id: string) => {
  if (fs.existsSync(configFilePath)) {
    const config = require(configFilePath);
    config.currentProjectId = id;
    fs.writeFileSync(configFilePath, JSON.stringify(config));
  }
};

export const addProject = (path: string, dbUrl: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(path)) {
      const project = require(path);
      const projectId = project['project_id'];
      project.dbUrl = dbUrl;
      let newFilePath = Path.join(projectsDirPath, projectId + ".json");
      fs.writeFile(newFilePath, JSON.stringify(project), error => {
        if (error) reject(error);

        if (getAuthenticatedProjects().length === 1) {
          setCurrentProject(projectId);
        }

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
    const project = projects.find(project => project === projectId);
    if (project) {
      const currentProject = getCurrentProject();
      if (currentProject === project) {
        const newProjects = projects.filter(p => p !== projectId);
        if (newProjects.length > 0) {
          setCurrentProject(newProjects[0])
        } else {
          fs.writeFileSync(configFilePath, JSON.stringify({}));
        }
      }
      fs.unlinkSync(Path.join(projectsDirPath, `${project}.json`));
    } else {
      reject("the project does not exists");
    }
  });
};

export const getAuthenticatedProjects = (): string[] => {
  const serviceAccountFiles = fs.readdirSync(projectsDirPath);
  let projects: string[] = [];
  if (serviceAccountFiles && serviceAccountFiles.length > 0) {
    projects = serviceAccountFiles.map(s => s.replace('.json', ''));
  }
  return projects;
};