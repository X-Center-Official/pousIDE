"use strict";

const $ = id => document.getElementById(id);
const workspace = $("workspace");
const stage = $("stage");

// ========================================
// PARTE 1: MENSAJES Y VENTANAS
// ========================================

function uiAlert(message, title = "PousIDE") {
  const modal = $("alertModal");

  if (!modal) {
    alert(message);
    return;
  }

  const titleElement = $("alertTitle");
  const messageElement = $("alertMessage");

  if (titleElement) titleElement.textContent = title;
  if (messageElement) messageElement.textContent = message;

  modal.classList.remove("hidden");

  const closeButton = $("alertClose");
  if (closeButton) closeButton.focus();
}

function uiConfirm(message, title = "¿Estás seguro?") {
  return new Promise(resolve => {
    const modal = $("confirmModal");

    if (!modal) {
      resolve(confirm(message));
      return;
    }

    const titleElement = $("confirmTitle");
    const messageElement = $("confirmMessage");
    const yesButton = $("confirmYes");
    const noButton = $("confirmNo");

    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;

    modal.classList.remove("hidden");

    function finish(result) {
      modal.classList.add("hidden");

      if (yesButton) yesButton.removeEventListener("click", onYes);
      if (noButton) noButton.removeEventListener("click", onNo);

      resolve(result);
    }

    function onYes() {
      finish(true);
    }

    function onNo() {
      finish(false);
    }

    if (yesButton) yesButton.addEventListener("click", onYes);
    if (noButton) noButton.addEventListener("click", onNo);
  });
}

// ========================================
// SELECTOR DE COLOR
// ========================================

function openColorPicker(initialColor = "#4287f5") {
  return new Promise(resolve => {
    const picker = $("colorPickerModal");
    const colorInput = $("colorPickerInput");
    const hexInput = $("colorPickerHex");
    const acceptButton = $("colorPickerAccept");
    const cancelButton = $("colorPickerCancel");

    if (!picker || !colorInput || !hexInput) {
      resolve(initialColor);
      return;
    }

    colorInput.value = initialColor;
    hexInput.value = initialColor;
    picker.classList.remove("hidden");

    function finish(value) {
      picker.classList.add("hidden");

      acceptButton?.removeEventListener("click", onAccept);
      cancelButton?.removeEventListener("click", onCancel);
      colorInput.removeEventListener("input", onColorInput);
      hexInput.removeEventListener("input", onHexInput);

      resolve(value);
    }

    function onAccept() {
      finish(colorInput.value);
    }

    function onCancel() {
      finish(null);
    }

    function onColorInput() {
      hexInput.value = colorInput.value;
    }

    function onHexInput() {
      const value = hexInput.value.trim();

      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        colorInput.value = value;
      }
    }

    acceptButton?.addEventListener("click", onAccept);
    cancelButton?.addEventListener("click", onCancel);
    colorInput.addEventListener("input", onColorInput);
    hexInput.addEventListener("input", onHexInput);
  });
}
// ========================================
// PARTE 2: PERSONAJES, BLOQUES Y EDITOR
// ========================================

const KEY_OPTIONS = [
  { value: "ArrowUp", label: "↑ flecha arriba" },
  { value: "ArrowDown", label: "↓ flecha abajo" },
  { value: "ArrowLeft", label: "← flecha izquierda" },
  { value: "ArrowRight", label: "→ flecha derecha" },
  { value: " ", label: "espacio" },
  { value: "Enter", label: "Enter" },
  { value: "Shift", label: "Shift" },
  { value: "Control", label: "Ctrl" },
  { value: "Escape", label: "Escape" },
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
  { value: "d", label: "D" },
  { value: "e", label: "E" },
  { value: "f", label: "F" },
  { value: "g", label: "G" },
  { value: "h", label: "H" },
  { value: "i", label: "I" },
  { value: "j", label: "J" },
  { value: "k", label: "K" },
  { value: "l", label: "L" },
  { value: "m", label: "M" },
  { value: "n", label: "N" },
  { value: "o", label: "O" },
  { value: "p", label: "P" },
  { value: "q", label: "Q" },
  { value: "r", label: "R" },
  { value: "s", label: "S" },
  { value: "t", label: "T" },
  { value: "u", label: "U" },
  { value: "v", label: "V" },
  { value: "w", label: "W" },
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "z", label: "Z" },
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" }
];

const DEFAULT_POU_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <ellipse cx="50" cy="52" rx="31" ry="38" fill="#9b6b43"/>
  <ellipse cx="39" cy="45" rx="5" ry="7" fill="#ffffff"/>
  <ellipse cx="61" cy="45" rx="5" ry="7" fill="#ffffff"/>
  <circle cx="40" cy="46" r="2.5" fill="#222222"/>
  <circle cx="60" cy="46" r="2.5" fill="#222222"/>
  <ellipse cx="50" cy="59" rx="9" ry="6" fill="#f5c7a5"/>
  <path d="M44 59 Q50 64 56 59" fill="none" stroke="#442b20" stroke-width="2" stroke-linecap="round"/>
