# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

visualizer2 is a browser-based graph visualization and architecture knowledge
management tool built on Cytoscape.js. Constraints that apply to every phase
of the build:

- HTML + JavaScript frontend only — **no backend server**.
- **JSON-based persistence** (graphs are saved/loaded as JSON, no database).
- Clean, modular architecture with minimal coupling — prefer composition over
  inheritance/monoliths.
- Built incrementally: each milestone below must stay self-contained and not
  reach ahead into later milestones' functionality.

## Current state

The repository currently contains only planning documents (`.claude/*.md`)
and this file — no application code has been written yet. There is no
package manager, build tool, linter, or test suite configured, so there are
no build/lint/test commands to run. The first implementation work should set
these up as part of Phase 1 (see roadmap below), and this file should be
updated once real tooling exists.

## Multi-role workflow

This project is driven through three role prompts stored in `.claude/`, and
work should follow the handoff between them rather than jumping straight to
code:

- `.claude/software-manager.md` — plans sprints. Reviews completed work and
  remaining milestones, decides what to build next and why, and produces a
  sprint backlog (Sprint Goal, Tasks, Acceptance Criteria, Files expected to
  change, Definition of Done). Never implements code, and never scopes work
  outside the current sprint.
- `.claude/software-developer.md` — implements only the tasks the manager
  assigns. Never invents extra features, never touches unrelated code, stops
  once sprint tasks are done, and reports back with a summary of changes,
  any technical debt incurred, and suggestions for future sprints.
- `.claude/project-charter.md` — the lead-architect brief: overall vision,
  milestone/task breakdown, and the standing architectural priorities
  (clean architecture, maintainability, incremental development,
  extensibility, excellent UX). It also flags future capabilities the
  current design must not preclude: multiple diagram presets, dependency
  analysis, knowledge base integration, AI assistance, subsystem
  navigation — later phases should be addable without major refactors of
  earlier ones.

When picking up work in this repo, read the relevant `phaseN.md` file for
the milestone in progress before making changes.

## Roadmap (`.claude/phase1.md` – `phase11.md`)

Each phase has a hard scope boundary — later capabilities are explicitly
excluded from earlier phases (e.g. Phase 1 has "no analysis, no AI, no
profiles, no presets"). Do not pull work forward from a later phase.

1. **Foundation** — minimal graph editor: HTML canvas, toolbar, left/right
   panels, node/edge CRUD, JSON save/load, search, automatic layouts.
2. **Graph Model** — internal node/edge data model (label, category, group,
   shape, icon, color, size, doc URL for nodes; label, arrow style,
   thickness, color, line style, waypoints for edges) with human-readable,
   backward-compatible JSON serialization.
3. **Editor UX** — right-click menus, multi-select, drag-multiple, keyboard
   shortcuts, undo/redo. No analysis logic.
4. **Group Engine** — categories/groups with boundary rendering, visibility
   and category toggles; hidden nodes/edges must drop out of rendering
   automatically.
5. **Layout Engine** — top-down, left-right, radial-outward, radial-inward
   layouts with smooth animation; layout applies only to visible nodes and
   should preserve the user's mental map where possible.
6. **Analysis Engine** — dependency, impact, flow, and hierarchy traversal
   over visible nodes only; highlight matches, dim the rest, allow reset.
   Traversal logic must be shared/reused across modes, not duplicated.
7. **Profiles** — per-user view state (positions, expanded state, visibility,
   camera zoom, layout, filters) stored **separately** from graph data, as
   distinct `GraphData/` vs `GraphProfile/` concerns — so different users can
   view the same graph differently.
8. **Knowledge Base** — per-node documentation URL and a "Knowledge Base
   mode" where clicking a node opens its docs; validate URLs and handle
   missing pages gracefully; support browser navigation.
9. **Rendering Presets** — swappable presets (Container, Class, ER, Site Map,
   Use Case) controlling default shapes/icons/colors/edge style/available
   properties. Switching presets must never require converting the
   underlying graph data — the graph model stays preset-agnostic.
10. **Plugin System** — extension points for toolbar buttons, right-click
    actions, node/edge properties, importers/exporters, and analysis modes.
    This must land *before* AI work, since AI is meant to be built as a
    plugin on top of it.
11. **AI Plugin** — assistant that can read the graph and doc URLs, ask
    clarifying questions, and generate architecture suggestions,
    documentation, and implementation plans (later: Terraform/Docker/code
    generation). Must return plans/previews only — never mutate the graph
    without explicit user confirmation.
