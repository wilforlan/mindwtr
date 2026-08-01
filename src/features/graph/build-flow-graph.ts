import type { Edge, Node } from "@xyflow/react";
import type { GraphData, GraphNode } from "@shared/types";

const MIN_NODE_WIDTH = 120;
const MAX_NODE_WIDTH = 280;
const OVAL_ASPECT_RATIO = 0.6;
const APPEARANCE_COUNT_FOR_MAX_SIZE = 20;
const DEFAULT_LAYOUT_GAP = 16;
const SOURCE_NODE_APPEARANCE_FLOOR = 1;

export type NodeDimensions = {
  width: number;
  height: number;
};

export type LayoutNode = {
  id: string;
  width: number;
  height: number;
};

export type LayoutPosition = {
  id: string;
  x: number;
  y: number;
};

export type SizedGraphNode = {
  id: string;
  label: string;
  width: number;
  height: number;
  isPromoted: boolean;
  isSourceNote: boolean;
};

export type BuildFlowGraphOptions = {
  data: GraphData;
  gap?: number;
};

export type FlowGraph = {
  nodes: Node[];
  edges: Edge[];
};

type MutableLayoutEntry = {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
};

export const sizeFromAppearanceCount = (options: {
  appearanceCount: number;
}): NodeDimensions => {
  const safeCount = Math.max(1, options.appearanceCount);
  const progress = Math.min(
    1,
    Math.log(safeCount) / Math.log(APPEARANCE_COUNT_FOR_MAX_SIZE)
  );
  const width = Math.round(
    MIN_NODE_WIDTH + progress * (MAX_NODE_WIDTH - MIN_NODE_WIDTH)
  );
  const height = Math.round(width * OVAL_ASPECT_RATIO);

  return { width, height };
};

export const countNodeAppearances = (
  data: GraphData
): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const node of data.nodes) {
    counts.set(node.id, 0);
  }

  for (const link of data.links) {
    const current = counts.get(link.targetNodeId) ?? 0;
    counts.set(link.targetNodeId, current + 1);
  }

  return new Map(
    Array.from(counts.entries()).map(([id, count]) => [
      id,
      Math.max(SOURCE_NODE_APPEARANCE_FLOOR, count),
    ])
  );
};

const boxesOverlap = (options: {
  left: MutableLayoutEntry;
  right: MutableLayoutEntry;
  gap: number;
}): boolean => {
  const { left, right, gap } = options;
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  );
};

const initialSpiralPositions = (options: {
  nodes: LayoutNode[];
}): MutableLayoutEntry[] => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const sorted = [...options.nodes].sort(
    (left, right) => right.width * right.height - left.width * left.height
  );

  return sorted.map((node, index) => {
    const radius = 40 + Math.sqrt(index) * 140;
    const angle = index * goldenAngle;
    return {
      id: node.id,
      width: node.width,
      height: node.height,
      x: Math.cos(angle) * radius - node.width / 2,
      y: Math.sin(angle) * radius - node.height / 2,
    };
  });
};

const separateOverlappingNodes = (options: {
  entries: MutableLayoutEntry[];
  gap: number;
}): MutableLayoutEntry[] => {
  const entries = options.entries.map((entry) => ({ ...entry }));
  const maxIterations = 80;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;

    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const left = entries[i];
        const right = entries[j];
        if (!left || !right) {
          continue;
        }
        if (!boxesOverlap({ left, right, gap: options.gap })) {
          continue;
        }

        const leftCenterX = left.x + left.width / 2;
        const leftCenterY = left.y + left.height / 2;
        const rightCenterX = right.x + right.width / 2;
        const rightCenterY = right.y + right.height / 2;

        let deltaX = rightCenterX - leftCenterX;
        let deltaY = rightCenterY - leftCenterY;
        if (deltaX === 0 && deltaY === 0) {
          deltaX = 1;
          deltaY = 0;
        }

        const distance = Math.hypot(deltaX, deltaY);
        const unitX = deltaX / distance;
        const unitY = deltaY / distance;

        const requiredX =
          left.width / 2 + right.width / 2 + options.gap - Math.abs(deltaX);
        const requiredY =
          left.height / 2 + right.height / 2 + options.gap - Math.abs(deltaY);
        const push = Math.max(requiredX, requiredY, 4) / 2;

        left.x -= unitX * push;
        left.y -= unitY * push;
        right.x += unitX * push;
        right.y += unitY * push;
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }

  return entries;
};