</svg>
`;

let objects = [];
let selectedObjectIndex = 0;
let nextBlockId = 1;
let running = false;
let stopRequested = false;
let runToken = 0;

const definitions = {
  flag: {
    label: "🚩 Cuando se presione la bandera verde",
    color: "#d8a522",
    category: "event",
    hat: true
  },
  key: {
    label: "⌨️ Al presionar tecla",
    color: "#d8a522",
    category: "event",
    hat: true,
    inputs: [{ name: "key", label: "tecla", value: "ArrowUp", type: "key" }]
  },
  touch: {
    label: "👆 Al tocar objeto",
    color: "#d8a522",
    category: "event",
    hat: true
  },
  move: {
    label: "Mover",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "steps", label: "pasos", value: 10, type: "number" }]
  },
  left: {
    label: "↶ Girar",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "degrees", label: "grados", value: 15, type: "number" }]
  },
  right: {
    label: "↷ Girar",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "degrees", label: "grados", value: 15, type: "number" }]
  },
  turnRight: {
    label: "girar ↻",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "degrees", label: "grados", value: 15, type: "number" }]
  },
  turnLeft: {
    label: "girar ↺",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "degrees", label: "grados", value: 15, type: "number" }]
  },
  say: {
    label: "💬 Decir",
    color: "#9956c8",
    category: "look",
    inputs: [{ name: "text", label: "texto", value: "¡Hola!", type: "text" }]
  },
  sayHello: {
    label: "decir hola",
    color: "#9956c8",
    category: "look"
  },
  wait: {
    label: "esperar",
    color: "#ffab19",
    category: "control",
    inputs: [{ name: "seconds", label: "segundos", value: 1, type: "number" }]
  },
  repeat: {
    label: "repetir",
    color: "#ffab19",
    category: "control",
    inputs: [{ name: "times", label: "veces", value: 10, type: "number" }],
    container: true
  },
  forever: {
    label: "por siempre",
    color: "#ffab19",
    category: "control",
    container: true
  },
  if: {
    label: "si",
    color: "#ffab19",
    category: "control",
    inputs: [{ name: "condition", label: "condición", value: "true", type: "text" }],
    container: true
  },
  ifElse: {
    label: "si",
    color: "#ffab19",
    category: "control",
    inputs: [{ name: "condition", label: "condición", value: "true", type: "text" }],
    container: true,
    dualContainer: true
  },
  changeX: {
    label: "cambiar x por",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "amount", label: "cantidad", value: 10, type: "number" }]
  },
  changeY: {
    label: "cambiar y por",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "amount", label: "cantidad", value: 10, type: "number" }]
  },
  setX: {
    label: "fijar x a",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "amount", label: "x", value: 0, type: "number" }]
  },
  setY: {
    label: "fijar y a",
    color: "#368fe0",
    category: "motion",
    inputs: [{ name: "amount", label: "y", value: 0, type: "number" }]
  },
  hide: {
    label: "Ocultar",
    color: "#9956c8",
    category: "look"
  },
  show: {
    label: "Mostrar",
    color: "#9956c8",
    category: "look"
  }
};

function definition(type) {
  if (definitions[type]) return definitions[type];

  // Bloque sombrero "definir ..." (cuerpo del bloque personalizado)
  if (type && String(type).startsWith("define_")) {
    const baseType = String(type).slice("define_".length);
    const custom = customBlocks.find(block => block.type === baseType);
    if (custom) {
      const parts = ["definir " + custom.name];
      (custom.inputs || []).forEach(inp => {
        parts.push(inp.kind === "logic" || inp.label === "condición" ? "‹condición›" : "(" + (inp.label || inp.name) + ")");
      });
      return {
        label: parts.join(" "),
        color: custom.color || "#ff4d8d",
        inputs: [],
        container: true,
        hat: true,
        category: "custom",
        define: true,
        customBase: baseType
      };
    }
  }

  const custom = customBlocks.find(block => block.type === type);
  if (custom) {
    return {
      label: custom.name,
      color: custom.color || "#ff4d8d",
      inputs: (custom.inputs || []).map(inp => ({
        name: inp.name,
        label: inp.label || inp.name,
        value: inp.value != null ? inp.value : (inp.kind === "logic" ? "true" : ""),
        type: "text"
      })),
      container: false,
      custom: true,
      category: "custom"
    };
  }

  return null;
}

/** Busca el bloque sombrero "definir" y su cuerpo (bloques debajo en el mismo script) */
function findDefineBlock(object, customType) {
  const scripts = ensureScripts(object);
  const defineType = "define_" + customType;
  for (const script of scripts) {
    const blocks = script.blocks || [];
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === defineType) {
        return { hat: blocks[i], body: blocks.slice(i + 1), script };
      }
    }
  }
  return null;
}

/** Pila de argumentos de bloques personalizados (como variables locales) */
let customArgStack = [];

function currentCustomArgs() {
  return customArgStack.length ? customArgStack[customArgStack.length - 1] : {};
}

/** Evalúa expresión usando args del bloque personalizado como variables */
function evalWithCustomArgs(expr) {
  const args = currentCustomArgs();
  const names = Object.keys(args);
  const values = names.map(n => args[n]);
  try {
    return Function(...names, `"use strict"; return (${expr});`)(...values);
  } catch {
    try {
      return Function(`"use strict"; return (${expr});`)();
    } catch {
      return false;
    }
  }
}



/** Normaliza un objeto para que use scripts: [{x,y,blocks}] */
function ensureScripts(object) {
  if (!object) return;
  if (!Array.isArray(object.scripts)) {
    object.scripts = [];
    if (Array.isArray(object.blocks) && object.blocks.length) {
      object.scripts.push({ x: 20, y: 20, blocks: object.blocks });
    }
    object.blocks = []; // legacy
  }
  return object.scripts;
}

function makeBlock(type) {
  const def = definition(type);
  if (!def) return null;

  const block = {
    id: nextBlockId++,
    type,
    values: {},
    children: [],
    childrenElse: []
  };

  (def.inputs || []).forEach(input => {
    block.values[input.name] = input.value;
  });

  return block;
}

function selectObject(index) {
  if (!objects.length) {
    objects.push({
      name: "Personaje1",
      x: 0,
      y: 0,
      direction: 90,
      visible: true,
      svg: DEFAULT_POU_SVG,
      blocks: [],
      scripts: []
    });
  }

  selectedObjectIndex = Math.max(
    0,
    Math.min(index, objects.length - 1)
  );

  renderObjectList();
  renderWorkspace();
  renderStage();
}

function getSelectedObject() {
  return objects[selectedObjectIndex] || null;
}

function renderObjectList() {
  const list = $("spriteList") || $("objectList");
  if (!list) return;

  list.innerHTML = "";

  objects.forEach((object, index) => {
    const item = document.createElement("div");
    item.className = "spriteRow" + (index === selectedObjectIndex ? " active" : "");

    const thumb = document.createElement("div");
    thumb.className = "sprite-thumb";
    thumb.innerHTML = object.svg || DEFAULT_POU_SVG;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = object.name;
    nameSpan.style.flex = "1";
    nameSpan.style.marginLeft = "8px";
    nameSpan.style.overflow = "hidden";
    nameSpan.style.textOverflow = "ellipsis";

    const actions = document.createElement("div");
    actions.className = "sprite-actions";

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.title = "Exportar .ps1 (PousIDE Sprite)";
    exportBtn.textContent = "💾";
    exportBtn.addEventListener("click", event => {
      event.stopPropagation();
      exportSpritePS1(index);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.title = "Eliminar objeto";
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", event => {
      event.stopPropagation();
      deleteObject(index);
    });

    actions.appendChild(exportBtn);
    actions.appendChild(delBtn);

    item.appendChild(thumb);
    item.appendChild(nameSpan);
    item.appendChild(actions);
    item.addEventListener("click", () => selectObject(index));
    list.appendChild(item);
  });
}

function deleteObject(index) {
  if (objects.length <= 1) {
    uiAlert("Debe haber al menos un objeto.");
    return;
  }
  objects.splice(index, 1);
  if (selectedObjectIndex >= objects.length) {
    selectedObjectIndex = objects.length - 1;
  }
  selectObject(selectedObjectIndex);
}

function createBlankObject(name) {
  return {
    name: name || ("Personaje" + (objects.length + 1)),
    x: 0,
    y: 0,
    direction: 90,
    visible: true,
    svg: DEFAULT_POU_SVG,
    blocks: [],
    scripts: []
  };
}


function renderStage() {
  if (!stage) return;

  stage.innerHTML = "";

  objects.forEach(object => {
    if (!object.visible) return;

    const sprite = document.createElement("div");
    sprite.className = "sprite";

    sprite.style.left = `calc(50% + ${object.x}px)`;
    sprite.style.top = `calc(50% - ${object.y}px)`;
    sprite.style.transform = `translate(-50%, -50%) rotate(${object.direction - 90}deg)`;

    sprite.innerHTML = object.svg || DEFAULT_POU_SVG;
    stage.appendChild(sprite);
  });
}

function renderBlock(block) {
  const def = definition(block.type);
  if (!def) return document.createElement("div");

  const element = document.createElement("div");
  const cat = def.category || "motion";
  element.className = "block " + (def.hat ? "event hat" : "normal " + cat);
  element.style.background = def.color || "#4c97ff";
  element.dataset.id = block.id;
  element.dataset.type = block.type;

  const content = document.createElement("div");
  content.className = "blockContent";

  const label = document.createElement("span");
  label.className = "blockLabel";
  label.textContent = def.label;
  content.appendChild(label);

  (def.inputs || []).forEach(input => {
    // Selector de tecla integrado (sin escribir a mano)
    if (input.type === "key" || input.name === "key") {
      const select = document.createElement("select");
      select.className = "param wide key-select";
      select.setAttribute("aria-label", input.label || "tecla");
      const current = block.values[input.name] ?? input.value ?? "ArrowUp";
      KEY_OPTIONS.forEach(opt => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === current) o.selected = true;
        select.appendChild(o);
      });
      // Si el valor guardado no está en la lista, añadirlo
      if (![...select.options].some(o => o.value === current)) {
        const o = document.createElement("option");
        o.value = current;
        o.textContent = current;
        o.selected = true;
        select.appendChild(o);
      }
      select.addEventListener("pointerdown", event => {
        event.stopPropagation();
      });
      select.addEventListener("mousedown", event => {
        event.stopPropagation();
      });
      select.addEventListener("click", event => {
        event.stopPropagation();
      });
      select.addEventListener("touchstart", event => {
        event.stopPropagation();
      }, { passive: true });
      select.addEventListener("change", () => {
        block.values[input.name] = select.value;
      });
      content.appendChild(select);
      return;
    }

    const field = document.createElement("input");
    field.className = "param" + (input.type === "text" ? " wide" : "");
    field.type = input.type === "number" ? "number" : "text";
    field.value = block.values[input.name] ?? input.value ?? "";
    field.setAttribute("aria-label", input.label || input.name);
    field.title = input.label || input.name;

    if (input.name === "steps") {
      content.appendChild(field);
      const unit = document.createElement("span");
      unit.className = "blockUnit";
      unit.textContent = " pasos";
      content.appendChild(unit);
    } else if (input.name === "degrees") {
      content.appendChild(field);
      const unit = document.createElement("span");
      unit.className = "blockUnit";
      unit.textContent = "°";
      content.appendChild(unit);
    } else if (input.name === "seconds") {
      content.appendChild(field);
      const unit = document.createElement("span");
      unit.className = "blockUnit";
      unit.textContent = " segundos";
      content.appendChild(unit);
    } else if (input.name === "times") {
      content.appendChild(field);
      const unit = document.createElement("span");
      unit.className = "blockUnit";
      unit.textContent = " veces";
      content.appendChild(unit);
    } else {
      content.appendChild(field);
    }

    field.addEventListener("pointerdown", event => event.stopPropagation());
    field.addEventListener("input", () => {
      block.values[input.name] = field.type === "number"
        ? Number(field.value)
        : field.value;
    });
  });

  element.appendChild(content);

  // Clic derecho → menú contextual (Duplicar / Eliminar)
  element.addEventListener("contextmenu", event => {
    event.preventDefault();
    event.stopPropagation();
    showBlockContextMenu(event.clientX, event.clientY, block.id);
  });

  if (def.container) {
    element.classList.add("container-block");

    if (def.dualContainer) {
      const lab1 = document.createElement("div");
      lab1.className = "childStack-label";
      lab1.textContent = "entonces";
      element.appendChild(lab1);
    }

    if (!Array.isArray(block.children)) block.children = [];
    const childStack = document.createElement("div");
    childStack.className = "childStack";
    childStack.dataset.parentId = String(block.id);
    childStack.dataset.branch = "then";
    block.children.forEach(child => {
      childStack.appendChild(renderBlock(child));
    });
    element.appendChild(childStack);

    if (def.dualContainer) {
      const lab2 = document.createElement("div");
      lab2.className = "childStack-label";
      lab2.textContent = "si no";
      element.appendChild(lab2);

      if (!Array.isArray(block.childrenElse)) block.childrenElse = [];
      const elseStack = document.createElement("div");
      elseStack.className = "childStack";
      elseStack.dataset.parentId = String(block.id);
      elseStack.dataset.branch = "else";
      block.childrenElse.forEach(child => {
        elseStack.appendChild(renderBlock(child));
      });
      element.appendChild(elseStack);
    }
  }

  return element;
}

function removeBlockById(blocks, id) {
  const index = blocks.findIndex(block => block.id === id);

  if (index !== -1) {
    blocks.splice(index, 1);
    return true;
  }

  for (const block of blocks) {
    if (removeBlockById(block.children || [], id)) {
      return true;
    }
  }

  return false;
}

/** Busca el array padre y el índice de un bloque por id */
function findBlockLocation(blocksOrScripts, id, parent = null) {
  // Puede recibir object.scripts o un array de bloques
  const list = blocksOrScripts;
  if (!list) return null;

  // Si son scripts ({x,y,blocks})
  if (list.length && list[0] && Array.isArray(list[0].blocks)) {
    for (const script of list) {
      const found = findBlockLocation(script.blocks, id, script);
      if (found) {
        found.script = script;
        return found;
      }
    }
    return null;
  }

  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return { array: list, index: i, parent };
    }
    if (list[i].children && list[i].children.length) {
      const found = findBlockLocation(list[i].children, id, list[i]);
      if (found) return found;
    }
    if (list[i].childrenElse && list[i].childrenElse.length) {
      const found = findBlockLocation(list[i].childrenElse, id, list[i]);
      if (found) return found;
    }
  }
  return null;
}

function findScriptContaining(object, blockId) {
  const scripts = ensureScripts(object);
  for (const script of scripts) {
    if (scriptContains(script.blocks, blockId)) return script;
  }
  return null;
}

function scriptContains(blocks, id) {
  for (const b of blocks) {
    if (b.id === id) return true;
    if (b.children && scriptContains(b.children, id)) return true;
    if (b.childrenElse && scriptContains(b.childrenElse, id)) return true;
  }
  return false;
}

/** Clona en profundidad un bloque asignando nuevos ids */
function deepCloneBlock(block) {
  const clone = {
    id: nextBlockId++,
    type: block.type,
    values: { ...(block.values || {}) },
    children: [],
    childrenElse: []
  };
  if (Array.isArray(block.children)) {
    clone.children = block.children.map(child => deepCloneBlock(child));
  }
  if (Array.isArray(block.childrenElse)) {
    clone.childrenElse = block.childrenElse.map(child => deepCloneBlock(child));
  }
  return clone;
}

/** Elimina el bloque y todos los que van después en el mismo nivel */
function deleteFromBlockOnward(blockId) {
  const object = getSelectedObject();
  if (!object) return;
  const scripts = ensureScripts(object);

  const loc = findBlockLocation(scripts, blockId);
  if (!loc) return;

  loc.array.splice(loc.index);
  // Si el script quedó vacío, eliminarlo
  if (loc.script && loc.script.blocks.length === 0) {
    const si = scripts.indexOf(loc.script);
    if (si >= 0) scripts.splice(si, 1);
  }
  renderWorkspace();
}

/** Duplica el bloque y todos los que van después en el mismo nivel */
function duplicateFromBlockOnward(blockId) {
  const object = getSelectedObject();
  if (!object) return;
  const scripts = ensureScripts(object);

  const loc = findBlockLocation(scripts, blockId);
  if (!loc) return;

  const segment = loc.array.slice(loc.index);
  const clones = segment.map(b => deepCloneBlock(b));

  // Si es top-level del script, crear un script nuevo al lado
  if (loc.array === loc.script.blocks && loc.index === 0) {
    scripts.push({
      x: (loc.script.x || 20) + 40,
      y: (loc.script.y || 20) + 40,
      blocks: clones
    });
  } else {
    loc.array.splice(loc.index + segment.length, 0, ...clones);
  }
  renderWorkspace();
}

// ========================================
// MENÚ CONTEXTUAL (clic derecho)
// ========================================

let contextMenuEl = null;

function hideBlockContextMenu() {
  if (contextMenuEl && contextMenuEl.parentNode) {
    contextMenuEl.remove();
  }
  contextMenuEl = null;
}

function showBlockContextMenu(x, y, blockId) {
  hideBlockContextMenu();

  const menu = document.createElement("div");
  menu.className = "block-context-menu";
  menu.innerHTML = `
    <button type="button" data-action="duplicate">📋 Duplicar</button>
    <button type="button" data-action="delete">🗑️ Eliminar</button>
  `;

  Object.assign(menu.style, {
    position: "fixed",
    left: x + "px",
    top: y + "px",
    zIndex: "1000000"
  });

  menu.addEventListener("click", event => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    hideBlockContextMenu();

    if (action === "duplicate") {
      duplicateFromBlockOnward(blockId);
    } else if (action === "delete") {
      deleteFromBlockOnward(blockId);
    }
  });

  // Evitar que el clic en el menú se propague
  menu.addEventListener("contextmenu", e => e.preventDefault());

  document.body.appendChild(menu);
  contextMenuEl = menu;

  // Cerrar al hacer clic fuera o al presionar Escape
  const onOutside = event => {
    if (!menu.contains(event.target)) {
      hideBlockContextMenu();
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    }
  };
  const onKey = event => {
    if (event.key === "Escape") {
      hideBlockContextMenu();
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    }
  };

  // Usar setTimeout para no cerrar inmediatamente por el mismo clic derecho
  setTimeout(() => {
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
  }, 0);
}

function renderWorkspace() {
  if (!workspace) return;
  workspace.innerHTML = "";

  const object = getSelectedObject();
  if (!object) return;
  const scripts = ensureScripts(object);

  if (!scripts.length) {
    const empty = document.createElement("div");
    empty.id = "empty";
    empty.innerHTML = "🧩<br>Arrastra bloques aquí<br>Puedes dejarlos sueltos o conectarlos";
    workspace.appendChild(empty);
    return;
  }

  scripts.forEach((script, scriptIndex) => {
    const stack = document.createElement("div");
    stack.className = "stack free-stack";
    stack.dataset.scriptIndex = scriptIndex;
    stack.style.position = "absolute";
    stack.style.left = (script.x ?? 20) + "px";
    stack.style.top = (script.y ?? 20) + "px";

    script.blocks.forEach(block => {
      stack.appendChild(renderBlock(block));
    });

    workspace.appendChild(stack);
    attachDrag(stack, object, script);
  });
}

// ========================================
// PARTE 3: ARRASTRE Y EJECUCIÓN
// ========================================


/** Inserta un segmento de bloques en el punto de drop (stack o interior de contenedor) */
function insertAtDropPoint(object, segment, clientX, clientY) {
  const scripts = ensureScripts(object);
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) {
    scripts.push({ x: 40, y: 40, blocks: segment });
    return;
  }

  // Interior de un contenedor (repetir / si / por siempre / si-no)
  const childStack = el.closest(".childStack");
  if (childStack && childStack.dataset.parentId) {
    const parentId = Number(childStack.dataset.parentId);
    const branch = childStack.dataset.branch || "then";
    const loc = findBlockLocation(scripts, parentId);
    if (loc) {
      const parentBlock = loc.array[loc.index];
      if (!parentBlock.children) parentBlock.children = [];
      if (!parentBlock.childrenElse) parentBlock.childrenElse = [];
      const arr = branch === "else" ? parentBlock.childrenElse : parentBlock.children;
      // ¿Soltar sobre un hijo concreto?
      const innerBlock = el.closest(".childStack .block:not(.block-ghost)");
      if (innerBlock && Number(innerBlock.dataset.id) !== parentId) {
        const innerId = Number(innerBlock.dataset.id);
        const ii = arr.findIndex(b => b.id === innerId);
        if (ii >= 0) {
          arr.splice(ii + 1, 0, ...segment);
          return;
        }
      }
      arr.push(...segment);
      return;
    }
  }

  // Conectar debajo de un bloque del workspace
  const targetBlock = el.closest(".free-stack .block:not(.block-ghost)");
  if (targetBlock) {
    const targetId = Number(targetBlock.dataset.id);
    const tLoc = findBlockLocation(scripts, targetId);
    if (tLoc) {
      tLoc.array.splice(tLoc.index + 1, 0, ...segment);
      return;
    }
  }

  // Nuevo script libre
  const wsRect = workspace.getBoundingClientRect();
  scripts.push({
    x: Math.max(0, clientX - wsRect.left + (workspace.scrollLeft || 0) - 40),
    y: Math.max(0, clientY - wsRect.top + (workspace.scrollTop || 0) - 20),
    blocks: segment
  });
}

function attachDrag(stack, object, script) {
  // Arrastre libre de stacks. Soltar fuera/paleta = eliminar.
  // Soltar cerca de otro stack = conectar.
  if (!script) return;

  const topBlocks = stack.querySelectorAll(":scope > .block");
  topBlocks.forEach((element, domIndex) => {
    element.style.touchAction = "none";
    element.style.cursor = "grab";

    element.addEventListener("pointerdown", event => {
      if (event.target.closest("input, button, select, option, .key-select, .param")) return;
      if (event.button !== 0 && event.pointerType !== "touch") return;

      const blockId = Number(element.dataset.id);
      const startX = event.clientX;
      const startY = event.clientY;
      const stackRect = stack.getBoundingClientRect();
      const offsetX = event.clientX - stackRect.left;
      const offsetY = event.clientY - stackRect.top;
      let moved = false;
      let ghost = null;
      let segmentElements = [];
      const isTopOfScript = !!(element.parentElement && element.parentElement.classList.contains("stack"));

      const onMove = moveEvent => {
        if (moveEvent.pointerId !== event.pointerId) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (Math.abs(dx) + Math.abs(dy) > 5) {
          if (!moved) {
            moved = true;
            const allTop = [...stack.querySelectorAll(":scope > .block")];
            const startDom = allTop.findIndex(el => Number(el.dataset.id) === blockId);
            segmentElements = startDom >= 0 ? allTop.slice(startDom) : [element];

            // Si movemos desde el primer bloque, movemos todo el stack
            if (isTopOfScript) {
              ghost = stack.cloneNode(true);
              ghost.classList.add("block-ghost");
              ghost.querySelectorAll("input, button").forEach(el => { el.disabled = true; });
              Object.assign(ghost.style, {
                position: "fixed",
                left: stackRect.left + "px",
                top: stackRect.top + "px",
                width: stackRect.width + "px",
                margin: "0",
                zIndex: "999999",
                opacity: "1",
                pointerEvents: "none",
                boxShadow: "0 14px 32px rgba(0,0,0,0.45)",
                transform: "scale(1.03)"
              });
              document.body.appendChild(ghost);
              stack.style.opacity = "0.3";
            } else {
              ghost = element.cloneNode(true);
              ghost.classList.add("block-ghost");
              ghost.querySelectorAll("input, button").forEach(el => el.remove());
              if (segmentElements.length > 1) {
                const badge = document.createElement("div");
                badge.textContent = "+" + (segmentElements.length - 1);
                Object.assign(badge.style, {
                  position: "absolute", right: "-10px", top: "-10px",
                  background: "#d94959", color: "white", borderRadius: "50%",
                  width: "24px", height: "24px", fontSize: "11px", fontWeight: "bold",
                  display: "flex", alignItems: "center", justifyContent: "center"
                });
                ghost.appendChild(badge);
              }
              Object.assign(ghost.style, {
                position: "fixed",
                left: element.getBoundingClientRect().left + "px",
                top: element.getBoundingClientRect().top + "px",
                width: element.getBoundingClientRect().width + "px",
                margin: "0", zIndex: "999999", opacity: "1",
                pointerEvents: "none", transform: "scale(1.05)",
                boxShadow: "0 14px 32px rgba(0,0,0,0.55)"
              });
              document.body.appendChild(ghost);
              segmentElements.forEach(el => { el.style.opacity = "0.35"; });
            }
          }
        }

        if (moved && ghost) {
          if (isTopOfScript) {
            ghost.style.left = (moveEvent.clientX - offsetX) + "px";
            ghost.style.top = (moveEvent.clientY - offsetY) + "px";
          } else {
            const r = element.getBoundingClientRect();
            ghost.style.left = (moveEvent.clientX - (startX - r.left)) + "px";
            ghost.style.top = (moveEvent.clientY - (startY - r.top)) + "px";
          }

          const wsRect = workspace.getBoundingClientRect();
          const palette = $("palette") || $("basePalette");
          const palRect = palette ? palette.getBoundingClientRect() : null;
          const overWs =
            moveEvent.clientX >= wsRect.left && moveEvent.clientX <= wsRect.right &&
            moveEvent.clientY >= wsRect.top && moveEvent.clientY <= wsRect.bottom;
          const overPal = palRect &&
            moveEvent.clientX >= palRect.left && moveEvent.clientX <= palRect.right &&
            moveEvent.clientY >= palRect.top && moveEvent.clientY <= palRect.bottom;

          if (!overWs || overPal) {
            ghost.style.filter = "brightness(0.7) saturate(0.5)";
            ghost.style.outline = "2px solid #d94959";
          } else {
            ghost.style.filter = "";
            ghost.style.outline = "none";
          }
        }
      };

      const cleanup = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onCancel);
        if (ghost && ghost.parentNode) ghost.remove();
        stack.style.opacity = "";
        segmentElements.forEach(el => { el.style.opacity = ""; el.style.cursor = "grab"; });
      };

      const onUp = upEvent => {
        if (upEvent.pointerId !== event.pointerId) return;
        cleanup();
        if (!moved) return;

        const scripts = ensureScripts(object);
        const wsRect = workspace.getBoundingClientRect();
        const palette = $("palette") || $("basePalette");
        const palRect = palette ? palette.getBoundingClientRect() : null;

        const inside =
          upEvent.clientX >= wsRect.left && upEvent.clientX <= wsRect.right &&
          upEvent.clientY >= wsRect.top && upEvent.clientY <= wsRect.bottom;
        const overPal = palRect &&
          upEvent.clientX >= palRect.left && upEvent.clientX <= palRect.right &&
          upEvent.clientY >= palRect.top && upEvent.clientY <= palRect.bottom;

        if (!inside || overPal) {
          deleteFromBlockOnward(blockId);
          return;
        }

        // Mover stack completo (desde el primer bloque)
        if (isTopOfScript) {
          script.x = Math.max(0, upEvent.clientX - offsetX - wsRect.left + (workspace.scrollLeft || 0));
          script.y = Math.max(0, upEvent.clientY - offsetY - wsRect.top + (workspace.scrollTop || 0));

          const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
          const childStack = target && target.closest(".childStack");
          if (childStack && childStack.dataset.parentId) {
            const moving = script.blocks.splice(0);
            const si = scripts.indexOf(script);
            if (si >= 0) scripts.splice(si, 1);
            insertAtDropPoint(object, moving, upEvent.clientX, upEvent.clientY);
            renderWorkspace();
            return;
          }
          const targetBlock = target && target.closest(".free-stack .block:not(.block-ghost)");
          if (targetBlock) {
            const targetId = Number(targetBlock.dataset.id);
            const otherScript = findScriptContaining(object, targetId);
            if (otherScript && otherScript !== script) {
              const loc = findBlockLocation(otherScript.blocks, targetId);
              if (loc) {
                const moving = script.blocks.splice(0);
                loc.array.splice(loc.index + 1, 0, ...moving);
                const si = scripts.indexOf(script);
                if (si >= 0) scripts.splice(si, 1);
              }
            }
          }
          renderWorkspace();
          return;
        }

        // Segmento: sacar del array actual e insertar en drop (incluye interiores)
        const locNow = findBlockLocation(scripts, blockId);
        if (!locNow) return;

        const segment = locNow.array.splice(locNow.index);
        if (locNow.script && locNow.script.blocks.length === 0) {
          const si = scripts.indexOf(locNow.script);
          if (si >= 0) scripts.splice(si, 1);
        }

        insertAtDropPoint(object, segment, upEvent.clientX, upEvent.clientY);
        renderWorkspace();
      };

      const onCancel = () => cleanup();
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onCancel);
      event.preventDefault();
    });
  });
}


function addBlock(type, x, y) {
  const object = getSelectedObject();
  if (!object) return;

  const block = makeBlock(type);
  if (!block) return;

  const scripts = ensureScripts(object);
  const wsRect = workspace.getBoundingClientRect();

  // Posición relativa al workspace
  let relX = 30;
  let relY = 30;
  if (typeof x === "number" && typeof y === "number") {
    relX = Math.max(8, x - wsRect.left + (workspace.scrollLeft || 0));
    relY = Math.max(8, y - wsRect.top + (workspace.scrollTop || 0));
  }

  scripts.push({
    x: relX,
    y: relY,
    blocks: [block]
  });
  renderWorkspace();
}


let paletteDragState = null;
let paletteSuppressClick = false;
let paletteClickReset = null;

function removePaletteGhost() {
  if (!paletteDragState) return;

  const state = paletteDragState;
  paletteDragState = null;

  if (state.element) {
    state.element.style.opacity = "";
    state.element.style.cursor = "grab";
  }

  if (state.ghost && state.ghost.parentNode) {
    state.ghost.remove();
  }
}

function wirePalette(root) {
  if (!root) return;

  root.querySelectorAll(".paletteBlock").forEach(element => {
    if (element.dataset.paletteWired === "true") return;

    element.dataset.paletteWired = "true";
    element.draggable = false;
    element.style.touchAction = "none";
    element.style.cursor = "grab";

    element.addEventListener("pointerdown", event => {
      if (event.button !== 0 && event.pointerType !== "touch") return;
      if (paletteDragState) return;
      if (event.target.closest("button, input")) return;

      const rect = element.getBoundingClientRect();
      const ghost = element.cloneNode(true);

      ghost.removeAttribute("id");
      ghost.classList.add("palette-ghost");

      Object.assign(ghost.style, {
        position: "fixed",
        left: rect.left + "px",
        top: rect.top + "px",
        width: rect.width + "px",
        height: rect.height + "px",
        margin: "0",
        zIndex: "999999",
        opacity: "1",
        transform: "scale(1.06)",
        boxShadow: "0 14px 32px rgba(0,0,0,0.55)",
        pointerEvents: "none",
        transition: "none",
        cursor: "grabbing",
        filter: "brightness(1.05)",
        borderRadius: "7px"
      });

      document.body.appendChild(ghost);
      element.style.opacity = "0.4";
      element.style.cursor = "grabbing";

      paletteDragState = {
        element,
        type: element.dataset.type,
        ghost,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false
      };

      paletteSuppressClick = false;
      event.preventDefault();
    });
  });
}

document.addEventListener("pointermove", event => {
  const drag = paletteDragState;

  if (!drag || event.pointerId !== drag.pointerId) return;

  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  if (Math.abs(dx) + Math.abs(dy) > 5) {
    drag.moved = true;
  }

  if (!drag.moved) return;

  drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
  drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
}, { passive: true });

function finishPaletteDrag(event) {
  const drag = paletteDragState;

  if (!drag || event.pointerId !== drag.pointerId) return;

  const type = drag.type;
  const moved = drag.moved;
  const x = event.clientX;
  const y = event.clientY;
  const rect = workspace.getBoundingClientRect();

  const insideWorkspace =
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom;

  removePaletteGhost();

  if (moved) {
    paletteSuppressClick = true;
    clearTimeout(paletteClickReset);

    paletteClickReset = setTimeout(() => {
      paletteSuppressClick = false;
    }, 350);

    if (insideWorkspace && definition(type)) {
      addBlock(type, x, y);
    }
  } else {
    // Un toque sin arrastrar también agrega el bloque.
    const workspaceRect = workspace.getBoundingClientRect();
    addBlock(type, workspaceRect.left + 35, workspaceRect.top + 35);
  }
}

document.addEventListener("pointerup", finishPaletteDrag);

document.addEventListener("pointercancel", event => {
  if (
    paletteDragState &&
    event.pointerId === paletteDragState.pointerId
  ) {
    removePaletteGhost();
  }
});

// ========================================
// EJECUCIÓN DE BLOQUES
// ========================================

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function runStack(blocks, object, token) {
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    if (stopRequested || token !== runToken) return;

    // Si es un sombrero "definir", su cuerpo son los bloques de debajo:
    // no se ejecutan aquí (solo al llamar el bloque personalizado).
    if (String(block.type).startsWith("define_")) {
      break;
    }

    const value = name => block.values[name];

    switch (block.type) {
      case "move":
        object.x += Math.cos(object.direction * Math.PI / 180) *
          Number(value("steps") || 0);
        object.y += Math.sin(object.direction * Math.PI / 180) *
          Number(value("steps") || 0);
        break;

      case "turnRight":
      case "right":
        object.direction += Number(value("degrees") || 0);
        break;

      case "turnLeft":
      case "left":
        object.direction -= Number(value("degrees") || 0);
        break;

      case "changeX":
        object.x += Number(value("amount") || 0);
        break;

      case "changeY":
        object.y += Number(value("amount") || 0);
        break;

      case "setX":
        object.x = Number(value("amount") || 0);
        break;

      case "setY":
        object.y = Number(value("amount") || 0);
        break;

      case "say": {
        let msg = String(value("text") ?? "");
        const args = currentCustomArgs();
        Object.keys(args).forEach(k => {
          msg = msg.split(k).join(String(args[k]));
        });
        showSpeech(object, msg);
        break;
      }

      case "sayHello":
        showSpeech(object, "¡Hola!");
        break;

      case "wait":
        await sleep(Math.max(0, Number(value("seconds") || 0) * 1000));
        break;

      case "show":
        object.visible = true;
        break;

      case "hide":
        object.visible = false;
        break;

      case "repeat": {
        const times = Math.max(
          0,
          Math.min(1000, Math.floor(Number(value("times") || 0)))
        );

        for (let i = 0; i < times; i++) {
          if (stopRequested || token !== runToken) return;
          await runStack(block.children || [], object, token);
        }
        break;
      }

      case "forever":
        while (!stopRequested && token === runToken) {
          await runStack(block.children || [], object, token);
          await sleep(20);
        }
        break;

      case "if": {
        let condition = false;
        try {
          condition = Boolean(evalWithCustomArgs(String(value("condition") ?? "false")));
        } catch {
          condition = false;
        }
        if (condition) {
          await runStack(block.children || [], object, token);
        }
        break;
      }

      case "ifElse": {
        let condition = false;
        try {
          condition = Boolean(evalWithCustomArgs(String(value("condition") ?? "false")));
        } catch {
          condition = false;
        }
        if (condition) {
          await runStack(block.children || [], object, token);
        } else {
          await runStack(block.childrenElse || [], object, token);
        }
        break;
      }

      default: {
        // Sombrero "definir ...": no se ejecuta solo; solo al llamar el bloque
        if (String(block.type).startsWith("define_")) {
          break;
        }

        const custom = customBlocks.find(item => item.type === block.type);
        if (custom) {
          // Entradas como variables/condiciones locales (arg0, arg1, …)
          const args = {};
          (custom.inputs || []).forEach(inp => {
            const raw = value(inp.name);
            if (inp.kind === "logic" || inp.label === "condición") {
              try {
                args[inp.name] = Boolean(evalWithCustomArgs(String(raw ?? "false")));
              } catch {
                args[inp.name] = false;
              }
            } else {
              const num = Number(raw);
              args[inp.name] =
                raw !== "" && raw != null && !Number.isNaN(num) && String(num) === String(raw).trim()
                  ? num
                  : String(raw ?? "");
            }
            if (inp.label) {
              args[String(inp.label).replace(/\s+/g, "_")] = args[inp.name];
            }
          });

          customArgStack.push(args);
          try {
            const found = findDefineBlock(object, custom.type);
            let body = [];
            if (found) {
              // Preferir hijos del sombrero si existen; si no, bloques debajo en el script
              body = (found.hat.children && found.hat.children.length)
                ? found.hat.children
                : (found.body || []);
            } else if (Array.isArray(custom.blocks)) {
              body = custom.blocks;
            }
            await runStack(body, object, token);
          } finally {
            customArgStack.pop();
          }
        }
        break;
      }
    }

    renderStage();
    await sleep(20);
  }
}

function showSpeech(object, message) {
  const bubble = document.createElement("div");

  bubble.className = "speechBubble";
  bubble.textContent = message;

  const sprite = [...stage.children].find(element =>
    element.innerHTML === object.svg
  );

  if (sprite) {
    sprite.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 2500);
  }
}

async function runProgram() {
  const object = getSelectedObject();
  if (!object || running) return;

  running = true;
  stopRequested = false;

  const token = ++runToken;

  try {
    const scripts = ensureScripts(object);
    for (const script of scripts) {
      if (stopRequested || token !== runToken) break;
      await runStack(script.blocks, object, token);
    }
  } catch (error) {
    console.error("Error ejecutando PousIDE:", error);
    uiAlert(`Ocurrió un error al ejecutar el programa:\n${error.message}`);
  } finally {
    if (token === runToken) {
      running = false;
      renderStage();
    }
  }
}

function stopProgram() {
  stopRequested = true;
  runToken++;
  running = false;
}

function clearWorkspace() {
  const object = getSelectedObject();
  if (!object) return;
  object.scripts = [];
  object.blocks = [];
  renderWorkspace();
}
// ========================================
// PARTE 4: BLOQUES PERSONALIZADOS Y BOTONES
// ========================================

let customBlocks = [];

function renderMyBlocks() {
  const palette = $("myBlocks");
  if (!palette) return;

  palette.innerHTML = "";

  customBlocks.forEach(block => {
    const element = document.createElement("div");
    element.className = "paletteBlock";
    element.dataset.type = block.type;
    element.textContent = block.name;
    element.style.background = block.color || "#9966ff";
    element.draggable = false;

    palette.appendChild(element);
  });

  wirePalette(palette);
}

function createCustomBlock(name, color = "#9966ff") {
  const type = `custom_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  customBlocks.push({
    type,
    name,
    color,
    inputs: [],
    blocks: []
  });

  renderMyBlocks();
}

