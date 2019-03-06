import { app, BrowserWindow } from "electron";
import { start } from "repl";
import { startMain } from "./main";

//////////////////////////////////////////////////
// Initialize application
//////////////////////////////////////////////////

let renderer: BrowserWindow = null;
async function init() {
    if (renderer != null) {
        return;
    }
    renderer = new BrowserWindow({
        width: 633,
        height: 203,
        fullscreenable: false,
        maximizable: false,
        minimizable: true
    });
    renderer.webContents.on('did-finish-load', () => {
        renderer.webContents.executeJavaScript('startRenderer()');
    });
    renderer.once('closed', () => renderer = null);
    renderer.loadFile('renderer.html');
}

app.on('ready', async () => await init());
app.on('activate', async () => await init());
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

startMain();
