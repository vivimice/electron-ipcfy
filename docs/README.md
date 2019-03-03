# Documentation

* [Glossary](#glossary)
* [API](#api)

## Glossary

This section defines some terminology of electron-ipcfy

### IpcDecl

IpcDecl stands for '**IPC Declaration**'. It is an interface which defines a set of ipc method. 

Due to [limitations](../README.md#limitations), all arguments and return values of these ipc methods should be json serializable.

### Ipcfied

Ipcfied is an wrapper type for a given IpcDecl, it selects all methods declared within given IpcDecl, and wrap all return types using `Promise` if not already one.

Also, Ipcfied interface will contain two additional utility method:

* [`__attachImpl(impl)`](#ipcfiedd.__attachimplimpl-d)
* [`__detachImpl()`](#ipcfiedd.__detachimpl)

For example, for a certain IpcDecl: 

```ts
interface FooIpc {
    someVar: string;
    bar(): void;
    test(): Promise<string>;
}
```

Then `Ipcfied<FooIpc>` will be like:

```ts
interface IpcfiedFooIpc {
    // someVar is stripped
    bar(): Promise<void>;
    test(): Promise<string>;    // will not wrapped again
    // utility method
    __attachImpl(impl: FooIpc): Promise<void>;
    __detachImpl(): Promise<void>;
}
```

### IpcImpl

IpcImpl stands for '**IPC implementation**', which is an object which implements all methods of certain IpcDecl.

### Topic

An unique identifier across application. Topic is used to distinguish different IpcImpl within an electron application.

Only one IpcImpl can be attached to one topic at any given time.

IpcImpl resident in renderer process will automatically detach from previously attached topic to.

## API

### `ipcfy<D>(topic: string): Ipcfied<D>`

* `D` typeof specific [IpcDecl](#ipcdecl)
* `topic` string

This method creates a [Ipcfied](#ipcfied) proxy object with given type on given topic. Calling declared ipc method will be routed to implementation's process, regardless of which process makes the call (even in the same process).

### `Ipcfied<D>.__attachImpl(impl: D)`

* `D` typeof specific [IpcDecl](#ipcdecl)
* `impl` implementation of IpcDecl

Returns a `Promise<void>` indicates the attaching result.

This method will attach implementation instance of given IpcDecl. After calling this method, calling ipc method on any Ipcified intance with the same topic will be routed to this implementation, regardless where the caller is located.

This method will return a rejected Promise if there is already a implementation is attached to the same topic.

### `Ipcfied<D>.__detachImpl()`

* `D` typeof specific [IpcDecl](#ipcdecl)

Returns a `Promise<void>` indicates the detaching result.

This method will detach previously attached implementation, makes it possible for attaching other implementation instance.

Note: This method will only work when called within implementation's process, otherwise it just return silently.

### `getCurrentIpcContext()`

Calling this method in an ipc handler function, it will returns a `IpcContext` which contains most recent information about the callers, etc. in calling stack.

Calling this method outside the ipc call will throw an error.

Return value is an instance of `IpcContext`, which has the following signature:

```ts
type IpcContext = {
    readonly topic: string;
    readonly callerId: number;   // webContents.id of caller. 0 if main process.
    readonly callerBrowserWindow: BrowserWindow;
    readonly callerWebContents: WebContents;
}
```
