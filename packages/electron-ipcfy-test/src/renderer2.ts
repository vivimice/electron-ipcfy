import { mainService } from "./MainService";
import { monitorCounters, initRandomizeButtons, updateCountersView } from "./renderer";
import { renderer2Service, RendererServiceImpl } from "./RendererService";

//////////////////////////////////////////////////
// attach implementation
//////////////////////////////////////////////////

renderer2Service.__attachImpl(new RendererServiceImpl(() => updateCountersView()));

monitorCounters();
initRandomizeButtons();

document.getElementById('show-renderer1').onclick = () => {
    mainService.showRenderer1();
}
