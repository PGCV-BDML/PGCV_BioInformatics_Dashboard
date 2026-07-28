"use client";

import ProgramDirectory from "@/app/components/program-directory";
import { internshipBreadcrumbs } from "@/lib/breadcrumbs";

export default function InternshipProgramsPage() {
  return (
    <ProgramDirectory
      programType="internship"
      breadcrumbTrail={internshipBreadcrumbs}
      title="Internship"
      subtitle="Manage internship cohorts, modules, assessments, and certificates"
      addButtonLabel="Add Internship"
    />
  );
}
