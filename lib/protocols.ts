export type ProtocolMeta = {
  slug: string;
  code: string;
  title: string;
  summary: string;
  category: string;
};

export const PROTOCOLS: ProtocolMeta[] = [
  {
    slug: "service-report-tracker",
    code: "SOP-BIOINFO-SR-001",
    title: "Tracking Service Reports",
    summary:
      "Record a client sequence analysis from intake through peer review, e-signature, approval, and client delivery.",
    category: "Sequence Analysis",
  },
];

export const DEFAULT_PROTOCOL_SLUG = PROTOCOLS[0]?.slug ?? "service-report-tracker";

export function getProtocolBySlug(slug: string): ProtocolMeta | undefined {
  return PROTOCOLS.find((protocol) => protocol.slug === slug);
}
