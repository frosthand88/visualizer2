// Rendering presets. A preset is purely a styling/defaults convention on
// top of the existing, preset-agnostic graph model (category/shape/icon/
// color already exist as of Phase 2) — it never adds fields, never
// rewrites existing elements, and switching presets is a no-op on stored
// data. All a preset does is: (1) supply shape/color defaults for a
// named category, offered as a one-click "quick category" palette in the
// properties panel, and (2) supply the default style new edges get.

export const PRESETS = [
  {
    id: "container",
    label: "Container",
    categories: [
      { name: "Person", shape: "round-rectangle", color: "#6b46c1" },
      { name: "System", shape: "round-rectangle", color: "#1168bd" },
      { name: "Container", shape: "rectangle", color: "#438dd5" },
      { name: "Database", shape: "hexagon", color: "#2b6cb0" },
    ],
    edgeStyle: { arrowStyle: "triangle", lineStyle: "solid", thickness: 2, color: "#666666" },
  },
  {
    id: "class",
    label: "Class",
    categories: [
      { name: "Class", shape: "rectangle", color: "#2c7a4b" },
      { name: "Interface", shape: "round-rectangle", color: "#38a169" },
      { name: "Abstract Class", shape: "rectangle", color: "#68a37a" },
    ],
    edgeStyle: { arrowStyle: "triangle", lineStyle: "solid", thickness: 2, color: "#4a5568" },
  },
  {
    id: "er",
    label: "ER",
    categories: [
      { name: "Entity", shape: "rectangle", color: "#b45309" },
      { name: "Attribute", shape: "ellipse", color: "#d69e4a" },
      { name: "Relationship", shape: "diamond", color: "#92400e" },
    ],
    edgeStyle: { arrowStyle: "none", lineStyle: "solid", thickness: 1.5, color: "#8a5a2b" },
  },
  {
    id: "sitemap",
    label: "Site Map",
    categories: [
      { name: "Page", shape: "round-rectangle", color: "#4a5568" },
      { name: "Section", shape: "rectangle", color: "#718096" },
      { name: "External Link", shape: "hexagon", color: "#a0aec0" },
    ],
    edgeStyle: { arrowStyle: "vee", lineStyle: "solid", thickness: 1.5, color: "#718096" },
  },
  {
    id: "usecase",
    label: "Use Case",
    categories: [
      { name: "Actor", shape: "rectangle", color: "#b83280" },
      { name: "Use Case", shape: "ellipse", color: "#d53f8c" },
      { name: "System Boundary", shape: "round-rectangle", color: "#f687b3" },
    ],
    edgeStyle: { arrowStyle: "vee", lineStyle: "dashed", thickness: 1.5, color: "#b83280" },
  },
];

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}
