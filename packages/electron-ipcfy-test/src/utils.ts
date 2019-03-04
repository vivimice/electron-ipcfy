import { BrowserWindow, ipcMain } from "electron";
import { join, resolve as resolvePath } from "path";
import { RendererConfig, rendererConfigs } from "./config";

export const n = 1;
export const s = 'hello, world';
export const b = true;

export type PreparedRenderer = {
    config: RendererConfig
}

export function prepareRenderer(type: keyof typeof rendererConfigs): Promise<PreparedRenderer> {
    const rendererConfig = rendererConfigs[type];
    return new Promise(resolve => {
        ipcMain.once(rendererConfig.readyChannel, () => {
            resolve({
                config: rendererConfig
            });
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
            bw.webContents.executeJavaScript(`require("${rendererConfig.source}")`);
        });
        bw.once('closed', () => {
            rendererConfig.window = null;
        });
        rendererConfig.window = bw;
    });
}