/** Serializa un objeto a texto .ps1 puro (sin descargar) */
function objectToPS1Text(object) {
  const svgPart = (object.svg || DEFAULT_POU_SVG).trim();
  const scriptsData = JSON.stringify(ensureScripts(object));
  const lines = [
    "PS1/1",
    "NAME " + String(object.name || "Sprite").replace(/[\r\n]/g, " "),
    "DIR " + (typeof object.direction === "number" ? object.direction : 90),
    "VIS " + (object.visible === false ? "0" : "1"),
    "COSTUME " + ps1Encode(svgPart),
    "SCRIPTS " + ps1Encode(scriptsData)
  ];
  // Bloques personalizados locales van dentro del .ps1
  if (customBlocks && customBlocks.length) {
    lines.push("CUSTOM " + ps1Encode(JSON.stringify(customBlocks)));
  }
  lines.push("END");
  return lines.join("\n") + "\n";
}

/** Gzip + Base64 (si el navegador lo soporta) */
async function compressToBase64(text) {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const bytes = new TextEncoder().encode(text);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const buf = await new Response(stream).arrayBuffer();
    const arr = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < arr.length; i += chunk) {
      binary += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
    }
    return btoa(binary);
  } catch (e) {
    console.warn("compress failed", e);
    return null;
  }
}

