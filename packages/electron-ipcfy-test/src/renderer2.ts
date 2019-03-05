import { getCurrentIpcContext } from "electron-ipcfy";
import { rendererConfigs } from "./config";
import { conflictService, mainService, renderer2Service, TestServiceImpl } from "./Services";
import { setupRenderer } from "./utils";

const { readyChannel, patchArgs } = rendererConfigs.renderer2;

export default setupRenderer(readyChannel, {
    smoke: async () => {
        await renderer2Service.__attachImpl(new class extends TestServiceImpl {
            async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]) {
                // patch some args, then pass message to renderer2
                const { topic } = getCurrentIpcContext();
                var { n, s, o } = patchArgs({ n, s, o });
                await mainService.call(callerChain.concat([topic]), n, s, o);
            }
        });
    },

    attachConflictImpl: async () => {
        await conflictService.__attachImpl(TestServiceImpl.CALLBACKLESS_INSTANCE);
    }
});