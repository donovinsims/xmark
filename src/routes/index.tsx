import { createFileRoute } from "@tanstack/react-router";
import { PastepostApp } from "@/components/pastepost-app";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { url?: string } => ({
    url: typeof search.url === "string" ? search.url : undefined,
  }),
  component: Home,
});

function Home() {
  const { url } = Route.useSearch();
  return <PastepostApp sharedUrl={url} />;
}
