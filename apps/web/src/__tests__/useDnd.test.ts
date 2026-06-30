import { describe, it, expect } from "vitest";
import { move } from "@/lib/useDnd.js";

describe("move", () => {
  it("moves an element forward", () => {
    expect(move(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an element backward", () => {
    expect(move(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("moves an element one step forward", () => {
    expect(move(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the original array", () => {
    const original = ["a", "b", "c"];
    move(original, 0, 2);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("handles a single-element array", () => {
    expect(move(["a"], 0, 0)).toEqual(["a"]);
  });

  it("returns same order when moving to same index", () => {
    expect(move(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
});
