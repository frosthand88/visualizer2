// Snapshot-based undo/redo. `snapshot`/`restore` are supplied by the
// caller so this stays agnostic to what's in the state (graph elements,
// groups, ...); restoring is just handing a prior snapshot back.

export function createHistory({ snapshot, restore }, { limit = 50 } = {}) {
  const undoStack = [];
  const redoStack = [];
  let suppress = false;

  function guardedRestore(json) {
    suppress = true;
    restore(json);
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
      guardedRestore(undoStack.pop());
      return true;
    },

    redo() {
      if (redoStack.length === 0) return false;
      undoStack.push(snapshot());
      guardedRestore(redoStack.pop());
      return true;
    },

    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
