/**
 * Build the Knowledge map from the model API's real entities and relationships.
 *
 * The ontology output is loosely typed (`Record<string, unknown>`), so every
 * field lookup here is defensive: anything we can't resolve is skipped rather
 * than guessed. When the model API returns nothing, the graph is empty and the
 * Knowledge screen shows its empty state.
 */
import type { EntityEntry, Provenance } from "@/lib/api";
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "./defaults";
import type { KnowledgeCategory } from "./types";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function firstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const s = str(obj[k]);
    if (s) return s;
  }
  return null;
}

/** Map an ontology entity type to one of the seven display categories. */
export function toCategory(raw: string | null): KnowledgeCategory {
  const t = (raw ?? "").toLowerCase();
  if (/person|people|employee|contact|staff/.test(t)) return "people";
  if (/customer|client|account(?!ing)/.test(t)) return "customers";
  if (/supplier|vendor|partner|carrier/.test(t)) return "suppliers";
  if (/project|initiative|engagement/.test(t)) return "projects";
  if (/polic|standard|guideline|sla|regulation/.test(t)) return "policies";
  if (/process|procedure|workflow|pipeline/.test(t)) return "processes";
  return "documents";
}

export interface KnowledgeModelInput {
  entities: EntityEntry[];
  relationships: { relationship: Record<string, unknown>; source: Provenance }[];
}

export interface KnowledgeView {
  graph: { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] };
  counts: Record<KnowledgeCategory, number>;
  total: number;
}

const EMPTY_COUNTS: () => Record<KnowledgeCategory, number> = () => ({
  people: 0,
  customers: 0,
  suppliers: 0,
  projects: 0,
  policies: 0,
  documents: 0,
  processes: 0,
});

export function buildKnowledgeView(input: KnowledgeModelInput): KnowledgeView {
  const counts = EMPTY_COUNTS();
  const nodes: KnowledgeGraphNode[] = [];
  const idByLabel = new Map<string, string>();

  for (const e of input.entities) {
    const ent = e.entity ?? {};
    const label =
      firstString(ent, ["name", "label", "title", "display_name", "value"]) ??
      str(e.key);
    if (!label) continue;
    const category = toCategory(
      firstString(ent, ["type", "kind", "entity_type", "category", "class"]),
    );
    const id = e.key || label;
    counts[category] += 1;
    idByLabel.set(label.toLowerCase(), id);
    nodes.push({
      id,
      label,
      category,
      detail: `${cap(category)} · seen in ${e.occurrences} ${
        e.occurrences === 1 ? "source" : "sources"
      }`,
    });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: KnowledgeGraphEdge[] = [];

  for (const { relationship: r } of input.relationships) {
    const rawSource = firstString(r, [
      "source",
      "from",
      "subject",
      "head",
      "start",
      "source_name",
    ]);
    const rawTarget = firstString(r, [
      "target",
      "to",
      "object",
      "tail",
      "end",
      "target_name",
    ]);
    if (!rawSource || !rawTarget) continue;
    const s = idByLabel.get(rawSource.toLowerCase()) ?? rawSource;
    const t = idByLabel.get(rawTarget.toLowerCase()) ?? rawTarget;
    if (!nodeIds.has(s) || !nodeIds.has(t)) continue;
    const label =
      firstString(r, ["type", "relation", "label", "predicate", "kind"]) ??
      "related to";
    edges.push({ source: s, target: t, label: humanize(label) });
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { graph: { nodes, edges }, counts, total };
}

export function emptyKnowledgeView(): KnowledgeView {
  return { graph: { nodes: [], edges: [] }, counts: EMPTY_COUNTS(), total: 0 };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function humanize(s: string) {
  return s.replace(/[_-]+/g, " ").toLowerCase();
}
