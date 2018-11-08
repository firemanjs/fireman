# Fireman

A desktop client for Firebase databases that makes querying and managing easy.

## Install

> 🛠This package is still in early stage of development thus is not yet published to npm.  
> Until then you can try it by cloning this repository and following [build](https://github.com/Salvatore-Giordano/fireman-cli/wiki/Build) instructions.

To install run

```
$ npm install fireman
```

This package only contains Fireman API + CLI, for the Electron app refer to (https://github.com/umbopepato/fireman).

## Usage

Fireman uses a custom query language called FiremanQL. To learn more about it see [FiremanQL Docs](https://github.com/Salvatore-Giordano/fireman-cli/wiki/FiremanQL).

Once installed, this package exposes the `fireman` command.

### Commands documentation

##### `fireman project:add <serviceAccountKeyPath> <dburl>`

Adds a Firebase project to your environment.

`serviceAccountKeyPath` is the absolute path of the service account key file.

`dburl` is the .firebaseio.com url of your database.

See https://firebase.google.com/docs/admin/setup#add_firebase_to_your_app to know how to generate the service account file and to find the db url.

##### `fireman project:use`

Starts an interactive shell that lets you choose which project to use from now on.

##### `fireman project:remove`

Starts an interactive shell that lets you choose which project to remove (locally).

##### `fireman firestore`

Starts the Fireman interactive shell.
