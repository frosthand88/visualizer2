// AI assistant, built entirely on the Phase 10 plugin API (plus the one
// addPanel extension point it required — see plugins.js). Reads the graph
// and node documentation URLs, can ask a clarifying question, and returns
// architecture suggestions / a documentation summary / an implementation
// plan. It never touches the graph itself: every plan is rendered as a
// preview with explicit Apply/Discard controls, and only Apply calls into
// graph.addNode/addEdge. Terraform/Docker/code generation are explicitly
// out of scope (see phase11.md — "Future").

import { summarizeGraph, mockProvider, anthropicProvider } from "./aiProviders.js";

const STORAGE_KEY_API = "visualizer2:ai:apiKey";
const STORAGE_KEY_MODEL = "visualizer2:ai:model";
const STORAGE_KEY_MAX_TOKENS = "visualizer2:ai:maxTokens";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_MAX_TOKENS = 8192;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

export const aiPlugin = {
  id: "ai-assistant",
  label: "AI Assistant",

  activate(api) {
    api.addPanel({
      id: "ai-assistant",
      label: "🤖 AI Assistant",
      render(container, ctx) {
        const log = el("div", { class: "ai-log" });

        const settings = document.createElement("details");
        settings.className = "ai-settings";
        const summary = document.createElement("summary");
        summary.textContent = "AI provider settings";
        const settingsBody = el("div", { class: "ai-settings-body" });
        const warning = el("p", {
          class: "ai-warning",
          text:
            "By default this uses a small built-in rule-based assistant — no network calls, no API key needed. " +
            "If you paste an Anthropic API key below, requests are sent directly from your browser to Anthropic's API " +
            "with that key attached. Don't do this on a shared or publicly deployed copy of this app.",
        });
        const apiKeyInput = el("input", {
          type: "password",
          placeholder: "sk-ant-... (optional)",
          class: "ai-api-key",
        });
        apiKeyInput.value = localStorage.getItem(STORAGE_KEY_API) || "";
        apiKeyInput.addEventListener("change", () => {
          if (apiKeyInput.value) localStorage.setItem(STORAGE_KEY_API, apiKeyInput.value);
          else localStorage.removeItem(STORAGE_KEY_API);
        });
        const modelLabel = el("label", { text: "Model ID" });
        const modelInput = el("input", { type: "text", class: "ai-model-id" });
        modelInput.value = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
        modelInput.addEventListener("change", () => localStorage.setItem(STORAGE_KEY_MODEL, modelInput.value));

        const maxTokensLabel = el("label", { text: "Max tokens (raise this for large/comprehensive diagrams)" });
        const maxTokensInput = el("input", { type: "number", class: "ai-max-tokens", min: "256", max: "32000", step: "256" });
        maxTokensInput.value = localStorage.getItem(STORAGE_KEY_MAX_TOKENS) || DEFAULT_MAX_TOKENS;
        maxTokensInput.addEventListener("change", () => localStorage.setItem(STORAGE_KEY_MAX_TOKENS, maxTokensInput.value));

        settingsBody.append(
          warning,
          el("label", { text: "Anthropic API key" }),
          apiKeyInput,
          modelLabel,
          modelInput,
          maxTokensLabel,
          maxTokensInput
        );
        settings.append(summary, settingsBody);

        const inputRow = el("div", { class: "ai-input-row" });
        const textarea = el("textarea", {
          class: "ai-input",
          placeholder: 'Describe a change or ask about this architecture, e.g. "add a cache between the API and the database"',
          rows: "2",
        });
        const sendBtn = el("button", { type: "button", text: "Send" });
        inputRow.append(textarea, sendBtn);

        container.append(log, inputRow, settings);

        function addLogEntry(role, node) {
          const entry = el("div", { class: `ai-entry ai-entry-${role}` });
          entry.appendChild(node);
          log.appendChild(entry);
          log.scrollTop = log.scrollHeight;
        }

        function renderPlanPreview(plan) {
          const box = el("div", { class: "ai-plan" });
          box.appendChild(el("p", { text: plan.message }));

          if (plan.addNodes?.length) {
            const list = el("ul");
            plan.addNodes.forEach((n) => list.appendChild(el("li", { text: `+ Node: ${n.label}` })));
            box.appendChild(list);
          }
          if (plan.addEdges?.length) {
            const list = el("ul");
            plan.addEdges.forEach((e) =>
              list.appendChild(el("li", { text: `+ Edge: ${e.sourceLabel} → ${e.targetLabel}` }))
            );
            box.appendChild(list);
          }

          const actions = el("div", { class: "ai-plan-actions" });
          const applyBtn = el("button", { type: "button", text: "Apply to graph" });
          const discardBtn = el("button", { type: "button", text: "Discard" });
          applyBtn.addEventListener("click", () => {
            applyPlan(plan, ctx);
            actions.remove();
            box.appendChild(el("p", { class: "ai-applied", text: "Applied." }));
          });
          discardBtn.addEventListener("click", () => {
            actions.remove();
            box.appendChild(el("p", { class: "ai-discarded", text: "Discarded." }));
          });
          actions.append(applyBtn, discardBtn);
          box.appendChild(actions);
          return box;
        }

        async function handleSend() {
          const text = textarea.value.trim();
          if (!text) return;
          addLogEntry("user", el("p", { text }));
          textarea.value = "";
          sendBtn.disabled = true;

          try {
            const summaryData = summarizeGraph(ctx.graph);
            const apiKey = localStorage.getItem(STORAGE_KEY_API);
            const model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
            const maxTokens = Number(localStorage.getItem(STORAGE_KEY_MAX_TOKENS)) || DEFAULT_MAX_TOKENS;

            const reply = apiKey
              ? await anthropicProvider(text, summaryData, { apiKey, model, maxTokens })
              : mockProvider(text, summaryData);

            if (reply.type === "plan" && (reply.addNodes?.length || reply.addEdges?.length)) {
              addLogEntry("assistant", renderPlanPreview(reply));
            } else {
              addLogEntry("assistant", el("p", { text: reply.message }));
            }
          } catch (err) {
            addLogEntry("assistant", el("p", { class: "ai-error", text: `Error: ${err.message}` }));
          } finally {
            sendBtn.disabled = false;
          }
        }

        sendBtn.addEventListener("click", handleSend);
        textarea.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
        });

        addLogEntry(
          "assistant",
          el("p", {
            text:
              'Ask me about this architecture, or describe a change — e.g. "add a cache between the API and the database". ' +
              "I'll only change the graph if you click Apply on a proposed plan.",
          })
        );
      },
    });
  },
};

function applyPlan(plan, ctx) {
  ctx.recordHistory();

  const labelToId = new Map(ctx.graph.realNodes().map((n) => [n.data("label").toLowerCase(), n.id()]));
  const extent = ctx.cy.extent();
  let i = 0;

  (plan.addNodes || []).forEach((n) => {
    const position = {
      x: (extent.x1 + extent.x2) / 2 + (i % 4) * 50 - 75,
      y: (extent.y1 + extent.y2) / 2 + Math.floor(i / 4) * 50,
    };
    i += 1;
    const node = ctx.graph.addNode({ label: n.label, category: n.category || "" }, position);
    labelToId.set(n.label.toLowerCase(), node.id());
  });

  (plan.addEdges || []).forEach((e) => {
    const sourceId = labelToId.get((e.sourceLabel || "").toLowerCase());
    const targetId = labelToId.get((e.targetLabel || "").toLowerCase());
    if (sourceId && targetId) {
      ctx.graph.addEdge(sourceId, targetId, { label: e.label || "" });
    }
  });

  ctx.refresh();
}
