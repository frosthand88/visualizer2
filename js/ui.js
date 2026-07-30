import { saveJson, loadJsonFile } from "./persistence.js";
import { applySearch, clearSearch } from "./search.js";
import { runLayout } from "./layouts.js";
import { createHistory } from "./history.js";
import { showContextMenu } from "./contextMenu.js";
import { createGroupManager } from "./groups.js";
import { createVisibility } from "./visibility.js";
import { createAnalysis } from "./analysis.js";
import { createProfileManager } from "./profile.js";
import { createKnowledgeBase } from "./knowledgeBase.js";
import { getPreset } from "./presets.js";

export function initUi(graph, plugins) {
  const { cy } = graph;
  const groupManager = createGroupManager(graph);
  const visibility = createVisibility(graph, groupManager);
  const analysis = createAnalysis(graph);
  const history = createHistory({
    snapshot: () => JSON.stringify({ ...graph.toJson(), groups: groupManager.toJson() }),
    restore: (json) => {
      const data = JSON.parse(json);
      graph.loadJson(data);
      groupManager.loadJson(data.groups || []);
    },
  });

  const btnAddNode = document.getElementById("btn-add-node");
  const btnAddEdge = document.getElementById("btn-add-edge");
  const btnDelete = document.getElementById("btn-delete");
  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");
  const btnSave = document.getElementById("btn-save");
  const btnLoad = document.getElementById("btn-load");
  const fileInput = document.getElementById("file-input");
  const btnSaveProfile = document.getElementById("btn-save-profile");
  const btnLoadProfile = document.getElementById("btn-load-profile");
  const profileFileInput = document.getElementById("profile-file-input");
  const layoutSelect = document.getElementById("layout-select");
  const modeIndicator = document.getElementById("mode-indicator");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const elementList = document.getElementById("element-list");
  const categoryList = document.getElementById("category-list");
  const groupList = document.getElementById("group-list");
  const btnAddGroup = document.getElementById("btn-add-group");
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

  const analysisSelect = document.getElementById("analysis-select");
  const btnRunAnalysis = document.getElementById("btn-run-analysis");
  const btnResetAnalysis = document.getElementById("btn-reset-analysis");
  const btnKbMode = document.getElementById("btn-kb-mode");
  const knowledgeBase = createKnowledgeBase(graph);

  const pluginToolbarGroup = document.getElementById("plugin-toolbar-group");
  const pluginIoGroup = document.getElementById("plugin-io-group");
  const pluginImporterSelect = document.getElementById("plugin-importer-select");
  const pluginExporterSelect = document.getElementById("plugin-exporter-select");
  const btnPluginImport = document.getElementById("btn-plugin-import");
  const btnPluginExport = document.getElementById("btn-plugin-export");
  const pluginImportFileInput = document.getElementById("plugin-import-file-input");
  const pluginNodeFields = document.getElementById("plugin-node-fields");
  const pluginEdgeFields = document.getElementById("plugin-edge-fields");

  const presetSelect = document.getElementById("preset-select");
  const presetCategories = document.getElementById("preset-categories");

  function currentPreset() {
    return getPreset(presetSelect.value);
  }

  function refreshPresetCategories() {
    presetCategories.innerHTML = "";
    currentPreset().categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = cat.color;
      btn.append(swatch, document.createTextNode(cat.name));
      btn.title = `Apply the "${cat.name}" look from the ${currentPreset().label} preset`;
      btn.addEventListener("click", () => {
        const ele = activeElement();
        if (!ele || !ele.isNode()) return;
        history.record();
        graph.updateData(ele, "category", cat.name);
        graph.updateData(ele, "shape", cat.shape);
        graph.updateData(ele, "color", cat.color);
        showProperties(ele);
        refreshCategoryList();
        refreshHistoryButtons();
      });
      presetCategories.appendChild(btn);
    });
  }

  presetSelect.addEventListener("change", refreshPresetCategories);

  const profileManager = createProfileManager({
    graph,
    visibility,
    groupManager,
    getLayoutName: () => layoutSelect.value,
    setLayoutName: (name) => {
      if ([...layoutSelect.options].some((o) => o.value === name)) layoutSelect.value = name;
    },
    getFilterText: () => searchInput.value,
    setFilterText: (text) => {
      searchInput.value = text;
      performSearch();
    },
  });

  let edgeModeSource = null;
  let flowModeSource = null;

  function setEdgeMode(active) {
    btnAddEdge.classList.toggle("active", active);
    if (active) {
      setFlowMode(false);
      setKbMode(false);
      modeIndicator.textContent = "Click a source node, then a target node";
      modeIndicator.classList.remove("hidden");
    } else {
      modeIndicator.classList.add("hidden");
    }
    edgeModeSource = null;
    cy.nodes().removeClass("edge-source-pending");
  }

  function setFlowMode(active) {
    btnRunAnalysis.classList.toggle("active", active);
    if (active) {
      setEdgeMode(false);
      setKbMode(false);
      modeIndicator.textContent = "Flow: click the source node, then the target node";
      modeIndicator.classList.remove("hidden");
    } else {
      modeIndicator.classList.add("hidden");
    }
    flowModeSource = null;
    cy.nodes().removeClass("edge-source-pending");
  }

  function setKbMode(active) {
    btnKbMode.classList.toggle("active", active);
    if (active) {
      setEdgeMode(false);
      setFlowMode(false);
      modeIndicator.textContent = "Knowledge Base: click a node to open its documentation";
      modeIndicator.classList.remove("hidden");
    } else {
      modeIndicator.classList.add("hidden");
    }
  }

  btnKbMode.addEventListener("click", () => setKbMode(!btnKbMode.classList.contains("active")));

  function runAnalysis(mode) {
    if (mode === "flow") {
      setFlowMode(true);
      return;
    }
    const selected = cy.nodes(":selected").filter((n) => !n.data("_groupContainer"));
    if (selected.length !== 1) {
      alert("Select exactly one node to analyze.");
      return;
    }
    clearSearchUi();

    if (typeof analysis[mode] === "function") {
      analysis[mode](selected[0].id());
    } else {
      const pluginMode = plugins.analysisModes.find((m) => m.id === mode);
      if (!pluginMode) return;
      const matched = pluginMode.run(selected[0].id(), { graph, cy, visibleGraph: analysis.visibleGraph });
      analysis.highlightMatches(matched);
    }
    btnResetAnalysis.disabled = false;
  }

  function clearSearchUi() {
    clearSearch(cy);
    searchInput.value = "";
    searchResults.innerHTML = "";
  }

  btnRunAnalysis.addEventListener("click", () => runAnalysis(analysisSelect.value));
  btnResetAnalysis.addEventListener("click", () => {
    analysis.reset();
    btnResetAnalysis.disabled = true;
  });

  function refreshHistoryButtons() {
    btnUndo.disabled = !history.canUndo();
    btnRedo.disabled = !history.canRedo();
  }

  function isTypingInField() {
    const tag = document.activeElement && document.activeElement.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
  }

  // --- Categories & Groups ---------------------------------------------

  function refreshCategoryList() {
    const categories = [...new Set(graph.realNodes().map((n) => n.data("category")).filter(Boolean))].sort();
    categoryList.innerHTML = "";
    categories.forEach((category) => {
      const li = document.createElement("li");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !visibility.isCategoryHidden(category);
      checkbox.addEventListener("change", () => {
        visibility.toggleCategory(category);
        refreshElementList();
      });
      const label = document.createElement("span");
      label.className = "item-label";
      label.textContent = category;
      li.append(checkbox, label);
      categoryList.appendChild(li);
    });
  }

  function refreshGroupList() {
    groupList.innerHTML = "";
    groupManager.list().forEach((g) => {
      const li = document.createElement("li");

      const expandBtn = document.createElement("button");
      expandBtn.type = "button";
      expandBtn.className = "expand-btn";
      expandBtn.textContent = groupManager.isExpanded(g.id) ? "▾" : "▸";
      expandBtn.title = groupManager.isExpanded(g.id) ? "Collapse group" : "Expand group";
      expandBtn.addEventListener("click", () => {
        history.record();
        groupManager.toggleExpanded(g.id);
        visibility.apply();
        refreshElementList();
        refreshGroupList();
        refreshHistoryButtons();
      });

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !visibility.isGroupHidden(g.id);
      checkbox.title = "Show/hide this group";
      checkbox.addEventListener("change", () => {
        visibility.toggleGroup(g.id);
        refreshElementList();
      });

      const color = document.createElement("input");
      color.type = "color";
      color.value = g.color;
      color.title = "Boundary color";
      color.addEventListener("input", () => {
        groupManager.setColor(g.id, color.value);
      });

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = g.label;
      nameInput.title = "Group name";
      nameInput.addEventListener("input", () => {
        groupManager.rename(g.id, nameInput.value);
        populateGroupSelect();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.title = "Delete group";
      removeBtn.addEventListener("click", () => {
        history.record();
        groupManager.remove(g.id);
        refreshAll();
      });

      li.append(expandBtn, checkbox, color, nameInput, removeBtn);
      groupList.appendChild(li);
    });
    return groupManager.list();
  }

  function populateGroupSelect() {
    const current = propGroup.value;
    propGroup.innerHTML = '<option value="">(none)</option>';
    groupManager.list().forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.label;
      propGroup.appendChild(opt);
    });
    propGroup.value = current;
  }

  btnAddGroup.addEventListener("click", () => {
    history.record();
    const id = groupManager.add(`Group ${groupManager.list().length + 1}`);
    refreshAll();
    const row = groupList.querySelector(`li:nth-child(${groupManager.list().findIndex((g) => g.id === id) + 1}) input[type="text"]`);
    if (row) row.focus();
    refreshHistoryButtons();
  });

  // Runs after any mutation that could change node/group/category
  // structure: keeps boundaries, visibility, and the sidebar in sync.
  function refreshAll() {
    groupManager.sync();
    visibility.apply();
    analysis.reset();
    btnResetAnalysis.disabled = true;
    refreshElementList();
    refreshCategoryList();
    refreshGroupList();
    populateGroupSelect();
    refreshHistoryButtons();
  }

  // --- Toolbar ---------------------------------------------------------

  btnAddNode.addEventListener("click", () => {
    history.record();
    const extent = cy.extent();
    const position = {
      x: (extent.x1 + extent.x2) / 2 + (Math.random() - 0.5) * 60,
      y: (extent.y1 + extent.y2) / 2 + (Math.random() - 0.5) * 60,
    };
    const defaultCat = currentPreset().categories[0];
    const node = graph.addNode(
      { label: "New node", category: defaultCat.name, shape: defaultCat.shape, color: defaultCat.color },
      position
    );
    cy.elements().unselect();
    node.select();
    refreshAll();
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
    refreshAll();
    updatePropertiesFromSelection();
  }

  function deleteSelection() {
    const selected = cy.$(":selected");
    if (selected.length === 0) return;
    history.record();
    graph.removeElements(selected);
    refreshAll();
  }

  btnSave.addEventListener("click", () => saveJson({ ...graph.toJson(), groups: groupManager.toJson() }));

  btnLoad.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const json = await loadJsonFile(file);
      history.record();
      graph.loadJson(json);
      groupManager.loadJson(json.groups || []);
      refreshAll();
      clearSearch(cy);
      searchInput.value = "";
      searchResults.innerHTML = "";
    } catch (err) {
      alert(err.message);
    }
  });

  layoutSelect.addEventListener("change", () => {
    runLayout(graph, layoutSelect.value);
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
      setFlowMode(false);
      setKbMode(false);
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
    const nodes = cy.nodes(":selected").filter((n) => !n.data("_groupContainer"));
    if (nodes.length === 0) return;
    history.record();
    cy.elements().unselect();
    nodes.forEach((n) => graph.duplicateNode(n).select());
    refreshAll();
  }

  // --- Canvas interaction ------------------------------------------------

  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    if (node.data("_groupContainer")) return;

    if (btnKbMode.classList.contains("active")) {
      knowledgeBase.open(node.id());
      return;
    }

    if (btnRunAnalysis.classList.contains("active")) {
      if (!flowModeSource) {
        flowModeSource = node;
        node.addClass("edge-source-pending");
        modeIndicator.textContent = `Flow source: ${node.data("label")} — now click the target node`;
      } else if (flowModeSource.id() !== node.id()) {
        clearSearchUi();
        const path = analysis.flow(flowModeSource.id(), node.id());
        setFlowMode(false);
        if (path) {
          btnResetAnalysis.disabled = false;
        } else {
          alert("No directed path found from the source to the target node.");
        }
      }
      return;
    }

    if (btnAddEdge.classList.contains("active")) {
      if (!edgeModeSource) {
        edgeModeSource = node;
        node.addClass("edge-source-pending");
        modeIndicator.textContent = `Source: ${node.data("label")} — now click a target node`;
      } else if (edgeModeSource.id() !== node.id()) {
        history.record();
        const edge = graph.addEdge(edgeModeSource.id(), node.id(), { ...currentPreset().edgeStyle });
        setEdgeMode(false);
        cy.elements().unselect();
        edge.select();
        refreshAll();
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

  function addNodeMenuItem(position) {
    return {
      label: "Add node here",
      action: () => {
        history.record();
        const defaultCat = currentPreset().categories[0];
        const node = graph.addNode(
          { label: "New node", category: defaultCat.name, shape: defaultCat.shape, color: defaultCat.color },
          position
        );
        cy.elements().unselect();
        node.select();
        refreshAll();
      },
    };
  }

  function pluginMenuItems(target, ctx) {
    return plugins.contextMenuActions[target].map((def) => ({
      label: def.label,
      action: () => {
        history.record();
        def.action(ctx);
        refreshAll();
      },
    }));
  }

  cy.on("cxttap", "node", (evt) => {
    const node = evt.target;
    if (node.data("_groupContainer")) {
      showContextMenu(evt.originalEvent.clientX, evt.originalEvent.clientY, [addNodeMenuItem(evt.position)]);
      return;
    }
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
      ...pluginMenuItems("node", { graph, cy, element: node }),
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
      ...pluginMenuItems("edge", { graph, cy, element: edge }),
    ]);
  });

  cy.on("cxttap", (evt) => {
    if (evt.target !== cy) return;
    showContextMenu(evt.originalEvent.clientX, evt.originalEvent.clientY, [
      addNodeMenuItem(evt.position),
      ...pluginMenuItems("canvas", { graph, cy, position: evt.position }),
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
      populateGroupSelect();
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

    populatePluginFieldValues(ele);
  }

  function activeElement() {
    const selected = cy.$(":selected");
    return selected.length === 1 ? selected[0] : null;
  }

  function bindField(el, key, transform = (v) => v, onAfter) {
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
      if (onAfter) onAfter();
    });
  }

  bindField(propLabel, "label");
  bindField(propCategory, "category", (v) => v, () => refreshCategoryList());
  bindField(propGroup, "group", (v) => v, () => {
    groupManager.sync();
    visibility.apply();
    refreshGroupList();
    refreshElementList();
  });
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
    const elements = [...graph.realNodes(), ...cy.edges()];
    elements.forEach((ele) => {
      const li = document.createElement("li");
      const kind = ele.isNode() ? "Node" : "Edge";
      const hiddenSuffix = ele.visible() ? "" : " (hidden)";
      li.textContent = `${kind}: ${ele.data("label") || "(no label)"}${hiddenSuffix}`;
      li.dataset.eleId = ele.id();
      li.classList.toggle("selected", ele.selected());
      li.classList.toggle("hidden-element", !ele.visible());
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

  function performSearch() {
    analysis.reset();
    btnResetAnalysis.disabled = true;
    const matches = applySearch(cy, searchInput.value);
    if (!searchInput.value.trim()) {
      searchResults.innerHTML = "";
      return;
    }
    searchResults.innerHTML = matches.length
      ? `${matches.length} match${matches.length === 1 ? "" : "es"}`
      : "No matches";
  }

  searchInput.addEventListener("input", performSearch);

  btnSaveProfile.addEventListener("click", () => saveJson(profileManager.toJson(), "profile.json"));

  btnLoadProfile.addEventListener("click", () => profileFileInput.click());

  profileFileInput.addEventListener("change", async () => {
    const file = profileFileInput.files[0];
    profileFileInput.value = "";
    if (!file) return;
    try {
      const json = await loadJsonFile(file);
      history.record();
      profileManager.apply(json);
      refreshElementList();
      refreshCategoryList();
      refreshGroupList();
      refreshHistoryButtons();
    } catch (err) {
      alert(err.message);
    }
  });

  // --- Plugins ---------------------------------------------------------

  function renderPluginToolbarButtons() {
    plugins.toolbarButtons.forEach((def) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = def.label;
      if (def.title) btn.title = def.title;
      btn.addEventListener("click", () => {
        history.record();
        def.onClick({
          graph,
          cy,
          selectedNodes: cy.nodes(":selected").filter((n) => !n.data("_groupContainer")),
          selectedEdges: cy.edges(":selected"),
        });
        refreshAll();
      });
      pluginToolbarGroup.appendChild(btn);
    });
  }

  function makePluginFieldInput(def) {
    if (def.type === "select") {
      const select = document.createElement("select");
      (def.options || []).forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      return select;
    }
    const input = document.createElement("input");
    input.type = def.type === "number" ? "number" : def.type === "color" ? "color" : "text";
    return input;
  }

  function renderPluginFields(container, defs) {
    defs.forEach((def) => {
      const label = document.createElement("label");
      label.textContent = def.label;
      label.htmlFor = `plugin-field-${def.pluginId}-${def.key}`;
      const input = makePluginFieldInput(def);
      input.id = `plugin-field-${def.pluginId}-${def.key}`;
      input.dataset.pluginKey = def.key;
      const transform = def.type === "number" ? Number : (v) => v;
      bindField(input, def.key, transform);
      container.append(label, input);
    });
  }

  function populatePluginFieldValues(ele) {
    const defs = ele.isNode() ? plugins.nodeProperties : plugins.edgeProperties;
    const container = ele.isNode() ? pluginNodeFields : pluginEdgeFields;
    defs.forEach((def) => {
      const input = container.querySelector(`[data-plugin-key="${def.key}"]`);
      if (input) input.value = ele.data(def.key) || "";
    });
  }

  function wirePluginImportExport() {
    const hasImporters = plugins.importers.length > 0;
    const hasExporters = plugins.exporters.length > 0;
    pluginIoGroup.classList.toggle("hidden", !hasImporters && !hasExporters);

    pluginImporterSelect.classList.toggle("hidden", !hasImporters);
    btnPluginImport.classList.toggle("hidden", !hasImporters);
    plugins.importers.forEach((imp) => {
      const o = document.createElement("option");
      o.value = imp.id;
      o.textContent = imp.label;
      pluginImporterSelect.appendChild(o);
    });

    pluginExporterSelect.classList.toggle("hidden", !hasExporters);
    btnPluginExport.classList.toggle("hidden", !hasExporters);
    plugins.exporters.forEach((exp) => {
      const o = document.createElement("option");
      o.value = exp.id;
      o.textContent = exp.label;
      pluginExporterSelect.appendChild(o);
    });

    btnPluginImport.addEventListener("click", () => {
      const importer = plugins.importers.find((i) => i.id === pluginImporterSelect.value);
      if (!importer) return;
      pluginImportFileInput.accept = importer.accept || "";
      pluginImportFileInput.dataset.importerId = importer.id;
      pluginImportFileInput.click();
    });

    pluginImportFileInput.addEventListener("change", async () => {
      const file = pluginImportFileInput.files[0];
      const importer = plugins.importers.find((i) => i.id === pluginImportFileInput.dataset.importerId);
      pluginImportFileInput.value = "";
      if (!file || !importer) return;
      try {
        const text = await file.text();
        const result = importer.parse(text);
        history.record();
        graph.loadJson(result);
        groupManager.loadJson(result.groups || []);
        refreshAll();
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    });

    btnPluginExport.addEventListener("click", () => {
      const exporter = plugins.exporters.find((e) => e.id === pluginExporterSelect.value);
      if (!exporter) return;
      const content = exporter.serialize({ ...graph.toJson(), groups: groupManager.toJson() });
      const blob = new Blob([content], { type: exporter.mime || "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exporter.filename || "export.txt";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function initPlugins() {
    renderPluginToolbarButtons();
    renderPluginFields(pluginNodeFields, plugins.nodeProperties);
    renderPluginFields(pluginEdgeFields, plugins.edgeProperties);
    wirePluginImportExport();
    plugins.analysisModes.forEach((mode) => {
      const o = document.createElement("option");
      o.value = mode.id;
      o.textContent = mode.label;
      analysisSelect.appendChild(o);
    });
  }

  initPlugins();
  refreshPresetCategories();
  refreshAll();
}
