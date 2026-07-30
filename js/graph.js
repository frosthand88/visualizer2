// Thin wrapper around the Cytoscape instance: owns element CRUD and
// element -> plain-object mapping. UI code should go through this module
// rather than touching `cy` directly, so later phases can extend the data
// model here without UI call sites changing.

import { NODE_DEFAULTS, EDGE_DEFAULTS, normalizeNodeData, normalizeEdgeData, computeSegments } from "./model.js";

let nextId = 1;

function generateId(prefix) {
  return `${prefix}${nextId++}`;
}

function applySegments(edge) {
  const waypoints = edge.data("waypoints");
  if (!waypoints || waypoints.length === 0) {
    edge.data("_segWeights", null);
    edge.data("_segDistances", null);
    return;
  }
  const { weights, distances } = computeSegments(
    edge.source().position(),
    edge.target().position(),
    waypoints
  );
  edge.data("_segWeights", weights.join(" "));
  edge.data("_segDistances", distances.join(" "));
}

export function createGraph(container) {
  const cy = cytoscape({
    container,
    elements: [],
    selectionType: "additive",
    boxSelectionEnabled: true,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          "background-image": (ele) => ele.data("icon") || "none",
          "background-fit": "contain",
          shape: "data(shape)",
          width: "data(width)",
          height: "data(height)",
          label: "data(label)",
          color: "#1a1a1a",
          "font-size": 11,
          "text-valign": "bottom",
          "text-margin-y": 6,
        },
      },
      {
        selector: "node:selected",
        style: {
          "border-width": 3,
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
        // Group boundary: a compound parent node. Cytoscape auto-sizes and
        // repositions it around its children, so boundaries update
        // automatically as members move, are added, or are removed.
        selector: "node[_groupContainer]",
        style: {
          shape: "round-rectangle",
          width: "auto",
          height: "auto",
          padding: "24px",
          "background-color": "data(color)",
          "background-image": "none",
          "background-opacity": 0.12,
          "border-width": 2,
          "border-color": "data(color)",
          "border-opacity": 0.6,
          label: "data(label)",
          "text-valign": "top",
          "text-halign": "center",
          "text-margin-y": 4,
          "font-size": 11,
          "font-weight": "bold",
          color: "#555",
        },
      },
      {
        selector: "edge",
        style: {
          width: "data(thickness)",
          "line-color": "data(color)",
          "target-arrow-color": "data(color)",
          "target-arrow-shape": "data(arrowStyle)",
          "line-style": "data(lineStyle)",
          "curve-style": (ele) => (ele.data("waypoints") && ele.data("waypoints").length ? "segments" : "bezier"),
          "segment-weights": (ele) => ele.data("_segWeights") || "0.5",
          "segment-distances": (ele) => ele.data("_segDistances") || "0",
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
        },
      },
    ],
  });

  const graph = {
    cy,

    // Excludes synthetic group-boundary compound nodes — those are derived
    // rendering state, not real graph data.
    realNodes() {
      return cy.nodes().filter((n) => !n.data("_groupContainer"));
    },

    addNode(props, position) {
      const id = generateId("n");
      const data = normalizeNodeData({ ...props, id });
      const node = cy.add({
        group: "nodes",
        data,
        position: position || { x: 100, y: 100 },
      });
      return node;
    },

    addEdge(sourceId, targetId, props) {
      const id = generateId("e");
      const data = normalizeEdgeData({ ...props, id, source: sourceId, target: targetId });
      const edge = cy.add({ group: "edges", data });
      applySegments(edge);
      return edge;
    },

    removeElements(eles) {
      cy.remove(eles);
    },

    duplicateNode(node) {
      const id = generateId("n");
      const { id: _oldId, ...rest } = node.data();
      const position = { x: node.position("x") + 24, y: node.position("y") + 24 };
      return cy.add({ group: "nodes", data: { ...rest, id }, position });
    },

    updateData(ele, key, value) {
      ele.data(key, value);
      if (ele.isEdge() && key === "waypoints") {
        applySegments(ele);
      }
    },

    toJson() {
      const nodes = graph.realNodes().map((n) => {
        const { id, parent, ...rest } = n.data();
        return {
          data: { id, ...rest },
          position: { x: Math.round(n.position("x")), y: Math.round(n.position("y")) },
        };
      });
      const edges = cy.edges().map((e) => {
        const { id, source, target, _segWeights, _segDistances, ...rest } = e.data();
        return { data: { id, source, target, ...rest } };
      });
      return { format: "visualizer2/graph", version: 2, nodes, edges };
    },

    loadJson(json) {
      cy.elements().remove();
      const nodes = (json.nodes || []).map((n) => ({
        group: "nodes",
        data: normalizeNodeData(n.data || {}),
        position: n.position || { x: 100, y: 100 },
      }));
      const edges = (json.edges || []).map((e) => ({
        group: "edges",
        data: normalizeEdgeData(e.data || {}),
      }));
      cy.add([...nodes, ...edges]);
      cy.edges().forEach(applySegments);

      const usedIds = [...nodes, ...edges]
        .map((el) => el.data && el.data.id)
        .filter(Boolean)
        .map((id) => parseInt(String(id).replace(/\D/g, ""), 10))
        .filter((n) => !Number.isNaN(n));
      nextId = usedIds.length ? Math.max(...usedIds) + 1 : 1;
    },
  };

  return graph;
}

export { NODE_DEFAULTS, EDGE_DEFAULTS };
