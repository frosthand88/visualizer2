// Shared graph-traversal primitives used by both the layout engine
// (directionalLayouts.js) and the analysis engine (analysis.js), so the
// adjacency-building and BFS logic exists in exactly one place.

export function buildAdjacency(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id()));
  const outgoing = new Map();
  const incoming = new Map();
  ids.forEach((id) => {
    outgoing.set(id, []);
    incoming.set(id, []);
  });
  edges.forEach((e) => {
    const s = e.data("source");
    const t = e.data("target");
    if (!ids.has(s) || !ids.has(t)) return;
    outgoing.get(s).push(t);
    incoming.get(t).push(s);
  });
  return { outgoing, incoming, ids };
}

// First-visit-wins multi-source BFS over a single adjacency map. Used both
// for plain reachability (collect all visited ids) and, by the caller
// tracking `prev`, for shortest-path reconstruction.
export function bfsReachable(startIds, adjacency) {
  const visited = new Set(startIds);
  const queue = [...startIds];
  let qi = 0;
  while (qi < queue.length) {
    const id = queue[qi++];
    (adjacency.get(id) || []).forEach((next) => {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    });
  }
  return visited;
}

export function bfsShortestPath(startId, targetId, adjacency) {
  if (startId === targetId) return [startId];
  const prev = new Map();
  const visited = new Set([startId]);
  const queue = [startId];
  let qi = 0;
  while (qi < queue.length) {
    const id = queue[qi++];
    for (const next of adjacency.get(id) || []) {
      if (visited.has(next)) continue;
      visited.add(next);
      prev.set(next, id);
      if (next === targetId) {
        const path = [next];
        let cur = next;
        while (cur !== startId) {
          cur = prev.get(cur);
          path.unshift(cur);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}
