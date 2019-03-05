import { remote, WebContents, webContents } from "electron";

export const isMain = process.type == 'browser';

export function getWebContentsById(id: number): WebContents {
    return (isMain ? webContents : remote.webContents).fromId(id);
}

export function webContentsAvailable(id: number): boolean {
    return getWebContentsById(id) != null;
}

const customIpcErrors: {
    [name: string]: {
        errorType: { new(...args: any[]): Error },
    }
} = {};
const ipcErrorTypeKey = '__ipcfy_error_type__';

/**
 * register a custom error type for ipc calls
 */
export function registerCustomIpcError<T extends Error>(errorType: { new(...args: any[]): T }, name: string = null) {
    if (!name) {
        name = errorType.name;
    }
    if (customIpcErrors[name] != null) {
        throw new Error(`Duplicate custom ipc error for name='${name}'`);
    }
    customIpcErrors[name] = { errorType };
    errorType.prototype[ipcErrorTypeKey] = name;
}

export function stringifyIpcError(error: Error): string {
    return JSON.stringify(error, (key, value) => {
        if (value instanceof Error) {
            const jsonable = {};
            Object.getOwnPropertyNames(value).forEach((key) => {
                jsonable[key] = value[key];
            });
            value = jsonable;

            const name = Object.getPrototypeOf(error)[ipcErrorTypeKey];
            if (name) {
                jsonable[ipcErrorTypeKey] = name;
            } else {
                console.log(`WARN failed stringify custom error. Use registerCustomIpcError(errorType) before invocation on both sender and receiver side`);
            }
        }
        return value;
    });
}

export function parseIpcError(json: string): Error {
    return JSON.parse(json, (key, value) => {
        const name = value[ipcErrorTypeKey];
        const customIpcError = customIpcErrors[name];
        if (customIpcError) {
            delete value[ipcErrorTypeKey];
            Object.setPrototypeOf(value, customIpcError.errorType.prototype);
        }
        return value;
    });
}

/**
 * Happens when trying attach an implementation to an already attached topic
 */
export class InvalidImplementationError extends Error {

    private topic: string;

    constructor(topic: string) {
        super(`Cannot register invalid implementation on topic '${topic}'`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.topic = topic;
    }

    public getTopic(): string {
        return this.topic;
    }

}

/**
 * Happens when trying attach an implementation to an already attached topic
 */
export class DuplicateImplementationError extends Error {

    public static readonly type: unique symbol = Symbol('InvalidImplementationError');

    private topic: string;

    constructor(topic: string) {
        super(`Topic '${topic}' already has implementation attached`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.topic = topic;
    }

    public getTopic(): string {
        return this.topic;
    }

}

/**
 * A wrapper error on implementation'serror
 */
export class IpcInvocationError extends Error {

    private topic: string;
    private methodName: string;
    private args: any[];

    constructor(message:string, stack: string, topic: string, methodName: string, args: any[]) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.stack = stack;
        this.topic = topic;
        this.methodName = methodName;
        this.args = args;
    }

    public getTopic(): string {
        return this.topic;
    }

    public getMethodName(): string {
        return this.methodName;
    }

    public getArgs(): any[] {
        return this.args;
    }

}

/**
 * Not implemented error
 */
export class IpcNotImplementedError extends Error {
    private topic: string;

    constructor(topic: string) {
        super(`Ipc on topic '${topic}' have no implementation attached`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.topic = topic;
    }

    public getTopic(): string {
        return this.topic;
    }
}

/**
 * Ipc method not found error
 */
export class IpcMethodNotFoundError extends Error {
    private topic: string;
    private methodName: string;

    constructor(topic: string, methodName: string) {
        super(`Ipc method '${methodName}' not found within topic '${topic}'`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.topic = topic;
        this.methodName = methodName;
    }

    public getTopic(): string {
        return this.topic;
    }

    public getMethodName(): string {
        return this.methodName;
    }
}

/**
 * Ipc timeout error
 */
export class IpcTimeoutError extends Error {
    private topic: string;
    private methodName: string;
    private args: any[];

    constructor(topic: string, methodName: string, args: any[]) {
        super(`Timeout calling method '${methodName}' on topic ${topic}`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.topic = topic;
        this.methodName = methodName;
        this.args = args;
    }

    public getTopic(): string {
        return this.topic;
    }

    public getMethodName(): string {
        return this.methodName;
    }

    public getArgs(): any[] {
        return this.args;
    }
}

/**
 * Register builtin ipc errors
 */
registerCustomIpcError(Error);
registerCustomIpcError(IpcInvocationError);
registerCustomIpcError(IpcMethodNotFoundError);
registerCustomIpcError(IpcNotImplementedError);
registerCustomIpcError(IpcTimeoutError);
registerCustomIpcError(InvalidImplementationError);
registerCustomIpcError(DuplicateImplementationError);
