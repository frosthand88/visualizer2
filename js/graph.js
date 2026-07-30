// Thin wrapper around the Cytoscape instance: owns element CRUD and
// element -> plain-object mapping. UI code should go through this module
// rather than touching `cy` directly, so later phases can extend the data
// model here without UI call sites changing.

let nextId = 1;

function generateId(prefix) {
  return `${prefix}${nextId++}`;
}

export function createGraph(container) {
  const cy = cytoscape({
    container,
    elements: [],
    style: [
      {
        selector: "node",
        style: {
          "background-color": "#4f8cff",
          label: "data(label)",
          color: "#1a1a1a",
          "font-size": 11,
          "text-valign": "bottom",
          "text-margin-y": 6,
          width: 36,
          height: 36,
        },
      },
      {
        selector: "node:selected",
        style: {
          "background-color": "#ff8a4f",
          "border-width": 2,
          "border-color": "#c85f24",
        },
      },
      {
        selector: "node.search-match",
        style: {
          "border-width": 3,
          "border-color": "#ffd23f",
        },
      },
      {
        selector: "node.search-dim",
        style: {
          opacity: 0.25,
        },
      },
      {
        selector: "node.edge-source-pending",
        style: {
          "border-width": 3,
          "border-color": "#4f8cff",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#999",
          "target-arrow-color": "#999",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-size": 10,
          color: "#555",
        },
      },
      {
        selector: "edge:selected",
        style: {
          "line-color": "#ff8a4f",
          "target-arrow-color": "#ff8a4f",
          width: 3,
        },
      },
    ],
  });

  return {
    cy,

    addNode(label, position) {
      const id = generateId("n");
      return cy.add({
        group: "nodes",
        data: { id, label: label || id },
        position: position || { x: 100, y: 100 },
      });
    },

    addEdge(sourceId, targetId, label) {
      const id = generateId("e");
      return cy.add({
        group: "edges",
        data: { id, source: sourceId, target: targetId, label: label || "" },
      });
    },

    removeElements(eles) {
      cy.remove(eles);
    },

    updateLabel(ele, label) {
      ele.data("label", label);
    },

    toJson() {
      const nodes = cy.nodes().map((n) => ({
        data: { id: n.data("id"), label: n.data("label") },
        position: { x: Math.round(n.position("x")), y: Math.round(n.position("y")) },
      }));
      const edges = cy.edges().map((e) => ({
        data: {
          id: e.data("id"),
          source: e.data("source"),
          target: e.data("target"),
          label: e.data("label") || "",
        },
      }));
      return { format: "visualizer2/graph", version: 1, nodes, edges };
    },

    loadJson(json) {
      cy.elements().remove();
      const nodes = (json.nodes || []).map((n) => ({ group: "nodes", ...n }));
      const edges = (json.edges || []).map((e) => ({ group: "edges", ...e }));
      cy.add([...nodes, ...edges]);

      const usedIds = [...nodes, ...edges]
        .map((el) => el.data && el.data.id)
        .filter(Boolean)
        .map((id) => parseInt(String(id).replace(/\D/g, ""), 10))
        .filter((n) => !Number.isNaN(n));
      nextId = usedIds.length ? Math.max(...usedIds) + 1 : 1;
    },
  };
}
