import { Redirect } from "wouter";

/** Detail now lives in the graph's inspector panel — send stray links home. */
export default function KnowledgeDetail() {
  return <Redirect to="/app/knowledge" />;
}
