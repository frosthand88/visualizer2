// A GraphProfile captures how *one user* is currently looking at a graph —
// node positions, which groups are expanded/hidden, camera framing, the
// last-picked layout, and the active filter — kept in a file completely
// separate from GraphData (graph.toJson()/groups.toJson()). The same
// graph.json can be paired with different profile.json files so different
// users get different views of identical underlying data.

export function createProfileManager({ graph, visibility, groupManager, getLayoutName, setLayoutName, getFilterText, setFilterText }) {
  const { cy } = graph;

  function toJson() {
    const positions = {};
    graph.realNodes().forEach((n) => {
      positions[n.id()] = { x: Math.round(n.position("x")), y: Math.round(n.position("y")) };
    });

    const expandedState = {};
    groupManager.list().forEach((g) => {
      expandedState[g.id] = groupManager.isExpanded(g.id);
    });

    return {
      format: "visualizer2/profile",
      version: 1,
      positions,
      expandedState,
      visibility: visibility.toJson(),
      camera: { zoom: cy.zoom(), pan: cy.pan() },
      layout: getLayoutName(),
      filters: { search: getFilterText() },
    };
  }

  // Positions are restored directly (authoritative), so the saved
  // "layout" name is applied to the dropdown only, not re-run — re-running
  // the algorithm would immediately recompute and overwrite the exact
  // positions this profile is trying to restore.
  function apply(profile) {
    if (!profile) return;

    if (profile.expandedState) {
      Object.entries(profile.expandedState).forEach(([gid, expanded]) => {
        groupManager.setExpanded(gid, expanded);
      });
    }

    if (profile.visibility) visibility.loadJson(profile.visibility);
    groupManager.sync();
    visibility.apply();

    if (profile.positions) {
      Object.entries(profile.positions).forEach(([id, pos]) => {
        const n = cy.getElementById(id);
        if (n.length && !n.data("_groupContainer")) n.position(pos);
      });
      groupManager.sync(); // re-derive boundary boxes from restored positions
    }

    if (profile.camera) {
      cy.viewport({
        zoom: typeof profile.camera.zoom === "number" ? profile.camera.zoom : cy.zoom(),
        pan: profile.camera.pan || cy.pan(),
      });
    }

    if (profile.layout) setLayoutName(profile.layout);
    if (profile.filters && typeof profile.filters.search === "string") setFilterText(profile.filters.search);
  }

  return { toJson, apply };
}
