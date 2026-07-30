import { createGraph } from "./graph.js";
import { initUi } from "./ui.js";

const container = document.getElementById("cy");
const graph = createGraph(container);
initUi(graph);
