import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import type { GraphData } from "@shared/types";
import { Button } from "@/components/ui/button";

type GraphViewProps = {
  profileId: string;
  onOpenNote: (noteId: string) => void;
  onOpenItem: (title: string) => void;
  onPromoteNode: (nodeId: string) => Promise<void>;
};

const COL_GAP = 340;
const ROW_GAP = 240;
const SOURCE_GAP = 220;

export const GraphView = ({
  profileId,
  onOpenNote,
  onOpenItem,
  onPromoteNode,
}: GraphViewProps): React.JSX.Element => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void window.mindwtr.graph.get(profileId).then(setData);
  }, [profileId]);

  const flowNodes: Node[] = useMemo(
    () =>
      data.nodes.map((node, index) => ({
        id: node.id,
        position: {
          x: 220 + (index % 3) * COL_GAP,
          y: 120 + Math.floor(index / 3) * ROW_GAP,
        },
        data: {
          label: node.noteId ? node.title : `${node.title} (stub)`,
        },
        style: {
          background: node.noteId ? "#fffaf5" : "#efdfd0",
          border: "1px solid #e2c9b3",
          borderRadius: 18,
          padding: "14px 18px",
          minWidth: 140,
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "#2a1f1a",
          boxShadow: "0 8px 24px rgb(61 47 40 / 0.08)",
        },
      })),
    [data.nodes]
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      data.links.map((link) => ({
        id: link.id,
        source: link.sourceNoteId,
        target: link.targetNodeId,
        label: link.label,
        style: { stroke: "#c97b3a", strokeWidth: 1.5 },
        labelStyle: { fill: "#3d2f28", fontSize: 11 },
      })),
    [data.links]
  );

  const noteSourceNodes: Node[] = useMemo(() => {
    const sourceIds = Array.from(new Set(data.links.map((l) => l.sourceNoteId)));
    const existing = new Set(data.nodes.map((n) => n.id));
    return sourceIds
      .filter((id) => !existing.has(id))
      .map((id, index) => ({
        id,
        position: { x: 40, y: 120 + index * SOURCE_GAP },
        data: { label: "Note" },
        style: {
          background: "#ffe8d4",
          border: "1px solid #e8a87c",
          borderRadius: 18,
          padding: "14px 18px",
          minWidth: 120,
          fontFamily: "var(--font-ui)",
          color: "#2a1f1a",
        },
      }));
  }, [data.links, data.nodes]);

  const selected = data.nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-sand-300/50 px-6 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-ink-900">
          Graph
        </h2>
        {selected ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-700">{selected.title}</span>
            <Button
              size="sm"
              variant="soft"
              onClick={() => onOpenItem(selected.title)}
            >
              Mentions
            </Button>
            {selected.noteId ? (
              <Button
                size="sm"
                onClick={() => {
                  if (selected.noteId) {
                    onOpenNote(selected.noteId);
                  }
                }}
              >
                Open note
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => void onPromoteNode(selected.id)}
              >
                Promote to note
              </Button>
            )}
          </div>
        ) : null}
      </header>
      <div className="flex-1">
        {flowNodes.length === 0 && noteSourceNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-ink-700/70">
            Create links with [[idea]] in a note to grow this graph.
          </div>
        ) : (
          <ReactFlow
            nodes={[...noteSourceNodes, ...flowNodes]}
            edges={flowEdges}
            fitView
            fitViewOptions={{ padding: 0.35, maxZoom: 0.72, minZoom: 0.2 }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
            minZoom={0.15}
            maxZoom={1.4}
            nodesDraggable
            onNodeClick={(_event, node) => {
              if (data.nodes.some((n) => n.id === node.id)) {
                setSelectedId(node.id);
              }
            }}
            onNodeDoubleClick={(_event, node) => {
              const graphNode = data.nodes.find((n) => n.id === node.id);
              if (graphNode) {
                onOpenItem(graphNode.title);
              }
            }}
          >
            <Background color="#e2c9b3" gap={28} size={1} />
            <MiniMap
              pannable
              zoomable
              style={{ width: 140, height: 90 }}
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
