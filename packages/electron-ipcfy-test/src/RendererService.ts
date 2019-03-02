import { ipcfy } from "electron-ipc-facade";

export interface RendererService {
    getCounter(): number;
    setCounter(newValue: number);
}

export class RendererServiceImpl implements RendererService {
    private counter: number = 0;
    private updateObserver: (newValue?: number, oldValue?: number) => any;

    constructor(updateObserver: (newValue?: number, oldValue?: number) => any) {
        this.updateObserver = updateObserver;
    }

    getCounter() {
        return this.counter;
    }

    setCounter(newValue: number) {
        const oldValue = this.counter;
        this.counter = newValue;
        this.updateObserver(newValue, oldValue);
    }
}

export const renderer1Service = ipcfy<RendererService>('renderer1');
export const renderer2Service = ipcfy<RendererService>('renderer2');
