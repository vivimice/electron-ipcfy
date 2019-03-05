import { ipcfy, getCurrentIpcContext } from "electron-ipcfy";

export type BundledArgs = { n: number, s: string, o: { b: boolean }, additional: any[], topic?: string };

export interface TestService {
    echo(n: number, s: string, o: { b: boolean }, ...additional: any[]): BundledArgs;
    call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]): void;
    test(): any;
}

export class TestServiceImpl implements TestService {

    public static readonly DEFAULT_INSTANCE: TestServiceImpl = new TestServiceImpl();

    public static createErrorRaisingImpl(errorSupplier: () => Error) {
        return new class extends TestServiceImpl {
            test() {
                throw errorSupplier();
            }
        };
    }

    public static createTimeoutImpl(sleep: number = 1000) {
        return new class extends TestServiceImpl {
            async test() {
                await new Promise(resolve => {
                    setTimeout(resolve, sleep);
                });
            }
        }
    }

    echo(n: number, s: string, o: { b: boolean }, ...additional: any[]): BundledArgs {
        const { topic } = getCurrentIpcContext();
        return { n, s, o, additional, topic };
    }

    async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]): Promise<void> {
        // do nothing
    }

    test(): void {
        // do nothing
    }
    
}

export const mainService = ipcfy<TestService>('main');
export const renderer1Service = ipcfy<TestService>('renderer1');
export const renderer2Service = ipcfy<TestService>('renderer2');
export const conflictService = ipcfy<TestService>('conflict');
export const errorService = ipcfy<TestService>('error');
export const timeoutService = ipcfy<TestService>('timeout');
