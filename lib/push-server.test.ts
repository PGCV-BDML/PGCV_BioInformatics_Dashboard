import { afterEach, describe, expect, it } from "vitest";
import { secretsEqual, shouldRegisterDispatchUrl } from "./push-server";

const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  if (originalVercelEnv == null) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
});

describe("secretsEqual", () => {
  it("accepts identical secrets", () => {
    expect(secretsEqual("sixteen-chars-ok", "sixteen-chars-ok")).toBe(true);
  });

  it("rejects a different value or length", () => {
    expect(secretsEqual("sixteen-chars-ok", "sixteen-chars-no")).toBe(false);
    expect(secretsEqual("short", "longer-secret")).toBe(false);
  });
});

describe("shouldRegisterDispatchUrl", () => {
  it("registers in production and local/dev, not preview", () => {
    process.env.VERCEL_ENV = "production";
    expect(shouldRegisterDispatchUrl()).toBe(true);
    process.env.VERCEL_ENV = "preview";
    expect(shouldRegisterDispatchUrl()).toBe(false);
    process.env.VERCEL_ENV = "development";
    expect(shouldRegisterDispatchUrl()).toBe(true);
    delete process.env.VERCEL_ENV;
    expect(shouldRegisterDispatchUrl()).toBe(true);
  });
});
