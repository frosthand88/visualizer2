// Groups are first-class entities (id, label, color) that nodes reference
// by id via their `group` field. Rendering the boundary is delegated
// entirely to Cytoscape's compound-node support: each group with members
// gets a synthetic parent node, and member nodes are re-parented to it.
// Cytoscape then auto-sizes/repositions the boundary as children move,
// are added, or are removed — no manual geometry needed.

function containerId(groupId) {
  return `__group__${groupId}`;
}

export function createGroupManager(graph) {
  const { cy } = graph;
  let groups = [];
  let nextNum = 1;

  function sync() {
    const memberIds = new Map();
    graph.realNodes().forEach((n) => {
      const gid = n.data("group");
      if (gid && groups.some((g) => g.id === gid)) {
        if (!memberIds.has(gid)) memberIds.set(gid, []);
        memberIds.get(gid).push(n.id());
      }
    });

    // Drop containers for groups that no longer exist.
    cy.nodes("[_groupContainer]").forEach((c) => {
      if (!groups.some((g) => g.id === c.data("groupId"))) cy.remove(c);
    });

    groups.forEach((g) => {
      const members = memberIds.get(g.id) || [];
      const cid = containerId(g.id);
      let container = cy.getElementById(cid);

      if (members.length === 0) {
        if (container.length) cy.remove(container);
        return;
      }

      if (container.length === 0) {
        container = cy.add({
          group: "nodes",
          data: { id: cid, label: g.label, color: g.color, groupId: g.id, _groupContainer: true },
          selectable: false,
          grabbable: false,
        });
      } else {
        container.data("label", g.label);
        container.data("color", g.color);
      }

      members.forEach((nid) => {
        const n = cy.getElementById(nid);
        if (n.data("parent") !== cid) n.move({ parent: cid });
      });
    });

    // Un-parent nodes whose group was cleared or deleted.
    graph.realNodes().forEach((n) => {
      const gid = n.data("group");
      const valid = gid && groups.some((g) => g.id === gid);
      if (!valid && n.data("parent")) n.move({ parent: null });
    });
  }

  return {
    list: () => groups,

    add(label) {
      const id = `g${nextNum++}`;
      groups.push({ id, label: label || id, color: "#8a8f98" });
      sync();
      return id;
    },

    rename(id, label) {
      const g = groups.find((g) => g.id === id);
      if (g) {
        g.label = label;
        sync();
      }
    },

    setColor(id, color) {
      const g = groups.find((g) => g.id === id);
      if (g) {
        g.color = color;
        sync();
      }
    },

    remove(id) {
      groups = groups.filter((g) => g.id !== id);
      graph.realNodes().forEach((n) => {
        if (n.data("group") === id) n.data("group", "");
      });
      sync();
    },

    sync,

    toJson: () => groups.map((g) => ({ ...g })),

    loadJson(data) {
      groups = (data || []).map((g) => ({ id: g.id, label: g.label || g.id, color: g.color || "#8a8f98" }));
      const nums = groups.map((g) => parseInt(String(g.id).replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
      nextNum = nums.length ? Math.max(...nums) + 1 : 1;
      sync();
    },
  };
}
