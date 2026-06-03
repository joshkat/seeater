import type { Prisma, PrismaClient } from "@prisma/client";
import type { ChairLayoutMode, SeatInput, Size, TableShape } from "@seating/shared";
import {
  DEFAULT_SEAT_COUNT,
  makeAutoSeatInputs,
  makeCustomSeatInputsFromAuto,
} from "@seating/shared";

import type { CreateTableBody, UpdateTableBody } from "./table.schema.js";

const seatsInclude = { seats: { orderBy: { index: "asc" } } } as const;

/** Maps shared SeatInputs to Prisma seat create rows, reindexed 0..n-1. */
function toSeatCreateData(seats: SeatInput[]): Prisma.SeatCreateWithoutTableInput[] {
  return [...seats]
    .sort((a, b) => a.index - b.index)
    .map((seat, index) => ({
      index,
      label: seat.label ?? null,
      offsetX: seat.offset?.x ?? null,
      offsetY: seat.offset?.y ?? null,
    }));
}

/**
 * Decides the final seat set for a table given its layout mode and inputs:
 * - custom + explicit seats -> use them
 * - custom without seats     -> seed offsets from the auto arrangement
 * - auto                      -> evenly-spaced seats from the desired count
 */
function resolveSeatInputs(params: {
  shape: TableShape;
  size: Size;
  mode: ChairLayoutMode;
  seatCount?: number;
  seats?: SeatInput[];
  currentCount?: number;
}): SeatInput[] {
  const { shape, size, mode, seatCount, seats, currentCount } = params;

  if (mode === "custom") {
    if (seats && seats.length > 0) {
      return seats;
    }
    const count = seatCount ?? currentCount ?? DEFAULT_SEAT_COUNT;
    return makeCustomSeatInputsFromAuto(shape, size, count);
  }

  const count = seatCount ?? seats?.length ?? currentCount ?? DEFAULT_SEAT_COUNT;
  return makeAutoSeatInputs(count);
}

export class TableService {
  constructor(private readonly prisma: PrismaClient) {}

  private async ownsPlan(floorPlanId: string, ownerId: string): Promise<boolean> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      select: { ownerId: true },
    });
    return plan?.ownerId === ownerId;
  }

  async create(floorPlanId: string, ownerId: string, body: CreateTableBody) {
    if (!(await this.ownsPlan(floorPlanId, ownerId))) return null;

    const mode: ChairLayoutMode = body.chairLayoutMode ?? "auto";
    const seatInputs = resolveSeatInputs({
      shape: body.shape,
      size: body.size,
      mode,
      seatCount: body.seatCount,
      seats: body.seats,
    });

    return this.prisma.table.create({
      data: {
        floorPlanId,
        label: body.label ?? "",
        shape: body.shape,
        x: body.position.x,
        y: body.position.y,
        rotation: body.rotation ?? 0,
        width: body.size.width,
        height: body.size.height,
        chairLayoutMode: mode,
        seats: { create: toSeatCreateData(seatInputs) },
      },
      include: seatsInclude,
    });
  }

  async update(floorPlanId: string, tableId: string, ownerId: string, body: UpdateTableBody) {
    const existing = await this.prisma.table.findFirst({
      where: { id: tableId, floorPlanId },
      include: { seats: true, floorPlan: { select: { ownerId: true } } },
    });
    if (!existing || existing.floorPlan.ownerId !== ownerId) return null;

    const nextShape = body.shape ?? existing.shape;
    const nextSize: Size = body.size ?? { width: existing.width, height: existing.height };
    const nextMode: ChairLayoutMode = body.chairLayoutMode ?? existing.chairLayoutMode;
    const modeChanged =
      body.chairLayoutMode !== undefined && body.chairLayoutMode !== existing.chairLayoutMode;

    // Only re-sync seats when seat-affecting input is present. Plain moves /
    // resizes leave seat rows (and any future guest assignments) untouched.
    const needsSeatResync = body.seats !== undefined || body.seatCount !== undefined || modeChanged;

    const data: Prisma.TableUpdateInput = {
      label: body.label,
      shape: body.shape,
      x: body.position?.x,
      y: body.position?.y,
      rotation: body.rotation,
      width: body.size?.width,
      height: body.size?.height,
      chairLayoutMode: body.chairLayoutMode,
    };

    if (needsSeatResync) {
      const seatInputs = resolveSeatInputs({
        shape: nextShape,
        size: nextSize,
        mode: nextMode,
        seatCount: body.seatCount,
        seats: body.seats,
        currentCount: existing.seats.length,
      });
      const resolved = toSeatCreateData(seatInputs); // reindexed 0..n-1
      const existingByIndex = new Map(existing.seats.map((seat) => [seat.index, seat]));

      // Reconcile seats BY INDEX instead of delete-all-recreate: update the
      // seats that survive (keeping their ids and any guest assignment), create
      // newly-added indices, and drop only seats beyond the new count. This is
      // what keeps seated guests put when toggling layout or nudging a chair.
      const seatUpdates: Prisma.SeatUpdateWithWhereUniqueWithoutTableInput[] = [];
      const seatCreates: Prisma.SeatCreateWithoutTableInput[] = [];
      for (const seat of resolved) {
        const current = existingByIndex.get(seat.index);
        if (current) {
          seatUpdates.push({
            where: { id: current.id },
            data: { label: seat.label, offsetX: seat.offsetX, offsetY: seat.offsetY },
          });
        } else {
          seatCreates.push(seat);
        }
      }

      data.seats = {
        deleteMany: { index: { gte: resolved.length } },
        update: seatUpdates,
        create: seatCreates,
      };
    }

    return this.prisma.table.update({
      where: { id: tableId },
      data,
      include: seatsInclude,
    });
  }

  async remove(floorPlanId: string, tableId: string, ownerId: string): Promise<boolean> {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, floorPlanId },
      include: { floorPlan: { select: { ownerId: true } } },
    });
    if (!table || table.floorPlan.ownerId !== ownerId) return false;
    await this.prisma.table.delete({ where: { id: tableId } });
    return true;
  }
}
