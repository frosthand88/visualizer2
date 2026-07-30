// Two interchangeable providers behind the same interface:
//   provider(request, graphSummary) -> { type: 'question'|'plan'|'info', message, addNodes?, addEdges? }
// Both return only a description of what *could* change — the plugin UI
// is responsible for previewing and requiring explicit confirmation
// before anything is ever written to the graph.

export function summarizeGraph(graph) {
  const nodes = graph.realNodes().map((n) => ({
    label: n.data("label"),
    category: n.data("category") || null,
    group: n.data("group") || null,
    docUrl: n.data("docUrl") || null,
  }));
  const edges = graph.cy
    .edges()
    .filter((e) => !e.hidden())
    .map((e) => ({
      source: e.source().data("label"),
      target: e.target().data("label"),
      label: e.data("label") || null,
    }));
  return { nodes, edges };
}

// --- Mock provider: deterministic, no network, no API key. This is the
// default so the plugin is fully functional out of the box. -------------

const GREETING_RE = /^(hi|hello|hey|help|\?+)\.?$/i;
const ADD_BETWEEN_RE = /\badd (?:an? |the )?(.+?) between (.+?) and (.+)$/i;
const ADD_CONNECTED_RE = /\badd (?:an? |the )?(.+?) (?:connected to|linked to|next to) (.+)$/i;
const ADD_RE = /\badd (?:an? |the )?(.+)$/i;

export function mockProvider(request, summary) {
  const text = request.trim();

  if (text.length < 4 || GREETING_RE.test(text)) {
    return {
      type: "question",
      message:
        'Could you describe the change more specifically? For example: "add a cache between the API and the database".',
    };
  }

  let m = ADD_BETWEEN_RE.exec(text);
  if (m) {
    const [, thing, a, b] = m;
    return {
      type: "plan",
      message: `Proposed: add "${thing.trim()}" wired between "${a.trim()}" and "${b.trim()}".`,
      addNodes: [{ label: thing.trim() }],
      addEdges: [
        { sourceLabel: a.trim(), targetLabel: thing.trim() },
        { sourceLabel: thing.trim(), targetLabel: b.trim() },
      ],
    };
  }

  m = ADD_CONNECTED_RE.exec(text);
  if (m) {
    const [, thing, a] = m;
    return {
      type: "plan",
      message: `Proposed: add "${thing.trim()}" connected to "${a.trim()}".`,
      addNodes: [{ label: thing.trim() }],
      addEdges: [{ sourceLabel: a.trim(), targetLabel: thing.trim() }],
    };
  }

  m = ADD_RE.exec(text);
  if (m) {
    const thing = m[1].trim();
    return {
      type: "plan",
      message: `Proposed: add "${thing}" as a new, unconnected node.`,
      addNodes: [{ label: thing }],
    };
  }

  const categories = [...new Set(summary.nodes.map((n) => n.category).filter(Boolean))];
  const undocumented = summary.nodes.filter((n) => !n.docUrl).length;
  return {
    type: "info",
    message:
      `This graph has ${summary.nodes.length} node(s) and ${summary.edges.length} edge(s)` +
      (categories.length ? `, across categories: ${categories.join(", ")}.` : ".") +
      (undocumented ? ` ${undocumented} node(s) have no documentation URL set.` : "") +
      ` Try a request like "add a queue between the API and the worker" for a concrete plan.`,
  };
}

// --- Real provider: calls Anthropic's Messages API directly from the
// browser. There's no backend to proxy this through, so the API key the
// user supplies is sent from their own browser to Anthropic — that's an
// explicit, opt-in tradeoff surfaced in the settings UI, not something
// silently done for them. Requires the API key to allow direct browser
// calls (Anthropic supports this for exactly this kind of app). -------

const DEFAULT_MAX_TOKENS = 8192;

export async function anthropicProvider(request, summary, { apiKey, model, maxTokens }) {
  const system = [
    "You are an architecture assistant embedded in a graph-diagramming tool.",
    "You will be given a summary of the current graph (nodes with label/category/group/docUrl, and edges).",
    "Respond with ONLY a single JSON object, no prose outside it, matching this shape:",
    '{ "type": "question" | "plan" | "info", "message": string, "addNodes"?: [{"label": string, "category"?: string}], "addEdges"?: [{"sourceLabel": string, "targetLabel": string, "label"?: string}] }',
    'Use "question" if the request is too vague to act on. Use "plan" when proposing concrete additions — addEdges must reference labels from addNodes or from the existing graph. Use "info" for summaries/explanations with no proposed change.',
    "Keep the plan reasonably scoped (roughly 20-30 nodes at most) so the full JSON response fits well within the token budget and is never cut off mid-object.",
    "Never invent Terraform, Docker, or code output — that is out of scope.",
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
      system,
      messages: [
        { role: "user", content: `Graph summary:\n${JSON.stringify(summary)}\n\nRequest: ${request}` },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content || []).map((block) => block.text || "").join("");
  const truncated = data.stop_reason === "max_tokens";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    if (truncated) {
      return {
        type: "info",
        message:
          "The response was cut off before any valid JSON closed out — it hit the token limit. " +
          "Try increasing \"Max tokens\" in the AI provider settings, or ask for a smaller/more focused diagram.",
      };
    }
    return { type: "info", message: text || "(empty response)" };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    if (truncated) {
      return {
        type: "info",
        message:
          "The response was cut off mid-JSON — it hit the token limit before finishing. " +
          "Try increasing \"Max tokens\" in the AI provider settings, or ask for a smaller/more focused diagram.\n\n" +
          `(Partial response, ${text.length} chars received.)`,
      };
    }
    return {
      type: "info",
      message: `Couldn't parse the assistant's reply as a plan (${err.message}). Raw response:\n\n${text}`,
    };
  }
}
