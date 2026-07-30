// Runs a layout — either one of Cytoscape's built-in algorithms or one of
// our custom directional/radial ones (see directionalLayouts.js) — scoped
// to the currently visible real nodes/edges only. Hidden nodes and group
// boundary containers are left untouched: hidden elements shouldn't be
// repositioned while invisible, and container position/size is derived
// automatically from its (visible) children.

import { computeTopDown, computeLeftRight, computeRadialOutward, computeRadialInward } from "./directionalLayouts.js";

const BUILTIN_OPTIONS = {
  grid: { name: "grid", animate: true, animationDuration: 300 },
  circle: { name: "circle", animate: true, animationDuration: 300 },
  concentric: { name: "concentric", animate: true, animationDuration: 300 },
  breadthfirst: { name: "breadthfirst", animate: true, animationDuration: 300 },
  cose: { name: "cose", animate: true, animationDuration: 300 },
};

const DIRECTIONAL_COMPUTE = {
  "top-down": computeTopDown,
  "left-right": computeLeftRight,
  "radial-outward": computeRadialOutward,
  "radial-inward": computeRadialInward,
};

export function runLayout(graph, name) {
  const cy = graph.cy;
  const visibleNodes = graph.realNodes().filter((n) => n.visible());
  const visibleEdges = cy.edges().filter((e) => e.visible());
  const targets = visibleNodes.union(visibleEdges);

  if (visibleNodes.length === 0) return;

  const compute = DIRECTIONAL_COMPUTE[name];
  if (compute) {
    const positions = compute(visibleNodes, visibleEdges);
    targets
      .layout({
        name: "preset",
        positions: (n) => positions[n.id()],
        animate: true,
        animationDuration: 500,
        fit: false,
      })
      .run();
    return;
  }

  const options = BUILTIN_OPTIONS[name] || BUILTIN_OPTIONS.grid;
  targets.layout(options).run();
}
