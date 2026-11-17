import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { DashboardButton } from "./block/dashboard-shell";

export function PastepostAccount({ pending, sharedUrl }: { pending: boolean; sharedUrl?: string }) {
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError("");
    try {
      const response = creating
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] || "PastePost user" })
        : await authClient.signIn.email({ email, password });
      if (response.error) setError(response.error.message || "Couldn’t sign in. Try again.");
    } catch {
      setError("Couldn’t connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="coss-app obsidian-dashboard-shell">
    <main className="pastepost-account">
      <p className="eyebrow">pastepost</p>
      <h1>{creating ? "Create your Vault" : "Sign in to PastePost"}</h1>
      <p>{sharedUrl ? "Sign in to extract and save the X link you shared." : "Open your saved posts from any device."}</p>
      {pending ? <p role="status">Checking your session…</p> :
        <form className="composer-card" onSubmit={(event) => void submit(event)}>
          <label className="pastepost-account-field">Email
            <input className="url-input" type="email" name="email" autoComplete="username" required />
          </label>
          <label className="pastepost-account-field">Password
            <input className="url-input" type="password" name="password"
              autoComplete={creating ? "new-password" : "current-password"} minLength={8} required />
          </label>
          {error && <p className="error-card" role="alert">{error}</p>}
          <div className="composer-actions">
            <DashboardButton type="submit" variant="primary" disabled={busy}>
              {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
            </DashboardButton>
            <DashboardButton type="button" variant="secondary" disabled={busy}
              onClick={() => { setCreating(!creating); setError(""); }}>
              {creating ? "Back to sign in" : "Create an account"}
            </DashboardButton>
          </div>
        </form>}
    </main>
  </div>;
}
