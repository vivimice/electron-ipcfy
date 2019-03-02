import { mainService } from "./MainService";
import { initRandomizeButtons, monitorCounters, updateCountersView } from "./renderer";
import { renderer1Service, RendererServiceImpl } from "./RendererService";
import { remote } from "electron";

//////////////////////////////////////////////////
// attach implementation
//////////////////////////////////////////////////

renderer1Service.__attachImpl(new RendererServiceImpl(() => updateCountersView()));

monitorCounters();
initRandomizeButtons();

document.getElementById('show-renderer2').onclick = () => {
    mainService.showRenderer2();
}