async function decompressFromBase64(b64) {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const binary = atob(String(b64 || "").replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch (e) {
    console.warn("decompress failed", e);
    return null;
  }
}

/**
 * Formato .pp1 = archivo de proyecto PousIDE.
 * Empaqueta varios .ps1 (sprites) como un contenedor tipo “zip” propio.
 *
 * PP1/1
 * Z 1          ← 1 = payload gzip+base64, 0 = texto plano
 * PAYLOAD
 * ...datos...
 * END
 *
 * Payload interno:
 *   SPRITE
 *   <contenido .ps1>
 *   ENDSPRITE
 *   ...
 *   CUSTOM <base64 de bloques personalizados>
 */
function buildPP1Payload() {
  const parts = [];
  objects.forEach(object => {
    parts.push("SPRITE");
    parts.push(objectToPS1Text(object).trim());
    parts.push("ENDSPRITE");
  });
  if (customBlocks && customBlocks.length) {
    parts.push("CUSTOM " + ps1Encode(JSON.stringify(customBlocks)));
  }
  return parts.join("\n") + "\n";
}

function parsePP1Payload(payload) {
  const sprites = [];
  let custom = [];
  const lines = String(payload || "").split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === "SPRITE") {
      const buf = [];
      i++;
      while (i < lines.length && lines[i] !== "ENDSPRITE") {
        buf.push(lines[i]);
        i++;
      }
      const parsed = parsePS1(buf.join("\n"));
      sprites.push(parsed);
    } else if (line.startsWith("CUSTOM ")) {
      try {
        const decoded = ps1Decode(line.slice(7).trim());
        const arr = JSON.parse(decoded);
        if (Array.isArray(arr)) custom = arr;
      } catch (_) {}
    }
    i++;
  }
  return { sprites, custom };
}

