// Runs one of Cytoscape's built-in automatic layouts. Custom directional
// layouts (top-down, left-right, radial) are a later phase.

const OPTIONS = {
  grid: { name: "grid", animate: true, animationDuration: 300 },
  circle: { name: "circle", animate: true, animationDuration: 300 },
  concentric: { name: "concentric", animate: true, animationDuration: 300 },
  breadthfirst: { name: "breadthfirst", animate: true, animationDuration: 300 },
  cose: { name: "cose", animate: true, animationDuration: 300 },
};

export function runLayout(cy, name) {
  const options = OPTIONS[name] || OPTIONS.grid;
  cy.layout(options).run();
}
