import { DarkSlide } from "../slide-frame";
import { DoiQr } from "../doi-qr";
import { LogoHelix } from "../logo-helix";
import { SectionBackdrop } from "../section-backdrop";
import { SocialIcon, hasSocialIcon } from "../social-icons";
import { TourCopy } from "../tour-copy";
import { useReveal } from "../use-reveal";
import styles from "../tour-motion.module.css";
import { delay, stagger, type SlideProps } from "./shared";

/** The contact slide bookends the welcome: its helix draws in when scrolled to. */
function ContactHelix() {
  const [ref, reveal] = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-reveal={reveal}
      className="pointer-events-none absolute hidden opacity-45 canvas:-bottom-6 canvas:-right-24 canvas:block canvas:w-[600px]"
      aria-hidden="true"
    >
      <LogoHelix onDark animate className="w-full" />
    </div>
  );
}

/**
 * The decks' thank-you slide: title, intro and social accounts on the left,
 * the emails on the right, and the QR codes along the bottom.
 */
export function ContactSlide({ content, audience }: Omit<SlideProps, "meta">) {
  const { contact } = content;
  // Visual turns the slide into its QR codes: scan and go, nothing to copy down.
  const scanOnly = audience === "visual" && contact.qrCodes.length > 0;
  return (
    <DarkSlide
      background="linear-gradient(120deg,#2b3278 0%,#5e205e 55%,#2a7797 100%)"
      art={
        <>
          <SectionBackdrop variant="contact" />
          <ContactHelix />
        </>
      }
      innerClassName="grid gap-10 canvas:grid-cols-[minmax(0,1fr)_440px] canvas:grid-rows-[auto_minmax(0,1fr)] canvas:gap-x-12 canvas:gap-y-0"
    >
      <div>
        <p className="flex items-center gap-3 font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#9ff0d8] canvas:text-[15px]">
          <span className="h-0.5 w-8 rounded-full bg-[#12ca99]" aria-hidden="true" />
          Work with us
        </p>
        <h2
          className={`${styles.enter} mt-3 max-w-3xl text-3xl font-black leading-[1.15] tracking-tight text-balance canvas:max-w-[560px] canvas:text-[46px] canvas:leading-[1.08]`}
          style={delay(80)}
        >
          {scanOnly ? "Scan to connect" : contact.title}
        </h2>
        {audience !== "visual" && (
          <p className="mt-3 text-lg text-white/85 canvas:mt-3.5 canvas:text-[22px] canvas:leading-snug">
            <TourCopy text={contact.intro} audience={audience} />
          </p>
        )}
        {contact.social && (
          <div className="mt-6 canvas:mt-5">
            <p className="text-sm font-medium text-white/80 canvas:text-[18px]">
              Follow us: <span className="font-bold text-white">{contact.social.handle}</span>
            </p>
            {contact.social.platforms.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2.5" aria-label="Find us on">
                {contact.social.platforms.map((platform) => (
                  <li
                    key={platform}
                    title={platform}
                    className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white/[0.1] px-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.2),0_6px_14px_-6px_rgba(10,12,40,0.6)]"
                  >
                    {hasSocialIcon(platform) ? (
                      <>
                        <SocialIcon platform={platform} className="h-[18px] w-[18px]" />
                        <span className="sr-only">{platform}</span>
                      </>
                    ) : (
                      <span className="text-xs font-bold canvas:text-[14px]">{platform}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <ul className={`space-y-3 canvas:space-y-2.5 ${scanOnly ? "hidden" : ""}`}>
        {contact.emails.map((email, i) => (
          <li key={email.address} className={styles.enter} style={stagger(i, 250)}>
            <a
              href={`mailto:${email.address}`}
              className="block rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 transition-colors hover:border-[#12ca99]/60 hover:bg-white/[0.14] canvas:py-3"
            >
              <span className="block text-xs font-bold uppercase tracking-[0.1em] text-[#9ff0d8] canvas:text-[14px]">{email.label}</span>
              <span className="mt-0.5 block break-all font-semibold canvas:text-[18px]">{email.address}</span>
            </a>
          </li>
        ))}
      </ul>
      {contact.qrCodes.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 canvas:col-span-2 canvas:flex canvas:items-start canvas:gap-6 canvas:self-end">
          {contact.qrCodes.map((qr, i) => (
            <li key={qr.url} className={`${styles.enter} canvas:w-[140px]`} style={stagger(i, 400)}>
              <EmbossedQr label={qr.label} url={qr.url} />
            </li>
          ))}
        </ul>
      )}
    </DarkSlide>
  );
}

/**
 * A QR code pressed into a raised plate: the plate catches light on its top
 * edge and casts a shadow below, and the code sits in a sunken well.
 */
function EmbossedQr({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group/qr flex flex-col items-center text-center">
      <span className="block w-full max-w-[200px] rounded-[22px] bg-[linear-gradient(145deg,#ffffff_0%,#e9e7f1_100%)] p-3.5 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-2px_0_rgba(43,50,120,0.12),0_2px_0_rgba(20,22,60,0.35),0_14px_28px_-10px_rgba(10,12,40,0.6),-6px_-6px_18px_-8px_rgba(255,255,255,0.18)] transition-transform duration-300 group-hover/qr:-translate-y-1 canvas:rounded-[18px] canvas:p-2.5">
        <span className="block rounded-[14px] bg-white p-2 shadow-[inset_2px_3px_6px_rgba(43,50,120,0.22),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] canvas:rounded-[10px] canvas:p-1.5">
          <DoiQr url={url} label={`QR code for the PGC Visayas ${label}`} className="block h-auto w-full rounded-md" />
        </span>
      </span>
      <span className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-white/65 canvas:mt-3 canvas:text-[14px]">PGC Visayas</span>
      <span className="mt-0.5 font-quicksand text-lg font-bold leading-tight text-white [text-shadow:0_1px_0_rgba(0,0,0,0.35),0_-1px_0_rgba(255,255,255,0.12)] canvas:text-[18px]">
        {label}
      </span>
    </a>
  );
}
