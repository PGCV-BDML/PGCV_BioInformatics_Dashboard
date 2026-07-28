"use client";

import ProgramDirectory from "@/app/components/program-directory";
import { trainingBreadcrumbs } from "@/lib/breadcrumbs";

export default function TrainingProgramsPage() {
  return (
    <ProgramDirectory
      programType="training"
      breadcrumbTrail={trainingBreadcrumbs}
      title="Training"
      subtitle="Manage training cohorts, modules, assessments, and certificates"
      addButtonLabel="Add Training"
    />
  );
}