async function exportProject() {
  const inner = buildPP1Payload();
  const compressed = await compressToBase64(inner);

  let content;
  if (compressed) {
    content = ["PP1/1", "Z 1", "PAYLOAD", compressed, "END"].join("\n") + "\n";
  } else {
    content = ["PP1/1", "Z 0", "PAYLOAD", inner, "END"].join("\n") + "\n";
  }

  const blob = new Blob([content], { type: "application/x-pouside-project" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pouside-project.pp1";
  link.click();
  URL.revokeObjectURL(url);
}

async function importProjectFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const raw = String(reader.result || "").trim();

      // Compatibilidad: JSON antiguo
      if (raw.startsWith("{")) {
        const data = JSON.parse(raw);
        if (!Array.isArray(data.objects)) {
          throw new Error("El archivo no contiene una lista válida de personajes.");
        }
        objects = data.objects;
        customBlocks = Array.isArray(data.customBlocks) ? data.customBlocks : [];
        objects.forEach(o => ensureScripts(o));
        if (!objects.length) objects.push(createBlankObject("Personaje1"));
        selectedObjectIndex = 0;
        renderMyBlocks();
        selectObject(0);
        uiAlert("¡Proyecto cargado correctamente!");
        return;
      }

      if (!raw.startsWith("PP1/")) {
        throw new Error("No es un archivo .pp1 válido (debe empezar por PP1/).");
      }

      const lines = raw.split(/\r?\n/);
      let zipped = false;
      let payloadStart = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("Z ")) zipped = lines[i].slice(2).trim() === "1";
        if (lines[i] === "PAYLOAD") {
          payloadStart = i + 1;
          break;
        }
      }
      if (payloadStart < 0) throw new Error("No se encontró PAYLOAD en el .pp1");

      let payloadLines = lines.slice(payloadStart);
      if (payloadLines.length && payloadLines[payloadLines.length - 1] === "END") {
        payloadLines = payloadLines.slice(0, -1);
      }
      let payload = payloadLines.join("\n");

      if (zipped) {
        const decompressed = await decompressFromBase64(payload.replace(/\s+/g, ""));
        if (!decompressed) {
          throw new Error("No se pudo descomprimir el .pp1 (gzip no soportado o datos corruptos).");
        }
        payload = decompressed;
      }

      const { sprites, custom } = parsePP1Payload(payload);
      if (!sprites.length) {
        throw new Error("El .pp1 no contiene ningún sprite .ps1.");
      }

      objects = sprites.map(s => {
        const obj = createBlankObject(s.name);
        obj.svg = s.svg || DEFAULT_POU_SVG;
        obj.scripts = Array.isArray(s.scripts) ? s.scripts : [];
        obj.direction = typeof s.direction === "number" ? s.direction : 90;
        obj.visible = s.visible !== false;
        return obj;
      });
      customBlocks = custom;
      selectedObjectIndex = 0;
      renderMyBlocks();
      selectObject(0);
      uiAlert("¡Proyecto .pp1 cargado (" + objects.length + " objetos)!");
    } catch (error) {
      uiAlert("No se pudo cargar el proyecto:\n" + error.message);
    }
  };
  reader.readAsText(file);
}

// ========================================
// CONEXIÓN DE BOTONES
// ========================================

function connectButton(id, callback) {
  const element = $(id);
  if (element) element.addEventListener("click", callback);
}

connectButton("runButton", runProgram);
connectButton("stopButton", stopProgram);
connectButton("clearButton", clearWorkspace);
connectButton("runObject", runProgram);
connectButton("deleteAll", clearWorkspace);
connectButton("green", runProgram);
connectButton("green2", runProgram);
connectButton("stop", stopProgram);
connectButton("stop2", stopProgram);

connectButton("resetButton", () => {
  stopProgram();
  objects.forEach(object => {
    object.x = 0;
    object.y = 0;
    object.direction = 90;
    object.visible = true;
  });
  renderStage();
});

connectButton("addObjectButton", () => {
  objects.push({
    name: `Personaje${objects.length + 1}`,
    x: 0,
    y: 0,
    direction: 90,
    visible: true,
    svg: DEFAULT_POU_SVG,
    blocks: [],
    scripts: []
  });
  selectObject(objects.length - 1);
});

connectButton("openAddObjectMenu", toggleAddObjectMenu);

connectButton("exportButton", exportProject);
connectButton("exportPP1", exportProject);
connectButton("importPP1", () => {
  const input = $("fileInputPP1");
  if (input) { input.value = ""; input.click(); }
});
const fileInputPP1 = $("fileInputPP1");
if (fileInputPP1) {
  fileInputPP1.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    importProjectFile(file);
    event.target.value = "";
  });
}


const importInput = $("importInput");
if (importInput) {
  importInput.addEventListener("change", event => {
    const file = event.target.files?.[0];
    importProjectFile(file);
    event.target.value = "";
  });
}

// ========================================
// INICIALIZACIÓN
// ========================================


// ========================================
// EDITOR DE BLOQUE PERSONALIZADO
// ========================================

let customDraft = { name: "nombre del bloque", inputs: [], runInstant: false };

