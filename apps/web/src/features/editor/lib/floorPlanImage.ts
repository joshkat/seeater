import { setBackdrop } from "@seating/shared";

import { MAX_IMAGE_BYTES, saveImage } from "../../storage/repository/imageRepository";
import { activeDb } from "../../storage/store/storageStore";
import { useDocumentStore } from "../store/documentStore";

/** Image types browsers can draw on the canvas. */
export const FLOOR_PLAN_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/** Reads an image's pixel size. */
async function imageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

/**
 * Stores a floor-plan picture (outside the event document) and puts it under
 * the active layout. Returns an error message, or null on success.
 */
export async function uploadFloorPlan(file: File): Promise<string | null> {
  const doc = useDocumentStore.getState().doc;
  if (!doc) return "No event is open.";
  if (!file.type.startsWith("image/")) return "That isn't an image. Use a PNG or JPEG.";
  if (file.size > MAX_IMAGE_BYTES) return "That image is too large (15 MB max).";
  try {
    const { width, height } = await imageSize(file);
    const imageId = await saveImage(activeDb(), {
      eventId: doc.id,
      data: await file.arrayBuffer(),
      mimeType: file.type,
      width,
      height,
    });
    useDocumentStore.getState().apply((current) => setBackdrop(current, imageId, 0.5));
    return null;
  } catch (error) {
    console.error("Floor plan upload failed", error);
    return "That image couldn't be read.";
  }
}
