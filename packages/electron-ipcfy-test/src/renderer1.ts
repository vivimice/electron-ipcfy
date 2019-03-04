import { ipcRenderer } from "electron";
import { getCurrentIpcContext } from "electron-ipcfy";
import { rendererConfigs } from "./config";
import { renderer1Service, renderer2Service, TestServiceImpl } from "./Services";

const config = rendererConfigs.renderer1;

async function init() {
    await renderer1Service.__attachImpl(new class extends TestServiceImpl {
        async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]) {
            // patch some args, then pass message to renderer2
            const { topic } = getCurrentIpcContext();
            var { n, s, o } = config.patchArgs({ n, s, o });
            await renderer2Service.call(callerChain.concat([topic]), n, s, o);
        }
    });
    ipcRenderer.send(config.readyChannel);
}

init();
