import { BrowserWindow } from "electron";
import { mainService } from "./Services";

// close all window after each test
afterEach(() => {
    BrowserWindow.getAllWindows().forEach(bw => bw.close());
    mainService.__detachImpl();
});

describe('Smoke Test', () => {
    require('./test/smoke-test');
});

