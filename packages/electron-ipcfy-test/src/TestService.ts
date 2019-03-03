import { dialog, BrowserWindow } from "electron";
import { ipcfy, getCurrentIpcContext } from "electron-ipcfy";

export interface TestService {
    promptForFile(): Promise<string>;
    getAndUpdateCounter(newValue: number): number;
}

export const testService = ipcfy<TestService>('test');

export class TestServiceImpl implements TestService {

    private counter: number = 0;

    promptForFile(): Promise<string> {
        console.log('[main    ]', 'promptForFile: called from ');
        const { callerBrowserWindow } = getCurrentIpcContext();
        return new Promise<string>((resolve, reject) => {
            dialog.showOpenDialog(callerBrowserWindow, {
            }, (filePaths) => {
                if (filePaths) {
                    console.log('[main    ]', 'promptForFile: resolved', filePaths);
                    resolve(filePaths[0]);
                } else {
                    console.log('[main    ]', 'promptForFile: user canceled');
                    reject(new Error('User canceled'));
                }
            })
        });
    }

    getAndUpdateCounter(newValue): number {
        const oldValue = this.counter;
        console.log('[main    ]', `getAndUpdateCounter: oldValue=${oldValue}, newValue=${newValue}`);
        this.counter = newValue;
        return oldValue;
    }
}
