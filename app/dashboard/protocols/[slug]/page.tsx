import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CovidSampleTrackerProtocol from "@/app/components/covid-sample-tracker-protocol";
import ProgramWorkflowProtocol from "@/app/components/program-workflow-protocol";
import ServiceReportTrackerProtocol from "@/app/components/service-report-tracker-protocol";
import { getProtocolBySlug } from "@/lib/protocols";

function TrainingProgramsProtocol() {
  return <ProgramWorkflowProtocol kind="training" />;
}

function InternshipProgramsProtocol() {
  return <ProgramWorkflowProtocol kind="internship" />;
}

const PROTOCOL_VIEWS: Record<string, ComponentType> = {
  "service-report-tracker": ServiceReportTrackerProtocol,
  "training-programs": TrainingProgramsProtocol,
  "internship-programs": InternshipProgramsProtocol,
  "covid-sample-tracker": CovidSampleTrackerProtocol,
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
