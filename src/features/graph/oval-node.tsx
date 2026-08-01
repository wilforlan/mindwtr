import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";

type OvalNodeData = {
  label: string;
  isPromoted?: boolean;
  isSourceNote?: boolean;
};

type OvalFlowNode = Node<OvalNodeData, "oval">;

export const OvalNode = ({
  data,
  selected,
}: NodeProps<OvalFlowNode>): React.JSX.Element => {
  const isPromoted = data.isPromoted ?? true;
  const isSourceNote = data.isSourceNote ?? false;

  const fillClass = isSourceNote
    ? "bg-gradient-to-br from-[#ffe8d4] to-peach-400/55"
    : isPromoted
      ? "bg-gradient-to-br from-sand-50 to-sand-200/90"
      : "bg-gradient-to-br from-sand-200 to-sand-300/90";

  return (
    <div
      className={[
        "flex h-full w-full items-center justify-center px-4 text-center",
        "font-[family-name:var(--font-ui)] text-sm leading-snug text-ink-900",
        "border shadow-[0_10px_28px_rgb(61_47_40_/_0.10)]",
        "backdrop-blur-sm",
        selected
          ? "border-amber-500 ring-2 ring-amber-500/30"
          : "border-sand-300/90",
        fillClass,
      ].join(" ")}
      style={{ borderRadius: "50%" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-sand-300 !bg-amber-500/80"
      />
      <span className="line-clamp-3 max-w-full break-words">{data.label}</span>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-sand-300 !bg-amber-500/80"
      />
    </div>
  );
};
