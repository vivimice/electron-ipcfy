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

    const prev = customIpcErrors[name]
    if (prev != null && prev.errorType !== errorType) {
        throw new Error(`Duplicate custom ipc error for name='${name}'`);
    }
    customIpcErrors[name] = { errorType };
    errorType.prototype[ipcErrorTypeKey] = name;
}

export function stringifyIpcError(error: Error): string {
    return JSON.stringify(error, (_, value) => {
        if (value instanceof Error) {
            const jsonable = {};
            Object.getOwnPropertyNames(value).forEach((key) => {
                jsonable[key] = value[key];
            });
            
            const name = Object.getPrototypeOf(value)[ipcErrorTypeKey];
            if (name) {
                jsonable[ipcErrorTypeKey] = name;
            } else {
                console.log(`WARN failed stringify custom error. Use registerCustomIpcError(errorType) before invocation on both sender and receiver side`);
            }
            
            value = jsonable;
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
        } else {
            Object.setPrototypeOf(value, Error.prototype);
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
    private cause: Error;

    constructor(topic: string, methodName: string, args: any[], cause: Error) {
        super(`Ipc invocation error on method '${methodName}' of topic '${topic}': ${cause.message}`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.cause = cause;
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

    public getCause(): Error {
        return this.cause;
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
    private timeout: number;

    constructor(topic: string, methodName: string, args: any[], timeout: number) {
        super(`Timeout calling method '${methodName}' on topic ${topic}`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.topic = topic;
        this.methodName = methodName;
        this.args = args;
        this.timeout = timeout;
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

    public getTimeout(): number {
        return this.timeout;
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
