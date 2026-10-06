/* eslint-disable @next/next/no-img-element -- tour images come from our own
   /api/tour/asset proxy (CDN-cached), not from next/image's optimizer. */
import {
  resolveText,
  tourAssetUrl,
  type Audience,
  type ServiceColor,
  type TourContent,
} from "@/lib/tour";
import type { TourCovidStats } from "@/lib/tour-stats";

const SERVICE_HEX: Record<ServiceColor, string> = {
  purple: "#4e2a74",
  magenta: "#92298d",
  mint: "#13886a",
  coral: "#c4523b",
  indigo: "#2b1747",
};

type SectionProps = { content: TourContent; audience: Audience };

function Eyebrow({ index, children, onDark }: { index: number; children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      className={`font-quicksand text-xs font-bold uppercase tracking-[0.2em] ${onDark ? "text-[#6ff2c4]" : "text-[#13886a]"}`}
    >
      {String(index).padStart(2, "0")} · {children}
    </p>
  );
}

function SectionHeading({ title, onDark }: { title: string; onDark?: boolean }) {
  return (
    <h2
      className={`mt-3 text-3xl font-extrabold tracking-tight md:text-[44px] md:leading-[1.1] ${onDark ? "text-white" : "text-[#4e2a74]"}`}
    >
      {title}
    </h2>
  );
}

