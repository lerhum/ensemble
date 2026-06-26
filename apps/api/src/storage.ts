// Service de stockage abstrait pour les bannières d'événement.
// Implémentation par défaut : data URI (portable Node + Worker, aucune infra).
// En production on vise Cloudflare R2 (free) — implémenter R2Storage et la brancher
// dans worker.ts (voir DEPLOY.md). L'API métier ne dépend que de l'interface.
export interface Storage {
  /** Stocke un binaire et renvoie une URL utilisable dans <img src>. */
  put(key: string, data: Uint8Array, contentType: string): Promise<{ url: string }>;
}

/** Encode l'image en data URI (stockée telle quelle dans event.banniere). */
export class DataUriStorage implements Storage {
  async put(_key: string, data: Uint8Array, contentType: string): Promise<{ url: string }> {
    let bin = "";
    for (const b of data) bin += String.fromCharCode(b);
    const b64 = btoa(bin);
    return { url: `data:${contentType};base64,${b64}` };
  }
}
