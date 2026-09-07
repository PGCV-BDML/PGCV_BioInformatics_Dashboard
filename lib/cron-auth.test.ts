import { describe, expect, it, afterEach } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

describe("isAuthorizedCronRequest", () => {
  const originalCron = process.env.CRON_SECRET;
  const originalPush = process.env.PUSH_DISPATCH_SECRET;

  afterEach(() => {
    process.env.CRON_SECRET = originalCron;
    process.env.PUSH_DISPATCH_SECRET = originalPush;
  });

  it("accepts CRON_SECRET or PUSH_DISPATCH_SECRET bearers", () => {
    process.env.CRON_SECRET = "cron-secret-16chars";
    process.env.PUSH_DISPATCH_SECRET = "push-secret-16chars";

    expect(
      isAuthorizedCronRequest(
        new Request("https://example.test/api/cron", {
          headers: { authorization: "Bearer cron-secret-16chars" },
        }),
      ),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(
        new Request("https://example.test/api/cron", {
          headers: { authorization: "Bearer push-secret-16chars" },
        }),
      ),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(
        new Request("https://example.test/api/cron", {
          headers: { authorization: "Bearer wrong-secret-16ch" },
        }),
      ),
    ).toBe(false);
  });
});
