import { describe, expect, it } from "vitest";
import type { GraphData, GraphLink, GraphNode } from "@shared/types";
import {
  buildFlowGraph,
  countNodeAppearances,
  layoutGraphNodes,
  sizeFromAppearanceCount,
} from "@/features/graph/build-flow-graph";

const getMockNode = (overrides?: Partial<GraphNode>): GraphNode => ({
  id: "11111111-1111-4111-8111-111111111111",
  profileId: "22222222-2222-4222-8222-222222222222",
  title: "Focus",
  noteId: null,
  createdAt: "2026-08-01T12:00:00.000Z",
  deletedAt: null,
  ...overrides,
});

const getMockLink = (overrides?: Partial<GraphLink>): GraphLink => ({
  id: "33333333-3333-4333-8333-333333333333",
  profileId: "22222222-2222-4222-8222-222222222222",
  sourceNoteId: "44444444-4444-4444-8444-444444444444",
  targetNodeId: "11111111-1111-4111-8111-111111111111",
  label: "Focus",
  createdAt: "2026-08-01T12:00:00.000Z",
  ...overrides,
});

const rectanglesOverlap = (options: {
  left: { x: number; y: number; width: number; height: number };
  right: { x: number; y: number; width: number; height: number };
  gap?: number;
}): boolean => {
  const gap = options.gap ?? 0;
  const leftRight = options.left.x + options.left.width + gap;
  const leftBottom = options.left.y + options.left.height + gap;
  const rightRight = options.right.x + options.right.width;
  const rightBottom = options.right.y + options.right.height;

  return !(
    leftRight <= options.right.x ||
    rightRight + gap <= options.left.x ||
    leftBottom <= options.right.y ||
    rightBottom + gap <= options.left.y
  );
};

describe("Graph node appearance sizing", () => {
  it("maps higher appearance counts to larger oval dimensions within min/max", () => {
    const small = sizeFromAppearanceCount({ appearanceCount: 1 });
    const large = sizeFromAppearanceCount({ appearanceCount: 12 });

    expect(small.width).toBeLessThan(large.width);
    expect(small.height).toBeLessThan(large.height);
    expect(small.width).toBeGreaterThan(small.height);
    expect(large.width).toBeGreaterThan(large.height);
    expect(small.width).toBeGreaterThanOrEqual(120);
    expect(large.width).toBeLessThanOrEqual(280);
  });

  it("clamps size at the configured maximum for very frequent nodes", () => {
    const sized = sizeFromAppearanceCount({ appearanceCount: 10_000 });
    const capped = sizeFromAppearanceCount({ appearanceCount: 20 });

    expect(sized.width).toBe(capped.width);
    expect(sized.height).toBe(capped.height);
  });
});

describe("Graph node appearance counting", () => {
  it("counts each inbound link as an appearance of the target node", () => {
    const focusId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const calmId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const noteA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const noteB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const noteC = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

    const data: GraphData = {
      nodes: [
        getMockNode({ id: focusId, title: "Focus" }),
        getMockNode({ id: calmId, title: "Calm" }),
      ],
      links: [
        getMockLink({
          id: "l1",
          sourceNoteId: noteA,
          targetNodeId: focusId,
          label: "Focus",
        }),
        getMockLink({
          id: "l2",
          sourceNoteId: noteB,
          targetNodeId: focusId,
          label: "Focus",
        }),
        getMockLink({
          id: "l3",
          sourceNoteId: noteC,
          targetNodeId: calmId,
          label: "Calm",
        }),
      ],
    };

    const counts = countNodeAppearances(data);

    expect(counts.get(focusId)).toBe(2);
    expect(counts.get(calmId)).toBe(1);
  });

  it("treats nodes with no inbound links as a single appearance", () => {
    const lonelyId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const data: GraphData = {
      nodes: [getMockNode({ id: lonelyId, title: "Lonely" })],
      links: [],
    };

    const counts = countNodeAppearances(data);

    expect(counts.get(lonelyId)).toBe(1);
  });
});

describe("Graph node non-overlapping layout", () => {
  it("places sized nodes so their bounding boxes do not overlap", () => {
    const nodes = [
      {
        id: "a",
        width: 200,
        height: 120,
      },
      {
        id: "b",
        width: 160,
        height: 96,
      },
      {
        id: "c",
        width: 240,
        height: 144,
      },
      {
        id: "d",
        width: 140,
        height: 84,
      },
      {
        id: "e",
        width: 180,
        height: 108,
      },
    ];

    const positions = layoutGraphNodes({ nodes, gap: 16 });

    expect(positions).toHaveLength(nodes.length);

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const leftNode = nodes[i];
        const rightNode = nodes[j];
        const leftPos = positions.find((entry) => entry.id === leftNode?.id);
        const rightPos = positions.find((entry) => entry.id === rightNode?.id);

        expect(leftPos).toBeDefined();
        expect(rightPos).toBeDefined();
        if (!leftNode || !rightNode || !leftPos || !rightPos) {
          continue;
        }

        expect(
          rectanglesOverlap({
            left: {
              x: leftPos.x,
              y: leftPos.y,
              width: leftNode.width,
              height: leftNode.height,
            },
            right: {
              x: rightPos.x,
              y: rightPos.y,
              width: rightNode.width,
              height: rightNode.height,
            },
            gap: 16,
          })
        ).toBe(false);
      }
    }
  });
});

describe("Flow graph building", () => {
  it("builds oval nodes sized by appearance and positioned without overlap", () => {
    const focusId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const calmId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const noteA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const noteB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const noteC = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

    const data: GraphData = {
      nodes: [
        getMockNode({
          id: focusId,
          title: "Focus",
          noteId: "99999999-9999-4999-8999-999999999999",
        }),
        getMockNode({ id: calmId, title: "Calm" }),
      ],
      links: [
        getMockLink({
          id: "l1",
          sourceNoteId: noteA,
          targetNodeId: focusId,
          label: "Focus",
        }),
        getMockLink({
          id: "l2",
          sourceNoteId: noteB,
          targetNodeId: focusId,
          label: "Focus",
        }),
        getMockLink({
          id: "l3",
          sourceNoteId: noteC,
          targetNodeId: calmId,
          label: "Calm",
        }),
      ],
    };

    const flow = buildFlowGraph({ data });

    expect(flow.nodes.every((node) => node.type === "oval")).toBe(true);

    const focus = flow.nodes.find((node) => node.id === focusId);
    const calm = flow.nodes.find((node) => node.id === calmId);

    expect(focus).toBeDefined();
    expect(calm).toBeDefined();
    if (!focus || !calm) {
      return;
    }

    expect(focus.style?.width).toBeGreaterThan(Number(calm.style?.width));
    expect(focus.style?.height).toBeGreaterThan(Number(calm.style?.height));
    expect(focus.style?.borderRadius).toBe("50%");
    expect(calm.data.label).toBe("Calm (stub)");
    expect(focus.data.label).toBe("Focus");

    const laidOut = flow.nodes.map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: Number(node.style?.width),
      height: Number(node.style?.height),
    }));

    for (let i = 0; i < laidOut.length; i += 1) {
      for (let j = i + 1; j < laidOut.length; j += 1) {
        const left = laidOut[i];
        const right = laidOut[j];
        if (!left || !right) {
          continue;
        }
        expect(
          rectanglesOverlap({
            left,
            right,
            gap: 12,
          })
        ).toBe(false);
      }
    }

    expect(flow.edges).toHaveLength(3);
    expect(flow.edges[0]?.source).toBe(noteA);
    expect(flow.edges[0]?.target).toBe(focusId);
  });
});
