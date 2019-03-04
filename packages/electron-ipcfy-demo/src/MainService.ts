import { ipcfy } from "electron-ipcfy";

export interface MainService {
    showRenderer1();
    showRenderer2();
    getCounter(): number;
    setCounter(newValue: number);
}

export const mainService = ipcfy<MainService>('main');
