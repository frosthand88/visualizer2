// The graph data model: the property set every node/edge carries, and the
// defaulting logic that keeps older saved JSON (e.g. Phase 1 files with
// only {id, label}) loading correctly as the model grows. UI and
// persistence code should build elements through these helpers rather than
// hand-assembling data objects.

export const NODE_DEFAULTS = {
  label: "",
  category: "",
  group: "",
  shape: "ellipse",
  icon: "",
  color: "#4f8cff",
  width: 36,
  height: 36,
  docUrl: "",
};

export const EDGE_DEFAULTS = {
  label: "",
  arrowStyle: "triangle",
  thickness: 2,
  color: "#999999",
  lineStyle: "solid",
  waypoints: [],
};

export function normalizeNodeData(data) {
  return { ...NODE_DEFAULTS, ...data, id: data.id };
}

export function normalizeEdgeData(data) {
  return {
    ...EDGE_DEFAULTS,
    ...data,
    id: data.id,
    source: data.source,
    target: data.target,
    waypoints: data.waypoints || [],
  };
}

// Cytoscape's "segments" curve style positions waypoints as a distance/weight
// pair relative to the straight source-target line, so they track correctly
// as nodes move without recomputation. This converts our human-readable
// absolute {x,y} waypoints into that relative form once, at load/creation
// time.
export function computeSegments(sourcePos, targetPos, waypoints) {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const lenSq = dx * dx + dy * dy || 1;
  const len = Math.sqrt(lenSq);

  const weights = [];
  const distances = [];
  for (const wp of waypoints) {
    const wx = wp.x - sourcePos.x;
    const wy = wp.y - sourcePos.y;
    weights.push((wx * dx + wy * dy) / lenSq);
    distances.push((wx * dy - wy * dx) / len);
  }
  return { weights, distances };
}
