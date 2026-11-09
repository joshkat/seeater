/** The public read-only URL for a share-link token. */
export function shareLinkUrl(token: string, origin = window.location.origin): string {
  return `${origin}/s/${token}`;
}
