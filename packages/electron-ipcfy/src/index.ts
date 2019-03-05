import { ipcRegistry } from "./IpcRegistry";

type Promisified<T extends Function> = 
    T extends (...args: infer P) => infer R
        ? ( R extends Promise<any> 
            ? (...args: P) => R
            : (...args: P) => Promise<R>
          )
        : never
    ;

export type IpcDecl = {

}

export type Ipcfied<D extends IpcDecl> = {
    __attachImpl(impl: D): Promise<void>;
    __detachImpl(): Promise<void>;
    __getTopic(): string;
    __setTimeout(timeoutInMills: number): void;
} & {
    [K in keyof D]: D[K] extends Function ? Promisified<D[K]> : never;
}

export function ipcfy<D extends IpcDecl>(topic: string): Ipcfied<D> {
    return ipcRegistry.getHandler<D>(topic);
}

export { getTopicTimeout, setTopicTimeout, setIpcDefaultTimeout } from "./IpcRegistry";
export { getCurrentIpcContext } from "./IpcContext";
export { IpcTimeoutError, IpcNotImplementedError, DuplicateImplementationError, IpcInvocationError, IpcMethodNotFoundError, registerCustomIpcError } from "./utils";
