import type { Audience, TourService } from "@/lib/tour";
import { CARD, SERVICE_HEX } from "../brand";
import { LightSlide } from "../slide-frame";
import { ServiceIcon } from "../service-icons";
import { TourCopy } from "../tour-copy";
import { useReveal } from "../use-reveal";
import styles from "../tour-motion.module.css";
import { delay, type SlideProps } from "./shared";

function ServiceCard({ service, audience, order }: { service: TourService; audience: Audience; order: number }) {
  const [ref, reveal] = useReveal<HTMLLIElement>();
  const color = SERVICE_HEX[service.color];
  // Visual: a big icon and the name, nothing to read.
  const visual = audience === "visual";
  return (
    <li
      ref={ref}
      data-reveal={reveal}
      className={`${CARD} ${styles.hoverable} ${styles.enter} relative flex flex-col gap-3 overflow-hidden transition-transform canvas:gap-2.5 duration-300 ease-tour hover:-translate-y-1 ${
        visual ? "items-center px-5 py-8 text-center canvas:justify-center" : "p-7 canvas:px-[18px] canvas:py-5"
      }`}
      style={delay(order * 90)}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} aria-hidden="true" />
      {/* Cards start their icons a beat apart. */}
      <ServiceIcon id={service.id} code={service.code} color={color} delay={order * 90} large={visual} />
      <h3
        className={`mt-1 font-bold text-[#2b3278] ${visual ? "text-2xl leading-tight canvas:text-[26px]" : "text-xl canvas:text-[20px] canvas:leading-tight"}`}
      >
        {service.name}
      </h3>
      {!visual && (
        <p className="flex-1 leading-relaxed text-[#5b6770] canvas:text-[18px] canvas:leading-[1.45]">
          <TourCopy text={service.summary} audience={audience} />
        </p>
      )}
      {!visual && service.tag && (
        // Pinned to the card's foot, so the pills in the row line up.
        <span
          className="mt-auto self-start rounded-full px-2.5 py-1.5 text-[11px] font-semibold leading-tight canvas:text-[14px]"
          style={{ color, backgroundColor: `${color}14` }}
        >
          {service.tag}
        </span>
      )}
    </li>
  );
}

/** The decks' `cards`: the services in one row. */
export function ServicesSlide({ content, audience, meta }: SlideProps) {
  const { services } = content;
  return (
    <LightSlide
      meta={meta}
      eyebrow="What we do"
      title={services.title}
      intro={audience !== "visual" && <TourCopy text={services.intro} audience={audience} />}
    >
      <ul className="grid gap-5 canvas:h-full canvas:auto-cols-fr canvas:grid-flow-col canvas:gap-4">
        {services.items.map((service, i) => (
          <ServiceCard key={service.id} service={service} audience={audience} order={i} />
        ))}
      </ul>
    </LightSlide>
  );
}
