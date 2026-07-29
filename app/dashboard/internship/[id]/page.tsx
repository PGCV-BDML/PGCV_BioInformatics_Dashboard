"use client";

import { use } from "react";
import ProgramModules from "@/app/components/program-modules";

export default function InternshipModulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProgramModules programId={id} programType="internship" />;
}
