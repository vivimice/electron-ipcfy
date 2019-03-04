import { ipcRenderer } from "electron";
import { getCurrentIpcContext } from "electron-ipcfy";
import { rendererConfigs } from "./config";
import { renderer1Service, renderer2Service, TestServiceImpl } from "./Services";
import { rendererEntries } from "./utils";

const { readyChannel, patchArgs } = rendererConfigs.renderer1;

export default rendererEntries(readyChannel, {
    smoke: async () => {
        await renderer1Service.__attachImpl(new class extends TestServiceImpl {
            async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]) {
                // patch some args, then pass message to renderer2
                const { topic } = getCurrentIpcContext();
                var { n, s, o } = patchArgs({ n, s, o });
                await renderer2Service.call(callerChain.concat([topic]), n, s, o);
            }
        });
    },

    attachNullImpl: async () => {
        await renderer1Service.__attachImpl(null);
    }
});