export function HeroSection({ content, audience }: SectionProps) {
  const { hero } = content;
  return (
    <div className="bg-[linear-gradient(135deg,#2b1747_0%,#4e2a74_55%,#a2457f_100%)] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <p className="font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#6ff2c4]">
          {hero.eyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl md:leading-[1.05]">
          {hero.title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#f3edf9] md:text-xl">
          {resolveText(hero.intro, audience)}
        </p>
        {hero.facts.length > 0 && (
          <dl className="mt-12 grid grid-cols-2 gap-6 md:flex md:gap-12">
            {hero.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="sr-only">{fact.label}</dt>
                <dd className="text-3xl font-black md:text-4xl">{fact.value}</dd>
                <dd className="mt-1 text-sm font-medium text-[#dccbf0]">{fact.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

export function ServicesSection({ content, audience, index }: SectionProps & { index: number }) {
  const { services } = content;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <Eyebrow index={index}>What we do</Eyebrow>
      <SectionHeading title={services.title} />
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6b73]">
        {resolveText(services.intro, audience)}
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.items.map((service) => {
          const color = SERVICE_HEX[service.color];
          return (
            <li
              key={service.id}
              className="flex flex-col gap-3 rounded-3xl border border-slate-300/50 bg-[#fffdf8] p-7 shadow-xl shadow-slate-400/15"
            >
              <span
                className="flex h-13 w-13 items-center justify-center rounded-2xl text-base font-bold"
                style={{ color, backgroundColor: `${color}1f` }}
                aria-hidden="true"
              >
                {service.code}
              </span>
              <h3 className="text-xl font-bold text-[#333333]">{service.name}</h3>
              <p className="flex-1 leading-relaxed text-[#5b6b73]">
                {resolveText(service.summary, audience)}
              </p>
              {service.tag && (
                <span
                  className="self-start rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ color, backgroundColor: `${color}1f` }}
                >
                  {service.tag}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function InfrastructureSection({ content, audience, index }: SectionProps & { index: number }) {
  const { infrastructure } = content;
  return (
    <div className="bg-[#22143a] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <Eyebrow index={index} onDark>
          Under the hood
        </Eyebrow>
        <SectionHeading title={infrastructure.title} onDark />
        <p className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-[#f2806a]/40 bg-[#f2806a]/15 px-5 py-3 text-[#fde0d9]">
          <span className="font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#f2806a]">
            In simple terms
          </span>
          <span className="font-medium">{resolveText(infrastructure.analogy, audience)}</span>
        </p>
        <div className="mt-10 space-y-6">
          {infrastructure.items.map((item) => {
            const src = tourAssetUrl(item.image);
            return (
              <article
                key={item.id}
                className="flex flex-col gap-8 rounded-[28px] border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:gap-14 md:p-10"
              >
                {src && (
                  <div className="flex h-80 shrink-0 items-center justify-center rounded-2xl bg-[radial-gradient(circle,#ffffff_0%,#e4d9f1_100%)] p-6 md:h-[460px] md:w-[360px]">
                    <img src={src} alt={`${item.name} photo`} loading="lazy" className="h-full w-auto object-contain" />
                  </div>
                )}
                <div className="flex-1">
                  {item.kicker && (
                    <p className="font-quicksand text-xs font-bold uppercase tracking-[0.15em] text-[#6ff2c4]">
                      {item.kicker}
                    </p>
                  )}
                  <h3 className="mt-1 text-3xl font-extrabold">{item.name}</h3>
                  <p className="mt-2 text-lg text-[#b9a8cf]">{resolveText(item.description, audience)}</p>
                  <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                    {item.specs.map((spec, i) => (
                      <div key={spec.label || i} className="rounded-2xl bg-white/[0.06] px-6 py-5">
                        <dd className="flex items-baseline gap-2">
                          <span
                            className="text-5xl font-black tracking-tight"
                            style={{ color: ["#6ff2c4", "#1fae86", "#f2806a"][i % 3] }}
                          >
                            {spec.value}
                          </span>
                          <span className="text-xl font-bold" style={{ color: ["#6ff2c4", "#1fae86", "#f2806a"][i % 3] }}>
                            {spec.unit}
                          </span>
                        </dd>
                        <dt className="mt-1 text-sm font-medium text-[#b9a8cf]">{spec.label}</dt>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TrainingsSection({ content, audience, index }: SectionProps & { index: number }) {
  const { trainings } = content;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <Eyebrow index={index}>Learn with us</Eyebrow>
      <SectionHeading title={trainings.title} />
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6b73]">
        {resolveText(trainings.intro, audience)}
      </p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {trainings.items.map((training, i) => {
          const src = tourAssetUrl(training.image);
          // 3 across on the first row, 2 wider tiles after (matches the deck).
          const span = i < 3 ? "lg:col-span-2" : "lg:col-span-3";
          return (
            <li
              key={training.name}
              className={`${span} overflow-hidden rounded-2xl border border-slate-300/50 bg-[#fffdf8]`}
            >
              <div className="aspect-[3/2] bg-[#f3edf9]">
                {src && (
                  <img src={src} alt={`${training.name} training session`} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <p className="px-5 py-4 text-lg font-bold text-[#333333]">{training.name}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CovidSection({
  content,
  audience,
  index,
  stats,
}: SectionProps & { index: number; stats: TourCovidStats | null }) {
  const { covid } = content;
  const max = stats ? Math.max(1, ...stats.quarterly.map((q) => q.samples)) : 1;
  const from = formatMonthYear(stats?.firstRunDate ?? null);
  const to = formatMonthYear(stats?.lastRunDate ?? null);
  const tiles = stats
    ? [
        { value: stats.totalSamples.toLocaleString("en-PH"), label: "samples sequenced", color: "#4e2a74" },
        { value: stats.totalRuns.toLocaleString("en-PH"), label: "sequencing runs", color: "#92298d" },
        { value: stats.lineageAssigned.toLocaleString("en-PH"), label: "genomes assigned a lineage", color: "#13886a" },
        ...(stats.pctLineageAssigned !== null
          ? [{ value: `${stats.pctLineageAssigned.toFixed(1)}%`, label: "lineage assignment rate", color: "#c4523b" }]
          : []),
      ]
    : [];

  return (
    <div className="bg-[#f3edf9]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <Eyebrow index={index}>Public health impact</Eyebrow>
        <SectionHeading title={covid.title} />
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6b73]">
          {resolveText(covid.intro, audience)}
        </p>
        {stats && (
          <>
            <dl className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {tiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-3xl border border-slate-300/50 bg-[#fffdf8] px-6 py-5 shadow-xl shadow-slate-400/15"
                >
                  <span className="block h-1 w-8 rounded-full" style={{ backgroundColor: tile.color }} aria-hidden="true" />
                  <dd className="mt-2 text-3xl font-black tracking-tight md:text-4xl" style={{ color: tile.color }}>
                    {tile.value}
                  </dd>
                  <dt className="mt-1 text-sm font-medium text-[#5b6b73]">{tile.label}</dt>
                </div>
              ))}
            </dl>
            {stats.quarterly.length > 0 && (
              <figure className="mt-6 rounded-3xl border border-slate-300/50 bg-[#fffdf8] p-6 shadow-xl shadow-slate-400/15 md:p-8">
                <figcaption className="text-lg font-bold text-[#333333]">
                  Samples sequenced per quarter
                  {from && to && (
                    <span className="ml-2 text-sm font-medium text-[#7a8e9b]">
                      {from} – {to}
                    </span>
                  )}
                </figcaption>
                <ol className="mt-6 flex h-56 items-end gap-1.5 md:gap-2.5">
                  {stats.quarterly.map((q, i) => {
                    const isPeak = q.samples === max;
                    return (
                      <li key={q.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                        <div
                          className="rounded-t-md"
                          style={{
                            height: `${Math.max(q.samples > 0 ? 2 : 0, (q.samples / max) * 100)}%`,
                            backgroundColor: isPeak ? "#4e2a74" : "#1fae86",
                          }}
                          title={`${q.label}: ${q.samples.toLocaleString("en-PH")} samples`}
                        />
                        <span
                          className={`truncate text-center text-[10px] font-medium text-[#7a8e9b] md:text-[11px] ${stats.quarterly.length > 10 && i % 2 ? "invisible" : ""}`}
                        >
                          {q.label}
                        </span>
                        <span className="sr-only">{q.samples} samples</span>
                      </li>
                    );
                  })}
                </ol>
              </figure>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function TeamSection({ content, audience, index }: SectionProps & { index: number }) {
  const { team } = content;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <Eyebrow index={index}>The people</Eyebrow>
      <SectionHeading title={team.title} />
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6b73]">{resolveText(team.intro, audience)}</p>
      <ul className="mt-10 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
        {team.members.map((member) => {
          const src = tourAssetUrl(member.image);
          return (
            <li key={member.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-300/50 bg-[#fffdf8]">
              <div className="aspect-[310/366] bg-[#f1f1ef]">
                {src && <img src={src} alt={member.fullName} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-[#bff5e1]/60 px-3 py-4 text-center">
                <p className="text-lg font-extrabold text-[#22143a] md:text-xl">{member.nickname}</p>
                <p className="text-xs font-medium text-[#3d4d57] md:text-[13px]">{member.fullName}</p>
                <p className="font-quicksand text-[10px] font-bold uppercase tracking-[0.1em] text-[#2a4a5a] md:text-[11px]">
                  {member.position}
                </p>
              </div>
            </li>
          );
        })}
        {team.joinCard && (
          <li className="flex flex-col justify-center gap-2 rounded-2xl bg-[#4e2a74] p-6 text-white">
            <p className="text-xl font-extrabold md:text-2xl">{team.joinCard.title}</p>
            <p className="text-sm leading-relaxed text-[#f3edf9] md:text-base">{team.joinCard.body}</p>
          </li>
        )}
      </ul>
    </div>
  );
}

export function VideosSection({ content, index }: SectionProps & { index: number }) {
  const { videos } = content;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <Eyebrow index={index}>See it in action</Eyebrow>
      <SectionHeading title={videos.title} />
      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {videos.items.map((video) => (
          <li key={video.id} className="overflow-hidden rounded-3xl border border-slate-300/50 bg-[#fffdf8]">
            <div className="aspect-video bg-[#22143a]">
              {video.youtubeId ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                video.url && <video className="h-full w-full" src={video.url} controls preload="none" />
              )}
            </div>
            <p className="flex items-baseline justify-between gap-3 px-5 py-4">
              <span className="font-semibold text-[#333333]">{video.title}</span>
              {video.duration && <span className="text-sm text-[#7a8e9b]">{video.duration}</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContactSection({ content, audience, index }: SectionProps & { index: number }) {
  const { contact } = content;
  return (
    <div className="bg-[linear-gradient(90deg,#4e2a74_0%,#7b3f9e_100%)] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <p className="font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#f3edf9]">
          {String(index).padStart(2, "0")} · Work with us
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight md:text-[40px] md:leading-[1.15]">
          {contact.title}
        </h2>
        <p className="mt-3 text-lg text-[#f3edf9]">{resolveText(contact.intro, audience)}</p>
        <ul className="mt-6 space-y-2">
          {contact.emails.map((email) => (
            <li key={email.address} className="flex flex-wrap gap-x-3">
              <span className="font-bold">{email.label}</span>
              <a className="text-[#f3edf9] underline-offset-4 hover:underline" href={`mailto:${email.address}`}>
                {email.address}
              </a>
            </li>
          ))}
        </ul>
        {contact.social && (
          <p className="mt-6 text-sm font-medium text-[#f3edf9]">
            Follow us: <span className="font-bold text-white">{contact.social.handle}</span>
            {contact.social.platforms.length > 0 && <> — {contact.social.platforms.join(" · ")}</>}
          </p>
        )}
      </div>
    </div>
  );
}
