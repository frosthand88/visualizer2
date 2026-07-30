// Knowledge Base mode: clicking a node in this mode opens its docUrl in an
// in-app viewer instead of selecting it. Navigation is driven by the URL
// hash (#kb/<nodeId>) rather than a private history stack, so the
// browser's own back/forward genuinely work and a refresh/deep-link to a
// #kb/... URL still resolves correctly on a static host (no server-side
// routing needed, unlike pushState with real paths).

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const SLOW_LOAD_MS = 4000;

export function validateDocUrl(raw) {
  if (!raw || !raw.trim()) return { valid: false, reason: "No documentation URL set for this node." };
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return { valid: false, reason: "Documentation URL is not a valid URL." };
  }
  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    return { valid: false, reason: `Unsupported URL scheme "${url.protocol}" — only http/https are allowed.` };
  }
  return { valid: true, href: url.href };
}

export function createKnowledgeBase(graph, { onOpen } = {}) {
  const panel = document.getElementById("kb-panel");
  const iframe = document.getElementById("kb-iframe");
  const titleEl = document.getElementById("kb-title");
  const errorEl = document.getElementById("kb-error");
  const slowNotice = document.getElementById("kb-slow-notice");
  const openNewTabLink = document.getElementById("kb-open-new-tab");
  const btnBack = document.getElementById("kb-back");
  const btnForward = document.getElementById("kb-forward");
  const btnClose = document.getElementById("kb-close");

  let loadTimer = null;

  function hashFor(nodeId) {
    return `#kb/${encodeURIComponent(nodeId)}`;
  }

  function parseHash() {
    const m = /^#kb\/(.+)$/.exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function render(nodeId) {
    clearTimeout(loadTimer);
    slowNotice.classList.add("hidden");
    errorEl.classList.add("hidden");

    const node = graph.cy.getElementById(nodeId);
    if (node.empty() || node.data("_groupContainer")) {
      panel.classList.add("hidden");
      return;
    }

    panel.classList.remove("hidden");
    if (onOpen) onOpen();
    titleEl.textContent = node.data("label") || nodeId;
    const result = validateDocUrl(node.data("docUrl"));

    if (!result.valid) {
      // No navigation needed — the iframe just stays hidden behind the
      // error message, so there's nothing stale visible to clear.
      iframe.classList.add("hidden");
      openNewTabLink.classList.add("hidden");
      errorEl.textContent = result.reason;
      errorEl.classList.remove("hidden");
      return;
    }

    iframe.classList.remove("hidden");
    openNewTabLink.href = result.href;
    openNewTabLink.classList.remove("hidden");
    // contentWindow.location.replace(), not iframe.src = ..., so loading
    // the doc page doesn't push its own entry into the browser's joint
    // session history — that would interleave with and break the
    // hash-based back/forward this panel relies on.
    iframe.contentWindow.location.replace(result.href);

    loadTimer = setTimeout(() => slowNotice.classList.remove("hidden"), SLOW_LOAD_MS);
    iframe.onload = () => {
      clearTimeout(loadTimer);
      slowNotice.classList.add("hidden");
    };
  }

  // Back/Forward delegate to the browser's real session history rather
  // than a parallel stack — that's what actually keeps them in sync with
  // the browser's own Back/Forward buttons and the hash in the URL bar.
  btnBack.addEventListener("click", () => history.back());
  btnForward.addEventListener("click", () => history.forward());
  btnClose.addEventListener("click", () => {
    location.hash = "";
  });

  window.addEventListener("hashchange", () => {
    const nodeId = parseHash();
    if (nodeId) render(nodeId);
    else panel.classList.add("hidden");
  });

  const initial = parseHash();
  if (initial) render(initial);

  return {
    open(nodeId) {
      if (parseHash() === nodeId) {
        render(nodeId);
        return;
      }
      location.hash = hashFor(nodeId);
    },
    close() {
      location.hash = "";
    },
    isOpen: () => !panel.classList.contains("hidden"),
  };
}
