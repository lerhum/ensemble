// Service de stockage abstrait pour les bannières d'événement.
// Implémentation par défaut : data URI (portable Node + Worker, aucune infra).
// En production on vise Cloudflare R2 (free) — implémenter R2Storage et la brancher
// dans worker.ts (voir DEPLOY.md). L'API métier ne dépend que de l'interface.
/** Storage abstraction for event banners. Default: data URI (no infrastructure). For production, implement R2Storage and wire it in worker.ts (see DEPLOY.md). */
export interface Storage {
  /** Stores binary data and returns a URL usable as an <img src>. */
  put(key: string, data: Uint8Array, contentType: string): Promise<{ url: string }>;
}

/** Stores images as base64 data URIs (embedded in event.banniere). No external infrastructure required. */
export class DataUriStorage implements Storage {
  async put(_key: string, data: Uint8Array, contentType: string): Promise<{ url: string }> {
    let bin = "";
    for (const b of data) bin += String.fromCharCode(b);
    const b64 = btoa(bin);
    return { url: `data:${contentType};base64,${b64}` };
  }
}
