import { createGraph } from "./graph.js";
import { initUi } from "./ui.js";
import { createPluginRegistry } from "./plugins.js";
import { examplePlugin } from "./plugins/example-plugin.js";
import { aiPlugin } from "./plugins/ai-plugin.js";

const container = document.getElementById("cy");
const graph = createGraph(container);

const plugins = createPluginRegistry();
plugins.register(examplePlugin);
plugins.register(aiPlugin);

initUi(graph, plugins);
