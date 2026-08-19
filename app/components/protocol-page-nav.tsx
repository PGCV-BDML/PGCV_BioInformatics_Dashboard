type ProtocolTocItem = {
  id: string;
  label: string;
};

function isStep(item: ProtocolTocItem) {
  return /^\d+\.\s/.test(item.label);
}

function TocLink({ item }: { item: ProtocolTocItem }) {
  return (
    <a
      href={`#${item.id}`}
      className="text-[#2a7797] hover:text-[#236584] hover:underline underline-offset-2"
    >
      {item.label}
    </a>
  );
}

export default function ProtocolPageNav({
  items,
}: {
  items: readonly ProtocolTocItem[];
}) {
  const overview = items.filter((item) => !isStep(item) && item.id !== "troubleshooting");
  const steps = items.filter(isStep);
  const closing = items.filter((item) => item.id === "troubleshooting");

  return (
    <nav
      aria-label="On this page"
      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
    >
      <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#7a8e9b] font-quicksand mb-3">
        On this page
      </p>

      {overview.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] list-none">
          {overview.map((item) => (
            <li key={item.id}>
              <TocLink item={item} />
            </li>
          ))}
        </ul>
      ) : null}

      {steps.length > 0 ? (
        <ol className="mt-3 columns-1 sm:columns-2 gap-x-8 text-[13px] list-none">
          {steps.map((item) => (
            <li key={item.id} className="break-inside-avoid py-0.5">
              <TocLink item={item} />
            </li>
          ))}
        </ol>
      ) : null}

      {closing.length > 0 ? (
        <ul className="mt-3 pt-2 border-t border-slate-200/80 text-[13px] list-none">
          {closing.map((item) => (
            <li key={item.id}>
              <TocLink item={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
