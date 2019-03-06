import { tryAttachImpl } from "./ipc-impl";
import { tokenService } from "./ipc";
import { IpcNotImplementedError } from "electron-ipcfy";

async function pollToken() {
    try {
        const { token, life, generator } = await tokenService.getCurrentToken();
        console.log(`Token: {${generator}} [${token}]`);
        setTimeout(() => pollToken(), life + 30);
    } catch (e) {
        if (e instanceof IpcNotImplementedError) {
            // not yet registered.
            console.log(`Token: Implementation offline. Retrying ...`);
        } else {
            console.error(`Failed get token. Caused by: ${e.stack}`);
        }
        // retry later
        setTimeout(() => pollToken(), 1000);
    }
}

export async function startMain() {
    const hasImpl = await tryAttachImpl();
    if (hasImpl) {
        console.log('>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<')
        console.log('>>>>>> WE HAVE THE IMPLEMENTATION <<<<<<')
        console.log('>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<')
    }
    pollToken();
}