import { afterEach, describe, expect, it, vi } from "vitest";
import { newId, uuidFromRandomBytes } from "../ids.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a v4 UUID", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it("works without crypto.randomUUID (plain HTTP on a LAN address)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: <T extends Uint8Array>(a: T) => real.getRandomValues(a),
    });
    const a = newId();
    const b = newId();
    expect(a).toMatch(UUID_V4);
    expect(b).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });
});

describe("uuidFromRandomBytes", () => {
  it("sets the version and variant bits", () => {
    expect(uuidFromRandomBytes(new Uint8Array(16).fill(0xff))).toBe(
      "ffffffff-ffff-4fff-bfff-ffffffffffff",
    );
    expect(uuidFromRandomBytes(new Uint8Array(16))).toBe("00000000-0000-4000-8000-000000000000");
  });
});
