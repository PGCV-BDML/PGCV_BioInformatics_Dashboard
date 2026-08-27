import { describe, expect, it } from "vitest";
import {
  previousServiceReportVersions,
  serviceReportVersionLabel,
  type ServiceReportVersion,
} from "./service-report-versions";

function version(
  partial: Partial<ServiceReportVersion> &
    Pick<ServiceReportVersion, "id" | "file_path" | "kind" | "uploaded_at">,
): ServiceReportVersion {
  return {
    analysis_id: "a-1",
    file_name: null,
    file_size: null,
    uploaded_by: null,
    ...partial,
  };
}

describe("serviceReportVersionLabel", () => {
  it("names each kind for the history list", () => {
    expect(serviceReportVersionLabel("upload")).toBe("Original");
    expect(serviceReportVersionLabel("revision")).toBe("Revision");
    expect(serviceReportVersionLabel("reviewed")).toBe("Peer reviewed");
    expect(serviceReportVersionLabel("signed")).toBe("Signed");
  });
});

describe("previousServiceReportVersions", () => {
  const original = version({
    id: "v-1",
    file_path: "a-1/1/report.pdf",
    kind: "upload",
    uploaded_at: "2026-08-01T10:00:00.000Z",
  });
  const reviewed = version({
    id: "v-2",
    file_path: "a-1/2/report-reviewed.pdf",
    kind: "reviewed",
    uploaded_at: "2026-08-02T10:00:00.000Z",
  });
  const signed = version({
    id: "v-3",
    file_path: "a-1/3/report_signed.pdf",
    kind: "signed",
    uploaded_at: "2026-08-03T10:00:00.000Z",
  });
  const revision = version({
    id: "v-4",
    file_path: "a-1/4/report.pdf",
    kind: "revision",
    uploaded_at: "2026-08-04T10:00:00.000Z",
  });

  it("omits the current file", () => {
    const previous = previousServiceReportVersions(
      [original, revision],
      revision.file_path,
    );
    expect(previous.map((row) => row.id)).toEqual(["v-1"]);
  });

  it("keeps original and revision files", () => {
    const previous = previousServiceReportVersions(
      [original, revision, signed],
      signed.file_path,
    );
    expect(previous.map((row) => row.kind)).toEqual(["revision", "upload"]);
  });

  it("hides a peer-review stamp once a later signed copy exists", () => {
    const previous = previousServiceReportVersions(
      [original, reviewed, signed],
      signed.file_path,
    );
    expect(previous.map((row) => row.kind)).toEqual(["upload"]);
  });

  it("keeps a peer-review stamp when that is still the latest sign-off", () => {
    const previous = previousServiceReportVersions(
      [original, reviewed, revision],
      revision.file_path,
    );
    expect(previous.map((row) => row.kind)).toEqual(["reviewed", "upload"]);
  });
});
