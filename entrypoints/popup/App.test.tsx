import { describe, expect, it } from "vitest";
import { toggleVisibleTabSelection } from "./App";

describe("bulk tab selection", () => {
  it("selects only tabs visible through the current filter", () => {
    expect([...toggleVisibleTabSelection(new Set([1]), [2, 3])]).toEqual([1, 2, 3]);
  });

  it("clears only visible tabs when all filtered results are selected", () => {
    expect([...toggleVisibleTabSelection(new Set([1, 2, 3]), [2, 3])]).toEqual([1]);
  });
});
