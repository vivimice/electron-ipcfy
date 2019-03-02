import { ipcMain, ipcRenderer, webContents } from "electron";
import { getMyCallerId, popContext, pushContext, MAIN_PROCESS_CALLER_ID } from "./IpcContext";
import { isMain, webContentsAvailable } from "./utils";

type IpcInvokeParams = {
    topic: string;
    methodName: string;
    args: any[];
    callbackId: number;
    callerId: number;
}

type IpcInvokeResult = {
    callbackId: number;
    returnValue?: any;
    error?: { [K in keyof Error]: Error[K] };
}

const callbackChannel = 'ipcrmt:cbk';
const invokeChannel = 'ipcrmt:nvk';

export type WebContentIdSupplier = () => Promise<number>;

export type RawHandler = (methodName: string, args: any[]) => Promise<any>;

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
 * 
 * @param topic 
 * @param destId Target webcontents.id. 
 *               Mandatory when invoked from main process, 
 *               Optional when invoked from renderer process
 */
let callbackCounter: number = 0;
export function createRemoteHandler(topic: string, destId: number = null): RawHandler {
    return (methodName, args: any[]) => {
        return new Promise<any>(async (resolve, reject) => {
            let callbacked = false;
            const callbackId = callbackCounter++;
            const callbackHandler = (event, result: IpcInvokeResult) => {
                if (result.callbackId != callbackId) {
                    return;
                }

                callbacked = true;

                (isMain ? ipcMain : ipcRenderer).removeListener(callbackChannel, callbackHandler);
                if (result.error) {
                    const error = new Error(result.error.message);
                    error.stack = result.error.stack;
                    reject(error);
                } else {
                    resolve(result.returnValue);
                }
            };

            const invokeParams: IpcInvokeParams = {
                topic: topic,
                methodName: methodName,
                callbackId: callbackId,
                args: args,
                callerId: getMyCallerId()
            }

            if (isMain) {
                // main -> renderer
                ipcMain.on(callbackChannel, callbackHandler);
                webContents.fromId(destId).send(invokeChannel, invokeParams);
            } else {
                ipcRenderer.on(callbackChannel, callbackHandler);
                if (destId != null) {
                    // renderer -> renderer
                    ipcRenderer.sendTo(destId, invokeChannel, invokeParams);
                } else {
                    // renderer -> main
                    ipcRenderer.send(invokeChannel, invokeParams);
                }
            }

            // destination render may crashed during invocation
            // prevent starving situation
            setTimeout(() => {
                if (!callbacked) {
                    // destination is crashed or reloaded or closed
                    (isMain ? ipcMain : ipcRenderer).removeListener(callbackChannel, callbackHandler);
                    reject(new IpcTimeoutError(topic, methodName, args));
                }
            }, 1000);
        })
    };
}

const handlers: { [topic: string]: any } = {};

export function acceptRemoteCall(topic: string, handler: any): void {
    handlers[topic] = handler;
}

export function stopAcceptRemoteCall(topic: string) {
    delete handlers[topic];
}

async function invokeHandler(event, params: IpcInvokeParams) {
    const { topic, callbackId, methodName } = params;
    const handler = handlers[topic];
    let result: IpcInvokeResult;
    if (handler != null) {
        const method = handler[methodName];
        if (method instanceof Function) {
            try {
                pushContext({
                    callerId: params.callerId,
                    topic: topic
                });
                const returnValue = await method.apply(handler, params.args);
                result = { callbackId, returnValue };
            } catch (error) {
                result = { callbackId, error }
            } finally {
                popContext();
            }
        } else {
            result = { callbackId, error: new Error(`Ipc method ${params.methodName} not found.`) };
        }
    } else {
        result = { callbackId, error: new Error(`Topic ${topic} is has no handler attached`) };
    }


    if (result.error) {
        const jsonableError = {
            name: result.error.name,
            message: result.error.message,
            stack: result.error.stack
        }
        result.error = jsonableError;
    }

    if (isMain) {
        // Reply from main to renderer
        event.sender.send(callbackChannel, result);
    } else {
        if (params.callerId == MAIN_PROCESS_CALLER_ID) {
            // Reply from renderer to main
            ipcRenderer.send(callbackChannel, result);
        } else {
            // Reply from renderer to another renderer
            ipcRenderer.sendTo(params.callerId, callbackChannel, result);
        }
    }
}

// install invoke handler
if (!isMain) {
    ipcRenderer.on(invokeChannel, invokeHandler);
    // automatically unregister when page is unloaded, prevent memory leak
    const unloadHandler = () => {
        window.removeEventListener('beforeunload', unloadHandler);
        ipcRenderer.removeAllListeners(invokeChannel);
        ipcRenderer.removeAllListeners(callbackChannel);
    };
    window.addEventListener('beforeunload', unloadHandler);
} else {
    ipcMain.on(invokeChannel, invokeHandler);
}