function openCustomBlockModal() {
  customDraft = { name: "nombre del bloque", inputs: [], runInstant: false };
  const modal = $("modal");
  if (!modal) return;
  updateCustomPreview();
  modal.classList.add("open");
  const check = $("runInstantCheck");
  if (check) check.checked = false;
}

function closeCustomBlockModal() {
  const modal = $("modal");
  if (modal) modal.classList.remove("open");
}

function updateCustomPreview() {
  const container = $("blockPreviewContainer");
  if (!container) return;
  container.innerHTML = "";
  container.className = "modal-block-preview";

  // Nombre editable
  const nameInput = document.createElement("input");
  nameInput.className = "preview-text";
  nameInput.value = customDraft.name;
  nameInput.placeholder = "nombre del bloque";
  nameInput.addEventListener("input", () => {
    customDraft.name = nameInput.value || "nombre del bloque";
  });
  container.appendChild(nameInput);

  customDraft.inputs.forEach((inp, i) => {
    if (inp.kind === "label") {
      const span = document.createElement("span");
      span.textContent = inp.value || "texto";
      span.style.cursor = "pointer";
      span.title = "Clic para editar";
      span.addEventListener("click", () => {
        const v = prompt("Etiqueta:", inp.value);
        if (v !== null) { inp.value = v; updateCustomPreview(); }
      });
      container.appendChild(span);
    } else if (inp.kind === "logic") {
      const bool = document.createElement("span");
      bool.className = "preview-bool";
      bool.title = "Entrada lógica";
      container.appendChild(bool);
    } else {
      const field = document.createElement("input");
      field.value = inp.value || "1";
      field.style.width = "48px";
      field.addEventListener("input", () => { inp.value = field.value; });
      container.appendChild(field);
    }
  });
}

function saveCustomFromModal() {
  const name = (customDraft.name || "mi bloque").trim();
  if (!name) {
    uiAlert("Pon un nombre al bloque");
    return;
  }
  const type = "custom_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  let argIndex = 0;
  const inputs = [];
  customDraft.inputs.forEach(inp => {
    if (inp.kind === "label") return;
    const isLogic = inp.kind === "logic";
    inputs.push({
      name: "arg" + argIndex,
      label: isLogic ? "condición" : (inp.value && inp.kind === "number" ? "número" : "texto"),
      value: isLogic ? "true" : (inp.value || ""),
      type: "text",
      kind: isLogic ? "logic" : "text"
    });
    argIndex++;
  });

  const entry = {
    type,
    name,
    color: "#ff4d8d",
    inputs,
    blocks: [],
    runInstant: !!customDraft.runInstant,
    labels: customDraft.inputs.filter(i => i.kind === "label").map(i => i.value)
  };
  customBlocks.push(entry);

  // Crear bloque sombrero "definir ..." en el workspace del objeto actual
  const object = getSelectedObject();
  if (object) {
    const scripts = ensureScripts(object);
    const defineBlock = makeBlock("define_" + type);
    if (defineBlock) {
      defineBlock.children = [];
      scripts.push({
        x: 40 + scripts.length * 24,
        y: 40 + scripts.length * 16,
        blocks: [defineBlock]
      });
    }
  }

  renderMyBlocks();
  renderWorkspace();
  closeCustomBlockModal();
  switchEditorTab("code");
  uiAlert(
    'Bloque "' + name + '" creado.\n' +
    "• Sombrero «definir» en el workspace: ahí va el cuerpo.\n" +
    "• En «Mis bloques» está la pieza para usarlo.\n" +
    "• Las entradas (texto/condición) se usan como variables (arg0, arg1…)."
  );
}

connectButton("createCustom", openCustomBlockModal);
connectButton("cancelModal", closeCustomBlockModal);
connectButton("saveCustom", saveCustomFromModal);
connectButton("clearPreviewBtn", () => {
  customDraft = { name: "nombre del bloque", inputs: [], runInstant: false };
  updateCustomPreview();
});
connectButton("addParamNumber", () => {
  customDraft.inputs.push({ kind: "number", value: "1" });
  updateCustomPreview();
});
connectButton("addParamLogic", () => {
  customDraft.inputs.push({ kind: "logic", value: "true" });
  updateCustomPreview();
});
connectButton("addLabel", () => {
  customDraft.inputs.push({ kind: "label", value: "texto" });
  updateCustomPreview();
});
const runCheck = $("runInstantCheck");
if (runCheck) {
  runCheck.addEventListener("change", () => {
    customDraft.runInstant = runCheck.checked;
  });
}


// ========================================
// PESTAÑAS CÓDIGO / APARIENCIA + EDITOR SVG
// ========================================

let paintTool = "circle";
let paintColor = "#4c97ff";
let paintStrokeWidth = 3;
let paintDrawing = false;
let paintStart = null;
let paintShape = null;
let paintShift = false;
let textPending = null;

const PAINT_COLORS = [
  "#4c97ff", "#ff4d8d", "#ffbf00", "#27a85e", "#9966ff",
  "#e74c3c", "#1abc9c", "#9b6b43", "#222222", "#ffffff",
  "#3498db", "#e67e22", "#2ecc71", "#9b59b6", "#95a5a6"
];

function switchEditorTab(tab) {
  const codePanel = $("codePanel");
  const looksPanel = $("looksPanel");
  const tabCode = $("tabCode");
  const tabLooks = $("tabLooks");
  const palette = $("palette");
  if (!codePanel || !looksPanel) return;

  const layout = $("layout");
  if (tab === "looks") {
    codePanel.classList.remove("active");
    looksPanel.classList.add("active");
    if (tabCode) tabCode.classList.remove("active");
    if (tabLooks) tabLooks.classList.add("active");
    // Ocultar lista de bloques y expandir el editor
    if (palette) palette.style.display = "none";
    if (layout) layout.classList.add("looks-mode");
    requestAnimationFrame(() => {
      loadCostumeIntoEditor();
      initSvgEditor();
    });
  } else {
    looksPanel.classList.remove("active");
    codePanel.classList.add("active");
    if (tabLooks) tabLooks.classList.remove("active");
    if (tabCode) tabCode.classList.add("active");
    // Mostrar lista de bloques y restaurar layout
    if (palette) palette.style.display = "";
    if (layout) layout.classList.remove("looks-mode");
    hideTextPrompt();
    renderWorkspace();
  }
}

function loadCostumeIntoEditor() {
  const svg = $("svgCanvas");
  const object = getSelectedObject();
  if (!svg || !object) return;

  svg.innerHTML = "";
  if (!svg.getAttribute("viewBox")) {
    svg.setAttribute("viewBox", "0 0 200 200");
  }

  const raw = object.svg || DEFAULT_POU_SVG;
  try {
    const parsed = new DOMParser().parseFromString(raw, "image/svg+xml");
    const root = parsed.documentElement;
    if (root && root.tagName && root.tagName.toLowerCase() === "svg") {
      [...root.childNodes].forEach(node => {
        if (node.nodeType === 1 || node.nodeType === 3) {
          svg.appendChild(document.importNode(node, true));
        }
      });
      const vb = root.getAttribute("viewBox");
      if (vb) svg.setAttribute("viewBox", vb);
    }
  } catch (e) {
    console.warn("loadCostume", e);
  }
}

function getSvgPoint(event) {
  const svg = $("svgCanvas");
  if (!svg) return { x: 0, y: 0 };

  // Método robusto con viewBox
  const rect = svg.getBoundingClientRect();
  const vb = (svg.getAttribute("viewBox") || "0 0 200 200").split(/[\s,]+/).map(Number);
  const [vx, vy, vw, vh] = vb.length === 4 ? vb : [0, 0, 200, 200];
  const x = vx + ((event.clientX - rect.left) / Math.max(rect.width, 1)) * vw;
  const y = vy + ((event.clientY - rect.top) / Math.max(rect.height, 1)) * vh;
  return { x, y };
}

function hideTextPrompt() {
  const box = $("textPromptBox");
  if (box) box.style.display = "none";
  textPending = null;
}

function showTextPrompt(clientX, clientY) {
  const box = $("textPromptBox");
  const input = $("svgTextInput");
  const wrap = document.querySelector(".looks-canvas-wrap");
  if (!box || !input) return;

  box.style.display = "flex";
  // Posicionar cerca del clic dentro del contenedor
  if (wrap) {
    const wr = wrap.getBoundingClientRect();
    box.style.left = Math.min(Math.max(8, clientX - wr.left), wr.width - 180) + "px";
    box.style.top = Math.min(Math.max(8, clientY - wr.top), wr.height - 50) + "px";
  }
  input.value = "";
  setTimeout(() => input.focus(), 20);
}

function setPaintColor(col) {
  paintColor = col;
  const swatch = $("colorSwatchBtn");
  if (swatch) swatch.style.background = col;
  document.querySelectorAll(".color-option").forEach(el => {
    el.classList.toggle("selected", el.dataset.color === col);
  });
}

