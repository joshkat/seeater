/**
 * @seating/shared
 *
 * The contract shared by the web app and the sync API (and, later, a mobile
 * client): the event-document schema + types, pure operations that edit a
 * document, and seat-layout geometry.
 */

export * from "./types/geometry.js";

export * from "./document/schema.js";
export * from "./document/migrate.js";
export * from "./document/ids.js";
export * from "./document/eventOps.js";
export * from "./document/tableOps.js";
export * from "./document/guestOps.js";
export * from "./document/householdOps.js";
export * from "./document/layoutOps.js";
export * from "./document/roomObjectOps.js";
export * from "./document/checkInOps.js";
export * from "./document/clipboardOps.js";
export * from "./document/ruleOps.js";
export * from "./document/autoSeat.js";
export * from "./document/templates.js";
export * from "./document/summary.js";
export * from "./document/stats.js";

export * from "./geometry/constants.js";
export * from "./geometry/seatLayout.js";
export * from "./sync/protocol.js";
