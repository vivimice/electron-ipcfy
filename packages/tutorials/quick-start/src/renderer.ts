import { tryAttachImpl } from "./ipc-impl";
import { tokenService } from "./ipc";
import { IpcNotImplementedError } from "electron-ipcfy";

async function updateToken() {
    const tokenDiv = document.getElementById('token');
    tokenDiv.style.color = null;
    try {
        const { token, life } = await tokenService.getCurrentToken();
        tokenDiv.innerText = token;
        setTimeout(() => updateToken(), life);
        setTimeout(() => tokenDiv.style.color = '#900', life - 1000);
    } catch (e) {
        if (e instanceof IpcNotImplementedError) {
            // not yet registered.
            tokenDiv.innerText = '......';
        } else {
            console.error(`Failed get token. Caused by: ${e.stack}`);
            tokenDiv.innerText = 'ERROR!';
        }
        // retry later
        setTimeout(() => updateToken(), 500);
    }
}

async function startRenderer() {
    const hasImpl = await tryAttachImpl();
    if (hasImpl) {
        document.getElementById('info').innerText = '>>>>>> WE HAVE THE IMPLEMENTATION <<<<<<';
    }
    updateToken();
}

window['startRenderer'] = startRenderer;
