import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Database, Network } from "lucide-react";
import {
  listEntities,
  listFacts,
  listRelationships,
  type Provenance,
} from "@/lib/api";
import { humanizeType } from "./fact-card";
import { EmptyState, ErrorState, useData } from "./shared";

/**
 * Ontology hierarchy.
 *
 * Renders the organisational model as a top-down tree:
 *   Organisational model → entity types → entities,
 * with mapped relationships drawn as labelled cross-links between entities.
 * Selecting a node shows its detail and evidence source. Nothing is invented:
 * a relationship only appears when both of its endpoints resolve to an entity.
 */

type NodeKind = "root" | "type" | "entity";

type OntologyNodeData = {
  label: string;
  kind: NodeKind;
  detail: string;
  source?: Provenance;
};

type OntologyNode = Node<OntologyNodeData>;

const STYLE: Record<NodeKind, React.CSSProperties> = {
  root: {
    background: "#111111",
    color: "#ffffff",
    border: "1px solid #111111",
    width: 220,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    padding: 12,
  },
  type: {
    background: "#e5e5e5",
    color: "#171717",
    border: "1px solid #737373",
    width: 190,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    padding: 10,
  },
  entity: {
    background: "#ffffff",
    color: "#171717",
    border: "1px solid #a3a3a3",
    width: 200,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    padding: 10,
  },
};

// Radial "ontology star": the model sits at the centre, entity types on an
// inner ring, and entities on an outer ring — spokes radiate from the centre.
const R_TYPE = 260;
const R_ENTITY = 540;
const START_ANGLE = -Math.PI / 2; // first spoke points straight up
const CENTER = { x: 640, y: 560 };
const SPOKE: React.CSSProperties = { stroke: "#cbcbcb", strokeWidth: 1.2 };

