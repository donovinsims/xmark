import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtractResult } from "../extract/types";
import { readPending, removePending, writePending } from "./pending";
import type { VaultEntry } from "./types";
import { saveVaultPost } from "./vault-fns";

type SyncStatus = "saving" | "saved" | "existing" | "pending" | "download";

export function useArchive(account: string) {
  const [statuses, setStatuses] = useState<Record<string, SyncStatus>>({});
  const [revision, setRevision] = useState(0);
  const waiting = useRef(new Map<string, VaultEntry>());
  const inFlight = useRef(new Set<string>());
  const active = useRef(false);
  const draining = useRef(false);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);

  const send = useCallback(async (entry: VaultEntry) => {
    const id = entry.result.id;
    if (!active.current || inFlight.current.has(id)) return;
    inFlight.current.add(id);
    // Put the extract on disk before trying the network so a reload can resume.
    let onDevice = false;
    try {
      entry = await writePending(account, entry);
      onDevice = true;
    } catch { /* The server save can still succeed. */ }
    try {
      if (!active.current) return;
      const result = await saveVaultPost({ data: { expectedAccount: account, entry } });
      await removePending(account, id).catch(() => undefined);
      waiting.current.delete(id);
      setStatuses((old) => ({ ...old, [id]: result.added ? "saved" : "existing" }));
      refresh();
    } catch {
      setStatuses((old) => ({ ...old, [id]: onDevice ? "pending" : "download" }));
    } finally {
      inFlight.current.delete(id);
    }
  }, [account, refresh]);

  const retry = useCallback(async () => {
    if (!active.current || draining.current) return;
    draining.current = true;
    try {
      const disk = await readPending(account).catch(() => []);
      const entries = new Map(disk.map(({ id, entry }) => [id, entry]));
      for (const [id, entry] of waiting.current) entries.set(id, entry);
      for (const [id, entry] of entries) {
        if (!active.current) break;
        waiting.current.set(id, entry);
        await send(entry);
      }
    } finally {
      draining.current = false;
    }
  }, [account, send]);

  useEffect(() => {
    active.current = true;
    const retryNow = () => { void retry(); };
    retryNow();
    const interval = window.setInterval(retryNow, 30_000);
    window.addEventListener("online", retryNow);
    return () => {
      active.current = false;
      window.clearInterval(interval);
      window.removeEventListener("online", retryNow);
    };
  }, [retry]);

  const archive = useCallback((result: ExtractResult) => {
    if (!active.current || waiting.current.has(result.id)) return;
    const entry = { result, favorite: false, trashed: false };
    waiting.current.set(result.id, entry);
    setStatuses((old) => ({ ...old, [result.id]: "saving" }));
    void send(entry);
  }, [send]);

  const unsynced = [...waiting.current.values()].filter(({ result }) =>
    statuses[result.id] === "pending" || statuses[result.id] === "download");
  return { archive, retry, statuses, unsynced, revision, refresh };
}
