import { describe, expect, it } from "vitest";
import {
  dateScrollRestorePosition,
  isScrollAtBottom,
  isScrollAtTop,
  resolveDateScrollNavigation,
  shiftDailyDate,
  shouldAcceptSavedNote,
} from "@/features/editor/date-scroll";

describe("Daily note date scrolling", () => {
  it("moves one day newer when shifting toward newer dates", () => {
    expect(
      shiftDailyDate({ date: "2026-07-30", direction: "newer" })
    ).toBe("2026-07-31");
  });

  it("moves one day older when shifting toward older dates", () => {
    expect(
      shiftDailyDate({ date: "2026-07-30", direction: "older" })
    ).toBe("2026-07-29");
  });

  it("crosses month and year boundaries when shifting dates", () => {
    expect(
      shiftDailyDate({ date: "2026-01-01", direction: "older" })
    ).toBe("2025-12-31");
    expect(
      shiftDailyDate({ date: "2025-12-31", direction: "newer" })
    ).toBe("2026-01-01");
  });

  it("treats the scroll container as at the top near zero scrollTop", () => {
    expect(
      isScrollAtTop({
        scrollTop: 0,
        scrollHeight: 2000,
        clientHeight: 800,
      })
    ).toBe(true);
    expect(
      isScrollAtTop({
        scrollTop: 2,
        scrollHeight: 2000,
        clientHeight: 800,
        edgeTolerancePx: 4,
      })
    ).toBe(true);
    expect(
      isScrollAtTop({
        scrollTop: 40,
        scrollHeight: 2000,
        clientHeight: 800,
      })
    ).toBe(false);
  });

  it("treats the scroll container as at the bottom near the end", () => {
    expect(
      isScrollAtBottom({
        scrollTop: 1200,
        scrollHeight: 2000,
        clientHeight: 800,
      })
    ).toBe(true);
    expect(
      isScrollAtBottom({
        scrollTop: 0,
        scrollHeight: 2000,
        clientHeight: 800,
      })
    ).toBe(false);
  });

  it("treats non-overflowing content as both at top and bottom", () => {
    const shortNote = {
      scrollTop: 0,
      scrollHeight: 400,
      clientHeight: 800,
    };
    expect(isScrollAtTop(shortNote)).toBe(true);
    expect(isScrollAtBottom(shortNote)).toBe(true);
  });

  it("navigates to a newer date when scrolling up past the top past the threshold", () => {
    const result = resolveDateScrollNavigation({
      deltaY: -50,
      atTop: true,
      atBottom: false,
      accumulatedDelta: -40,
      thresholdPx: 80,
      enabled: true,
    });

    expect(result).toEqual({
      kind: "navigate",
      direction: "newer",
      accumulatedDelta: 0,
    });
  });

  it("navigates to an older date when scrolling down past the bottom past the threshold", () => {
    const result = resolveDateScrollNavigation({
      deltaY: 50,
      atTop: false,
      atBottom: true,
      accumulatedDelta: 40,
      thresholdPx: 80,
      enabled: true,
    });

    expect(result).toEqual({
      kind: "navigate",
      direction: "older",
      accumulatedDelta: 0,
    });
  });

  it("accumulates overscroll without navigating until the threshold is reached", () => {
    const result = resolveDateScrollNavigation({
      deltaY: -30,
      atTop: true,
      atBottom: false,
      accumulatedDelta: -20,
      thresholdPx: 80,
      enabled: true,
    });

    expect(result).toEqual({
      kind: "accumulate",
      accumulatedDelta: -50,
    });
  });

  it("resets accumulation when scrolling away from an edge", () => {
    const result = resolveDateScrollNavigation({
      deltaY: 20,
      atTop: false,
      atBottom: false,
      accumulatedDelta: -60,
      thresholdPx: 80,
      enabled: true,
    });

    expect(result).toEqual({
      kind: "none",
      accumulatedDelta: 0,
    });
  });

  it("does not navigate when date scrolling is disabled", () => {
    const result = resolveDateScrollNavigation({
      deltaY: -100,
      atTop: true,
      atBottom: true,
      accumulatedDelta: 0,
      thresholdPx: 80,
      enabled: false,
    });

    expect(result).toEqual({
      kind: "none",
      accumulatedDelta: 0,
    });
  });

  it("on short notes, maps upward scroll to newer and downward scroll to older", () => {
    expect(
      resolveDateScrollNavigation({
        deltaY: -90,
        atTop: true,
        atBottom: true,
        accumulatedDelta: 0,
        thresholdPx: 80,
        enabled: true,
      })
    ).toEqual({
      kind: "navigate",
      direction: "newer",
      accumulatedDelta: 0,
    });

    expect(
      resolveDateScrollNavigation({
        deltaY: 90,
        atTop: true,
        atBottom: true,
        accumulatedDelta: 0,
        thresholdPx: 80,
        enabled: true,
      })
    ).toEqual({
      kind: "navigate",
      direction: "older",
      accumulatedDelta: 0,
    });
  });

  it("ignores downward scroll at the top when content still can scroll", () => {
    const result = resolveDateScrollNavigation({
      deltaY: 40,
      atTop: true,
      atBottom: false,
      accumulatedDelta: -10,
      thresholdPx: 80,
      enabled: true,
    });

    expect(result).toEqual({
      kind: "none",
      accumulatedDelta: 0,
    });
  });

  it("ignores upward scroll at the bottom when content still can scroll", () => {
    const result = resolveDateScrollNavigation({
      deltaY: -40,
      atTop: false,
      atBottom: true,
      accumulatedDelta: 10,
      thresholdPx: 80,
      enabled: true,
    });

    expect(result).toEqual({
      kind: "none",
      accumulatedDelta: 0,
    });
  });

  it("restores scroll to the bottom when entering a newer date", () => {
    expect(dateScrollRestorePosition("newer")).toBe("bottom");
  });

  it("restores scroll to the top when entering an older date", () => {
    expect(dateScrollRestorePosition("older")).toBe("top");
  });

  it("accepts a saved note only when it still matches the active note", () => {
    expect(
      shouldAcceptSavedNote({
        activeNoteId: "note-a",
        savedNoteId: "note-a",
      })
    ).toBe(true);
    expect(
      shouldAcceptSavedNote({
        activeNoteId: "note-b",
        savedNoteId: "note-a",
      })
    ).toBe(false);
  });
});
