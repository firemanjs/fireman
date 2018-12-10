<img src="logo.png" width="250">

A cli and desktop client for Firebase databases that makes querying and managing easy.

## Install

To install run

```
$ npm install fireman
```

This package only contains Fireman API and CLI, for the Electron app refer to [fireman-electron](https://github.com/firemanjs/fireman-electron). (Not yet released)

## Usage

Fireman uses a custom query language called FiremanQL. To learn more about it see [FiremanQL Docs](https://github.com/firemanjs/fireman/wiki/FiremanQL).

Once installed, this package exposes the `fireman` command.

## CLI documentation

### `fireman project:add <serviceAccountKeyPath> <dbUrl>`

Adds a Firebase project to your environment.

|Parameter|Description|
|---|---|
|`serviceAccountKeyPath`|The absolute path of the service account key JSON file|
|`dbUrl`|The .firebaseio.com url of your database|

See [add firebase to your app](https://firebase.google.com/docs/admin/setup#add_firebase_to_your_app) to know how to generate the service account file and to find the db url.

### `fireman project:use`

Starts an interactive shell that lets you choose which project to use from now on.

### `fireman project:remove`

Starts an interactive shell that lets you choose which project to remove (locally).

### `fireman firestore [query]`

If no query is provided, starts the Fireman interactive shell, otherwise performs `query`.

### `fireman realtime [query]`

If no query is provided, starts the Realtime interactive shell, otherwise performs `query`.

### Query options

The following options can be appended to queries:

**`-l`** listens for changes in the queried data and updates the output in real time.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/firemanjs/fireman/LICENSE) file for details
