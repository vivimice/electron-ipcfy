import { ipcRegistry } from "./IpcRegistry";

/////////////////////////////////////////////////////////////////////////////
// See: https://stackoverflow.com/a/50774825/1305930
// Thanks to Titian Cernicova-Dragomir
/////////////////////////////////////////////////////////////////////////////

type IsValidArg<T> = T extends object ? keyof T extends never ? false : true : true;

type Promisified<T extends Function> =
    T extends (...args: any[]) => Promise<any> ? T : (
        T extends (a: infer A, b: infer B, c: infer C, d: infer D, e: infer E, f: infer F, g: infer G, h: infer H, i: infer I, j: infer J) => infer R ? (
            IsValidArg<J> extends true ? (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J) => Promise<R> :
            IsValidArg<I> extends true ? (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I) => Promise<R> :
            IsValidArg<H> extends true ? (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => Promise<R> :
            IsValidArg<G> extends true ? (a: A, b: B, c: C, d: D, e: E, f: F, g: G) => Promise<R> :
            IsValidArg<F> extends true ? (a: A, b: B, c: C, d: D, e: E, f: F) => Promise<R> :
            IsValidArg<E> extends true ? (a: A, b: B, c: C, d: D, e: E) => Promise<R> :
            IsValidArg<D> extends true ? (a: A, b: B, c: C, d: D) => Promise<R> :
            IsValidArg<C> extends true ? (a: A, b: B, c: C) => Promise<R> :
            IsValidArg<B> extends true ? (a: A, b: B) => Promise<R> :
            IsValidArg<A> extends true ? (a: A) => Promise<R> :
            () => Promise<R>
        ) : never
    );
/////////////////////////////////////////////////////////////////////////////

export type IpcDecl = {

}

export type Ipcfied<D extends IpcDecl> = {
    __attachImpl(impl: D): Promise<any>;
    __detachImpl(): Promise<any>;
} & {
    [K in keyof D]: D[K] extends Function ? Promisified<D[K]> : never;
}

export function ipcfy<D extends IpcDecl>(topic: string, impl: D = null): Ipcfied<D> {
    return ipcRegistry.getHandler<D>(topic);
}

export { getCurrentIpcContext } from "./IpcContext";
export { IpcTimeoutError } from "./RemoteHandlers";
