import { ipcRenderer } from "electron";
import { getCurrentIpcContext } from "electron-ipcfy";
import { rendererConfigs } from "./config";
import { mainService, renderer2Service, TestServiceImpl } from "./Services";

const config = rendererConfigs.renderer2;

async function init() {
    await renderer2Service.__attachImpl(new class extends TestServiceImpl {
        async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]) {
            // patch some args, then pass message to renderer2
            const { topic } = getCurrentIpcContext();
            var { n, s, o } = config.patchArgs({ n, s, o });
            await mainService.call(callerChain.concat([topic]), n, s, o);
        }
    });
    ipcRenderer.send(config.readyChannel);
}

init();
