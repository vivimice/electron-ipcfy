/**
 * This scripts runs in 'main' process
 */
import { app, BrowserWindow } from 'electron';
import { mainService, MainService } from './MainService';
import { renderer1Service, renderer2Service } from './RendererService';

//////////////////////////////////////////////////
// attach implementation
//////////////////////////////////////////////////

mainService.__attachImpl(new class implements MainService {
    private counter: number = 0;
    private renderer1: BrowserWindow = null;
    private renderer2: BrowserWindow = null;

    showRenderer1() {
        if (this.renderer1 == null) {
            this.renderer1 = new BrowserWindow({width: 400, height: 300});
            this.renderer1.loadFile('renderer1.html');
            this.renderer1.on('closed', () => {
                this.renderer1 = null
            });
        } else {
            this.renderer1.focus();
        }
    }

    showRenderer2() {
        if (this.renderer2 == null) {
            this.renderer2 = new BrowserWindow({width: 400, height: 300});
            this.renderer2.loadFile('renderer2.html');
            this.renderer2.on('closed', () => {
                this.renderer2 = null
            });
        } else {
            this.renderer2.focus();
        }
    }

    getCounter() {
        return this.counter;
    }

    setCounter(newValue) {
        this.counter = newValue;
    }
});

//////////////////////////////////////////////////
// Main process call renderers
//////////////////////////////////////////////////

function lpad(s: any) {
    s = s.toString();
    const sp = '     ';
    if (s.length < 5) { 
        s = sp.substring(s.length) + s;
    }
    return s;
}

let timerId;
(async function printCounters() {
    let mainCounter;
    try {
        mainCounter = lpad(await mainService.getCounter());
    } catch (e) {
        mainCounter = lpad('-');
    }

    let counter1;
    try {
        counter1 = lpad(await renderer1Service.getCounter());
    } catch (e) {
        counter1 = lpad('-');
    }

    let counter2;
    try {
        counter2 = lpad(await renderer2Service.getCounter());
    } catch (e) {
        counter2 = lpad('-');
    }

    console.log('[main     ]', `Counters (MN/R1/R2): [${mainCounter}] [${counter1}] [${counter2}]`);

    timerId = setTimeout(printCounters, 1000);
})//();

//////////////////////////////////////////////////
// Initialize application
//////////////////////////////////////////////////

app.on('ready', async () => await mainService.showRenderer1());
app.on('activate', async () => await mainService.showRenderer1());

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        clearInterval(timerId);
        app.quit();
    }
})
