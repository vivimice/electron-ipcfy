import { BrowserWindow, ipcMain, remote, ipcRenderer } from "electron";
import { join, resolve as resolvePath } from "path";
import { RendererConfig, rendererConfigs } from "./config";
import { stringifyIpcError, parseIpcError, registerCustomIpcError } from "electron-ipcfy/dist/utils";

export const n = 1;
export const s = 'hello, world';
export const b = true;

export type PreparedRenderer = {
    config: RendererConfig
}

export function prepareRenderer(type: keyof typeof rendererConfigs, initFuncName: string): Promise<PreparedRenderer> {
    const rendererConfig = rendererConfigs[type];
    return new Promise((resolve, reject) => {
        ipcMain.once(rendererConfig.readyChannel, (event, errorJson) => {
            if (errorJson == null) {
                resolve({
                    config: rendererConfig
                });
            } else {
                reject(parseIpcError(errorJson));
            }
        });

        const bw = new BrowserWindow({
            width: 64, 
            height: 64, 
            fullscreenable: false,
            maximizable: false,
            minimizable: false,
            resizable: false,
            show: false,
            webPreferences: {
                webSecurity: false,
                webaudio: false,
                webgl: false
            }
        });
        bw.loadURL('file://' + resolvePath(join(__dirname, '../blank.html')));
        bw.webContents.once('did-finish-load', () => {
            bw.webContents.executeJavaScript(`require("${rendererConfig.source}").default.${initFuncName}()`);
        });
        bw.once('closed', () => {
            rendererConfig.window = null;
        });
        rendererConfig.window = bw;
    });
}

export function setupRenderer(readyTopic: string, callbacks: { [ name: string ]: () => void }) {
    const remoteConsole = remote.require('console');
    console.log = function () {
        remoteConsole.log.apply(remoteConsole, arguments);
    }
      
    console.dir = function () {
        remoteConsole.dir.apply(remoteConsole, arguments);
    }
    
    console.error = function () {
        remoteConsole.error.apply(remoteConsole, arguments);
    }

    const m = {};
    Object.keys(callbacks).forEach(methodName => {
        m[methodName] = async () => {
            try {
                await callbacks[methodName]();
                ipcRenderer.send(readyTopic);
            } catch (e) {
                ipcRenderer.send(readyTopic, stringifyIpcError(e));
            }
        }
    });
    return m;
}


export class CustomError extends Error {
    foo: string;
    constructor(message?: string, foo?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.foo = foo;
    }
}

registerCustomIpcError(CustomError);