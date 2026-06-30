import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ApiError, notFound, unauthorized, forbidden, conflict, validate } from "../errors.js";

describe("ApiError", () => {
  it("stores status, message, and optional issues", () => {
    const err = new ApiError(422, "Unprocessable", { field: "required" });
    expect(err.status).toBe(422);
    expect(err.message).toBe("Unprocessable");
    expect(err.issues).toEqual({ field: "required" });
  });

  it("is an instance of Error", () => {
    expect(new ApiError(500, "oops")).toBeInstanceOf(Error);
  });

  it("issues defaults to undefined when omitted", () => {
    expect(new ApiError(400, "bad").issues).toBeUndefined();
  });
});

describe("error factory functions", () => {
  it("notFound returns 404 with default message", () => {
    const e = notFound();
    expect(e.status).toBe(404);
    expect(e.message).toBeTruthy();
  });

  it("notFound accepts a custom message", () => {
    expect(notFound("Créneau introuvable").message).toBe("Créneau introuvable");
  });

  it("unauthorized returns 401", () => {
    expect(unauthorized().status).toBe(401);
  });

  it("forbidden returns 403", () => {
    expect(forbidden().status).toBe(403);
  });

  it("conflict returns 409 with the provided message", () => {
    const e = conflict("Slug déjà utilisé");
    expect(e.status).toBe(409);
    expect(e.message).toBe("Slug déjà utilisé");
  });
});

describe("validate", () => {
  const schema = z.object({ name: z.string().min(1), age: z.number() });

  it("returns parsed data on success", () => {
    const result = validate(schema, { name: "Alice", age: 30 });
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("throws ApiError 400 on invalid data", () => {
    expect(() => validate(schema, { name: "", age: "oops" })).toThrow(ApiError);
    try {
      validate(schema, { name: "" });
    } catch (e) {
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).issues).toBeDefined();
    }
  });

  it("includes flattened Zod issues in the error", () => {
    try {
      validate(schema, { name: "", age: "not-a-number" });
    } catch (e) {
      const issues = (e as ApiError).issues as ReturnType<z.ZodError["flatten"]>;
      expect(issues).toHaveProperty("fieldErrors");
    }
  });
});
