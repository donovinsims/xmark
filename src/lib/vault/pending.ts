import type { VaultEntry } from "./types";

type Pending = { account: string; id: string; entry: VaultEntry };
const STORE = "pending";

async function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("pastepost.vault", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE, { keyPath: ["account", "id"] }).createIndex("account", "account");
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const operation = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(operation.result);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function writePending(account: string, entry: VaultEntry) {
  const id = entry.result.id;
  try {
    await request("readwrite", (store) => store.add({ account, id, entry } satisfies Pending));
    return entry;
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "ConstraintError") throw error;
    const previous = await request<Pending | undefined>("readonly", (store) => store.get([account, id]));
    return previous?.entry ?? entry;
  }
}

export function readPending(account: string) {
  return request<Pending[]>("readonly", (store) => store.index("account").getAll(account));
}

export function removePending(account: string, id: string) {
  return request("readwrite", (store) => store.delete([account, id]));
}
