import { ipcfy, getCurrentIpcContext } from "electron-ipcfy";

export type BundledArgs = { n: number, s: string, o: { b: boolean }, additional: any[], topic?: string };

export interface TestService {
    echo(n: number, s: string, o: { b: boolean }, ...additional: any[]): BundledArgs;
    call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]): void;
}

export abstract class TestServiceImpl implements TestService {

    public static readonly CALLBACKLESS_INSTANCE: TestServiceImpl =
        new class extends TestServiceImpl {
            async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]): Promise<void> {
                // do nothing
            }
        };

    echo(n: number, s: string, o: { b: boolean }, ...additional: any[]): BundledArgs {
        const { topic } = getCurrentIpcContext();
        return { n, s, o, additional, topic };
    }

    abstract call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]): Promise<void>;
    
}

export const mainService = ipcfy<TestService>('main');
export const renderer1Service = ipcfy<TestService>('renderer1');
export const renderer2Service = ipcfy<TestService>('renderer2');
export const conflictService = ipcfy<TestService>('conflict');
