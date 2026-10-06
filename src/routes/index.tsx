import { createFileRoute } from "@tanstack/react-router";
import { PastepostApp } from "@/components/pastepost-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <PastepostApp />;
}
