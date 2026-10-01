import type { ParsedInput } from "./types";

const RAW_ID = /^\d{1,20}$/;
const HOSTS = new Set(["x.com", "twitter.com", "t.co"]);

const STATUS_PATH =
  /^(?:\/(?:i\/web|i)\/status\/(\d{1,20})(?:\/|$)|\/([^/]+)\/status\/(\d{1,20})(?:\/|$))/i;

export function parseInput(raw: string): ParsedInput {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  if (RAW_ID.test(trimmed)) {
    return {
      ok: true,
      id: trimmed,
      canonical: canonicalPermalink(trimmed),
    };
  }

  const url = coerceUrl(trimmed);
  if (!url) return { ok: false, reason: "invalid" };

  const host = normalizeHost(url.hostname);
  if (host === "t.co") {
    const idGuess = trimmed.match(/(\d{1,20})/);
    if (idGuess) {
      return { ok: true, id: idGuess[1]!, canonical: canonicalPermalink(idGuess[1]!) };
    }
    return { ok: false, reason: "invalid" };
  }

  if (!HOSTS.has(host)) return { ok: false, reason: "invalid" };

  const match = STATUS_PATH.exec(url.pathname);
  if (!match) {
    const trailingId = url.pathname.match(/\/(\d{1,20})\/?$/);
    if (trailingId) {
      return {
        ok: true,
        id: trailingId[1]!,
        canonical: canonicalPermalink(trailingId[1]!),
      };
    }
    return { ok: false, reason: "invalid" };
  }

  const id = match[1] || match[3];
  if (!id) return { ok: false, reason: "invalid" };

  const handleRaw = match[2];
  const handle =
    handleRaw && !["i", "web"].includes(handleRaw.toLowerCase())
      ? handleRaw.replace(/^@/, "")
      : undefined;

  return {
    ok: true,
    id,
    handle,
    canonical: canonicalPermalink(id, handle),
  };
}

export function canonicalPermalink(id: string, handle?: string): string {
  if (handle) return `https://x.com/${handle}/status/${id}`;
  return `https://x.com/i/status/${id}`;
}

export function stripTracking(href: string): string {
  try {
    const url = new URL(href);
    const drop = [
      "s",
      "t",
      "src",
      "cn",
      "ref_src",
      "ref_url",
      "twclid",
      "mx",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ];
    for (const key of drop) url.searchParams.delete(key);
    url.hash = "";
    return url.toString();
  } catch {
    return href;
  }
}

function coerceUrl(value: string): URL | null {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^(www|mobile|m)\./i, "").toLowerCase();
}
