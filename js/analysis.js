// The four analysis modes are all thin, differently-parameterized uses of
// the same BFS primitives from graphAlgorithms.js — dependency and impact
// just traverse the same adjacency in opposite directions, hierarchy is
// both directions unioned, and flow is a shortest path. No mode implements
// its own traversal.

import { buildAdjacency, bfsReachable, bfsShortestPath } from "./graphAlgorithms.js";

export function createAnalysis(graph) {
  const { cy } = graph;

  function visibleGraph() {
    const nodes = graph.realNodes().filter((n) => n.visible());
    const edges = cy.edges().filter((e) => e.visible());
    return { nodes, edges, ...buildAdjacency(nodes, edges) };
  }

  function edgesInducedBy(matchedIds, edges) {
    return new Set(
      edges.filter((e) => matchedIds.has(e.data("source")) && matchedIds.has(e.data("target"))).map((e) => e.id())
    );
  }

  function applyHighlight(nodes, edges, matchedNodeIds, matchedEdgeIds) {
    nodes.forEach((n) => {
      n.removeClass("analysis-match analysis-dim");
      n.addClass(matchedNodeIds.has(n.id()) ? "analysis-match" : "analysis-dim");
    });
    edges.forEach((e) => {
      e.removeClass("analysis-match analysis-dim");
      e.addClass(matchedEdgeIds.has(e.id()) ? "analysis-match" : "analysis-dim");
    });
  }

  return {
    // "What does this node depend on?" — walk backward along incoming edges.
    dependency(nodeId) {
      const { nodes, edges, incoming } = visibleGraph();
      const matched = bfsReachable([nodeId], incoming);
      applyHighlight(nodes, edges, matched, edgesInducedBy(matched, edges));
      return matched;
    },

    // "What depends on this node?" — walk forward along outgoing edges.
    impact(nodeId) {
      const { nodes, edges, outgoing } = visibleGraph();
      const matched = bfsReachable([nodeId], outgoing);
      applyHighlight(nodes, edges, matched, edgesInducedBy(matched, edges));
      return matched;
    },

    // Everything transitively related to this node, either direction.
    hierarchy(nodeId) {
      const { nodes, edges, outgoing, incoming } = visibleGraph();
      const up = bfsReachable([nodeId], incoming);
      const down = bfsReachable([nodeId], outgoing);
      const matched = new Set([...up, ...down]);
      applyHighlight(nodes, edges, matched, edgesInducedBy(matched, edges));
      return matched;
    },

    // The directed path connecting two specific nodes, if one exists.
    flow(sourceId, targetId) {
      const { nodes, edges, outgoing } = visibleGraph();
      const path = bfsShortestPath(sourceId, targetId, outgoing);
      if (!path) return null;
      const matched = new Set(path);
      const edgeIds = new Set();
      for (let i = 0; i < path.length - 1; i++) {
        const e = edges.find((e) => e.data("source") === path[i] && e.data("target") === path[i + 1]);
        if (e) edgeIds.add(e.id());
      }
      applyHighlight(nodes, edges, matched, edgeIds);
      return path;
    },

    reset() {
      cy.elements().removeClass("analysis-match analysis-dim");
    },
  };
}
