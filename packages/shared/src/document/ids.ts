/**
 * Ids are generated on the client (UUID v4) so documents can be created and
 * edited fully offline — nothing waits on a server to mint an id.
 *
 * `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost) and
 * Node 19+. A self-hosted copy opened over plain HTTP on a LAN address
 * (http://192.168.x.x) has no `randomUUID`, so we fall back to building a v4
 * UUID from `crypto.getRandomValues`, which every context has. Accessed
 * through a narrow cast because this package compiles without DOM or Node
 * type libraries.
 */
interface IdCrypto {
  randomUUID?: () => string;
  getRandomValues<T extends Uint8Array>(array: T): T;
}

export function newId(): string {
  const crypto = (globalThis as unknown as { crypto: IdCrypto }).crypto;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return uuidFromRandomBytes(crypto.getRandomValues(new Uint8Array(16)));
}

/** Formats 16 random bytes as an RFC 4122 version 4 UUID. */
export function uuidFromRandomBytes(bytes: Uint8Array): string {
  const b = Uint8Array.from(bytes);
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(b, (n) => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
