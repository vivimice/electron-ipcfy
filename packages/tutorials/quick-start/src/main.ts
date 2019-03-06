import { tryAttachImpl } from "./ipc-impl";
import { tokenService } from "./ipc";
import { IpcNotImplementedError } from "electron-ipcfy";

async function updateToken() {
    try {
        const { token, life, generator } = await tokenService.getCurrentToken();
        console.log(`Token: {${generator}} [${token}]`);
        setTimeout(() => updateToken(), life);
    } catch (e) {
        if (e instanceof IpcNotImplementedError) {
            // not yet registered.
            console.log(`Token: Implementation offline. Retrying ...`);
        } else {
            console.error(`Failed get token. Caused by: ${e.stack}`);
        }
        // retry later
        setTimeout(() => updateToken(), 1000);
    }
}

export async function startMain() {
    const hasImpl = await tryAttachImpl();
    if (hasImpl) {
        console.log('>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<')
        console.log('>>>>>> WE HAVE THE IMPLEMENTATION <<<<<<')
        console.log('>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<')
    }

    updateToken();
}