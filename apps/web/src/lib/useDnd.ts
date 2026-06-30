import * as React from "react";

/** Native HTML5 drag-and-drop hook for list reordering. Calls onReorder(from, to) with source and target indices. */
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

/** Moves the element at index `from` to index `to` in a copy of the array. */
export function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  if (item !== undefined) copy.splice(to, 0, item);
  return copy;
}
