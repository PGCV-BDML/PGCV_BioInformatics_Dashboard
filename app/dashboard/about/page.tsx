"use client";

import {
  ExternalLink,
  FolderGit2,
  Mail,
  Globe,
  Users,
  Code2,
  Info,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { DataPrivacyNotice } from "../../components/data-privacy-notice";
import { aboutBreadcrumbs } from "@/lib/breadcrumbs";
import {
  APP_MVP_LABEL,
  APP_VERSION,
  CONTACT_EMAILS,
  DEVELOPMENT_TEAM,
  LAB_NAME,
  LAB_SHORT,
  SITE_LINKS,
  TECH_STACK,
} from "@/lib/site-info";

function SectionCard({
  icon: Icon,
  title,
  children,
  id,
}: {
  icon: typeof Info;
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-6 shadow-xl shadow-slate-400/20"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-[#2a7797]" />
        <h2 className="text-lg font-bold text-[#333333] font-aileron">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ExternalSiteLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[#2a7797] hover:text-[#236584] text-sm font-medium transition-colors"
    >
      {label}
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
}

export default function AboutPage() {
  const compSciTeam = DEVELOPMENT_TEAM.filter((m) => m.track === "CompSci");
  const biologyTeam = DEVELOPMENT_TEAM.filter((m) => m.track === "Biology");

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-8 font-aileron">
      <PageHeader
        breadcrumbTrail={aboutBreadcrumbs}
        title="About"
        subtitle={`${LAB_SHORT} internal workflow dashboard · ${APP_MVP_LABEL}`}
      />

      <SectionCard icon={Info} title="About this dashboard">
        <div className="space-y-3 text-sm text-[#65706f] font-quicksand leading-relaxed">
          <p>
            The Bioinformatics Workflow Dashboard is an internal tool for{" "}
            <span className="font-semibold text-[#172126]">{LAB_NAME}</span>.
            It centralizes lab operations — projects, collaborations, sequence
            analysis services, training, internships, tasks, and team
            management — alongside the external{" "}
            <ExternalSiteLink
              href={SITE_LINKS.omicsPortal.href}
              label="GenomeBase Omics Solutions Portal"
            />
            .
          </p>
          <p>
            This proof-of-concept MVP was built during the June–July 2026
            Internship Program. Version{" "}
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              v{APP_VERSION}
            </span>{" "}
            · authorized PGCV-BDML users only.
          </p>
        </div>
      </SectionCard>

      <SectionCard icon={Users} title="Development team">
        <p className="text-sm text-[#65706f] font-quicksand mb-4">
          June–July 2026 Internship Cohort, supervised by the PGCV-BDML
          in-house team.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#7a8e9b] font-quicksand mb-3">
              Computer Science
            </h3>
            <ul className="space-y-2">
              {compSciTeam.map((member) => (
                <li
                  key={member.name}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3"
                >
                  <p className="text-sm font-bold text-slate-800">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500 font-quicksand">
                    {member.school}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#7a8e9b] font-quicksand mb-3">
              Biology
            </h3>
            <ul className="space-y-2">
              {biologyTeam.map((member) => (
                <li
                  key={member.name}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3"
                >
                  <p className="text-sm font-bold text-slate-800">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500 font-quicksand">
                    {member.school}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Mail} title="Contact">
        <ul className="space-y-3 text-sm font-quicksand">
          <li>
            <span className="font-semibold text-[#172126]">
              Bioinformatics Laboratory:{" "}
            </span>
            <a
              href={`mailto:${CONTACT_EMAILS.bioinformatics}`}
              className="text-[#2a7797] hover:underline"
            >
              {CONTACT_EMAILS.bioinformatics}
            </a>
          </li>
          <li>
            <span className="font-semibold text-[#172126]">
              Sequencing &amp; Laboratory Services:{" "}
            </span>
            <a
              href={`mailto:${CONTACT_EMAILS.sequencing}`}
              className="text-[#2a7797] hover:underline"
            >
              {CONTACT_EMAILS.sequencing}
            </a>
          </li>
          <li>
            <span className="font-semibold text-[#172126]">
              Office concerns:{" "}
            </span>
            <a
              href={`mailto:${CONTACT_EMAILS.office}`}
              className="text-[#2a7797] hover:underline"
            >
              {CONTACT_EMAILS.office}
            </a>
          </li>
        </ul>
      </SectionCard>

      <SectionCard icon={Globe} title="Links">
        <ul className="space-y-2">
          <li>
            <ExternalSiteLink
              href={SITE_LINKS.labWebsite.href}
              label={SITE_LINKS.labWebsite.label}
            />
          </li>
          <li>
            <ExternalSiteLink
              href={SITE_LINKS.omicsPortal.href}
              label={SITE_LINKS.omicsPortal.label}
            />
          </li>
          <li>
            <ExternalSiteLink
              href={SITE_LINKS.facebook.href}
              label={SITE_LINKS.facebook.label}
            />
          </li>
          <li>
            <a
              href={SITE_LINKS.github.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#2a7797] hover:text-[#236584] text-sm font-medium transition-colors"
            >
              <FolderGit2 className="w-4 h-4" />
              {SITE_LINKS.github.label}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </li>
        </ul>
      </SectionCard>

      <SectionCard icon={Code2} title="Built with">
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((item) => (
            <span
              key={item}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-600 font-quicksand"
            >
              {item}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Info} title="Data privacy" id="privacy">
        <DataPrivacyNotice defaultOpen />
        <p className="mt-4 text-xs text-[#65706f] font-quicksand">
          For deletion requests or privacy questions, contact{" "}
          <a
            href={`mailto:${CONTACT_EMAILS.bioinformatics}`}
            className="text-[#2a7797] hover:underline"
          >
            {CONTACT_EMAILS.bioinformatics}
          </a>
          .
        </p>
      </SectionCard>

      <p className="text-center text-[11px] text-[#65706f] font-quicksand pb-4">
        © {new Date().getFullYear()} {LAB_SHORT} · University of the
        Philippines. All rights reserved.
      </p>
    </div>
  );
}
