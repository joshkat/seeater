/**
 * @seating/shared
 *
 * Domain types shared between the API (@seating/api) and web client
 * (@seating/web). Keeping the model here keeps both ends in sync and makes
 * a future mobile client just another consumer of the same contracts.
 */

export * from "./types/geometry.js";
export * from "./types/seat.js";
export * from "./types/table.js";
export * from "./types/floorPlan.js";
export * from "./types/event.js";

export * from "./geometry/constants.js";
export * from "./geometry/seatLayout.js";
