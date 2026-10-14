import { useEffect, useState } from "react";

type LaunchSnapshot = {
  event: string;
  time: string;
  address: string;
  sharedUrl: string | null;
  standalone: boolean;
};

/** Register before the shared-link effect so the initial URL is retained. */
export function useLaunchDiagnostics() {
  const [snapshots, setSnapshots] = useState<LaunchSnapshot[]>([]);
  useEffect(() => {
    const capture = (event: string) => {
      const address = window.location.href;
      const snapshot: LaunchSnapshot = {
        event,
        time: new Date().toLocaleTimeString(),
        address,
        sharedUrl: new URL(address).searchParams.get("url"),
        standalone: window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
      };
      // Keep the initial address even after extraction removes its parameter.
      setSnapshots((previous) => previous.length === 0
        ? [snapshot]
        : [previous[0]!, ...previous.slice(1).slice(-4), snapshot]);
    };
    capture("Page opened");
    const onFocus = () => capture("App focused");
    const onPageShow = () => capture("Page shown");
    const onVisibility = () => {
      if (document.visibilityState === "visible") capture("App foregrounded");
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return snapshots;
}

export function LaunchDiagnostic({ snapshots }: { snapshots: LaunchSnapshot[] }) {
  return <details style={{ margin: "16px 0", padding: 12, border: "1px solid var(--border)", borderRadius: 12 }}>
    <summary style={{ cursor: "pointer" }}>Shortcut launch diagnostic</summary>
    <p>Temporary test details. The first entry records the address before extraction removes the shared link. Details stay in this page only.</p>
    {snapshots.map((snapshot, index) => <div key={`${index}-${snapshot.time}`} style={{ marginTop: 12, overflowWrap: "anywhere" }}>
      <strong>{snapshot.event} · {snapshot.time}</strong>
      <div>Running as: {snapshot.standalone ? "Home Screen web app" : "Browser"}</div>
      <div>Received post: {snapshot.sharedUrl === null ? "No url parameter" : snapshot.sharedUrl || "Empty url parameter"}</div>
      <div>Address: <code>{snapshot.address}</code></div>
    </div>)}
  </details>;
}
