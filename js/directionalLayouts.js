// Top-down / left-right / radial layouts. Cytoscape core ships no
// directional or radial algorithm, so positions are computed here (a
// standard multi-source BFS leveling) and applied via the 'preset' layout.
//
// "Maintain the user's mental map" is approximated rather than solved:
// siblings within a level are ordered by their *current* position (x, y,
// or angle from the centroid) instead of arbitrary traversal order, so a
// relayout tends to preserve left-to-right / rotational ordering instead
// of scrambling it. The whole result is also re-centered on the current
// centroid so the graph doesn't jump across the canvas.

import { buildAdjacency } from "./graphAlgorithms.js";

const LEVEL_GAP = 110;
const SIBLING_GAP = 90;
const RING_GAP = 110;

// First-visit-wins multi-source BFS: gives shortest distance from the
// nearest root and terminates cleanly even with cycles, since each node
// is only ever visited once.
function computeLevels(nodes, edges, { reverse = false } = {}) {
  const { outgoing, incoming, ids } = buildAdjacency(nodes, edges);
  const forward = reverse ? incoming : outgoing;
  const backward = reverse ? outgoing : incoming;

  const roots = [...ids].filter((id) => backward.get(id).length === 0);
  const rootSet = roots.length ? roots : [...ids]; // everything's in a cycle: treat all as roots

  const level = new Map();
  const queue = [];
  rootSet.forEach((id) => {
    level.set(id, 0);
    queue.push(id);
  });

  let qi = 0;
  while (qi < queue.length) {
    const id = queue[qi++];
    const lvl = level.get(id);
    forward.get(id).forEach((next) => {
      if (!level.has(next)) {
        level.set(next, lvl + 1);
        queue.push(next);
      }
    });
  }

  ids.forEach((id) => {
    if (!level.has(id)) level.set(id, 0);
  });
  return level;
}

function groupByLevel(nodes, level) {
  const byLevel = new Map();
  nodes.forEach((n) => {
    const lvl = level.get(n.id());
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl).push(n);
  });
  return byLevel;
}

function centroidOf(nodes) {
  if (nodes.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  nodes.forEach((n) => {
    sx += n.position("x");
    sy += n.position("y");
  });
  return { x: sx / nodes.length, y: sy / nodes.length };
}

function centeredOffsets(count, gap) {
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * gap);
}

export function computeTopDown(nodes, edges) {
  const level = computeLevels(nodes, edges);
  const byLevel = groupByLevel(nodes, level);
  const centroid = centroidOf(nodes);
  const maxLevel = Math.max(0, ...byLevel.keys());
  const positions = {};

  byLevel.forEach((members, lvl) => {
    members.sort((a, b) => a.position("x") - b.position("x"));
    const offsets = centeredOffsets(members.length, SIBLING_GAP);
    members.forEach((n, i) => {
      positions[n.id()] = {
        x: centroid.x + offsets[i],
        y: centroid.y - (maxLevel * LEVEL_GAP) / 2 + lvl * LEVEL_GAP,
      };
    });
  });
  return positions;
}

export function computeLeftRight(nodes, edges) {
  const level = computeLevels(nodes, edges);
  const byLevel = groupByLevel(nodes, level);
  const centroid = centroidOf(nodes);
  const maxLevel = Math.max(0, ...byLevel.keys());
  const positions = {};

  byLevel.forEach((members, lvl) => {
    members.sort((a, b) => a.position("y") - b.position("y"));
    const offsets = centeredOffsets(members.length, SIBLING_GAP);
    members.forEach((n, i) => {
      positions[n.id()] = {
        x: centroid.x - (maxLevel * LEVEL_GAP) / 2 + lvl * LEVEL_GAP,
        y: centroid.y + offsets[i],
      };
    });
  });
  return positions;
}

function computeRadial(nodes, edges, { reverse }) {
  const level = computeLevels(nodes, edges, { reverse });
  const byLevel = groupByLevel(nodes, level);
  const centroid = centroidOf(nodes);
  const positions = {};

  byLevel.forEach((members, lvl) => {
    if (lvl === 0) {
      // Roots (or sinks, for the inward variant) sit at the center; spread
      // them on a small inner circle if there's more than one so they
      // don't fully overlap.
      const radius = members.length > 1 ? RING_GAP / 3 : 0;
      members
        .sort((a, b) => angleFrom(centroid, a) - angleFrom(centroid, b))
        .forEach((n, i) => {
          const angle = (2 * Math.PI * i) / members.length;
          positions[n.id()] = {
            x: centroid.x + radius * Math.cos(angle),
            y: centroid.y + radius * Math.sin(angle),
          };
        });
      return;
    }

    const radius = lvl * RING_GAP;
    members
      .sort((a, b) => angleFrom(centroid, a) - angleFrom(centroid, b))
      .forEach((n, i) => {
        const angle = (2 * Math.PI * i) / members.length;
        positions[n.id()] = {
          x: centroid.x + radius * Math.cos(angle),
          y: centroid.y + radius * Math.sin(angle),
        };
      });
  });
  return positions;
}

function angleFrom(centroid, node) {
  return Math.atan2(node.position("y") - centroid.y, node.position("x") - centroid.x);
}

export function computeRadialOutward(nodes, edges) {
  return computeRadial(nodes, edges, { reverse: false });
}

export function computeRadialInward(nodes, edges) {
  return computeRadial(nodes, edges, { reverse: true });
}
