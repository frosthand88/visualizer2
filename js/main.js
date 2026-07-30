import { createGraph } from "./graph.js";
import { initUi } from "./ui.js";
import { createPluginRegistry } from "./plugins.js";
import { examplePlugin } from "./plugins/example-plugin.js";

const container = document.getElementById("cy");
const graph = createGraph(container);

const plugins = createPluginRegistry();
plugins.register(examplePlugin);

initUi(graph, plugins);
