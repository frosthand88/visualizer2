// Extension points a plugin can contribute to: toolbar buttons, right-click
// actions (node/edge/canvas), extra node/edge properties, importers,
// exporters, analysis modes, and docked panels. A plugin is a plain object:
//   { id, label, activate(api) }
// `activate` receives a registration-only API — it can add things, it
// can't reach into ui.js internals — so plugins stay decoupled from core
// UI code. Phase 11's AI assistant is meant to be exactly one more
// consumer of this same `register()` call, nothing more privileged.
//
// addPanel was added when building that AI plugin: none of the other six
// extension points give a plugin its own UI surface (a chat-style
// assistant view, in this case), so the gap was real, not hypothetical.
// This is the kind of incremental growth the plugin system exists to
// absorb without changing how the other six points work.

export function createPluginRegistry() {
  const toolbarButtons = [];
  const contextMenuActions = { node: [], edge: [], canvas: [] };
  const nodeProperties = [];
  const edgeProperties = [];
  const importers = [];
  const exporters = [];
  const analysisModes = [];
  const panels = [];
  const registered = [];

  function makeApi(pluginId) {
    return {
      addToolbarButton(def) {
        toolbarButtons.push({ ...def, pluginId });
      },
      addContextMenuAction(def) {
        if (!contextMenuActions[def.target]) {
          throw new Error(`Unknown context menu target "${def.target}" (expected node/edge/canvas)`);
        }
        contextMenuActions[def.target].push({ ...def, pluginId });
      },
      addNodeProperty(def) {
        nodeProperties.push({ ...def, pluginId });
      },
      addEdgeProperty(def) {
        edgeProperties.push({ ...def, pluginId });
      },
      addImporter(def) {
        importers.push({ ...def, pluginId });
      },
      addExporter(def) {
        exporters.push({ ...def, pluginId });
      },
      addAnalysisMode(def) {
        analysisModes.push({ ...def, pluginId });
      },
      // def: { id, label, render(container, ctx) }. ui.js creates a docked
      // panel + toolbar toggle for it and calls render() once with a DOM
      // node to populate and a ctx giving read access to the graph plus a
      // way to record history and refresh the UI after a confirmed change.
      addPanel(def) {
        panels.push({ ...def, pluginId });
      },
    };
  }

  return {
    register(plugin) {
      registered.push(plugin);
      if (plugin.activate) plugin.activate(makeApi(plugin.id));
    },
    list: () => registered.map((p) => ({ id: p.id, label: p.label })),
    toolbarButtons,
    contextMenuActions,
    nodeProperties,
    edgeProperties,
    importers,
    exporters,
    analysisModes,
    panels,
  };
}
