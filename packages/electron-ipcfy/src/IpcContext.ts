import { remote, webContents, WebContents } from "electron";
import { isMain } from "./utils";

export type IpcContext = {
    readonly topic: string;
    readonly callerId: number;   // webContents.id of caller. 0 if main process.
    readonly callerWebContents?: WebContents;
}

const contextStack: IpcContext[] = [];

export const MAIN_PROCESS_CALLER_ID = 0;

export function pushContext(context: IpcContext) {
    contextStack.push(context);
}

export function getMyCallerId() {
    return isMain ? MAIN_PROCESS_CALLER_ID : remote.getCurrentWebContents().id;
}

export function popContext() {
    contextStack.pop();
}

export function getCurrentIpcContext(): IpcContext {
    if (contextStack.length == 0) {
        throw new Error('Not in ipc context');
    }
    const wc = isMain ? webContents : remote.webContents;
    const context = contextStack[contextStack.length - 1];
    const callerWebContents = context.callerId != 0 ? wc.fromId(context.callerId) : null;
    return { ...context,
        callerWebContents: callerWebContents
    };
}
