import { addDays, format, parseISO } from "date-fns";

export type DateScrollDirection = "newer" | "older";

export type ShiftDailyDateOptions = {
  date: string;
  direction: DateScrollDirection;
};

export const shiftDailyDate = (options: ShiftDailyDateOptions): string => {
  const { date, direction } = options;
  const parsed = parseISO(date);
  const shifted = addDays(parsed, direction === "newer" ? 1 : -1);
  return format(shifted, "yyyy-MM-dd");
};

export type ScrollEdgeState = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  edgeTolerancePx?: number;
};

const DEFAULT_EDGE_TOLERANCE_PX = 4;

export const isScrollAtTop = (state: ScrollEdgeState): boolean => {
  const tolerance = state.edgeTolerancePx ?? DEFAULT_EDGE_TOLERANCE_PX;
  return state.scrollTop <= tolerance;
};

export const isScrollAtBottom = (state: ScrollEdgeState): boolean => {
  const tolerance = state.edgeTolerancePx ?? DEFAULT_EDGE_TOLERANCE_PX;
  const remaining =
    state.scrollHeight - state.clientHeight - state.scrollTop;
  return remaining <= tolerance;
};

export type ResolveDateScrollNavigationOptions = {
  deltaY: number;
  atTop: boolean;
  atBottom: boolean;
  accumulatedDelta: number;
  thresholdPx: number;
  enabled: boolean;
};

export type DateScrollNavigationResult =
  | { kind: "none"; accumulatedDelta: number }
  | { kind: "accumulate"; accumulatedDelta: number }
  | {
      kind: "navigate";
      direction: DateScrollDirection;
      accumulatedDelta: number;
    };

const towardNewer = (deltaY: number): boolean => deltaY < 0;
const towardOlder = (deltaY: number): boolean => deltaY > 0;

export const resolveDateScrollNavigation = (
  options: ResolveDateScrollNavigationOptions
): DateScrollNavigationResult => {
  const {
    deltaY,
    atTop,
    atBottom,
    accumulatedDelta,
    thresholdPx,
    enabled,
  } = options;

  if (!enabled || deltaY === 0) {
    return { kind: "none", accumulatedDelta: 0 };
  }

  const canGoNewer = atTop && towardNewer(deltaY);
  const canGoOlder = atBottom && towardOlder(deltaY);

  if (!canGoNewer && !canGoOlder) {
    return { kind: "none", accumulatedDelta: 0 };
  }

  const nextAccumulated = accumulatedDelta + deltaY;
  const crossedNewer =
    canGoNewer && Math.abs(nextAccumulated) >= thresholdPx;
  const crossedOlder =
    canGoOlder && Math.abs(nextAccumulated) >= thresholdPx;

  if (crossedNewer) {
    return {
      kind: "navigate",
      direction: "newer",
      accumulatedDelta: 0,
    };
  }

  if (crossedOlder) {
    return {
      kind: "navigate",
      direction: "older",
      accumulatedDelta: 0,
    };
  }

  return {
    kind: "accumulate",
    accumulatedDelta: nextAccumulated,
  };
};

export const DATE_SCROLL_THRESHOLD_PX = 80;
export const DATE_SCROLL_COOLDOWN_MS = 450;

export type DateScrollRestorePosition = "top" | "bottom";

export const dateScrollRestorePosition = (
  direction: DateScrollDirection
): DateScrollRestorePosition => (direction === "newer" ? "bottom" : "top");

export type ShouldAcceptSavedNoteOptions = {
  activeNoteId: string;
  savedNoteId: string;
};

export const shouldAcceptSavedNote = (
  options: ShouldAcceptSavedNoteOptions
): boolean => options.activeNoteId === options.savedNoteId;
