import { describe, expect, it } from "vitest";
import { saveTabsLabel, toggleVisibleTabSelection } from "./App";

describe("bulk tab selection", () => {
  it("selects only tabs visible through the current filter", () => {
    expect([...toggleVisibleTabSelection(new Set([1]), [2, 3])]).toEqual([1, 2, 3]);
  });

  it("clears only visible tabs when all filtered results are selected", () => {
    expect([...toggleVisibleTabSelection(new Set([1, 2, 3]), [2, 3])]).toEqual([1]);
  });
});

describe("bulk save label", () => {
  it("uses the singular for one tab", () => {
    expect(saveTabsLabel(1)).toBe("Save 1 tab");
    expect(saveTabsLabel(0)).toBe("Save 0 tabs");
    expect(saveTabsLabel(3)).toBe("Save 3 tabs");
  });
});
