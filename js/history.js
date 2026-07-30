// Snapshot-based undo/redo. Records the full serialized graph (data +
// positions only, via graph.toJson) so restoring a snapshot is just a
// loadJson call — simple and correct, at the cost of coarser granularity
// than a command-pattern history would give.

export function createHistory(graph, { limit = 50 } = {}) {
  const undoStack = [];
  const redoStack = [];
  let suppress = false;

  function snapshot() {
    return JSON.stringify(graph.toJson());
  }

  function restore(json) {
    suppress = true;
    graph.loadJson(JSON.parse(json));
    suppress = false;
  }

  return {
    // Call before a mutation to make it undoable.
    record() {
      if (suppress) return;
      undoStack.push(snapshot());
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
    },

    undo() {
      if (undoStack.length === 0) return false;
      redoStack.push(snapshot());
      restore(undoStack.pop());
      return true;
    },

    redo() {
      if (redoStack.length === 0) return false;
      undoStack.push(snapshot());
      restore(redoStack.pop());
      return true;
    },

    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
