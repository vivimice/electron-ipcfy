import { BrowserWindow, ipcMain, remote, ipcRenderer } from "electron";
import { join, resolve as resolvePath } from "path";
import { RendererConfig, rendererConfigs } from "./config";

export const n = 1;
export const s = 'hello, world';
export const b = true;

export type PreparedRenderer = {
    config: RendererConfig
}

export function prepareRenderer(type: keyof typeof rendererConfigs, initFuncName: string): Promise<PreparedRenderer> {
    const rendererConfig = rendererConfigs[type];
    return new Promise(resolve => {
        ipcMain.once(rendererConfig.readyChannel, (event, error) => {
            if (error == null) {
                resolve({
                    config: rendererConfig
                });
            } else {
                const e = new Error(error.message);
                e.stack = error.stack;
                throw e;
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

export function rendererEntries(readyTopic: string, callbacks: { [ name: string ]: () => void }) {
    const m = {};
    const remoteConsole = remote.require('console');
    Object.keys(callbacks).forEach(methodName => {
        m[methodName] = async () => {
            try {
                await callbacks[methodName]();
                ipcRenderer.send(readyTopic);
            } catch (e) {
                remoteConsole.error(e);
                ipcRenderer.send(readyTopic, { message: e.message, stack: e.stack });
            }
        }
    });
    return m;
}