/** Polar → top-left position (offset by ~half a node so it sits on the ring). */
function polar(radius: number, angle: number) {
  return {
    x: CENTER.x + radius * Math.cos(angle) - 95,
    y: CENTER.y + radius * Math.sin(angle) - 20,
  };
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export default function OntologyVisualization() {
  const entitiesState = useData(listEntities);
  const relationshipsState = useData(listRelationships);
  const factsState = useData(listFacts);
  const [selected, setSelected] = useState<OntologyNode | null>(null);

  const graph = useMemo(() => {
    const entities = entitiesState.data?.entities ?? [];
    const relationships = relationshipsState.data?.relationships ?? [];
    const facts = factsState.data?.facts ?? [];

    const nodes: OntologyNode[] = [];
    const edges: Edge[] = [];
    // norm(name|key|entity_id) -> entity node id, so relationships can resolve.
    const aliases = new Map<string, string>();

    // Group entities by their type so siblings sit together under one parent.
    const byType = new Map<string, typeof entities>();
    for (const entry of entities) {
      const type = humanizeType(
        entry.entity.entity_type ?? entry.entity.type ?? "Entity",
      );
      const list = byType.get(type) ?? [];
      list.push(entry);
      byType.set(type, list);
    }

    const factsFor = (name: string) =>
      facts.filter((f) => normalize(f.fact.subject) === normalize(name)).length;

    const total = Math.max(entities.length, 1);
    let slot = 0; // global slot index → angle around the star
    const typeCenters: { id: string; angle: number }[] = [];

    for (const [type, list] of byType) {
      const startSlot = slot;
      const typeId = `type-${type}`;

      list.forEach((entry) => {
        const id = `entity-${slot}`;
        const name = String(entry.entity.name ?? entry.key);
        const fc = factsFor(name);
        const angle = START_ANGLE + (slot / total) * 2 * Math.PI;
        nodes.push({
          id,
          position: polar(R_ENTITY, angle),
          data: {
            label: name,
            kind: "entity",
            detail: `${type} · ${entry.occurrences} occurrence${
              entry.occurrences === 1 ? "" : "s"
            }${fc ? ` · ${fc} fact${fc === 1 ? "" : "s"}` : ""}`,
            source: entry.sources[0],
          },
          style: STYLE.entity,
        });
        [entry.key, name, entry.entity.entity_id].forEach(
          (a) => a && aliases.set(normalize(a), id),
        );
        edges.push({
          id: `h-${typeId}-${id}`,
          source: typeId,
          target: id,
          type: "straight",
          style: SPOKE,
        });
        slot++;
      });

      // Type node on the inner ring, at the angular centre of its entities.
      const typeAngle =
        START_ANGLE + ((startSlot + slot - 1) / 2 / total) * 2 * Math.PI;
      nodes.push({
        id: typeId,
        position: polar(R_TYPE, typeAngle),
        data: {
          label: type,
          kind: "type",
          detail: `${list.length} entit${list.length === 1 ? "y" : "ies"}`,
        },
        style: STYLE.type,
      });
      typeCenters.push({ id: typeId, angle: typeAngle });
    }

    // Root at the centre of the star.
    if (typeCenters.length > 0) {
      nodes.push({
        id: "root",
        position: { x: CENTER.x - 110, y: CENTER.y - 22 },
        data: {
          label: "Organisational model",
          kind: "root",
          detail: `${entities.length} entit${
            entities.length === 1 ? "y" : "ies"
          } · ${facts.length} fact${facts.length === 1 ? "" : "s"}`,
        },
        style: STYLE.root,
      });
      typeCenters.forEach((t) =>
        edges.push({
          id: `h-root-${t.id}`,
          source: "root",
          target: t.id,
          type: "straight",
          style: SPOKE,
        }),
      );
    }

    // Relationships: labelled cross-links between two resolved entities only.
    let mapped = 0;
    relationships.forEach((entry, index) => {
      const rel = entry.relationship;
      const s = aliases.get(normalize(rel.subject_ref ?? rel.subject));
      const t = aliases.get(normalize(rel.object_ref ?? rel.object));
      if (!s || !t || s === t) return;
      mapped++;
      edges.push({
        id: `rel-${index}`,
        source: s,
        target: t,
        label: humanizeType(
          rel.predicate ?? rel.relationship_type ?? "Related to",
        ),
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#525252" },
        style: { stroke: "#525252", strokeWidth: 1.4, strokeDasharray: "4 3" },
        labelStyle: { fill: "#404040", fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
      });
    });

    return { nodes, edges, mappedRelationships: mapped };
  }, [entitiesState.data, factsState.data, relationshipsState.data]);

  if (
    entitiesState.loading ||
    relationshipsState.loading ||
    factsState.loading
  ) {
    return <div className="h-[620px] animate-pulse rounded-md bg-muted/50" />;
  }

  const error =
    entitiesState.error ?? relationshipsState.error ?? factsState.error;
  if (error) return <ErrorState error={error} />;

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="No ontology to visualize yet"
        description="Upload evidence to resolve entities, facts and relationships. The organisational model hierarchy will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-neutral-900" />
          Model
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-neutral-500 bg-neutral-200" />
          Entity type
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-neutral-400 bg-white" />
          Entity
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t border-dashed border-neutral-600" />
          Relationship
        </span>
        <span>
          {graph.mappedRelationships} mapped relationship
          {graph.mappedRelationships === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="h-[460px] overflow-hidden rounded-md border border-border bg-white sm:h-[560px] xl:h-[620px]">
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.8}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => setSelected(node as OntologyNode)}
            onPaneClick={() => setSelected(null)}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#d4d4d4"
              gap={18}
              size={1}
            />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) =>
                (node as OntologyNode).data.kind === "entity"
                  ? "#d4d4d4"
                  : "#171717"
              }
              maskColor="rgba(245,245,245,0.75)"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="min-h-36 rounded-md border border-border bg-card p-4 xl:min-h-0">
          {selected ? (
            <>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {selected.data.kind === "root"
                  ? "Model"
                  : selected.data.kind === "type"
                    ? "Entity type"
                    : "Entity"}
              </p>
              <h3 className="mt-2 text-base font-semibold">
                {selected.data.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {selected.data.detail}
              </p>
              {selected.data.source && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Evidence source
                  </p>
                  <p className="mt-1 break-words text-sm">
                    {selected.data.source.filename}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-32 flex-col items-center justify-center text-center">
              <Database className="size-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Explore the ontology</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Select a node to see its type, occurrences and evidence source.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