function initSvgEditor() {
  const svg = $("svgCanvas");
  if (!svg) return;

  // Color picker integrado (siempre rellenar)
  const pop = $("colorPalettePopover");
  const swatch = $("colorSwatchBtn");
  if (pop) {
    pop.innerHTML = "";
    PAINT_COLORS.forEach(col => {
      const d = document.createElement("div");
      d.className = "color-option" + (col === paintColor ? " selected" : "");
      d.dataset.color = col;
      d.style.background = col;
      d.title = col;
      d.addEventListener("click", event => {
        event.stopPropagation();
        setPaintColor(col);
        pop.classList.remove("open");
      });
      pop.appendChild(d);
    });
  }
  if (swatch) {
    swatch.style.background = paintColor;
    swatch.onclick = event => {
      event.stopPropagation();
      if (pop) pop.classList.toggle("open");
    };
  }

  // Cerrar paleta al clicar fuera
  if (!document.body.dataset.colorPopWired) {
    document.body.dataset.colorPopWired = "true";
    document.addEventListener("pointerdown", event => {
      const popEl = $("colorPalettePopover");
      const sw = $("colorSwatchBtn");
      if (!popEl || !popEl.classList.contains("open")) return;
      if (popEl.contains(event.target) || (sw && sw.contains(event.target))) return;
      popEl.classList.remove("open");
    });
  }

  // Track Shift
  if (!document.body.dataset.shiftPaintWired) {
    document.body.dataset.shiftPaintWired = "true";
    window.addEventListener("keydown", e => { if (e.key === "Shift") paintShift = true; });
    window.addEventListener("keyup", e => { if (e.key === "Shift") paintShift = false; });
  }

  // Herramientas
  const TOOL_IDS = ["toolCircle", "toolRect", "toolPencil", "toolFill", "toolText"];

  const setTool = (tool, btnId) => {
    // Solo una herramienta a la vez: deselecciona las demás
    paintTool = tool;
    TOOL_IDS.forEach(id => {
      const b = $(id);
      if (!b) return;
      if (id === btnId) {
        b.classList.add("active");
        b.setAttribute("aria-pressed", "true");
      } else {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      }
    });
    // Grosor visible en círculo, rectángulo, lápiz y texto
    const sw = $("strokeWidthWrap");
    if (sw) {
      const show = (tool === "circle" || tool === "rect" || tool === "pencil" || tool === "text");
      sw.style.display = show ? "flex" : "none";
    }
    hideTextPrompt();
  };

  const bindTool = (id, tool) => {
    const b = $(id);
    if (!b) return;
    b.setAttribute("role", "button");
    b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false");
    b.onclick = () => setTool(tool, id);
  };
  bindTool("toolCircle", "circle");
  bindTool("toolRect", "rect");
  bindTool("toolPencil", "pencil");
  bindTool("toolFill", "fill");
  bindTool("toolText", "text");
  // Estado inicial: solo círculo seleccionado
  
  const strokeInput = $("strokeWidth");
  const strokeVal = $("strokeWidthVal");
  if (strokeInput) {
    paintStrokeWidth = Number(strokeInput.value) || 3;
    strokeInput.oninput = () => {
      paintStrokeWidth = Number(strokeInput.value) || 3;
      if (strokeVal) strokeVal.textContent = String(paintStrokeWidth);
    };
  }

  setTool(paintTool || "circle", "toolCircle");

  const clearBtn = $("clearSvg");
  if (clearBtn) clearBtn.onclick = () => { svg.innerHTML = ""; };

  const saveBtn = $("saveSvg");
  if (saveBtn) saveBtn.onclick = saveCostumeFromEditor;

  const resetBtn = $("resetCostume");
  if (resetBtn) {
    resetBtn.onclick = () => {
      const object = getSelectedObject();
      if (!object) return;
      object.svg = DEFAULT_POU_SVG;
      loadCostumeIntoEditor();
      renderStage();
      renderObjectList();
    };
  }

  // Solo cablear eventos del canvas una vez
  if (svg.dataset.wired === "true") return;
  svg.dataset.wired = "true";

  svg.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();

    const p = getSvgPoint(event);
    paintStart = p;
    paintShift = event.shiftKey;
    paintDrawing = true;

    try { svg.setPointerCapture(event.pointerId); } catch (_) {}

    if (paintTool === "circle") {
      paintShape = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      paintShape.setAttribute("cx", p.x);
      paintShape.setAttribute("cy", p.y);
      paintShape.setAttribute("rx", "0");
      paintShape.setAttribute("ry", "0");
      // Sin relleno visible; transparent permite clicar el interior con la cubeta
      paintShape.setAttribute("fill", "transparent");
      paintShape.setAttribute("stroke", paintColor);
      paintShape.setAttribute("stroke-width", String(paintStrokeWidth));
      svg.appendChild(paintShape);
    } else if (paintTool === "rect") {
      paintShape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      paintShape.setAttribute("x", p.x);
      paintShape.setAttribute("y", p.y);
      paintShape.setAttribute("width", "0");
      paintShape.setAttribute("height", "0");
      paintShape.setAttribute("fill", "transparent");
      paintShape.setAttribute("stroke", paintColor);
      paintShape.setAttribute("stroke-width", String(paintStrokeWidth));
      svg.appendChild(paintShape);
    } else if (paintTool === "pencil") {
      paintShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
      paintShape.setAttribute("d", "M " + p.x + " " + p.y);
      // Igual que círculo/rect: contorno visible, interior sin relleno (rellenable con cubeta)
      paintShape.setAttribute("fill", "transparent");
      paintShape.setAttribute("stroke", paintColor);
      paintShape.setAttribute("stroke-width", String(paintStrokeWidth));
      paintShape.setAttribute("stroke-linecap", "round");
      paintShape.setAttribute("stroke-linejoin", "round");
      paintShape.setAttribute("data-pencil", "1");
      paintShape.setAttribute("data-start-x", String(p.x));
      paintShape.setAttribute("data-start-y", String(p.y));
      svg.appendChild(paintShape);
    } else if (paintTool === "fill") {
      paintDrawing = false;
      // Cubeta: rellena la figura (círculo/rect tenían fill=none a propósito)
      const stack = document.elementsFromPoint(event.clientX, event.clientY);
      let shape = null;
      for (const el of stack) {
        if (!el || el === svg) continue;
        if (el.namespaceURI !== "http://www.w3.org/2000/svg") continue;
        if (el.getAttribute && el.getAttribute("data-bg-fill") === "1") continue;
        const tag = el.tagName.toLowerCase();
        if (["ellipse", "circle", "rect", "path", "polygon", "polyline", "text"].includes(tag)) {
          shape = el;
          break;
        }
      }
      if (shape) {
        // Mismo comportamiento para figuras de herramientas y del pincel
        shape.setAttribute("fill", paintColor);
        // Mantener el contorno si ya tenía stroke
        if (!shape.getAttribute("stroke") || shape.getAttribute("stroke") === "none") {
          shape.setAttribute("stroke", paintColor);
        }
      } else {
        // Clic en vacío → fondo del lienzo
        let bg = svg.querySelector("[data-bg-fill='1']");
        if (!bg) {
          bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          bg.setAttribute("data-bg-fill", "1");
          bg.setAttribute("x", "0");
          bg.setAttribute("y", "0");
          bg.setAttribute("width", "100%");
          bg.setAttribute("height", "100%");
          bg.setAttribute("pointer-events", "none");
          svg.insertBefore(bg, svg.firstChild);
        }
        bg.setAttribute("fill", paintColor);
      }
    } else if (paintTool === "text") {
      paintDrawing = false;
      textPending = p;
      showTextPrompt(event.clientX, event.clientY);
    }
  });

  svg.addEventListener("pointermove", event => {
    if (!paintDrawing || !paintStart || !paintShape) return;
    const p = getSvgPoint(event);
    const shift = event.shiftKey || paintShift;

    if (paintTool === "circle") {
      let rx = Math.abs(p.x - paintStart.x);
      let ry = Math.abs(p.y - paintStart.y);
      if (shift) {
        const r = Math.max(rx, ry);
        rx = r;
        ry = r;
      }
      paintShape.setAttribute("cx", paintStart.x);
      paintShape.setAttribute("cy", paintStart.y);
      paintShape.setAttribute("rx", rx);
      paintShape.setAttribute("ry", ry);
      paintShape.setAttribute("fill", "transparent");
      paintShape.setAttribute("stroke", paintColor);
      paintShape.setAttribute("stroke-width", String(paintStrokeWidth));
    } else if (paintTool === "rect") {
      let w = p.x - paintStart.x;
      let h = p.y - paintStart.y;
      if (shift) {
        const side = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w) * side || side;
        h = Math.sign(h) * side || side;
      }
      const x = Math.min(paintStart.x, paintStart.x + w);
      const y = Math.min(paintStart.y, paintStart.y + h);
      paintShape.setAttribute("x", x);
      paintShape.setAttribute("y", y);
      paintShape.setAttribute("width", Math.abs(w));
      paintShape.setAttribute("height", Math.abs(h));
      paintShape.setAttribute("fill", "transparent");
      paintShape.setAttribute("stroke", paintColor);
      paintShape.setAttribute("stroke-width", String(paintStrokeWidth));
    } else if (paintTool === "pencil") {
      const d = paintShape.getAttribute("d") + " L " + p.x + " " + p.y;
      paintShape.setAttribute("d", d);
    }
  });

  const endDraw = event => {
    // Al soltar el pincel: cerrar la figura si el final está cerca del inicio
    // para que se comporte como círculo/rect (contorno + relleno con cubeta)
    if (paintShape && paintTool === "pencil" && paintStart) {
      try {
        const d = paintShape.getAttribute("d") || "";
        const sx = Number(paintShape.getAttribute("data-start-x"));
        const sy = Number(paintShape.getAttribute("data-start-y"));
        let ex = paintStart.x;
        let ey = paintStart.y;
        if (event) {
          const pt = getSvgPoint(event);
          ex = pt.x;
          ey = pt.y;
        }
        // Extraer último punto del path
        const nums = d.match(/-?\d*\.?\d+/g);
        if (nums && nums.length >= 2) {
          ex = Number(nums[nums.length - 2]);
          ey = Number(nums[nums.length - 1]);
        }
        const dist = Math.hypot(ex - sx, ey - sy);
        const closeThresh = Math.max(12, paintStrokeWidth * 3);
        if (dist <= closeThresh) {
          paintShape.setAttribute("d", d + " Z");
        }
        // Siempre: listo para cubeta (interior transparente clicable)
        paintShape.setAttribute("fill", "transparent");
        paintShape.setAttribute("fill-rule", "evenodd");
      } catch (_) {}
    }
    paintDrawing = false;
    paintShape = null;
    paintStart = null;
  };
  svg.addEventListener("pointerup", endDraw);
  svg.addEventListener("pointercancel", endDraw);

  // Texto: OK y Enter (sin prompt)
  const okBtn = $("svgTextOk");
  const input = $("svgTextInput");

  const commitText = () => {
    if (!textPending || !input || !svg) return;
    const value = (input.value || "").trim();
    if (value) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", textPending.x);
      t.setAttribute("y", textPending.y);
      t.setAttribute("fill", paintColor);
      t.setAttribute("font-size", String(Math.max(10, paintStrokeWidth * 4)));
      t.setAttribute("font-family", "Arial, sans-serif");
      t.setAttribute("font-weight", "bold");
      t.textContent = value;
      svg.appendChild(t);
    }
    hideTextPrompt();
  };

  if (okBtn) okBtn.onclick = commitText;
  if (input) {
    input.onkeydown = event => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitText();
      } else if (event.key === "Escape") {
        hideTextPrompt();
      }
    };
  }
}

function saveCostumeFromEditor() {
  const svg = $("svgCanvas");
  const object = getSelectedObject();
  if (!svg || !object) return;
  const viewBox = svg.getAttribute("viewBox") || "0 0 200 200";
  const inner = svg.innerHTML;
  object.svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '">' + inner + "</svg>";
  renderStage();
  renderObjectList();
  uiAlert("Disfraz guardado.");
}

// ========================================
// MENÚ + OBJETO / IMPORTAR IMAGEN O .ps1
// ========================================

