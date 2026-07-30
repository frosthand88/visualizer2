import { saveJson, loadJsonFile } from "./persistence.js";
import { applySearch, clearSearch } from "./search.js";
import { runLayout } from "./layouts.js";
import { createHistory } from "./history.js";
import { showContextMenu } from "./contextMenu.js";

export function initUi(graph) {
  const { cy } = graph;
  const history = createHistory(graph);

  const btnAddNode = document.getElementById("btn-add-node");
  const btnAddEdge = document.getElementById("btn-add-edge");
  const btnDelete = document.getElementById("btn-delete");
  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");
  const btnSave = document.getElementById("btn-save");
  const btnLoad = document.getElementById("btn-load");
  const fileInput = document.getElementById("file-input");
  const layoutSelect = document.getElementById("layout-select");
  const modeIndicator = document.getElementById("mode-indicator");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const elementList = document.getElementById("element-list");
  const propertiesEmpty = document.getElementById("properties-empty");
  const propertiesMulti = document.getElementById("properties-multi");
  const propertiesForm = document.getElementById("properties-form");
  const propLabel = document.getElementById("prop-label");
  const propId = document.getElementById("prop-id");
  const nodeFields = document.getElementById("node-fields");
  const edgeFields = document.getElementById("edge-fields");

  const propCategory = document.getElementById("prop-category");
  const propGroup = document.getElementById("prop-group");
  const propShape = document.getElementById("prop-shape");
  const propColor = document.getElementById("prop-color");
  const propWidth = document.getElementById("prop-width");
  const propHeight = document.getElementById("prop-height");
  const propIcon = document.getElementById("prop-icon");
  const propDocUrl = document.getElementById("prop-docurl");

  const propArrowStyle = document.getElementById("prop-arrow-style");
  const propThickness = document.getElementById("prop-thickness");
  const propEdgeColor = document.getElementById("prop-edge-color");
  const propLineStyle = document.getElementById("prop-line-style");

  const allPropFields = [
    propLabel, propCategory, propGroup, propShape, propColor, propWidth, propHeight, propIcon, propDocUrl,
    propArrowStyle, propThickness, propEdgeColor, propLineStyle,
  ];

  let edgeModeSource = null;

  function setEdgeMode(active) {
    btnAddEdge.classList.toggle("active", active);
    if (active) {
      modeIndicator.textContent = "Click a source node, then a target node";
      modeIndicator.classList.remove("hidden");
    } else {
      modeIndicator.classList.add("hidden");
    }
    edgeModeSource = null;
    cy.nodes().removeClass("edge-source-pending");
  }

  function refreshHistoryButtons() {
    btnUndo.disabled = !history.canUndo();
    btnRedo.disabled = !history.canRedo();
  }

  function isTypingInField() {
    const tag = document.activeElement && document.activeElement.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
  }

  // --- Toolbar ---------------------------------------------------------

  btnAddNode.addEventListener("click", () => {
    history.record();
    const extent = cy.extent();
    const position = {
      x: (extent.x1 + extent.x2) / 2 + (Math.random() - 0.5) * 60,
      y: (extent.y1 + extent.y2) / 2 + (Math.random() - 0.5) * 60,
    };
    const node = graph.addNode({ label: "New node" }, position);
    cy.elements().unselect();
    node.select();
    refreshElementList();
    refreshHistoryButtons();
  });

  btnAddEdge.addEventListener("click", () => {
    setEdgeMode(!btnAddEdge.classList.contains("active"));
  });

  btnDelete.addEventListener("click", () => deleteSelection());

  btnUndo.addEventListener("click", () => {
    if (history.undo()) afterHistoryChange();
  });

  btnRedo.addEventListener("click", () => {
    if (history.redo()) afterHistoryChange();
  });

  function afterHistoryChange() {
    refreshElementList();
    updatePropertiesFromSelection();
    refreshHistoryButtons();
  }

  function deleteSelection() {
    const selected = cy.$(":selected");
    if (selected.length === 0) return;
    history.record();
    graph.removeElements(selected);
    refreshElementList();
    refreshHistoryButtons();
  }

  btnSave.addEventListener("click", () => saveJson(graph));

  btnLoad.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const json = await loadJsonFile(file);
      history.record();
      graph.loadJson(json);
      refreshElementList();
      refreshHistoryButtons();
      clearSearch(cy);
      searchInput.value = "";
      searchResults.innerHTML = "";
    } catch (err) {
      alert(err.message);
    }
  });

  layoutSelect.addEventListener("change", () => {
    runLayout(cy, layoutSelect.value);
  });

  // --- Keyboard shortcuts ------------------------------------------------

  document.addEventListener("keydown", (e) => {
    const typing = isTypingInField();
    const mod = e.ctrlKey || e.metaKey;

    if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
      deleteSelection();
      return;
    }
    if (e.key === "Escape") {
      setEdgeMode(false);
      return;
    }
    if (mod && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();
      if (e.shiftKey) {
        if (history.redo()) afterHistoryChange();
      } else if (history.undo()) {
        afterHistoryChange();
      }
      return;
    }
    if (mod && e.key.toLowerCase() === "y" && !typing) {
      e.preventDefault();
      if (history.redo()) afterHistoryChange();
      return;
    }
    if (mod && e.key.toLowerCase() === "a" && !typing) {
      e.preventDefault();
      cy.elements().select();
      return;
    }
    if (mod && e.key.toLowerCase() === "d" && !typing) {
      e.preventDefault();
      duplicateSelectedNodes();
    }
  });

  function duplicateSelectedNodes() {
    const nodes = cy.nodes(":selected");
    if (nodes.length === 0) return;
    history.record();
    cy.elements().unselect();
    nodes.forEach((n) => graph.duplicateNode(n).select());
    refreshElementList();
    refreshHistoryButtons();
  }

  // --- Canvas interaction ------------------------------------------------

  cy.on("tap", "node", (evt) => {
    const node = evt.target;

    if (btnAddEdge.classList.contains("active")) {
      if (!edgeModeSource) {
        edgeModeSource = node;
        node.addClass("edge-source-pending");
        modeIndicator.textContent = `Source: ${node.data("label")} — now click a target node`;
      } else if (edgeModeSource.id() !== node.id()) {
        history.record();
        const edge = graph.addEdge(edgeModeSource.id(), node.id(), {});
        refreshElementList();
        refreshHistoryButtons();
        setEdgeMode(false);
        cy.elements().unselect();
        edge.select();
      }
    }
  });

  cy.on("grab", "node", () => history.record());
  cy.on("dragfree", "node", () => refreshHistoryButtons());

  cy.on("select unselect", () => {
    updatePropertiesFromSelection();
    syncElementListSelection();
  });

  // --- Context menus ----------------------------------------------------

  cy.on("cxttap", "node", (evt) => {
    const node = evt.target;
    showContextMenu(evt.originalEvent.clientX, evt.originalEvent.clientY, [
      {
        label: "Rename",
        action: () => {
          cy.elements().unselect();
          node.select();
          propLabel.focus();
        },
      },
      { label: "Duplicate (Ctrl+D)", action: () => { cy.elements().unselect(); node.select(); duplicateSelectedNodes(); } },
      {
        label: "Delete",
        action: () => {
          cy.elements().unselect();
          node.select();
          deleteSelection();
        },
      },
    ]);
  });

  cy.on("cxttap", "edge", (evt) => {
    const edge = evt.target;
    showContextMenu(evt.originalEvent.clientX, evt.originalEvent.clientY, [
      {
        label: "Delete",
        action: () => {
          cy.elements().unselect();
          edge.select();
          deleteSelection();
        },
      },
    ]);
  });

  cy.on("cxttap", (evt) => {
    if (evt.target !== cy) return;
    const position = evt.position;
    showContextMenu(evt.originalEvent.clientX, evt.originalEvent.clientY, [
      {
        label: "Add node here",
        action: () => {
          history.record();
          const node = graph.addNode({ label: "New node" }, position);
          cy.elements().unselect();
          node.select();
          refreshElementList();
          refreshHistoryButtons();
        },
      },
    ]);
  });

  // --- Properties panel ----------------------------------------------

  function updatePropertiesFromSelection() {
    const selected = cy.$(":selected");
    if (selected.length === 0) {
      propertiesEmpty.classList.remove("hidden");
      propertiesMulti.classList.add("hidden");
      propertiesForm.classList.add("hidden");
    } else if (selected.length === 1) {
      propertiesEmpty.classList.add("hidden");
      propertiesMulti.classList.add("hidden");
      propertiesForm.classList.remove("hidden");
      showProperties(selected[0]);
    } else {
      propertiesEmpty.classList.add("hidden");
      propertiesForm.classList.add("hidden");
      propertiesMulti.classList.remove("hidden");
      propertiesMulti.textContent = `${selected.length} elements selected`;
    }
  }

  function showProperties(ele) {
    propLabel.value = ele.data("label") || "";
    propId.textContent = `id: ${ele.data("id")}`;

    if (ele.isNode()) {
      nodeFields.classList.remove("hidden");
      edgeFields.classList.add("hidden");
      propCategory.value = ele.data("category") || "";
      propGroup.value = ele.data("group") || "";
      propShape.value = ele.data("shape") || "ellipse";
      propColor.value = ele.data("color") || "#4f8cff";
      propWidth.value = ele.data("width") || 36;
      propHeight.value = ele.data("height") || 36;
      propIcon.value = ele.data("icon") || "";
      propDocUrl.value = ele.data("docUrl") || "";
    } else {
      nodeFields.classList.add("hidden");
      edgeFields.classList.remove("hidden");
      propArrowStyle.value = ele.data("arrowStyle") || "triangle";
      propThickness.value = ele.data("thickness") || 2;
      propEdgeColor.value = ele.data("color") || "#999999";
      propLineStyle.value = ele.data("lineStyle") || "solid";
    }
  }

  function activeElement() {
    const selected = cy.$(":selected");
    return selected.length === 1 ? selected[0] : null;
  }

  function bindField(el, key, transform = (v) => v) {
    let recorded = false;
    el.addEventListener("focus", () => {
      recorded = false;
    });
    el.addEventListener("input", () => {
      const ele = activeElement();
      if (!ele) return;
      if (!recorded) {
        history.record();
        recorded = true;
        refreshHistoryButtons();
      }
      graph.updateData(ele, key, transform(el.value));
      if (key === "label") refreshElementList();
    });
  }

  bindField(propLabel, "label");
  bindField(propCategory, "category");
  bindField(propGroup, "group");
  bindField(propShape, "shape");
  bindField(propColor, "color");
  bindField(propWidth, "width", Number);
  bindField(propHeight, "height", Number);
  bindField(propIcon, "icon");
  bindField(propDocUrl, "docUrl");

  bindField(propArrowStyle, "arrowStyle");
  bindField(propThickness, "thickness", Number);
  bindField(propEdgeColor, "color");
  bindField(propLineStyle, "lineStyle");

  // --- Left panel: element list + search ------------------------------

  function refreshElementList() {
    elementList.innerHTML = "";
    cy.elements().forEach((ele) => {
      const li = document.createElement("li");
      const kind = ele.isNode() ? "Node" : "Edge";
      li.textContent = `${kind}: ${ele.data("label") || "(no label)"}`;
      li.dataset.eleId = ele.id();
      li.classList.toggle("selected", ele.selected());
      li.addEventListener("click", (evt) => {
        if (!evt.shiftKey && !evt.metaKey && !evt.ctrlKey) cy.elements().unselect();
        ele.select();
      });
      elementList.appendChild(li);
    });
  }

  function syncElementListSelection() {
    elementList.querySelectorAll("li").forEach((li) => {
      const ele = cy.getElementById(li.dataset.eleId);
      li.classList.toggle("selected", ele.length > 0 && ele.selected());
    });
  }

  searchInput.addEventListener("input", () => {
    const matches = applySearch(cy, searchInput.value);
    if (!searchInput.value.trim()) {
      searchResults.innerHTML = "";
      return;
    }
    searchResults.innerHTML = matches.length
      ? `${matches.length} match${matches.length === 1 ? "" : "es"}`
      : "No matches";
  });

  refreshElementList();
  refreshHistoryButtons();
}
