import * as React from "react";

// Petit utilitaire de réordonnancement par glisser-déposer (HTML5 natif).
// onReorder(from, to) reçoit les index source/cible dans la même liste.
export function useDnd(onReorder: (from: number, to: number) => void) {
  const from = React.useRef<number | null>(null);
  return (index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      from.current = index;
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (from.current !== null && from.current !== index) onReorder(from.current, index);
      from.current = null;
    },
  });
}

/** Déplace l'élément d'index `from` vers `to` (copie). */
export function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  if (item !== undefined) copy.splice(to, 0, item);
  return copy;
}
