import { renderer1Service, renderer2Service } from "./RendererService";
import { mainService } from "./MainService";

export async function monitorCounters() {
    await updateCountersView();
    setTimeout(async () => {
        console.log(11111);
        monitorCounters();
    }, 1000);
}

export function initRandomizeButtons() {
    initRandomizeButton('update-main', (newValue) => mainService.setCounter(newValue));
    initRandomizeButton('update-renderer1', (newValue) => renderer1Service.setCounter(newValue));
    initRandomizeButton('update-renderer2', (newValue) => renderer2Service.setCounter(newValue));
}

function initRandomizeButton(id: string, updater: (newValue: number) => any) {
    document.getElementById(id).onclick = 
        async () => {
            try {
                await updater(Math.floor(Math.random() * 10000));
            } catch (e) {
                // skip update error
            }
            updateCountersView();
        };
}

export async function updateCountersView() {
    await updateCounterView('main-counter', () => mainService.getCounter());
    await updateCounterView('renderer1-counter', () => renderer1Service.getCounter());
    await updateCounterView('renderer2-counter', () => renderer2Service.getCounter());
}

async function updateCounterView(elementId: string, counterSupplier: () => Promise<number>) {
    const div: HTMLElement = document.getElementById(elementId);
    try {
        const counter = await counterSupplier();
        const counterText = counter.toString();
        if (div.innerText != counterText && div.innerText != '') {
            div.style.backgroundColor = '#0c0';
        } else {
            div.style.backgroundColor = null;
        }
        div.innerText = counterText;
    } catch (e) {
        div.innerText = 'NA';
        div.style.backgroundColor = '#ccc';
    }
}