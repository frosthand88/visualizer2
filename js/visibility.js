// Category/group visibility toggles. Hidden nodes are excluded from
// rendering (Cytoscape .hide()); edges are derived from current node
// visibility every time, so an edge disappears automatically the moment
// either endpoint is hidden — no separate edge-toggle bookkeeping needed.

export function createVisibility(graph) {
  const { cy } = graph;
  const hiddenCategories = new Set();
  const hiddenGroups = new Set();

  function apply() {
    graph.realNodes().forEach((n) => {
      const hiddenByCategory = n.data("category") && hiddenCategories.has(n.data("category"));
      const hiddenByGroup = n.data("group") && hiddenGroups.has(n.data("group"));
      if (hiddenByCategory || hiddenByGroup) n.hide();
      else n.show();
    });

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
  };
}
