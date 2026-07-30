// Category/group visibility toggles, plus collapsed-group hiding. Hidden
// nodes are excluded from rendering (Cytoscape .hide()); edges are derived
// from current node visibility every time, so an edge disappears
// automatically the moment either endpoint is hidden — no separate
// edge-toggle bookkeeping needed.

export function createVisibility(graph, groupManager) {
  const { cy } = graph;
  const hiddenCategories = new Set();
  const hiddenGroups = new Set();

  function apply() {
    graph.realNodes().forEach((n) => {
      const gid = n.data("group");
      const hiddenByCategory = n.data("category") && hiddenCategories.has(n.data("category"));
      const hiddenByGroup = gid && hiddenGroups.has(gid);
      const hiddenByCollapse = gid && !groupManager.isExpanded(gid);
      if (hiddenByCategory || hiddenByGroup || hiddenByCollapse) n.hide();
      else n.show();
    });

    // The boundary itself only disappears if the group is explicitly
    // hidden — collapsing keeps the (now summary) boundary visible.
    cy.nodes("[_groupContainer]").forEach((c) => {
      if (hiddenGroups.has(c.data("groupId"))) c.hide();
      else c.show();
    });

    cy.edges().forEach((e) => {
      if (e.source().hidden() || e.target().hidden()) e.hide();
      else e.show();
    });
  }

  return {
    toggleCategory(category) {
      if (hiddenCategories.has(category)) hiddenCategories.delete(category);
      else hiddenCategories.add(category);
      apply();
    },
    toggleGroup(groupId) {
      if (hiddenGroups.has(groupId)) hiddenGroups.delete(groupId);
      else hiddenGroups.add(groupId);
      apply();
    },
    isCategoryHidden: (category) => hiddenCategories.has(category),
    isGroupHidden: (groupId) => hiddenGroups.has(groupId),
    apply,

    // Profile-facing (Phase 7): visibility choices are view state, not
    // graph data, so they're saved/restored via a profile, never via
    // graph.toJson().
    toJson: () => ({ hiddenCategories: [...hiddenCategories], hiddenGroups: [...hiddenGroups] }),
    loadJson(data) {
      hiddenCategories.clear();
      (data?.hiddenCategories || []).forEach((c) => hiddenCategories.add(c));
      hiddenGroups.clear();
      (data?.hiddenGroups || []).forEach((g) => hiddenGroups.add(g));
    },
  };
}
