import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROTOCOL_SLUG,
  getProtocolBySlug,
  PROTOCOLS,
} from "./protocols";

describe("getProtocolBySlug", () => {
  it("returns the service report protocol", () => {
    const protocol = getProtocolBySlug("service-report-tracker");
    expect(protocol?.code).toBe("SOP-BIOINFO-SR-001");
    expect(protocol?.title).toBe("Tracking Service Reports");
  });

  it("returns the training and internship protocols", () => {
    expect(getProtocolBySlug("training-programs")?.code).toBe(
      "SOP-BIOINFO-TR-001",
    );
    expect(getProtocolBySlug("internship-programs")?.code).toBe(
      "SOP-BIOINFO-IN-001",
    );
  });

  it("returns undefined for an unknown slug", () => {
    expect(getProtocolBySlug("not-a-protocol")).toBeUndefined();
  });

  it("uses the first catalog entry as the default slug", () => {
    expect(DEFAULT_PROTOCOL_SLUG).toBe(PROTOCOLS[0].slug);
  });
});
