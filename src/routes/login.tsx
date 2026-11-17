import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PastepostAccount } from "@/components/pastepost-account";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { url?: string } => ({
    url: typeof search.url === "string" ? search.url : undefined,
  }),
  component: Login,
});

function Login() {
  const { url } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  if (user && !user.isDevFallback) return <Navigate to="/" search={{ url }} replace />;
  return <PastepostAccount pending={isPending} sharedUrl={url} />;
}
