import { saveJson, loadJsonFile } from "./persistence.js";
import { applySearch, clearSearch } from "./search.js";
import { runLayout } from "./layouts.js";

export function initUi(graph) {
  const { cy } = graph;

  const btnAddNode = document.getElementById("btn-add-node");
  const btnAddEdge = document.getElementById("btn-add-edge");
  const btnDelete = document.getElementById("btn-delete");
  const btnSave = document.getElementById("btn-save");
  const btnLoad = document.getElementById("btn-load");
  const fileInput = document.getElementById("file-input");
  const layoutSelect = document.getElementById("layout-select");
  const modeIndicator = document.getElementById("mode-indicator");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const elementList = document.getElementById("element-list");
  const propertiesEmpty = document.getElementById("properties-empty");
  const propertiesForm = document.getElementById("properties-form");
  const propLabel = document.getElementById("prop-label");
  const propId = document.getElementById("prop-id");

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

  // --- Toolbar ---------------------------------------------------------

  btnAddNode.addEventListener("click", () => {
    const extent = cy.extent();
    const position = {
      x: (extent.x1 + extent.x2) / 2 + (Math.random() - 0.5) * 60,
      y: (extent.y1 + extent.y2) / 2 + (Math.random() - 0.5) * 60,
    };
    const node = graph.addNode("New node", position);
    node.select();
    refreshElementList();
    showProperties(node);
  });

  btnAddEdge.addEventListener("click", () => {
    setEdgeMode(!btnAddEdge.classList.contains("active"));
  });

  btnDelete.addEventListener("click", () => {
    const selected = cy.$(":selected");
    if (selected.length === 0) return;
    graph.removeElements(selected);
    refreshElementList();
    hideProperties();
  });

  btnSave.addEventListener("click", () => saveJson(graph));

  btnLoad.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const json = await loadJsonFile(file);
      graph.loadJson(json);
      refreshElementList();
      hideProperties();
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

  document.addEventListener("keydown", (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement === document.body) {
      const selected = cy.$(":selected");
      if (selected.length > 0) {
        graph.removeElements(selected);
        refreshElementList();
        hideProperties();
      }
    }
    if (e.key === "Escape") {
      setEdgeMode(false);
    }
  });

  // --- Canvas interaction ------------------------------------------------

  cy.on("tap", "node", (evt) => {
    const node = evt.target;

    if (btnAddEdge.classList.contains("active")) {
      if (!edgeModeSource) {
        edgeModeSource = node;
        node.addClass("edge-source-pending");
        modeIndicator.textContent = `Source: ${node.data("label")} — now click a target node`;
      } else if (edgeModeSource.id() !== node.id()) {
        graph.addEdge(edgeModeSource.id(), node.id());
        refreshElementList();
        setEdgeMode(false);
      }
      return;
    }

    showProperties(node);
  });

  cy.on("tap", "edge", (evt) => {
    if (btnAddEdge.classList.contains("active")) return;
    showProperties(evt.target);
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      hideProperties();
    }
  });

  // --- Properties panel ----------------------------------------------

  let activeElement = null;

  function showProperties(ele) {
    activeElement = ele;
    propertiesEmpty.classList.add("hidden");
    propertiesForm.classList.remove("hidden");
    propLabel.value = ele.data("label") || "";
    propId.textContent = `id: ${ele.data("id")}`;
  }

  function hideProperties() {
    activeElement = null;
    propertiesEmpty.classList.remove("hidden");
    propertiesForm.classList.add("hidden");
  }

  propLabel.addEventListener("input", () => {
    if (!activeElement) return;
    graph.updateLabel(activeElement, propLabel.value);
    refreshElementList();
  });

  // --- Left panel: element list + search ------------------------------

  function refreshElementList() {
    elementList.innerHTML = "";
    cy.elements().forEach((ele) => {
      const li = document.createElement("li");
      const kind = ele.isNode() ? "Node" : "Edge";
      li.textContent = `${kind}: ${ele.data("label") || "(no label)"}`;
      li.addEventListener("click", () => {
        cy.elements().unselect();
        ele.select();
        showProperties(ele);
      });
      elementList.appendChild(li);
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
}
