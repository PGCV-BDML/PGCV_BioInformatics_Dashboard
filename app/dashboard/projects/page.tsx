import ProjectsClientView from "./ProjectsClientView";

async function getProjects() {
  return [
    {
      id: 1,
      name: "De Novo Transcriptome Assembly Pipeline",
      client_name: "UP Visayas Marine Science",
      service_type: "Bioinformatics Analysis",
      status: "On-going",
      lead: "Dr. Analyst Cruz",
      start_date: "2026-05-10",
      target_delivery_date: "2026-07-20",
    },
    {
      id: 2,
      name: "Metagenomic Sequencing Validation",
      client_name: "DOST Region VI",
      service_type: "Sequencing Service",
      status: "For approval",
      lead: "Prof. Lopez",
      start_date: "2026-06-01",
      target_delivery_date: "2026-08-15",
    },
    {
      id: 3,
      name: "Variant Calling on Rice Subspecies",
      client_name: "PhilRice",
      service_type: "Custom Workflow",
      status: "Submitted",
      lead: "Engr. Santos",
      start_date: "2026-04-12",
      target_delivery_date: "2026-06-30",
    },
    {
      id: 4,
      name: "RNA-Seq Differential Expression Analysis",
      client_name: "UP Manila",
      service_type: "Bioinformatics Analysis",
      status: "Completed",
      lead: "Dr. Cruz",
      start_date: "2026-02-10",
      target_delivery_date: "2026-04-15",
    },
    {
      id: 5,
      name: "ChIP-Seq Transcription Profiling",
      client_name: "MSU-IIT",
      service_type: "Custom Workflow",
      status: "On hold",
      lead: "Prof. Torres",
      start_date: "2026-03-01",
      target_delivery_date: "2026-06-15",
    },
    {
      id: 6,
      name: "Amplicion Deep Sequencing Verification",
      client_name: "DOST-PCHRD",
      service_type: "Sequencing Service",
      status: "On-going",
      lead: "Dr. Analyst Cruz",
      start_date: "2026-05-20",
      target_delivery_date: "2026-08-01",
    },
    {
      id: 7,
      name: "Exome Variant Annotation Pipeline",
      client_name: "PGH Pediatric Labs",
      service_type: "Bioinformatics Analysis",
      status: "Submitted",
      lead: "Engr. Santos",
      start_date: "2026-06-11",
      target_delivery_date: "2026-09-10",
    },
  ];
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsClientView initialProjects={projects} />;
}
