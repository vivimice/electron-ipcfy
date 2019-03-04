import { BrowserWindow } from "electron";
import { BundledArgs } from "./Services";

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type PatchableArgs = Omit<BundledArgs, 'additional' | 'topic'>;

export type RendererConfig = {
    readonly topic: string,
    readonly readyChannel: string, 
    readonly source: string,
    window: BrowserWindow,
    patchArgs: (args: PatchableArgs) => PatchableArgs
}

export const rendererConfigs: { [type: string]: RendererConfig } = {
    renderer1: {
        topic: 'renderer1',
        readyChannel: 'renderer1-ready',
        source: './dist/renderer1',
        window: null,
        patchArgs: (args) => {
            return { ...args, 
                n: args.n + 13
            };
        }
    },
    renderer2: {
        topic: 'renderer2',
        readyChannel: 'renderer2-ready',
        source: './dist/renderer2',
        window: null,
        patchArgs: (args) => {
            return { ...args, 
                s: 'hohoho! ' + args
            }
        }
    }
}
