import { ipcRenderer } from "electron";
import { getCurrentIpcContext } from "electron-ipcfy";
import { rendererConfigs } from "./config";
import { mainService, renderer2Service, TestServiceImpl } from "./Services";
import { rendererEntries } from "./utils";

const { readyChannel, patchArgs } = rendererConfigs.renderer2;

export default rendererEntries(readyChannel, {
    smoke: async () => {
        await renderer2Service.__attachImpl(new class extends TestServiceImpl {
            async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]) {
                // patch some args, then pass message to renderer2
                const { topic } = getCurrentIpcContext();
                var { n, s, o } = patchArgs({ n, s, o });
                await mainService.call(callerChain.concat([topic]), n, s, o);
            }
        });
    }
});