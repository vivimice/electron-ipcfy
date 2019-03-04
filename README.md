# electron-ipcfy

[![npm version](https://badge.fury.io/js/electron-ipcfy.svg)](https://badge.fury.io/js/electron-ipcfy)
[![npm-taobao](https://npm.taobao.org/badge/v/electron-ipcfy.svg)](https://npm.taobao.org/package/electron-ipcfy)

* [Introduction](#introduction)
* [Motivation](#motivation)
* [Install](#install)
* [Pros](#pros)
* [Limitations](#limitations)

## Introduction

electron-ipcfy (_[aɪ'pɪsɪfaɪ]_) is an electron ipc typescript framework, it has following features:

* Simplified calling routing
* Strong typed
* Support asynchronous return values / error handling from ipc

```ts
import { ipcfy } from "electron-ipcfy";

interface TestService {
    greet(name: string);
}

const testService = ipcfy<TestService>('test'); // 'test' is ipc topic id

if (process.type == 'browser') {
    // Attach implementation in main process
    testService.__attachImpl(
        new class implements TestService {
            greet(name: string) {
                console.log(`Hello, ${name}!`);
            }
        });
}

// Then you can call it in any process
testService.greet('world');
```

## Motivation

In electron, [main process and renderer process](https://github.com/electron/electron/blob/master/docs/tutorial/application-architecture.md#main-and-renderer-processes) are isolated, the only way to communicate is via [IPC](https://github.com/electron/electron/blob/master/docs/api/ipc-main.md). IPC has thress forms in practise:

* Main process to renderer process
* Renderer process to main process
* Renderer process to another renderer process

Each form's implementation routine are different, which make it more complicated to maintain and refract.

Also, when the number of IPCs increases, code maintaining and refractoring are becoming a nightmare:

* When refractoring `topic`, must make sure that `ipcMain.on` and `ipcRenderer.send` changed at the same time.
* When refractoring arguments (type or order), `ipcMain.on` and `ipcRenderer.send` changed at the same time too.
* Refractoring is hard to be validated since bugs won't appear until it is called at runtime.
* Asynchronous return value / error handling can't be done at same time.

## Install

```
npm install --save electron-ipcfy
```

## Pros

* Topic and method signature is only defined in one source file. Once any method signature is changed, both implementation side and invocation side will trigger typescript compile error. So **refract friendly**.
* Builtin return value support. All value returned by `ipc` on invocation side is a `Promise`, so return value and error handling is pretty simple and elegant via `async` / `await`

## Limitations

* It only make sense when used together with typescript.
* Arguments and return value must be simple objects (json serializable), so functions and prototypes won't be passed to main process. ([Limited by electron ipc](https://electronjs.org/docs/api/ipc-renderer#ipcrenderersendchannel-arg1-arg2-))
