import { createFileRoute } from "@tanstack/react-router";
import { XtractApp } from "@/components/xtract-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <XtractApp />;
}
