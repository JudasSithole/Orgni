/**
 * Interactive knowledge graph — "what Orgni understands", as a picture.
 *
 * Nodes are people / customers / suppliers / projects / policies / documents /
 * processes, coloured by kind. Edges are plain-language relationships. Pan,
 * zoom, drag nodes; click a node to inspect it; filter by category or search.
 *
 * Layout is a small deterministic force simulation so it looks organic without
 * a layout dependency.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
} from "@/lib/orgni/defaults";
import type { KnowledgeCategory } from "@/lib/orgni/types";

export const CATEGORY_LABEL: Record<KnowledgeCategory, string> = {
  people: "People",
  customers: "Customers",
  suppliers: "Suppliers",
  projects: "Projects",
  policies: "Policies",
  documents: "Documents",
  processes: "Processes",
};

/**
 * A restrained 4-tone scheme for the graph only: people, outside parties,
 * work in motion, and reference material. Enough to read the graph at a
 * glance without a rainbow.
 */
export function categoryTone(c: KnowledgeCategory): string {
  switch (c) {
    case "people":
      return "#5b7fb0"; // muted blue
    case "customers":
    case "suppliers":
      return "#b07d4b"; // muted amber — outside parties
    case "projects":
    case "processes":
      return "#4f8a7e"; // muted teal — work in motion
    case "policies":
    case "documents":
    default:
      return "#8b8b93"; // slate — reference
  }
}

export const TONE_LEGEND: { label: string; color: string }[] = [
  { label: "People", color: "#5b7fb0" },
  { label: "Outside parties", color: "#b07d4b" },
  { label: "Work in motion", color: "#4f8a7e" },
  { label: "Reference", color: "#8b8b93" },
];

type GNodeData = {
  label: string;
  category: KnowledgeCategory;
  detail: string;
  dim: boolean;
};

/* ---- deterministic force layout ---------------------------------- */

function layout(
  nodes: KnowledgeGraphNode[],
  edges: KnowledgeGraphEdge[],
  width = 920,
  height = 620,
): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  // Seeded ring start so it's stable across renders.
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    pos[n.id] = {
      x: width / 2 + Math.cos(a) * 240 + ((i * 53) % 40),
      y: height / 2 + Math.sin(a) * 200 + ((i * 31) % 40),
    };
  });
  const adj = edges.map((e) => [e.source, e.target] as const);
  const k = 210;
  for (let iter = 0; iter < 320; iter++) {
    const disp: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) disp[n.id] = { x: 0, y: 0 };
    // repulsion
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const na = nodes[a]!.id;
        const nb = nodes[b]!.id;
        let dx = pos[na]!.x - pos[nb]!.x;
        let dy = pos[na]!.y - pos[nb]!.y;
        let d = Math.hypot(dx, dy) || 0.01;
        const rep = (k * k) / d;
        dx /= d;
        dy /= d;
        disp[na]!.x += dx * rep;
        disp[na]!.y += dy * rep;
        disp[nb]!.x -= dx * rep;
        disp[nb]!.y -= dy * rep;
      }
    }
    // attraction along edges
    for (const [s, t] of adj) {
      let dx = pos[s]!.x - pos[t]!.x;
      let dy = pos[s]!.y - pos[t]!.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const att = (d * d) / k;
      dx /= d;
      dy /= d;
      disp[s]!.x -= dx * att;
      disp[s]!.y -= dy * att;
      disp[t]!.x += dx * att;
      disp[t]!.y += dy * att;
    }
    const temp = 16 * (1 - iter / 320);
    for (const n of nodes) {
      const dd = Math.hypot(disp[n.id]!.x, disp[n.id]!.y) || 0.01;
      pos[n.id]!.x += (disp[n.id]!.x / dd) * Math.min(dd, temp);
      pos[n.id]!.y += (disp[n.id]!.y / dd) * Math.min(dd, temp);
      pos[n.id]!.x = Math.max(20, Math.min(width - 20, pos[n.id]!.x));
      pos[n.id]!.y = Math.max(20, Math.min(height - 20, pos[n.id]!.y));
    }
  }
  return pos;
}

/* ---- custom node ------------------------------------------------- */

