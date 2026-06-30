import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../auth.js";

describe("hashPassword", () => {
  it("returns a string in pbkdf2$<iter>$<salt>$<hash> format", async () => {
    const hash = await hashPassword("secret");
    const parts = hash.split("$");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("pbkdf2");
    expect(Number(parts[1])).toBeGreaterThan(0);
    expect(parts[2]).toBeTruthy();
    expect(parts[3]).toBeTruthy();
  });

  it("produces a different hash each call (random salt)", async () => {
    const h1 = await hashPassword("password");
    const h2 = await hashPassword("password");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true for a correct password round-trip", async () => {
    const hash = await hashPassword("correcthorse");
    expect(await verifyPassword("correcthorse", hash)).toBe(true);
  });

  it("returns false for a wrong password", async () => {
    const hash = await hashPassword("correcthorse");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("returns false for a malformed stored hash", async () => {
    expect(await verifyPassword("any", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("any", "pbkdf2$abc$def")).toBe(false);
  });

  it("returns false when prefix is not pbkdf2", async () => {
    expect(await verifyPassword("any", "bcrypt$12$salt$hash")).toBe(false);
  });
});
