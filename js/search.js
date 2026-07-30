// Label search: highlights matches and dims everything else. Reset by
// clearing the search box.

export function applySearch(cy, term) {
  const query = term.trim().toLowerCase();
  const realNodes = cy.nodes().filter((n) => !n.data("_groupContainer"));

  cy.nodes().removeClass("search-match search-dim");

  if (!query) {
    return [];
  }

  const matches = realNodes.filter((n) => n.data("label").toLowerCase().includes(query));
  realNodes.addClass("search-dim");
  matches.removeClass("search-dim").addClass("search-match");

  return matches.map((n) => ({ id: n.data("id"), label: n.data("label") }));
}

export function clearSearch(cy) {
  cy.nodes().removeClass("search-match search-dim");
}