export const layoutGraphNodes = (options: {
  nodes: LayoutNode[];
  gap?: number;
}): LayoutPosition[] => {
  const gap = options.gap ?? DEFAULT_LAYOUT_GAP;
  if (options.nodes.length === 0) {
    return [];
  }

  const seeded = initialSpiralPositions({ nodes: options.nodes });
  const separated = separateOverlappingNodes({ entries: seeded, gap });

  return separated.map((entry) => ({
    id: entry.id,
    x: entry.x,
    y: entry.y,
  }));
};

const nodeLabel = (node: GraphNode): string =>
  node.noteId ? node.title : `${node.title} (stub)`;

const countSourceNoteAppearances = (options: {
  data: GraphData;
  sourceNoteId: string;
}): number => {
  const outgoing = options.data.links.filter(
    (link) => link.sourceNoteId === options.sourceNoteId
  ).length;
  return Math.max(SOURCE_NODE_APPEARANCE_FLOOR, outgoing);
};

const collectSizedNodes = (data: GraphData): SizedGraphNode[] => {
  const appearanceCounts = countNodeAppearances(data);
  const existingIds = new Set(data.nodes.map((node) => node.id));

  const graphNodes: SizedGraphNode[] = data.nodes.map((node) => {
    const appearanceCount = appearanceCounts.get(node.id) ?? 1;
    const dimensions = sizeFromAppearanceCount({ appearanceCount });
    return {
      id: node.id,
      label: nodeLabel(node),
      width: dimensions.width,
      height: dimensions.height,
      isPromoted: Boolean(node.noteId),
      isSourceNote: false,
    };
  });

  const sourceNoteIds = Array.from(
    new Set(data.links.map((link) => link.sourceNoteId))
  ).filter((id) => !existingIds.has(id));

  const sourceNodes: SizedGraphNode[] = sourceNoteIds.map((sourceNoteId) => {
    const appearanceCount = countSourceNoteAppearances({
      data,
      sourceNoteId,
    });
    const dimensions = sizeFromAppearanceCount({ appearanceCount });
    return {
      id: sourceNoteId,
      label: "Note",
      width: dimensions.width,
      height: dimensions.height,
      isPromoted: true,
      isSourceNote: true,
    };
  });

  return [...sourceNodes, ...graphNodes];
};

export const buildFlowGraph = (options: BuildFlowGraphOptions): FlowGraph => {
  const gap = options.gap ?? DEFAULT_LAYOUT_GAP;
  const sizedNodes = collectSizedNodes(options.data);
  const positions = layoutGraphNodes({
    nodes: sizedNodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
    })),
    gap,
  });
  const positionById = new Map(
    positions.map((position) => [position.id, position])
  );

  const nodes: Node[] = sizedNodes.map((node) => {
    const position = positionById.get(node.id) ?? { x: 0, y: 0 };
    return {
      id: node.id,
      type: "oval",
      position: { x: position.x, y: position.y },
      data: {
        label: node.label,
        isPromoted: node.isPromoted,
        isSourceNote: node.isSourceNote,
      },
      style: {
        width: node.width,
        height: node.height,
        borderRadius: "50%",
        background: "transparent",
        border: "none",
        padding: 0,
      },
    };
  });

  const edges: Edge[] = options.data.links.map((link) => ({
    id: link.id,
    source: link.sourceNoteId,
    target: link.targetNodeId,
    label: link.label,
    style: { stroke: "#c97b3a", strokeWidth: 1.5 },
    labelStyle: { fill: "#3d2f28", fontSize: 11 },
  }));

  return { nodes, edges };
};