function KnowledgeNode({ data, selected }: NodeProps) {
  const d = data as GNodeData;
  const tone = categoryTone(d.category);
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border bg-card py-2 pl-2.5 pr-3 text-xs transition-opacity ${
        selected ? "border-foreground shadow-[0_0_0_1px_hsl(var(--foreground))]" : "border-border"
      }`}
      style={{ opacity: d.dim ? 0.25 : 1 }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: tone }}
      />
      <span>
        <span className="block text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {CATEGORY_LABEL[d.category]}
        </span>
        <span className="block font-medium text-foreground">{d.label}</span>
      </span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { knowledge: KnowledgeNode };

/* ---- graph ----------------------------------------------------- */

export function KnowledgeGraph({
  data,
  onInspect,
}: {
  data: { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] };
  onInspect?: (node: KnowledgeGraphNode | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);

  const positions = useMemo(
    () => layout(data.nodes, data.edges),
    [data],
  );

  const categoriesPresent = useMemo(() => {
    const set = new Set(data.nodes.map((n) => n.category));
    return (Object.keys(CATEGORY_LABEL) as KnowledgeCategory[]).filter((c) =>
      set.has(c),
    );
  }, [data.nodes]);

  const matches = useCallback(
    (n: KnowledgeGraphNode) => {
      const q = query.trim().toLowerCase();
      const qOk = !q || n.label.toLowerCase().includes(q) || n.detail.toLowerCase().includes(q);
      const cOk = !activeCategory || n.category === activeCategory;
      return qOk && cOk;
    },
    [query, activeCategory],
  );

  const initialNodes: Node[] = useMemo(
    () =>
      data.nodes.map((n) => ({
        id: n.id,
        type: "knowledge",
        position: positions[n.id] ?? { x: 0, y: 0 },
        data: {
          label: n.label,
          category: n.category,
          detail: n.detail,
          dim: !matches(n),
        } satisfies GNodeData,
      })),
    // positions/data only; dim handled by the effect below
    [data.nodes, positions],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      data.edges.map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
        labelBgStyle: { fill: "hsl(var(--background))" },
        style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
      })),
    [data.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Re-dim on filter change without moving nodes.
  useEffect(() => {
    setNodes((ns) =>
      ns.map((node) => {
        const src = data.nodes.find((x) => x.id === node.id)!;
        return { ...node, data: { ...node.data, dim: !matches(src) } };
      }),
    );
    setEdges((es) =>
      es.map((e) => {
        const s = data.nodes.find((x) => x.id === e.source)!;
        const t = data.nodes.find((x) => x.id === e.target)!;
        const on = matches(s) && matches(t);
        return {
          ...e,
          style: {
            stroke: on ? "hsl(var(--muted-foreground) / 0.5)" : "hsl(var(--border))",
            strokeWidth: 1.5,
            opacity: on ? 1 : 0.3,
          },
        };
      }),
    );
  }, [matches, data.nodes, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setSelected(node.id);
      const src = data.nodes.find((n) => n.id === node.id) ?? null;
      onInspect?.(src);
    },
    [data.nodes, onInspect],
  );

  const selectedNode = selected
    ? (data.nodes.find((n) => n.id === selected) ?? null)
    : null;

  return (
    <div className="relative h-[calc(100vh-13rem)] min-h-[460px] w-full overflow-hidden rounded-2xl border border-border bg-card">
      {/* floating toolbar */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start gap-2">
        <div className="pointer-events-auto relative w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-8 bg-background pl-8 text-sm shadow-sm"
          />
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          {categoriesPresent.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory((prev) => (prev === c ? null : c))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs shadow-sm transition-colors ${
                activeCategory === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: categoryTone(c) }}
              />
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={() => {
          setSelected(null);
          onInspect?.(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.5}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="hsl(var(--border))" />
        <Controls showInteractive={false} position="bottom-left" className="!shadow-sm" />
      </ReactFlow>

      {selectedNode ? (
        <GraphInspector
          node={selectedNode}
          edges={data.edges}
          allNodes={data.nodes}
          onClose={() => {
            setSelected(null);
            onInspect?.(null);
          }}
        />
      ) : null}
    </div>
  );
}

function GraphInspector({
  node,
  edges,
  allNodes,
  onClose,
}: {
  node: KnowledgeGraphNode;
  edges: KnowledgeGraphEdge[];
  allNodes: KnowledgeGraphNode[];
  onClose: () => void;
}) {
  const links = edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .map((e) => {
      const otherId = e.source === node.id ? e.target : e.source;
      const other = allNodes.find((n) => n.id === otherId);
      return {
        rel: e.source === node.id ? e.label : `${e.label} (in)`,
        name: other?.label ?? otherId,
      };
    });

  return (
    <div className="absolute right-3 top-3 z-10 max-h-[calc(100%-1.5rem)] w-72 overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABEL[node.category]}
          </div>
          <h3 className="mt-0.5 text-sm font-medium tracking-tight">{node.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{node.detail}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {links.length > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-xs font-medium text-muted-foreground">Connected to</div>
          <ul className="mt-1.5 space-y-1 text-xs">
            {links.map((l, i) => (
              <li key={i} className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground">{l.rel}</span>
                <span className="font-medium">{l.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
