// Minimal floating right-click menu — no dependency on a plugin/extension
// system, since that's Phase 10. `items` is [{ label, action }, ...];
// pass action: null for a disabled/divider-ish entry.

let menuEl = null;

function closeMenu() {
  if (menuEl) {
    menuEl.remove();
    menuEl = null;
    document.removeEventListener("mousedown", onOutsideClick);
    document.removeEventListener("keydown", onKeydown);
  }
}

function onOutsideClick(e) {
  if (menuEl && !menuEl.contains(e.target)) closeMenu();
}

function onKeydown(e) {
  if (e.key === "Escape") closeMenu();
}

export function showContextMenu(x, y, items) {
  closeMenu();

  menuEl = document.createElement("ul");
  menuEl.className = "context-menu";
  menuEl.style.left = `${x}px`;
  menuEl.style.top = `${y}px`;

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.label;
    if (item.action) {
      li.addEventListener("click", () => {
        closeMenu();
        item.action();
      });
    } else {
      li.classList.add("disabled");
    }
    menuEl.appendChild(li);
  });

  document.body.appendChild(menuEl);
  setTimeout(() => {
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onKeydown);
  }, 0);
}
