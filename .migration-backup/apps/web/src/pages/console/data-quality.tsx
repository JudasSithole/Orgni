import { Redirect, useRoute } from "wouter";
import { ConsolePageHeader, SectionTabs } from "./shared";
import Exceptions from "./exceptions";
import Review from "./review";

const tabs = [
  { label: "Issues", href: "/app/data-quality/issues" },
  { label: "Review queue", href: "/app/data-quality/review" },
];

export default function DataQuality() {
  const [, params] = useRoute("/app/data-quality/:view");
  const view = params?.view;
  if (!view) return <Redirect to="/app/data-quality/issues" />;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Data Quality"
        description="Inspect conflicts, failed processing, rejected mappings and unresolved review work that affect model quality."
      />
      <SectionTabs tabs={tabs} />
      {view === "issues" ? <Exceptions embedded /> : <Review embedded />}
    </div>
  );
}
