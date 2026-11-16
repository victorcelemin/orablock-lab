(function (global) {
  "use strict";

  var STORAGE_KEY = "orablock_lab_workspace_v1";
  var GUIDE_DISMISSED_KEY = "orablock_hide_guide_v1";
  var VIEW_PREFS_KEY = "orablock_view_prefs_v1";
  var Catalog = global.OraBlock.Catalog;
  var Agents = global.OraBlock.Agents;
  var Storage = global.OraBlock.Storage;

  var state = {
    activeTab: "scratch",
    categoryFilter: "all",
    searchQuery: "",
    outputMode: "sql",
    aiEnv: "local_pdb",
    kitTab: "prompt",
    selectedAgentId: null,
    selectedBlockUid: null,
    docTab: "controlfile",
    activeParentUid: "",
    compactCards: false,
    paletteCollapsed: false,
    canvasExpanded: false,
    blocks: [],
    undoStack: [],
    redoStack: [],
    simState: Storage.createInitialSimState(),
    dragPayload: null
  };

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(msg) {
    var toast = document.getElementById("app-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.hidden = true;
    }, 2600);
  }

  function sanitizeBlockList(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    list.forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      var def = Catalog.COMMAND_MAP[raw.commandId];
      if (!def) return;
      var clean = Catalog.createBlockInstance(raw.commandId, raw.params || {});
      if (raw.uid && typeof raw.uid === "string") {
        clean.uid = raw.uid;
      }
      clean.disabled = Boolean(raw.disabled);
      if (def.kind === "cblock") {
        clean.children = sanitizeBlockList(raw.children);
      }
      out.push(clean);
    });
    return out;
  }

  function saveWorkspace() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.blocks));
    } catch (e) {
      // Ignore storage quota errors in private browsing
    }
  }

  function saveViewPrefs() {
    try {
      localStorage.setItem(
        VIEW_PREFS_KEY,
        JSON.stringify({
          compactCards: state.compactCards,
          paletteCollapsed: state.paletteCollapsed,
          canvasExpanded: state.canvasExpanded
        })
      );
    } catch (e) {
      // Ignore storage errors
    }
  }

  function loadViewPrefs() {
    try {
      var raw = localStorage.getItem(VIEW_PREFS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.compactCards = Boolean(parsed.compactCards);
          state.paletteCollapsed = Boolean(parsed.paletteCollapsed);
          state.canvasExpanded = Boolean(parsed.canvasExpanded);
        }
      }
    } catch (e) {
      // Defaults remain false
    }
  }

  function applyWorkbenchPrefs() {
    var grid = document.getElementById("ide-grid");
    var stack = document.getElementById("block-stack");
    var btnCompact = document.getElementById("btn-toggle-compact");
    var btnPalette = document.getElementById("btn-toggle-palette");
    var btnExpand = document.getElementById("btn-expand-canvas");
    var btnRestore = document.getElementById("btn-restore-panes");

    if (grid) {
      grid.classList.toggle("is-palette-hidden", state.paletteCollapsed && !state.canvasExpanded);
      grid.classList.toggle("is-canvas-expanded", state.canvasExpanded);
    }
    if (stack) {
      stack.classList.toggle("is-compact", state.compactCards);
    }
    if (btnCompact) {
      btnCompact.classList.toggle("is-active", state.compactCards);
      btnCompact.setAttribute("aria-pressed", state.compactCards ? "true" : "false");
      btnCompact.textContent = state.compactCards ? "Vista detallada" : "Vista compacta";
    }
    if (btnPalette) {
      var hiddenPalette = state.paletteCollapsed && !state.canvasExpanded;
      btnPalette.classList.toggle("is-active", hiddenPalette);
      btnPalette.setAttribute("aria-pressed", hiddenPalette ? "true" : "false");
      btnPalette.textContent = hiddenPalette ? "Mostrar paleta" : "Ocultar paleta";
    }
    if (btnExpand) {
      btnExpand.classList.toggle("is-active", state.canvasExpanded);
      btnExpand.setAttribute("aria-pressed", state.canvasExpanded ? "true" : "false");
      btnExpand.textContent = state.canvasExpanded ? "Vista 3 paneles" : "Lienzo amplio";
    }
    if (btnRestore) {
      btnRestore.hidden = !state.canvasExpanded;
    }
  }

  function updateHistoryButtons() {
    var btnUndo = document.getElementById("btn-undo");
    var btnRedo = document.getElementById("btn-redo");
    if (btnUndo) btnUndo.disabled = state.undoStack.length === 0;
    if (btnRedo) btnRedo.disabled = state.redoStack.length === 0;
  }

  function recordUndoSnapshot() {
    var snap = JSON.stringify(state.blocks);
    if (state.undoStack.length && state.undoStack[state.undoStack.length - 1] === snap) {
      return;
    }
    state.undoStack.push(snap);
    if (state.undoStack.length > 30) state.undoStack.shift();
    state.redoStack = [];
    updateHistoryButtons();
  }

  function performUndo() {
    if (!state.undoStack.length) return;
    state.redoStack.push(JSON.stringify(state.blocks));
    state.blocks = sanitizeBlockList(JSON.parse(state.undoStack.pop()));
    if (state.activeParentUid && !findLocation(state.blocks, state.activeParentUid)) {
      state.activeParentUid = "";
    }
    saveWorkspace();
    renderAll();
    updateHistoryButtons();
    showToast("Cambio deshecho");
  }

  function performRedo() {
    if (!state.redoStack.length) return;
    state.undoStack.push(JSON.stringify(state.blocks));
    state.blocks = sanitizeBlockList(JSON.parse(state.redoStack.pop()));
    if (state.activeParentUid && !findLocation(state.blocks, state.activeParentUid)) {
      state.activeParentUid = "";
    }
    saveWorkspace();
    renderAll();
    updateHistoryButtons();
    showToast("Cambio rehecho");
  }

  function loadWorkspace() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          state.blocks = sanitizeBlockList(parsed);
          return;
        }
      }
    } catch (e) {
      // Fall back to default preset
    }
    state.blocks = Catalog.PRESETS.tablespace_tx();
  }

  function applyGuideBannerState() {
    var banner = document.getElementById("scratch-guide-banner");
    if (!banner) return;
    try {
      banner.hidden = localStorage.getItem(GUIDE_DISMISSED_KEY) === "1";
    } catch (e) {
      banner.hidden = false;
    }
  }

  // Tree manipulation helpers for root + nested C-block children
  function findLocation(list, uid, parentNode, parentList, parentIndex) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].uid === uid) {
        return {
          list: list,
          index: i,
          item: list[i],
          parentNode: parentNode || null,
          parentList: parentList || null,
          parentIndex: typeof parentIndex === "number" ? parentIndex : -1
        };
      }
      if (Array.isArray(list[i].children)) {
        var nested = findLocation(list[i].children, uid, list[i], list, i);
        if (nested) return nested;
      }
    }
    return null;
  }

  function getTargetList(parentUid) {
    if (!parentUid) return state.blocks;
    var loc = findLocation(state.blocks, parentUid);
    if (loc && Array.isArray(loc.item.children)) {
      return loc.item.children;
    }
    return state.blocks;
  }

  function isDescendant(parentCandidate, targetUid) {
    if (!parentCandidate || !Array.isArray(parentCandidate.children)) return false;
    for (var i = 0; i < parentCandidate.children.length; i++) {
      var c = parentCandidate.children[i];
      if (c.uid === targetUid || isDescendant(c, targetUid)) return true;
    }
    return false;
  }

  function insertBlockAt(commandId, parentUid, index) {
    var instance = Catalog.createBlockInstance(commandId);
    if (!instance) return;
    recordUndoSnapshot();
    var list = getTargetList(parentUid);
    var idx = typeof index === "number" ? Math.max(0, Math.min(index, list.length)) : list.length;
    list.splice(idx, 0, instance);
    state.selectedBlockUid = instance.uid;
    saveWorkspace();
    renderAll();
  }

  function moveExistingBlock(uid, targetParentUid, targetIndex) {
    var srcLoc = findLocation(state.blocks, uid);
    if (!srcLoc) return;

    if (targetParentUid) {
      if (targetParentUid === uid || isDescendant(srcLoc.item, targetParentUid)) {
        return; // Prevent nesting a C-block inside itself
      }
    }

    recordUndoSnapshot();
    var destList = getTargetList(targetParentUid);
    var adjustedIndex = targetIndex;
    if (srcLoc.list === destList && srcLoc.index < targetIndex) {
      adjustedIndex -= 1;
    }
    srcLoc.list.splice(srcLoc.index, 1);
    adjustedIndex = Math.max(0, Math.min(adjustedIndex, destList.length));
    destList.splice(adjustedIndex, 0, srcLoc.item);
    state.selectedBlockUid = uid;
    saveWorkspace();
    renderAll();
  }

  function moveBlockStep(uid, delta) {
    var loc = findLocation(state.blocks, uid);
    if (!loc) return;
    var newIdx = loc.index + delta;
    if (newIdx < 0 || newIdx >= loc.list.length) return;
    recordUndoSnapshot();
    var tmp = loc.list[loc.index];
    loc.list[loc.index] = loc.list[newIdx];
    loc.list[newIdx] = tmp;
    state.selectedBlockUid = uid;
    saveWorkspace();
    renderAll();
  }

  function cloneBlockDeep(item) {
    var copy = {
      uid: "blk_" + Math.random().toString(36).slice(2, 9),
      commandId: item.commandId,
      params: Object.assign({}, item.params),
      disabled: Boolean(item.disabled)
    };
    if (Array.isArray(item.children)) {
      copy.children = item.children.map(cloneBlockDeep);
    }
    return copy;
  }

  function duplicateBlock(uid) {
    var loc = findLocation(state.blocks, uid);
    if (!loc) return;
    recordUndoSnapshot();
    var copy = cloneBlockDeep(loc.item);
    loc.list.splice(loc.index + 1, 0, copy);
    state.selectedBlockUid = copy.uid;
    saveWorkspace();
    renderAll();
  }

  function unnestBlock(uid) {
    var loc = findLocation(state.blocks, uid);
    if (!loc || !loc.parentList) return;
    recordUndoSnapshot();
    var extracted = loc.list.splice(loc.index, 1)[0];
    loc.parentList.splice(loc.parentIndex + 1, 0, extracted);
    state.selectedBlockUid = uid;
    saveWorkspace();
    renderAll();
    showToast("Tarjeta sacada fuera del bloque contenedor");
  }

  function toggleDisabledBlock(uid) {
    var loc = findLocation(state.blocks, uid);
    if (!loc) return;
    recordUndoSnapshot();
    loc.item.disabled = !loc.item.disabled;
    state.selectedBlockUid = uid;
    saveWorkspace();
    renderAll();
    showToast(loc.item.disabled ? "Tarjeta pausada (comentada en script)" : "Tarjeta reactivada en script");
  }

  function deleteBlock(uid) {
    var loc = findLocation(state.blocks, uid);
    if (!loc) return;
    recordUndoSnapshot();
    if (state.activeParentUid === uid || isDescendant(loc.item, state.activeParentUid)) {
      state.activeParentUid = "";
    }
    if (state.selectedBlockUid === uid) {
      state.selectedBlockUid = null;
    }
    loc.list.splice(loc.index, 1);
    saveWorkspace();
    renderAll();
  }

  function updateBlockParam(uid, key, value) {
    var loc = findLocation(state.blocks, uid);
    if (!loc) return;
    loc.item.params[key] = value;
    saveWorkspace();
    renderScriptAndRecommendations();
  }

  // Render Palette
  function renderPalette() {
    var container = document.getElementById("palette-list");
    var countEl = document.getElementById("palette-count");
    if (!container) return;

    var q = state.searchQuery.trim().toLowerCase();
    var filtered = Catalog.COMMANDS.filter(function (cmd) {
      var catOk =
        state.categoryFilter === "all" ||
        (state.categoryFilter === "cblocks" ? cmd.kind === "cblock" : cmd.category === state.categoryFilter);
      if (!catOk) return false;
      if (!q) return true;
      return (
        cmd.title.toLowerCase().indexOf(q) !== -1 ||
        cmd.syntaxPreview.toLowerCase().indexOf(q) !== -1 ||
        cmd.hint.toLowerCase().indexOf(q) !== -1 ||
        (cmd.impactTag && cmd.impactTag.toLowerCase().indexOf(q) !== -1)
      );
    });

    if (countEl) {
      countEl.textContent = filtered.length + (filtered.length === 1 ? " bloque" : " bloques");
    }

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="lint-item">No hay tarjetas que coincidan con "' +
        escapeHtml(state.searchQuery) +
        '". Prueba con TABLESPACE, IF, MERGE, RMAN o USER.</div>';
      return;
    }

    container.innerHTML = filtered
      .map(function (cmd) {
        var cat = Catalog.CATEGORIES[cmd.category];
        var badgeText = cmd.kind === "cblock" ? cat.label + " · Bloque C" : cat.label;
        return (
          '<article class="palette-card ' +
          cat.theme +
          (cmd.kind === "cblock" ? " is-cblock-palette" : "") +
          '" draggable="true" data-command-id="' +
          escapeHtml(cmd.id) +
          '">' +
          '<div class="palette-card-top">' +
          '<span class="palette-card-title">' +
          escapeHtml(cmd.title) +
          "</span>" +
          '<span class="palette-card-cat">' +
          escapeHtml(badgeText) +
          "</span>" +
          "</div>" +
          '<div class="palette-card-syntax">' +
          escapeHtml(cmd.syntaxPreview) +
          "</div>" +
          '<div class="palette-card-footer">' +
          '<button type="button" class="palette-card-add" data-add-cmd="' +
          escapeHtml(cmd.id) +
          '" aria-label="Conectar ' +
          escapeHtml(cmd.title) +
          ' al lienzo">+ Conectar tarjeta</button>' +
          (cmd.impactTag
            ? '<span class="palette-card-impact">' + escapeHtml(cmd.impactTag) + "</span>"
            : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderFieldsHtml(blk, def) {
    return (def.fields || [])
      .map(function (f) {
        var val = blk.params && blk.params[f.key] !== undefined ? blk.params[f.key] : f.default;
        var inputId = "fld_" + blk.uid + "_" + f.key;
        if (f.type === "select") {
          var opts = (f.options || [])
            .map(function (o) {
              return (
                '<option value="' +
                escapeHtml(o) +
                '"' +
                (o === val ? " selected" : "") +
                ">" +
                escapeHtml(o) +
                "</option>"
              );
            })
            .join("");
          return (
            '<span class="block-param-group">' +
            '<label class="block-param-label" for="' +
            escapeHtml(inputId) +
            '">' +
            escapeHtml(f.label) +
            "</label>" +
            '<select id="' +
            escapeHtml(inputId) +
            '" class="block-select" data-uid="' +
            escapeHtml(blk.uid) +
            '" data-key="' +
            escapeHtml(f.key) +
            '">' +
            opts +
            "</select></span>"
          );
        }
        return (
          '<span class="block-param-group">' +
          '<label class="block-param-label" for="' +
          escapeHtml(inputId) +
          '">' +
          escapeHtml(f.label) +
          "</label>" +
          '<input id="' +
          escapeHtml(inputId) +
          '" type="text" class="block-input' +
          (f.wide ? " is-wide" : "") +
          '" value="' +
          escapeHtml(val) +
          '" data-uid="' +
          escapeHtml(blk.uid) +
          '" data-key="' +
          escapeHtml(f.key) +
          '"></span>'
        );
      })
      .join("");
  }

  function renderControlsHtml(blk, def, index, total, isNested) {
    var toggleDisabledBtn =
      '<button type="button" class="icon-btn' +
      (blk.disabled ? " is-toggled" : "") +
      '" data-action="toggle-disabled" data-uid="' +
      escapeHtml(blk.uid) +
      '" title="' +
      (blk.disabled ? "Reactivar tarjeta en script" : "Pausar tarjeta (comentar)") +
      '" aria-label="' +
      (blk.disabled ? "Reactivar " : "Pausar ") +
      escapeHtml(def.title) +
      '">' +
      (blk.disabled
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>') +
      "</button>";
    var unnestBtn = isNested
      ? '<button type="button" class="icon-btn" data-action="unnest" data-uid="' +
        escapeHtml(blk.uid) +
        '" title="Sacar fuera del bloque" aria-label="Sacar ' +
        escapeHtml(def.title) +
        ' del bloque">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>' +
        "</button>"
      : "";
    return (
      '<div class="block-controls">' +
      toggleDisabledBtn +
      unnestBtn +
      '<button type="button" class="icon-btn" data-action="up" data-uid="' +
      escapeHtml(blk.uid) +
      '" title="Mover arriba" aria-label="Subir ' +
      escapeHtml(def.title) +
      '"' +
      (index === 0 ? " disabled" : "") +
      ">" +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>' +
      "</button>" +
      '<button type="button" class="icon-btn" data-action="down" data-uid="' +
      escapeHtml(blk.uid) +
      '" title="Mover abajo" aria-label="Bajar ' +
      escapeHtml(def.title) +
      '"' +
      (index === total - 1 ? " disabled" : "") +
      ">" +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
      "</button>" +
      '<button type="button" class="icon-btn" data-action="dup" data-uid="' +
      escapeHtml(blk.uid) +
      '" title="Duplicar tarjeta" aria-label="Duplicar ' +
      escapeHtml(def.title) +
      '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
      "</button>" +
      '<button type="button" class="icon-btn is-danger" data-action="del" data-uid="' +
      escapeHtml(blk.uid) +
      '" title="Eliminar tarjeta" aria-label="Eliminar ' +
      escapeHtml(def.title) +
      '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      "</button>" +
      "</div>"
    );
  }

  var DRAG_GRIP_SVG =
    '<span class="drag-grip" title="Arrastra para reordenar" aria-hidden="true">' +
    '<svg width="12" height="14" viewBox="0 0 12 16" fill="currentColor">' +
    '<circle cx="3" cy="3" r="1.3"/><circle cx="9" cy="3" r="1.3"/>' +
    '<circle cx="3" cy="8" r="1.3"/><circle cx="9" cy="8" r="1.3"/>' +
    '<circle cx="3" cy="13" r="1.3"/><circle cx="9" cy="13" r="1.3"/>' +
    "</svg></span>";

  function renderBlockList(list, parentUid, stepCounter) {
    var html = [];
    var isNested = Boolean(parentUid);
    for (var i = 0; i < list.length; i++) {
      html.push(
        '<div class="drop-slot" data-parent-uid="' +
          escapeHtml(parentUid || "") +
          '" data-index="' +
          i +
          '"></div>'
      );

      var blk = list[i];
      var def = Catalog.COMMAND_MAP[blk.commandId];
      if (!def) continue;
      stepCounter.n += 1;
      var stepLabel = (stepCounter.n < 10 ? "0" : "") + stepCounter.n;
      var cat = Catalog.CATEGORIES[def.category];
      var isSelected = state.selectedBlockUid === blk.uid;
      var statusCls = (blk.disabled ? " is-disabled" : "") + (isSelected ? " is-selected" : "");
      var impactText = blk.disabled ? "Pausado" : def.impactTag;
      var impactHtml = impactText
        ? '<span class="block-impact-badge">' + escapeHtml(impactText) + "</span>"
        : "";

      if (def.kind === "cblock") {
        var children = blk.children || [];
        var isRmanBox = def.category === "rman" || def.cblockFamily === "rman";
        var quickCmd = isRmanBox ? "rman_backup_db" : "dbms_output";
        var quickLabel = isRmanBox ? "+ Backup DB" : "+ DBMS_OUTPUT";
        var footText = def.footLabel || (def.id === "plsql_loop" ? "END LOOP;" : "EXCEPTION / END;");
        var isTarget = state.activeParentUid === blk.uid;
        var innerHtml = children.length
          ? renderBlockList(children, blk.uid, stepCounter)
          : '<div class="drop-slot" data-parent-uid="' +
            escapeHtml(blk.uid) +
            '" data-index="0"></div><div class="cblock-empty-hint">Arrastra tarjetas aquí dentro o pulsa "Añadir tarjetas aquí dentro" para anidarlas.</div>';
        html.push(
          '<div class="scratch-cblock ' +
            cat.theme +
            statusCls +
            (isTarget ? " is-nesting-target" : "") +
            '" draggable="true" data-uid="' +
            escapeHtml(blk.uid) +
            '">' +
            '<div class="cblock-head ' +
            cat.theme +
            '">' +
            '<div class="block-row">' +
            '<div class="block-main">' +
            DRAG_GRIP_SVG +
            '<span class="block-step-num">' +
            stepLabel +
            "</span>" +
            '<span class="block-label">' +
            escapeHtml(def.title) +
            "</span>" +
            impactHtml +
            renderFieldsHtml(blk, def) +
            "</div>" +
            renderControlsHtml(blk, def, i, list.length, isNested) +
            "</div>" +
            '<div class="block-note">' +
            escapeHtml(def.hint) +
            "</div>" +
            "</div>" +
            '<div class="cblock-body" data-cblock-uid="' +
            escapeHtml(blk.uid) +
            '">' +
            innerHtml +
            "</div>" +
            '<div class="cblock-foot">' +
            "<span>" +
            escapeHtml(footText) +
            "</span>" +
            '<div class="block-controls">' +
            '<button type="button" class="palette-card-add" data-target-cblock="' +
            escapeHtml(blk.uid) +
            '">' +
            (isTarget ? "Destino activo (clic para salir)" : "Añadir tarjetas aquí dentro") +
            "</button>" +
            '<button type="button" class="palette-card-add" data-insert-inside="' +
            escapeHtml(blk.uid) +
            '" data-inside-cmd="' +
            escapeHtml(quickCmd) +
            '">' +
            quickLabel +
            "</button>" +
            "</div>" +
            "</div>" +
            "</div>"
        );
      } else {
        html.push(
          '<div class="scratch-block ' +
            cat.theme +
            statusCls +
            '" draggable="true" data-uid="' +
            escapeHtml(blk.uid) +
            '">' +
            '<div class="block-row">' +
            '<div class="block-main">' +
            DRAG_GRIP_SVG +
            '<span class="block-step-num">' +
            stepLabel +
            "</span>" +
            '<span class="block-label">' +
            escapeHtml(def.title) +
            "</span>" +
            impactHtml +
            renderFieldsHtml(blk, def) +
            "</div>" +
            renderControlsHtml(blk, def, i, list.length, isNested) +
            "</div>" +
            '<div class="block-note">' +
            escapeHtml(def.hint) +
            "</div>" +
            "</div>"
        );
      }
    }

    html.push(
      '<div class="drop-slot" data-parent-uid="' +
        escapeHtml(parentUid || "") +
        '" data-index="' +
        list.length +
        '"></div>'
    );
    return html.join("");
  }

  function renderNestingBanner() {
    var banner = document.getElementById("nesting-target-banner");
    var label = document.getElementById("nesting-target-label");
    if (!banner || !label) return;
    if (!state.activeParentUid) {
      banner.hidden = true;
      return;
    }
    var loc = findLocation(state.blocks, state.activeParentUid);
    if (!loc) {
      state.activeParentUid = "";
      banner.hidden = true;
      return;
    }
    var def = Catalog.COMMAND_MAP[loc.item.commandId];
    label.innerHTML =
      "<strong>Modo anidamiento activo:</strong> Las tarjetas nuevas entrarán dentro de «" +
      escapeHtml(def ? def.title : "Contenedor") +
      "».";
    banner.hidden = false;
  }

  function renderCanvas() {
    var stackEl = document.getElementById("block-stack");
    var countBadge = document.getElementById("canvas-block-count");
    if (!stackEl) return;

    renderNestingBanner();
    var analysis = Catalog.analyzeScript(state.blocks);
    if (countBadge) {
      var disabledNote = analysis.counts.disabled > 0 ? " (" + analysis.counts.disabled + " pausados)" : "";
      countBadge.textContent =
        analysis.counts.total + (analysis.counts.total === 1 ? " bloque" : " bloques") + disabledNote;
    }

    if (state.blocks.length === 0) {
      stackEl.innerHTML =
        '<div class="empty-canvas">' +
        "<h3>Tu lienzo Scratch de Oracle está vacío</h3>" +
        "<p>Empieza haciendo clic en las tarjetas de comandos de la izquierda o carga una plantilla guiada para ver cómo se genera el script y cómo impacta el almacenamiento.</p>" +
        '<div class="empty-actions">' +
        '<button type="button" class="btn btn-primary" data-load-preset="tablespace_tx">Cargar Tablespace + Transacción</button>' +
        '<button type="button" class="btn btn-secondary" data-load-preset="plsql_savepoint">Cargar PL/SQL con IF y Bucle</button>' +
        '<button type="button" class="btn btn-secondary" data-load-preset="redo_rman">Cargar Log Switch + RMAN RUN</button>' +
        "</div></div>";
      return;
    }

    stackEl.innerHTML = renderBlockList(state.blocks, "", { n: 0 });
  }

  function updateRiskDisplay(riskLevel) {
    var headerPill = document.getElementById("header-risk-pill");
    var headerLabel = document.getElementById("header-risk-label");
    var inspBadge = document.getElementById("inspector-risk-badge");
    var aiBadge = document.getElementById("ai-script-risk-badge");

    var map = {
      low: { text: "Riesgo bajo", short: "Bajo", cls: "" },
      medium: { text: "Riesgo medio · DDL/Disco", short: "Medio", cls: "is-medium" },
      high: { text: "Riesgo alto · Crítico", short: "Alto", cls: "is-high" }
    };
    var info = map[riskLevel] || map.low;

    if (headerPill && headerLabel) {
      headerPill.className = "risk-pill" + (info.cls ? " " + info.cls : "");
      headerLabel.textContent = info.text;
    }
    if (inspBadge) {
      inspBadge.className = "risk-tag" + (info.cls ? " " + info.cls : "");
      inspBadge.textContent = info.short;
    }
    if (aiBadge) {
      aiBadge.className = "risk-tag" + (info.cls ? " " + info.cls : "");
      aiBadge.textContent = info.text;
    }
  }

  function renderScriptAndRecommendations(scrollCodeToSelection) {
    var scriptMap = Catalog.buildScriptWithMap(state.blocks, state.outputMode);
    var scriptText = scriptMap.text;
    var activeRange =
      state.selectedBlockUid && scriptMap.blockRanges
        ? scriptMap.blockRanges[state.selectedBlockUid] || null
        : null;
    var analysis = Catalog.analyzeScript(state.blocks);
    var impact = Catalog.summarizeStorageImpact(state.blocks);
    var rec = Agents.recommendForContext(analysis, state.aiEnv);

    // Code Output & Line Numbers
    var codeEl = document.querySelector("#code-output code");
    var gutterEl = document.getElementById("code-gutter");
    var lineCountEl = document.getElementById("status-lines");
    var modeChip = document.getElementById("status-mode");

    var lines = scriptText.split("\n");
    if (codeEl) {
      codeEl.innerHTML = Catalog.highlightSqlHtml(scriptText, activeRange);
      if (scrollCodeToSelection && activeRange) {
        var firstHl = codeEl.querySelector(".code-line.is-highlighted");
        if (firstHl && firstHl.scrollIntoView) {
          firstHl.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }
    }
    if (gutterEl) {
      gutterEl.innerHTML = lines
        .map(function (_, idx) {
          var lineNum = idx + 1;
          var isHl = Boolean(activeRange && lineNum >= activeRange.start && lineNum <= activeRange.end);
          return '<div class="' + (isHl ? "is-highlighted" : "") + '">' + lineNum + "</div>";
        })
        .join("");
    }
    if (lineCountEl) {
      lineCountEl.textContent = lines.length + (lines.length === 1 ? " línea" : " líneas");
    }
    if (modeChip) {
      if (state.outputMode === "rman") {
        modeChip.textContent = "RMAN (rman target /)";
      } else if (analysis.hasRman && analysis.hasSql) {
        modeChip.textContent = "Mixto SQLcl + RMAN";
      } else {
        modeChip.textContent = "SQL*Plus / SQLcl";
      }
    }

    var impactStrip = document.getElementById("script-impact-pills");
    if (impactStrip) {
      var impactItems = [
        ["Buffer RAM", impact.ramBuffer],
        ["Redo Log (.log)", impact.redoLog],
        ["Datafile (.dbf)", impact.datafile],
        ["Control File (.ctl)", impact.controlFile]
      ];
      impactStrip.innerHTML =
        '<span class="impact-label">Toca en Oracle:</span>' +
        impactItems
          .map(function (pair) {
            return (
              '<span class="impact-pill ' +
              (pair[1] ? "is-on" : "is-off") +
              '">' +
              escapeHtml(pair[0]) +
              "</span>"
            );
          })
          .join("");
    }

    // Download button label
    var dlBtn = document.getElementById("btn-download-script");
    if (dlBtn) {
      var span = dlBtn.querySelector("span");
      if (span) span.textContent = state.outputMode === "rman" ? "Descargar .rman" : "Descargar .sql";
    }

    // Lint list
    var lintList = document.getElementById("lint-list");
    var lintCount = document.getElementById("lint-count");
    var warnOnly = analysis.warnings.filter(function (w) {
      return w.level === "warn";
    }).length;
    if (lintCount) {
      lintCount.textContent = warnOnly + (warnOnly === 1 ? " aviso" : " avisos");
    }
    if (lintList) {
      if (analysis.warnings.length === 0) {
        lintList.innerHTML = '<li class="lint-item">Añade tarjetas para validar el flujo Oracle.</li>';
      } else {
        lintList.innerHTML = analysis.warnings
          .map(function (w) {
            return (
              '<li class="lint-item ' +
              (w.level === "warn" ? "is-warn" : "is-ok") +
              '">' +
              escapeHtml(w.text) +
              "</li>"
            );
          })
          .join("");
      }
    }

    // Risk & Inspector harness preview
    updateRiskDisplay(analysis.riskLevel);
    var sumEl = document.getElementById("inspector-harness-summary");
    var tagsEl = document.getElementById("inspector-harness-tags");
    if (sumEl) {
      sumEl.textContent = rec.primary.agent + " + " + rec.primary.harness;
    }
    if (tagsEl) {
      var tags = [
        "Bloques: " + analysis.counts.total,
        "DDL: " + analysis.counts.ddl,
        "DML: " + analysis.counts.dml,
        "Disco: " + analysis.counts.storage,
        "RMAN: " + analysis.counts.rman
      ];
      tagsEl.innerHTML = tags
        .map(function (t) {
          return '<span class="mini-badge">' + escapeHtml(t) + "</span>";
        })
        .join("");
    }

    renderAgentsModule(scriptText, analysis, rec);
  }

  function renderAgentsModule(scriptText, analysis, rec) {
    var diagEl = document.getElementById("ai-script-diagnosis");
    var breakdownEl = document.getElementById("ai-script-breakdown");
    var guardrailsEl = document.getElementById("ai-guardrail-list");
    var primaryEl = document.getElementById("ai-primary-recommendation");
    var matrixBody = document.getElementById("agent-matrix-body");
    var kitOutput = document.querySelector("#kit-code-output code");
    var kitDesc = document.getElementById("kit-description");

    if (diagEl) diagEl.textContent = rec.diagnosis;
    if (breakdownEl) {
      var items = [
        ["Sesión", analysis.counts.session],
        ["DDL", analysis.counts.ddl],
        ["DML", analysis.counts.dml],
        ["Disco", analysis.counts.storage],
        ["PL/SQL", analysis.counts.plsql],
        ["RMAN", analysis.counts.rman]
      ];
      breakdownEl.innerHTML = items
        .map(function (pair) {
          return (
            '<div class="metric-chip"><span>' +
            escapeHtml(pair[0]) +
            "</span><strong>" +
            pair[1] +
            "</strong></div>"
          );
        })
        .join("");
    }
    if (guardrailsEl) {
      guardrailsEl.innerHTML = rec.guardrails
        .map(function (g) {
          return "<li>" + escapeHtml(g) + "</li>";
        })
        .join("");
    }

    var activeAgent =
      Agents.AGENTS_CATALOG.filter(function (a) {
        return a.id === state.selectedAgentId;
      })[0] || rec.primary;

    var primaryBadge = document.getElementById("ai-primary-badge");
    if (primaryBadge) {
      primaryBadge.textContent =
        activeAgent.id === rec.primary.id ? "Recomendado para tu script" : "Selección manual";
    }

    if (primaryEl) {
      var stepsHtml =
        Array.isArray(activeAgent.steps) && activeAgent.steps.length
          ? '<div class="rec-steps"><strong>Cómo usarlo en 3 pasos</strong><ol>' +
            activeAgent.steps
              .map(function (st) {
                return "<li>" + escapeHtml(st) + "</li>";
              })
              .join("") +
            "</ol></div>"
          : "";
      primaryEl.innerHTML =
        '<div class="rec-block">' +
        '<h3 class="rec-title">' +
        escapeHtml(activeAgent.agent) +
        " · " +
        escapeHtml(activeAgent.harness) +
        "</h3>" +
        '<p class="card-body-text">' +
        escapeHtml(activeAgent.summary) +
        "</p>" +
        '<div class="rec-meta">' +
        '<div class="rec-detail"><strong>Por qué encaja</strong>' +
        escapeHtml(activeAgent.whyItWorks) +
        "</div>" +
        '<div class="rec-detail"><strong>Aislamiento y límite</strong>' +
        escapeHtml(activeAgent.isolation) +
        "</div>" +
        "</div>" +
        stepsHtml +
        "</div>";
    }

    if (matrixBody) {
      matrixBody.innerHTML = Agents.AGENTS_CATALOG.map(function (row) {
        var selected = row.id === activeAgent.id ? "is-selected" : "";
        return (
          '<tr class="' +
          selected +
          '" data-agent-id="' +
          escapeHtml(row.id) +
          '" tabindex="0">' +
          "<td><strong>" +
          escapeHtml(row.agent) +
          "</strong></td>" +
          "<td>" +
          escapeHtml(row.harness) +
          "</td>" +
          "<td>" +
          escapeHtml(row.isolation) +
          "</td>" +
          "<td>" +
          escapeHtml(row.bestFor) +
          "</td>" +
          "<td>" +
          escapeHtml(row.maxRisk) +
          "</td>" +
          "</tr>"
        );
      }).join("");
    }

    var effectiveRec = Object.assign({}, rec, { primary: activeAgent });
    var kitMap = {
      prompt: "Prompt listo para pegar en Gemini CLI, Claude Code o Codex CLI con reglas de revisión Oracle.",
      agents_md: "Archivo AGENTS.md / GEMINI.md para fijar políticas de seguridad en la raíz de tu repositorio de scripts.",
      mcp_json: "Configuración estándar de servidor MCP oficial de Oracle SQLcl (`sqlcl -mcp`) con perfil por entorno."
    };
    if (kitDesc) kitDesc.textContent = kitMap[state.kitTab] || kitMap.prompt;
    if (kitOutput) {
      kitOutput.textContent = Agents.generateKitArtifact(state.kitTab, scriptText, effectiveRec, analysis);
    }
  }

  function renderStorageSimulator() {
    var s = state.simState;
    var scnEl = document.getElementById("sim-scn");
    var seqEl = document.getElementById("sim-seq");
    var dbEl = document.getElementById("sim-db-state");
    var expEl = document.getElementById("sim-explanation");

    if (scnEl) scnEl.textContent = String(s.scn);
    if (seqEl) seqEl.textContent = "#" + s.logSeq;
    if (dbEl) {
      dbEl.textContent = s.dbState;
      dbEl.className = "scn-value " + (s.dbState === "OPEN" ? "status-open" : "status-crashed");
    }
    if (expEl) expEl.innerHTML = s.explanation;

    var suggested = s.suggestedNext || "dml";
    document.querySelectorAll("[data-sim]").forEach(function (btn) {
      btn.classList.toggle("is-suggested", btn.getAttribute("data-sim") === suggested);
    });

    var bufBadge = document.getElementById("badge-buffer");
    var bufState = document.getElementById("state-buffer");
    if (bufBadge && bufState) {
      if (s.dbState !== "OPEN") {
        bufBadge.textContent = "PERDIDO";
        bufState.textContent = "Memoria RAM borrada tras caída eléctrica";
      } else if (s.dirtyBuffer) {
        bufBadge.textContent = "DIRTY";
        bufState.textContent =
          "Bloque #104 en RAM: Saldo = " +
          s.ramSaldo +
          (s.uncommittedValue !== null ? " (Sin COMMIT)" : " (Confirmado en Redo)");
      } else {
        bufBadge.textContent = "CLEAN";
        bufState.textContent = "Bloque #104 en RAM: Saldo = " + s.ramSaldo + " (Sincronizado con disco)";
      }
    }

    var logBadge = document.getElementById("badge-logbuf");
    var logState = document.getElementById("state-logbuf");
    if (logBadge && logState) {
      if (s.dbState !== "OPEN") {
        logBadge.textContent = "PERDIDO";
        logState.textContent = "Redo Log Buffer en RAM borrado";
      } else if (s.logBufferPending) {
        logBadge.textContent = "PENDIENTE";
        logState.textContent = "Vector DML Saldo=" + s.ramSaldo + " esperando COMMIT / LGWR";
      } else {
        logBadge.textContent = "VACÍO";
        logState.textContent = "Todos los vectores confirmados ya están en Online Redo Log";
      }
    }

    var redoEl = document.getElementById("state-redo");
    var redoBadge = document.getElementById("badge-redo");
    if (redoBadge) redoBadge.textContent = "GRUPO " + s.activeGroup + " CURRENT";
    if (redoEl) {
      redoEl.innerHTML = s.redoGroups
        .map(function (g) {
          return (
            '<div class="redo-group-card ' +
            (g.status === "CURRENT" ? "is-current" : "") +
            '">' +
            "<strong>Grupo " +
            g.group +
            " · " +
            g.status +
            "</strong><div>Seq #" +
            g.seq +
            "</div><div>" +
            escapeHtml(g.entries) +
            "</div></div>"
          );
        })
        .join("");
    }

    var dfBadge = document.getElementById("badge-datafile");
    var dfState = document.getElementById("state-datafile");
    if (dfBadge && dfState) {
      dfBadge.textContent = "SCN " + s.datafileHeaderScn;
      dfState.textContent =
        "Cabecera SCN: " + s.datafileHeaderScn + " · Bloque #104 en disco: Saldo = " + s.diskSaldo;
    }

    var ctlBadge = document.getElementById("badge-ctrl");
    var ctlState = document.getElementById("state-ctrl");
    if (ctlBadge && ctlState) {
      ctlBadge.textContent = "CKPT SCN " + s.checkpointScn;
      ctlState.textContent =
        "Checkpoint SCN: " +
        s.checkpointScn +
        " · Datafiles: 4 · Redo Seq activo: #" +
        s.logSeq;
    }

    var highlightMap = {
      buffer: "node-buffer-cache",
      logbuf: "node-log-buffer",
      lgwr: "proc-lgwr",
      dbwn: "proc-dbwn",
      ckpt: "proc-ckpt",
      smon: "proc-smon",
      redolog: "node-redolog",
      datafile: "node-datafile",
      controlfile: "node-controlfile"
    };

    Object.keys(highlightMap).forEach(function (key) {
      var el = document.getElementById(highlightMap[key]);
      if (!el) return;
      el.classList.remove("is-active", "is-lost");
      if (s.dbState !== "OPEN" && (key === "buffer" || key === "logbuf")) {
        el.classList.add("is-lost");
      } else if (s.activeHighlight.indexOf(key) !== -1) {
        el.classList.add("is-active");
      }
    });
  }

  function renderDidacticDocs() {
    var container = document.getElementById("didactic-body");
    if (!container) return;
    var doc = Storage.DIDACTIC_DOCS[state.docTab] || Storage.DIDACTIC_DOCS.controlfile;

    container.innerHTML =
      '<div class="doc-card">' +
      "<h3>" +
      escapeHtml(doc.title) +
      "</h3>" +
      "<p>" +
      doc.analogy +
      "</p>" +
      '<ul class="doc-list">' +
      doc.points
        .map(function (pt) {
          return "<li>" + pt + "</li>";
        })
        .join("") +
      "</ul>" +
      "</div>" +
      '<div class="doc-card">' +
      "<h3>" +
      escapeHtml(doc.queryTitle) +
      "</h3>" +
      '<pre class="kit-code"><code>' +
      escapeHtml(doc.querySql) +
      "</code></pre>" +
      '<button type="button" class="btn btn-primary" id="btn-load-doc-blocks">Cargar comandos en Ensamblador Scratch</button>' +
      "</div>";

    var loadBtn = document.getElementById("btn-load-doc-blocks");
    if (loadBtn) {
      loadBtn.addEventListener("click", function () {
        state.blocks = doc.presetBlocks.map(function (spec) {
          return Catalog.createBlockInstance(spec.commandId, spec.params);
        });
        saveWorkspace();
        switchTab("scratch");
        renderAll();
        showToast("Comandos cargados en el lienzo Scratch");
      });
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".mode-tab").forEach(function (btn) {
      var active = btn.getAttribute("data-tab") === tabId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".tab-panel").forEach(function (panel) {
      var active = panel.id === "panel-" + tabId;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function renderAll() {
    renderPalette();
    renderCanvas();
    renderScriptAndRecommendations();
    renderStorageSimulator();
    renderDidacticDocs();
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast(label + " copiado al portapapeles");
        },
        function () {
          fallbackCopy(text, label);
        }
      );
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(label + " copiado");
    } catch (e) {
      showToast("No se pudo copiar automáticamente");
    }
    document.body.removeChild(ta);
  }

  function downloadCurrentScript() {
    var scriptText = Catalog.buildScript(state.blocks, state.outputMode);
    var ext = state.outputMode === "rman" ? "rman" : "sql";
    var blob = new Blob([scriptText + "\n"], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "orablock_script." + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Descargado orablock_script." + ext);
  }

  function bindEvents() {
    // Top navigation tabs (+ WAI-ARIA ArrowLeft/ArrowRight navigation)
    var modeTabs = Array.prototype.slice.call(document.querySelectorAll(".mode-tab"));
    modeTabs.forEach(function (btn, idx) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
      btn.addEventListener("keydown", function (ev) {
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        ev.preventDefault();
        var nextIdx =
          ev.key === "ArrowRight"
            ? (idx + 1) % modeTabs.length
            : (idx - 1 + modeTabs.length) % modeTabs.length;
        var nextBtn = modeTabs[nextIdx];
        switchTab(nextBtn.getAttribute("data-tab"));
        nextBtn.focus();
      });
    });

    // Dismissible Scratch color guide banner
    var btnDismissGuide = document.getElementById("btn-dismiss-guide");
    if (btnDismissGuide) {
      btnDismissGuide.addEventListener("click", function () {
        var banner = document.getElementById("scratch-guide-banner");
        if (banner) banner.hidden = true;
        try {
          localStorage.setItem(GUIDE_DISMISSED_KEY, "1");
        } catch (e) {
          // Ignore storage quota errors
        }
      });
    }

    // Workbench toolbar buttons (Undo, Redo, Compact, Palette, Expand, Exit nesting)
    var btnUndo = document.getElementById("btn-undo");
    if (btnUndo) btnUndo.addEventListener("click", performUndo);
    var btnRedo = document.getElementById("btn-redo");
    if (btnRedo) btnRedo.addEventListener("click", performRedo);

    var btnCompact = document.getElementById("btn-toggle-compact");
    if (btnCompact) {
      btnCompact.addEventListener("click", function () {
        state.compactCards = !state.compactCards;
        saveViewPrefs();
        applyWorkbenchPrefs();
      });
    }

    var btnTogglePalette = document.getElementById("btn-toggle-palette");
    if (btnTogglePalette) {
      btnTogglePalette.addEventListener("click", function () {
        if (state.canvasExpanded) {
          state.canvasExpanded = false;
          state.paletteCollapsed = true;
        } else {
          state.paletteCollapsed = !state.paletteCollapsed;
        }
        saveViewPrefs();
        applyWorkbenchPrefs();
      });
    }

    var btnExpandCanvas = document.getElementById("btn-expand-canvas");
    if (btnExpandCanvas) {
      btnExpandCanvas.addEventListener("click", function () {
        state.canvasExpanded = !state.canvasExpanded;
        saveViewPrefs();
        applyWorkbenchPrefs();
      });
    }

    var btnRestorePanes = document.getElementById("btn-restore-panes");
    if (btnRestorePanes) {
      btnRestorePanes.addEventListener("click", function () {
        state.canvasExpanded = false;
        state.paletteCollapsed = false;
        saveViewPrefs();
        applyWorkbenchPrefs();
      });
    }

    var btnExitNesting = document.getElementById("btn-exit-nesting");
    if (btnExitNesting) {
      btnExitNesting.addEventListener("click", function () {
        state.activeParentUid = "";
        renderCanvas();
        showToast("Destino vuelto al flujo principal");
      });
    }

    document.addEventListener("keydown", function (ev) {
      if (state.activeTab !== "scratch") return;
      var activeTag = document.activeElement ? document.activeElement.tagName : "";
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
        var k = ev.key.toLowerCase();
        if (k === "z" && !ev.shiftKey) {
          ev.preventDefault();
          performUndo();
        } else if (k === "y" || (k === "z" && ev.shiftKey)) {
          ev.preventDefault();
          performRedo();
        }
      }
    });

    // Preset selector
    var presetSelect = document.getElementById("preset-select");
    if (presetSelect) {
      presetSelect.addEventListener("change", function () {
        var key = presetSelect.value;
        if (!key || !Catalog.PRESETS[key]) return;
        recordUndoSnapshot();
        state.blocks = Catalog.PRESETS[key]();
        state.activeParentUid = "";
        state.selectedBlockUid = state.blocks[0] ? state.blocks[0].uid : null;
        saveWorkspace();
        renderAll();
        presetSelect.value = "";
        showToast("Plantilla cargada en el lienzo");
      });
    }

    // Copy & Download script
    var btnCopy = document.getElementById("btn-copy-script");
    if (btnCopy) {
      btnCopy.addEventListener("click", function () {
        copyText(Catalog.buildScript(state.blocks, state.outputMode), "Script Oracle");
      });
    }
    var btnDownload = document.getElementById("btn-download-script");
    if (btnDownload) {
      btnDownload.addEventListener("click", downloadCurrentScript);
    }

    // Palette search & category filter
    var searchInput = document.getElementById("palette-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.searchQuery = searchInput.value;
        renderPalette();
      });
    }

    var catFilters = document.getElementById("category-filters");
    if (catFilters) {
      catFilters.addEventListener("click", function (ev) {
        var btn = ev.target.closest(".cat-btn");
        if (!btn) return;
        state.categoryFilter = btn.getAttribute("data-category") || "all";
        catFilters.querySelectorAll(".cat-btn").forEach(function (el) {
          el.classList.toggle("is-active", el === btn);
        });
        renderPalette();
      });
    }

    // Palette add & dragstart
    var paletteList = document.getElementById("palette-list");
    if (paletteList) {
      paletteList.addEventListener("click", function (ev) {
        var addBtn = ev.target.closest("[data-add-cmd]");
        if (addBtn) {
          var cmdId = addBtn.getAttribute("data-add-cmd");
          if (state.activeParentUid && findLocation(state.blocks, state.activeParentUid)) {
            var nestedList = getTargetList(state.activeParentUid);
            insertBlockAt(cmdId, state.activeParentUid, nestedList.length);
            showToast("Tarjeta anidada dentro del bloque PL/SQL activo");
          } else {
            state.activeParentUid = "";
            insertBlockAt(cmdId, "", state.blocks.length);
            showToast("Tarjeta conectada al final del flujo");
          }
        }
      });

      paletteList.addEventListener("dragstart", function (ev) {
        var card = ev.target.closest(".palette-card");
        if (!card) return;
        state.dragPayload = { type: "new", commandId: card.getAttribute("data-command-id") };
        var stackEl = document.getElementById("block-stack");
        if (stackEl) stackEl.classList.add("is-reordering");
        ev.dataTransfer.effectAllowed = "copy";
        ev.dataTransfer.setData("text/plain", card.getAttribute("data-command-id"));
      });
    }

    // Global dragend cleanup so palette drags always close expanded drop slots
    document.addEventListener("dragend", function () {
      var stackEl = document.getElementById("block-stack");
      if (stackEl) stackEl.classList.remove("is-reordering");
      document.querySelectorAll(".drop-slot.is-active, .cblock-body.is-drag-target").forEach(function (el) {
        el.classList.remove("is-active", "is-drag-target");
      });
    });

    // Canvas events (move, edit, delete, drag & drop)
    var blockStack = document.getElementById("block-stack");
    var dropzone = document.getElementById("canvas-dropzone");

    if (blockStack) {
      blockStack.addEventListener("focusin", function (ev) {
        if (ev.target.matches(".block-input, .block-select")) {
          recordUndoSnapshot();
        }
      });

      blockStack.addEventListener("click", function (ev) {
        var presetBtn = ev.target.closest("[data-load-preset]");
        if (presetBtn) {
          var key = presetBtn.getAttribute("data-load-preset");
          if (Catalog.PRESETS[key]) {
            recordUndoSnapshot();
            state.blocks = Catalog.PRESETS[key]();
            state.activeParentUid = "";
            state.selectedBlockUid = state.blocks[0] ? state.blocks[0].uid : null;
            saveWorkspace();
            renderAll();
          }
          return;
        }

        var targetBtn = ev.target.closest("[data-target-cblock]");
        if (targetBtn) {
          var targetUid = targetBtn.getAttribute("data-target-cblock");
          state.activeParentUid = state.activeParentUid === targetUid ? "" : targetUid;
          renderCanvas();
          showToast(
            state.activeParentUid
              ? "Destino fijado: las tarjetas que añadas irán dentro de este bloque"
              : "Destino vuelto al flujo principal"
          );
          return;
        }

        var insideBtn = ev.target.closest("[data-insert-inside]");
        if (insideBtn) {
          var parentUid = insideBtn.getAttribute("data-insert-inside");
          var insideCmd = insideBtn.getAttribute("data-inside-cmd") || "dbms_output";
          var list = getTargetList(parentUid);
          insertBlockAt(insideCmd, parentUid, list.length);
          showToast("Tarjeta anidada dentro del contenedor");
          return;
        }

        var actionBtn = ev.target.closest("[data-action]");
        if (actionBtn) {
          var uid = actionBtn.getAttribute("data-uid");
          var act = actionBtn.getAttribute("data-action");
          if (act === "up") moveBlockStep(uid, -1);
          else if (act === "down") moveBlockStep(uid, 1);
          else if (act === "dup") duplicateBlock(uid);
          else if (act === "unnest") unnestBlock(uid);
          else if (act === "toggle-disabled") toggleDisabledBlock(uid);
          else if (act === "del") deleteBlock(uid);
          return;
        }

        if (!ev.target.closest("input, select, button")) {
          var blkEl = ev.target.closest("[data-uid]");
          if (blkEl) {
            var clickedUid = blkEl.getAttribute("data-uid");
            state.selectedBlockUid = clickedUid;
            blockStack.querySelectorAll("[data-uid].is-selected").forEach(function (el) {
              el.classList.remove("is-selected");
            });
            blkEl.classList.add("is-selected");
            renderScriptAndRecommendations(true);
          }
        }
      });

      // Prevent drag hijacking when user clicks to select text inside inputs/selects
      blockStack.addEventListener("mousedown", function (ev) {
        var blkEl = ev.target.closest("[data-uid]");
        if (!blkEl) return;
        var onField = Boolean(ev.target.closest("input, select, button, textarea, label"));
        blkEl.setAttribute("draggable", onField ? "false" : "true");
      });
      blockStack.addEventListener("mouseup", function () {
        blockStack.querySelectorAll("[data-uid][draggable='false']").forEach(function (el) {
          el.setAttribute("draggable", "true");
        });
      });

      blockStack.addEventListener("input", function (ev) {
        var target = ev.target;
        if (!target.matches(".block-input, .block-select")) return;
        updateBlockParam(
          target.getAttribute("data-uid"),
          target.getAttribute("data-key"),
          target.value
        );
      });

      blockStack.addEventListener("change", function (ev) {
        var target = ev.target;
        if (!target.matches(".block-select")) return;
        updateBlockParam(
          target.getAttribute("data-uid"),
          target.getAttribute("data-key"),
          target.value
        );
      });

      blockStack.addEventListener("dragstart", function (ev) {
        var blkEl = ev.target.closest("[data-uid]");
        if (!blkEl) return;
        if (ev.target.matches("input, select, button")) {
          ev.preventDefault();
          return;
        }
        ev.stopPropagation();
        state.dragPayload = { type: "move", uid: blkEl.getAttribute("data-uid") };
        blkEl.classList.add("is-dragging");
        blockStack.classList.add("is-reordering");
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", state.dragPayload.uid);
      });

      blockStack.addEventListener("dragend", function () {
        state.dragPayload = null;
        blockStack.classList.remove("is-reordering");
        document.querySelectorAll(".is-dragging, .drop-slot.is-active, .cblock-body.is-drag-target").forEach(function (el) {
          el.classList.remove("is-dragging", "is-active", "is-drag-target");
        });
        blockStack.querySelectorAll("[data-uid]").forEach(function (el) {
          el.setAttribute("draggable", "true");
        });
      });

      blockStack.addEventListener("dragover", function (ev) {
        var slot = ev.target.closest(".drop-slot");
        var cbody = !slot ? ev.target.closest(".cblock-body[data-cblock-uid]") : null;
        if (!slot && !cbody) return;
        ev.preventDefault();
        document.querySelectorAll(".drop-slot.is-active, .cblock-body.is-drag-target").forEach(function (el) {
          if (el !== slot && el !== cbody) {
            el.classList.remove("is-active", "is-drag-target");
          }
        });
        if (slot) slot.classList.add("is-active");
        else if (cbody) cbody.classList.add("is-drag-target");
      });

      blockStack.addEventListener("dragleave", function (ev) {
        var slot = ev.target.closest(".drop-slot");
        if (slot) slot.classList.remove("is-active");
        var cbody = ev.target.closest(".cblock-body[data-cblock-uid]");
        if (cbody && !cbody.contains(ev.relatedTarget)) cbody.classList.remove("is-drag-target");
      });

      blockStack.addEventListener("drop", function (ev) {
        var slot = ev.target.closest(".drop-slot");
        var cbody = !slot ? ev.target.closest(".cblock-body[data-cblock-uid]") : null;
        if ((!slot && !cbody) || !state.dragPayload) return;
        ev.preventDefault();
        ev.stopPropagation();
        blockStack.classList.remove("is-reordering");
        if (slot) slot.classList.remove("is-active");
        if (cbody) cbody.classList.remove("is-drag-target");

        var parentUid = slot
          ? slot.getAttribute("data-parent-uid") || ""
          : cbody.getAttribute("data-cblock-uid") || "";
        var index = slot
          ? parseInt(slot.getAttribute("data-index"), 10)
          : getTargetList(parentUid).length;

        if (state.dragPayload.type === "new") {
          insertBlockAt(state.dragPayload.commandId, parentUid, index);
        } else if (state.dragPayload.type === "move") {
          moveExistingBlock(state.dragPayload.uid, parentUid, index);
        }
        state.dragPayload = null;
      });
    }

    if (dropzone) {
      dropzone.addEventListener("dragover", function (ev) {
        if (!state.dragPayload) return;
        ev.preventDefault();
        dropzone.classList.add("is-drag-over");
      });
      dropzone.addEventListener("dragleave", function (ev) {
        if (ev.target === dropzone) dropzone.classList.remove("is-drag-over");
      });
      dropzone.addEventListener("drop", function (ev) {
        dropzone.classList.remove("is-drag-over");
        if (blockStack) blockStack.classList.remove("is-reordering");
        if (!state.dragPayload) return;
        if (ev.target.closest(".drop-slot")) return;
        ev.preventDefault();
        if (state.dragPayload.type === "new") {
          insertBlockAt(state.dragPayload.commandId, "", state.blocks.length);
        } else if (state.dragPayload.type === "move") {
          moveExistingBlock(state.dragPayload.uid, "", state.blocks.length);
        }
        state.dragPayload = null;
      });
    }

    // Clear canvas
    var btnClear = document.getElementById("btn-clear-canvas");
    if (btnClear) {
      btnClear.addEventListener("click", function () {
        if (state.blocks.length > 0) recordUndoSnapshot();
        state.blocks = [];
        state.activeParentUid = "";
        state.selectedBlockUid = null;
        saveWorkspace();
        renderAll();
        showToast("Lienzo vaciado");
      });
    }

    // Output mode toggle (SQL vs RMAN)
    document.querySelectorAll("[data-output]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.outputMode = btn.getAttribute("data-output");
        document.querySelectorAll("[data-output]").forEach(function (el) {
          el.classList.toggle("is-active", el === btn);
        });
        renderScriptAndRecommendations();
      });
    });

    // Cross-module jumps
    ["btn-jump-agents", "btn-open-harness-tab"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", function () {
          switchTab("agents");
        });
      }
    });

    var jumpStorage = document.getElementById("btn-jump-storage");
    if (jumpStorage) {
      jumpStorage.addEventListener("click", function () {
        var analysis = Catalog.analyzeScript(state.blocks);
        state.simState = Storage.createInitialSimState();
        if (analysis.counts.dml > 0) {
          state.simState = Storage.applySimStep(state.simState, "dml");
          state.simState = Storage.applySimStep(state.simState, "commit");
        }
        if (analysis.counts.storage > 0 || analysis.counts.ddl > 0) {
          state.simState = Storage.applySimStep(state.simState, "checkpoint");
        }
        switchTab("storage");
        renderStorageSimulator();
      });
    }

    // AI Agents & Harness controls
    var envSelect = document.getElementById("ai-env-select");
    if (envSelect) {
      envSelect.addEventListener("change", function () {
        state.aiEnv = envSelect.value;
        state.selectedAgentId = null;
        renderScriptAndRecommendations();
      });
    }

    var matrixBody = document.getElementById("agent-matrix-body");
    if (matrixBody) {
      matrixBody.addEventListener("click", function (ev) {
        var row = ev.target.closest("tr[data-agent-id]");
        if (!row) return;
        state.selectedAgentId = row.getAttribute("data-agent-id");
        renderScriptAndRecommendations();
      });
      matrixBody.addEventListener("keydown", function (ev) {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        var row = ev.target.closest("tr[data-agent-id]");
        if (!row) return;
        ev.preventDefault();
        state.selectedAgentId = row.getAttribute("data-agent-id");
        renderScriptAndRecommendations();
      });
    }

    document.querySelectorAll("[data-kit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.kitTab = btn.getAttribute("data-kit");
        document.querySelectorAll("[data-kit]").forEach(function (el) {
          el.classList.toggle("is-active", el === btn);
        });
        renderScriptAndRecommendations();
      });
    });

    var btnCopyKit = document.getElementById("btn-copy-kit");
    if (btnCopyKit) {
      btnCopyKit.addEventListener("click", function () {
        var codeEl = document.querySelector("#kit-code-output code");
        if (codeEl) copyText(codeEl.textContent, "Configuración de harness");
      });
    }

    // Storage Simulator buttons
    document.querySelectorAll("[data-sim]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.simState = Storage.applySimStep(state.simState, btn.getAttribute("data-sim"));
        renderStorageSimulator();
      });
    });

    var btnResetSim = document.getElementById("btn-sim-reset");
    if (btnResetSim) {
      btnResetSim.addEventListener("click", function () {
        state.simState = Storage.createInitialSimState();
        renderStorageSimulator();
      });
    }

    // Didactic tabs
    document.querySelectorAll("[data-doc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.docTab = btn.getAttribute("data-doc");
        document.querySelectorAll("[data-doc]").forEach(function (el) {
          el.classList.toggle("is-active", el === btn);
        });
        renderDidacticDocs();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadViewPrefs();
    loadWorkspace();
    applyGuideBannerState();
    applyWorkbenchPrefs();
    updateHistoryButtons();
    bindEvents();
    renderAll();
  });
})(window);
