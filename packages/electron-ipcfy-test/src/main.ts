import { BrowserWindow } from "electron";
import { mainService } from "./Services";

// close all window after each test

afterEach((done) => {
    const windows = BrowserWindow.getAllWindows();
    let remain = windows.length;
    if (remain > 0) {
        windows.forEach(bw => {
            bw.once('closed', () => {
                remain--;
                if (remain == 0) {
                    done();
                }
            });
            bw.close();
        });
    } else {
        done();
    }
});

describe('Smoke Test', () => {
    require('./test/smoke-test');
});

describe('Error test', () => {
    require('./test/error-test');
});