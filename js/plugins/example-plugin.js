// A small reference plugin exercising every extension point, so the
// plugin system (Phase 10) is proven against real usage of its own API
// before Phase 11's AI assistant is built the same way. Intentionally
// tiny — this exists to validate the mechanism, not to be a feature.

export const examplePlugin = {
  id: "example",
  label: "Example Plugin",

  activate(api) {
    api.addToolbarButton({
      id: "randomize-colors",
      label: "🎲 Randomize",
      title: "Example plugin: give selected nodes a random color",
      onClick({ selectedNodes }) {
        selectedNodes.forEach((n) => {
          const hue = Math.floor(Math.random() * 360);
          n.data("color", `hsl(${hue}, 65%, 55%)`);
        });
      },
    });

    api.addContextMenuAction({
      target: "node",
      label: "Mark reviewed (example)",
      action({ element }) {
        element.data("reviewed", element.data("reviewed") ? "" : "yes");
      },
    });

    api.addNodeProperty({
      key: "owner",
      label: "Owner (example)",
      type: "text",
    });

    api.addImporter({
      id: "plain-list",
      label: "Plain list (one label per line)",
      accept: ".txt",
      parse(text) {
        const labels = text.split("\n").map((l) => l.trim()).filter(Boolean);
        return {
          nodes: labels.map((label, i) => ({
            data: { id: `imp${i}`, label },
            position: { x: 120 + (i % 6) * 100, y: 100 + Math.floor(i / 6) * 100 },
          })),
          edges: [],
        };
      },
    });

    api.addExporter({
      id: "plain-text",
      label: "Plain text summary",
      filename: "graph-summary.txt",
      serialize(graphJson) {
        const lines = graphJson.nodes.map((n) => `Node: ${n.data.label}`);
        graphJson.edges.forEach((e) => {
          const from = graphJson.nodes.find((n) => n.data.id === e.data.source)?.data.label ?? e.data.source;
          const to = graphJson.nodes.find((n) => n.data.id === e.data.target)?.data.label ?? e.data.target;
          lines.push(`Edge: ${from} -> ${to}`);
        });
        return lines.join("\n");
      },
    });

    api.addAnalysisMode({
      id: "isolated",
      label: "Isolated nodes (example)",
      run(nodeId, { visibleGraph }) {
        const { nodes, outgoing, incoming } = visibleGraph();
        const isolatedIds = nodes
          .filter((n) => (outgoing.get(n.id()) || []).length === 0 && (incoming.get(n.id()) || []).length === 0)
          .map((n) => n.id());
        return new Set(isolatedIds);
      },
    });
  },
};
