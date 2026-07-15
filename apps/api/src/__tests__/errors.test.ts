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
  it("notFound returns 404 with the default key", () => {
    const e = notFound();
    expect(e.status).toBe(404);
    expect(e.message).toBe("notFound");
  });

  it("notFound accepts a custom key", () => {
    expect(notFound("creneauNotFound").message).toBe("creneauNotFound");
  });

  it("unauthorized returns 401 with the default key", () => {
    const e = unauthorized();
    expect(e.status).toBe(401);
    expect(e.message).toBe("unauthorized");
  });

  it("forbidden returns 403 with the default key", () => {
    const e = forbidden();
    expect(e.status).toBe(403);
    expect(e.message).toBe("forbidden");
  });

  it("conflict returns 409 with the provided key", () => {
    const e = conflict("slotFull");
    expect(e.status).toBe(409);
    expect(e.message).toBe("slotFull");
  });
});

describe("validate", () => {
  const schema = z.object({ name: z.string().min(1), age: z.number() });

  it("returns parsed data on success", () => {
    const result = validate(schema, { name: "Alice", age: 30 });
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("throws ApiError 400 with the validationFailed key on invalid data", () => {
    expect(() => validate(schema, { name: "", age: "oops" })).toThrow(ApiError);
    try {
      validate(schema, { name: "" });
    } catch (e) {
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).message).toBe("validationFailed");
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
