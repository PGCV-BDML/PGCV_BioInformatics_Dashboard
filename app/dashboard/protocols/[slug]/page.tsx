import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import ServiceReportTrackerProtocol from "@/app/components/service-report-tracker-protocol";
import { getProtocolBySlug } from "@/lib/protocols";

const PROTOCOL_VIEWS: Record<string, ComponentType> = {
  "service-report-tracker": ServiceReportTrackerProtocol,
};

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const protocol = getProtocolBySlug(slug);
  const View = PROTOCOL_VIEWS[slug];

  if (!protocol || !View) {
    notFound();
  }

  return <View />;
}
