# Documentation

* [Glossary](#glossary)
* [Function References](#function-references)
  * [`ipcfy<D>(topic: string): Ipcfied<D>`](#ipcfydtopic-string-ipcfiedd)
  * [`getCurrentIpcContext()`](#getcurrentipccontext)
  * [`getTopicTimeout(topic: string): number`](#gettopictimeouttopic-string-number)
  * [`setTopicTimeout(topic: string, timeoutInMillis: number)`](#settopictimeouttopic-string-timeoutinmillis-number)
  * [`setIpcDefaultTimeout(timeoutInMillis: number)`](#setipcdefaulttimeouttimeoutinmillis-number)
  * [`registerCustomIpcError(errorType, name: string = null)`](#registercustomipcerrorerrortype-name-string--null)
* [Class References](#class-references)
  * [`Ipcfied<D>`](#ipcfiedd)
  * [`DuplicateImplementationError`](#duplicateimplementationerror)
  * [`InvalidImplementationError`](#invalidimplementationerror)
  * [`IpcInvocationError`](#ipcinvocationerror)
  * [`IpcMethodNotFoundError`](#ipcmethodnotfounderror)
  * [`IpcNotImplementedError`](#ipcnotimplementederror)
  * [`IpcTimeoutError`](#ipctimeouterror)

## Glossary

This section defines some terminology of electron-ipcfy

### IpcDecl

IpcDecl stands for '**IPC Declaration**'. It is an interface which defines a set of ipc method. 

Due to [limitations](../README.md#limitations), all arguments and return values of these ipc methods should be json serializable.

### Ipcfied

Ipcfied is an wrapper type for a given IpcDecl, it selects all methods declared within given IpcDecl, and wrap all return types using `Promise` if not already one.

Also, Ipcfied interface will contain some additional utility method:

* [`__attachImpl(impl)`](#ipcfiedd.__attachimplimpl-d)
* [`__detachImpl()`](#ipcfiedd.__detachimpl)
* [`__getTopic()`](#ipcfiedd.__gettopic-string)
* [`__setTimeout(timeoutInMillis)`](#ipcfiedd.__settimeouttimeoutinmillis-number)

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

See [`Ipcfied<D>`](#ipcfiedd) for more details.

### IpcImpl

IpcImpl stands for '**IPC implementation**', which is an object which implements all methods of certain IpcDecl.

### Topic

An unique identifier across application. Topic is used to distinguish different IpcImpl within an electron application.

Only one IpcImpl can be attached to one topic at any given time.

IpcImpl resident in renderer process will automatically detach from previously attached topic to.

### Timeout

Remote method call across process has the risk of halt indefinitely. electron-ipcfy will try its best to ensure all methods returns at last, but there are still some occasions that it won't return expected.

For example, when peer process received method call request, it will start processing and return value to sender via ipc. But peer process may crash right before sending reply ipc. So caller won't get its return value ipc call forever.

In these cases, timeout is the last resort of taking caller out of the indefinite waiting status.

## Function References

### `getCurrentIpcContext()`

Calling this method in an ipc handler function, it will returns a `IpcContext` which contains most recent information about the callers, etc. in calling stack.

Calling this method outside the ipc call will throw an error.

Return value is an instance of `IpcContext`, which has the following signature:

```ts
type IpcContext = {
    readonly topic: string;
    readonly callerId: number;   // webContents.id of caller. 0 if main process.
    readonly callerWebContents: WebContents;
}
```

### `getTopicTimeout(topic: string): number`

Get timeout setting of given topic for current process. If timeout is not set for these topic before, default timeout value is returned.

### `ipcfy<D>(topic: string): Ipcfied<D>`

* `D` typeof specific [IpcDecl](#ipcdecl)
* `topic` string

This method creates a [Ipcfied](#ipcfied) proxy object with given type on given topic. Calling declared ipc method will be routed to implementation's process, regardless of which process makes the call (even in the same process).

### `setIpcDefaultTimeout(timeoutInMillis: number)`

Set's default ipc method timeout for current process. See [`Ipcfied<D>.__setTimeout(timeoutInMillis)`](#ipcfiedd.__settimeouttimeoutinmillis-number) for more details.

See:

* [Glossary: Timeout](#timeout)
* [`setTopicTimeout(topic: string, timeoutInMillis: number)`](#settopictimeouttopic-string-timeoutinmillis-number)
* [`Ipcfied<D>.__setTimeout(timeoutInMillis: number)`](#ipcfiedd.__setTimeouttimeoutinmillis-number)

### `setTopicTimeout(topic: string, timeoutInMillis: number)`

* `topic` The target topic
* `timeoutInMills` Method call timeout in milli-second. Must be 0 or greater.

Set timeout (in milli-seconds) for all method calls of the given topic from current process. When timeout occurred, [`IpcTimeoutError`](#ipctimeouterror) will be thrown.

Note: Set timeout to zero will disable timeout functionality completely, thus `IpcTimeoutError` won't thrown ever. So use it with caution.

Default timeout is `1000ms`, which can be override by calling [`setIpcDefaultTimeout(timeoutInMillis: number)`](#setipcdefaulttimeouttimeoutinmillis-number)

An error will thrown if `timeoutInMills` param is not a number or negative.

See:

* [Glossary: Timeout](#timeout)
* [`Ipcfied<D>.__setTimeout(timeoutInMillis: number)`](#ipcfiedd.__setTimeouttimeoutinmillis-number)

### `registerCustomIpcError(errorType, name: string = null)`

* `errorType` Type of your custom error
* `name` Optional. The alternate name of this errorType. Often used to prevent name collision. When not provided or `null`, `errorType.constructor.name` will be used.

Register a custom error type, so it won't lost it's type information across ipc calls.

Electron uses json to serialize/deserialize ipc data across process, no prototype chain will be included. So recievers cannot use `instanceof` operator to distinguish different types of errors.

```ts
class MyError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

const original = new MyError();
console.log(original instanceof MyError);   // true

const restored = JSON.parse(JSON.stringify(original));
console.log(restored instanceof MyError);   // false
```

In `electron-ipcfy`, error object's prototype info can be restored after method call, if the type of the error is registered on BOTH sender side and receiver side BEFORE method invocation.

## Class References

### `Ipcfied<D>`

#### `Ipcfied<D>.__attachImpl(impl: D)`

* `D` typeof specific [IpcDecl](#ipcdecl)
* `impl` implementation of IpcDecl

Returns a `Promise<void>` indicates the attaching result.

This method will attach implementation instance of given IpcDecl. After calling this method, calling ipc method on any Ipcified intance with the same topic will be routed to this implementation, regardless where the caller is located.

This method will return a rejected Promise of [`DuplicateImplementationError`](#duplicateimplementationerror) to indicates that there is already an implementation attached in any process within the same electron application.

This method will return a rejected Promise of [`InvalidImplementationError`](#invalidimplementationerror) to indicates that `impl` parameter is invalid.

#### `Ipcfied<D>.__detachImpl()`

* `D` typeof specific [IpcDecl](#ipcdecl)

Returns a `Promise<void>` indicates the detaching result.

This method will detach previously attached implementation, makes it possible for attaching other implementation instance.

Implementation attached within renderer process will automatically detached when renderer's window is closed.

Note: This method will only work when called within implementation's process, otherwise it just return silently.

#### `Ipcfied<D>.__getTopic(): string`

* `D` typeof specific [IpcDecl](#ipcdecl)

Returns topic associated with this Ipcfied interface.

#### `Ipcfied<D>.__setTimeout(timeoutInMillis: number)`

* `D` typeof specific [IpcDecl](#ipcdecl)
* `timeoutInMillis` Timeout value in milli-seconds

Set timeout (in milli-seconds) for all method calls of current topic from current process. When timeout occurred, [`IpcTimeoutError`](#ipctimeouterror) will be thrown.

Calling this method is equivalent of: 

```ts
setTopicTimeout(ipcfied.__getTopic(), timeoutInMillis)
```

See:

* [Glossary: Timeout](#timeout)
* [`setTopicTimeout(topic: string, timeoutInMillis: number)`](#settopictimeouttopic-string-timeoutinmillis-number)
* [`setIpcDefaultTimeout(timeoutInMillis: number)`](#setipcdefaulttimeouttimeoutinmillis-number)

## `IpcInvocationError`

Thrown to indicates that ipcfied method call throwed an error or returned a rejected Promise.

It has following methods:

* `getTopic(): string`: Returns the topic of the method call.
* `getMethodName(): string`: Returns the method name of the method call.
* `getArgs(): any[]`: Returns the arguments of the method call.
* `getCause(): Error`: Returns the cause/rejection of the method call.

Note: If implementation throwed a custom error, and type of the custom error isn't registered before the invocation on both caller and implmentation side, the `getCause()` method may adapt it to a `Error` instance.

See:

* [`registerCustomIpcError(errorType, name: string = null)`](#registercustomipcerrorerrortype-name-string--null)

## `IpcMethodNotFoundError`

Thrown to indicates that the ipcifed method does not exists.

* `getTopic(): string`: Returns the topic of the failed method call.
* `getMethodName(): string`: Returns the method name of the failed method call.

## `IpcNotImplementedError`

Thrown to indicates that there is no implementation associated with given topic.

* `getTopic(): string`: Returns the topic of the failed method call.

See:

* [Glossary: Topic](#topic)
* [`Ipcfied<D>.__attachImpl(impl: D)`](#ipcfiedd.__attachimplimpl-d)
* [`Ipcfied<D>.__detachImpl()`](#ipcfiedd.__detachimpl)

## `IpcTimeoutError`

Thrown to indicates that the ipcfied method call exceeds topic's timeout setting.

It has following methods:

* `getTopic(): string`: Returns the topic of the timeouted method call.
* `getMethodName(): string`: Returns the method name of the timeouted method call.
* `getArgs(): any[]`: Returns the arguments of the timeouted method call.
* `getTimeout(): number`: Returns the timeout setting.

See:

* [Glossary: Timeout](#timeout)
* [`setTopicTimeout(topic: string, timeoutInMillis: number)`](#settopictimeouttopic-string-timeoutinmillis-number)
* [`Ipcfied<D>.__setTimeout(timeoutInMillis: number)`](#ipcfiedd.__setTimeouttimeoutinmillis-number)
* [`setIpcDefaultTimeout(timeoutInMillis: number)`](#setipcdefaulttimeouttimeoutinmillis-number)

## `InvalidImplementationError`

This error will be thrown when invalid value (Usually `null` or `undefined`) to provided to [`Ipcfied<D>.__attachImpl(impl: D)`](#ipcfiedd.__attachimplimpl-d) call.

It has following methods:

* `getTopic(): string`: Returns the topic which is trying to attach to

## `DuplicateImplementationError`

This error will be thrown when trying to attach value (Usually `null` or `undefined`) to an already attached topic.

It has following methods:

* `getTopic(): string`: Returns the topic which is trying to attach to

See:

* [`Ipcfied<D>.__attachImpl(impl: D)`](#ipcfiedd.__attachimplimpl-d)