function toggleAddObjectMenu(event) {
  const menu = $("addObjectMenu");
  const btn = $("openAddObjectMenu");
  if (!menu || !btn) return;
  const rect = btn.getBoundingClientRect();
  menu.style.display = menu.style.display === "block" ? "none" : "block";
  menu.style.left = rect.left + "px";
  menu.style.top = (rect.bottom + 4) + "px";
  if (event) event.stopPropagation();
}

function hideAddObjectMenu() {
  const menu = $("addObjectMenu");
  if (menu) menu.style.display = "none";
}

document.addEventListener("pointerdown", event => {
  const menu = $("addObjectMenu");
  const btn = $("openAddObjectMenu");
  if (!menu || menu.style.display !== "block") return;
  if (menu.contains(event.target) || (btn && btn.contains(event.target))) return;
  hideAddObjectMenu();
});

function addObjectFromMenuDraw() {
  hideAddObjectMenu();
  objects.push(createBlankObject());
  selectObject(objects.length - 1);
  switchEditorTab("looks");
}

function addObjectFromMenuImport() {
  hideAddObjectMenu();
  const input = $("fileInputAsset");
  if (input) {
    input.value = "";
    input.click();
  }
}

/** Formato PousIDE Sprite (.ps1) */
/** Codifica texto a Base64 (UTF-8 seguro) */
function ps1Encode(str) {
  try {
    return btoa(unescape(encodeURIComponent(String(str || ""))));
  } catch (e) {
    return "";
  }
}

/** Decodifica Base64 a texto UTF-8 */
function ps1Decode(b64) {
  try {
    return decodeURIComponent(escape(atob(String(b64 || "").replace(/\s+/g, ""))));
  } catch (e) {
    return "";
  }
}

/**
 * Formato puro .ps1 (PousIDE Sprite) — NO es JSON ni SVG.
 *
 * PS1/1
 * NAME ...
 * DIR 90
 * VIS 1
 * COSTUME <base64 del svg>
 * SCRIPTS <base64 de la serialización de scripts>
 * END
 */
function exportSpritePS1(index) {
  const object = objects[index];
  if (!object) return;

  const svgPart = (object.svg || DEFAULT_POU_SVG).trim();
  const scriptsData = JSON.stringify(ensureScripts(object));

  const lines = [
    "PS1/1",
    "NAME " + String(object.name || "Sprite").replace(/[\r\n]/g, " "),
    "DIR " + (typeof object.direction === "number" ? object.direction : 90),
    "VIS " + (object.visible === false ? "0" : "1"),
    "COSTUME " + ps1Encode(svgPart),
    "SCRIPTS " + ps1Encode(scriptsData)
  ];
  if (customBlocks && customBlocks.length) {
    lines.push("CUSTOM " + ps1Encode(JSON.stringify(customBlocks)));
  }
  lines.push("END");

  const content = lines.join("\n") + "\n";
  const blob = new Blob([content], { type: "application/x-pouside-sprite" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safe = (object.name || "sprite").replace(/[^\w\-]+/g, "_");
  link.download = "pouside-sprite-" + safe + ".ps1";
  link.click();
  URL.revokeObjectURL(url);
}

/** Parsea archivo .ps1 puro (formato PousIDE Sprite) */
function parsePS1(text) {
  const result = {
    name: "Sprite",
    direction: 90,
    visible: true,
    svg: DEFAULT_POU_SVG,
    scripts: []
  };

  const raw = String(text || "").trim();

  // Compatibilidad: si alguien trae un .ps1 antiguo (JSON o SVG+JSON)
  if (raw.startsWith("{") || raw.includes("application/x-pouside-json") || raw.includes("<svg")) {
    try {
      if (raw.startsWith("{")) {
        const data = JSON.parse(raw);
        if (data.name) result.name = data.name;
        if (data.svg) result.svg = data.svg;
        if (Array.isArray(data.scripts)) result.scripts = data.scripts;
        else if (Array.isArray(data.blocks)) result.scripts = [{ x: 20, y: 20, blocks: data.blocks }];
        if (typeof data.direction === "number") result.direction = data.direction;
        if (typeof data.visible === "boolean") result.visible = data.visible;
        return result;
      }
      const scriptMatch = raw.match(/<script[^>]*x-pouside-json[^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        const meta = JSON.parse(scriptMatch[1].trim());
        if (meta.name) result.name = meta.name;
        if (Array.isArray(meta.scripts)) result.scripts = meta.scripts;
        if (typeof meta.direction === "number") result.direction = meta.direction;
        if (typeof meta.visible === "boolean") result.visible = meta.visible;
      }
      const svgMatch = raw.replace(/<script[\s\S]*?<\/script>/gi, "").match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) result.svg = svgMatch[0];
      return result;
    } catch (_) {
      /* caer al parser puro */
    }
  }

  // Formato puro PS1/1
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line === "END") continue;
    if (line.startsWith("PS1/")) continue;

    if (line.startsWith("NAME ")) {
      result.name = line.slice(5).trim() || result.name;
    } else if (line.startsWith("DIR ")) {
      const n = Number(line.slice(4).trim());
      if (!Number.isNaN(n)) result.direction = n;
    } else if (line.startsWith("VIS ")) {
      result.visible = line.slice(4).trim() !== "0";
    } else if (line.startsWith("COSTUME ")) {
      const decoded = ps1Decode(line.slice(8).trim());
      if (decoded) result.svg = decoded;
    } else if (line.startsWith("SCRIPTS ")) {
      const decoded = ps1Decode(line.slice(8).trim());
      if (decoded) {
        try {
          const scripts = JSON.parse(decoded);
          if (Array.isArray(scripts)) result.scripts = scripts;
        } catch (_) {}
      }
    } else if (line.startsWith("CUSTOM ")) {
      const decoded = ps1Decode(line.slice(7).trim());
      if (decoded) {
        try {
          const customs = JSON.parse(decoded);
          if (Array.isArray(customs)) result.customBlocks = customs;
        } catch (_) {}
      }
    }
  }

  return result;
}

/** Convierte imagen bitmap (PNG/JPG/…) a SVG embebido */
function bitmapToSvg(dataUrl, width, height) {
  const w = width || 100;
  const h = height || 100;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '">' +
    '<image href="' + dataUrl + '" x="0" y="0" width="' + w + '" height="' + h + '" ' +
    'preserveAspectRatio="xMidYMid meet"/>' +
    "</svg>"
  );
}

function importAssetFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();

  // --- .ps1 puro (PousIDE Sprite) ---
  if (name.endsWith(".ps1")) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parsePS1(reader.result);
        const obj = createBlankObject(parsed.name || file.name.replace(/\.ps1$/i, ""));
        obj.svg = parsed.svg || DEFAULT_POU_SVG;
        obj.scripts = Array.isArray(parsed.scripts) ? parsed.scripts : [];
        obj.direction = typeof parsed.direction === "number" ? parsed.direction : 90;
        obj.visible = parsed.visible !== false;
        // Bloques personalizados locales embebidos en el .ps1
        if (Array.isArray(parsed.customBlocks) && parsed.customBlocks.length) {
          parsed.customBlocks.forEach(block => {
            if (!block || !block.type) return;
            const idx = customBlocks.findIndex(b => b.type === block.type);
            if (idx >= 0) customBlocks[idx] = block;
            else customBlocks.push(block);
          });
          renderMyBlocks();
        }
        objects.push(obj);
        selectObject(objects.length - 1);
        uiAlert('Sprite .ps1 "' + obj.name + '" importado.');
      } catch (err) {
        uiAlert("No se pudo leer el archivo .ps1:\n" + err.message);
      }
    };
    reader.readAsText(file);
    return;
  }

  // --- SVG vectorial ---
  if (name.endsWith(".svg") || file.type === "image/svg+xml") {
    const reader = new FileReader();
    reader.onload = () => {
      const textSvg = String(reader.result || "");
      const base = file.name.replace(/\.[^.]+$/, "") || ("Svg" + (objects.length + 1));
      const obj = createBlankObject(base);
      const m = textSvg.match(/<svg[\s\S]*?<\/svg>/i);
      obj.svg = m ? m[0] : textSvg;
      objects.push(obj);
      selectObject(objects.length - 1);
      uiAlert('Objeto "' + base + '" creado desde SVG.');
    };
    reader.readAsText(file);
    return;
  }

  // --- Bitmap → conversión automática a SVG interno ---
  if (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(name)) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base = file.name.replace(/\.[^.]+$/, "") || ("Imagen" + (objects.length + 1));
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 100;
        const h = img.naturalHeight || 100;
        const maxSide = 200;
        const scale = Math.min(maxSide / w, maxSide / h, 1);
        const vw = Math.max(1, Math.round(w * scale));
        const vh = Math.max(1, Math.round(h * scale));
        const obj = createBlankObject(base);
        obj.svg = bitmapToSvg(dataUrl, vw, vh);
        objects.push(obj);
        selectObject(objects.length - 1);
        uiAlert('Imagen convertida. Objeto "' + base + '" creado.');
      };
      img.onerror = () => {
        const obj = createBlankObject(base);
        obj.svg = bitmapToSvg(dataUrl, 100, 100);
        objects.push(obj);
        selectObject(objects.length - 1);
        uiAlert('Imagen convertida. Objeto "' + base + '" creado.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    return;
  }

  uiAlert("Formato no soportado. Usa una imagen o un archivo .ps1 (PousIDE Sprite).");
}

connectButton("menuDrawSvg", addObjectFromMenuDraw);
connectButton("menuImportFile", addObjectFromMenuImport);
connectButton("tabCode", () => switchEditorTab("code"));
connectButton("tabLooks", () => switchEditorTab("looks"));

const fileInputAsset = $("fileInputAsset");
if (fileInputAsset) {
  fileInputAsset.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    importAssetFile(file);
    event.target.value = "";
  });
}

// Llamar al cargar costume cuando se selecciona objeto si estamos en apariencia
const _origSelectObject = selectObject;
selectObject = function(index) {
  _origSelectObject(index);
  const looks = $("looksPanel");
  if (looks && looks.classList.contains("active")) {
    loadCostumeIntoEditor();
  }
  const info = $("workInfo");
  const obj = getSelectedObject();
  if (info && obj) info.textContent = "Programa de " + obj.name;
};



wirePalette($("basePalette"));
renderMyBlocks();

if (!objects.length) {
  objects.push({
    name: "Personaje1",
    x: 0,
    y: 0,
    direction: 90,
    visible: true,
    svg: DEFAULT_POU_SVG,
    blocks: [],
    scripts: []
  });
}

selectObject(0);
