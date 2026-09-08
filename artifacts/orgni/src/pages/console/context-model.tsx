import { Redirect, useRoute } from "wouter";
import { ConsolePageHeader, SectionTabs } from "./shared";
import Entities from "./entities";
import Relationships from "./relationships";
import Facts from "./facts";
import OntologyVisualization from "./ontology-visualization";
import Policies from "./policies";

const tabs = [
  { label: "Visualization", href: "/app/context-model/visualization" },
  { label: "Entities", href: "/app/context-model/entities" },
  { label: "Relationships", href: "/app/context-model/relationships" },
  { label: "Facts", href: "/app/context-model/facts" },
  { label: "Policies", href: "/app/context-model/policies" },
];

export default function ContextModel() {
  const [, params] = useRoute("/app/context-model/:view");
  const view = params?.view;
  const validViews = new Set([
    "visualization",
    "entities",
    "relationships",
    "facts",
    "policies",
  ]);
  if (!view || !validViews.has(view)) {
    return <Redirect to="/app/context-model/visualization" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Context Model"
        description="The structured organisational context maintained by Orgni, with evidence, confidence and provenance preserved."
      />
      <SectionTabs tabs={tabs} />
      {view === "visualization" && <OntologyVisualization />}
      {view === "entities" && <Entities embedded />}
      {view === "relationships" && <Relationships embedded />}
      {view === "facts" && <Facts embedded />}
      {view === "policies" && <Policies />}
    </div>
  );
}
