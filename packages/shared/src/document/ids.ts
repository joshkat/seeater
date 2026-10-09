/**
 * Ids are generated on the client (UUID v4) so documents can be created and
 * edited fully offline — nothing waits on a server to mint an id.
 *
 * `crypto.randomUUID` exists in every modern browser (secure contexts, which
 * includes localhost) and in Node 19+. It's accessed through a narrow cast
 * because this package compiles without DOM or Node type libraries.
 */
export function newId(): string {
  return (globalThis as unknown as { crypto: { randomUUID(): string } }).crypto.randomUUID();
}
