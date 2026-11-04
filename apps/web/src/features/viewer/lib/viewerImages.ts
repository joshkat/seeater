/**
 * Where the viewer gets floor-plan pictures: the image id from a layout's
 * backdrop → its bytes, or null when this source doesn't have it (then the
 * chart is drawn without the picture). Local events read the `images` store;
 * a shared link would fetch from the server.
 */
export type ViewerImageSource = (imageId: string) => Promise<Blob | null>;
