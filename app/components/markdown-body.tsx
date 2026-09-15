"use client";

import { parseFaqMarkdown, type MarkdownInline } from "@/lib/markdown";

function InlineNodes({ inlines }: { inlines: MarkdownInline[] }) {
  return (
    <>
      {inlines.map((inline, index) => {
        switch (inline.type) {
          case "code":
            return (
              <code
                key={index}
                className="rounded-md bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800"
              >
                {inline.value}
              </code>
            );
          case "link":
            return (
              <a
                key={index}
                href={inline.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#2a7797] underline decoration-[#2a7797]/30 underline-offset-2 break-all hover:text-[#1c5c59]"
              >
                {inline.value}
              </a>
            );
          case "bold":
            return (
              <strong key={index}>
                <InlineNodes inlines={inline.inlines} />
              </strong>
            );
          case "italic":
            return (
              <em key={index}>
                <InlineNodes inlines={inline.inlines} />
              </em>
            );
          default:
            return <span key={index}>{inline.value}</span>;
        }
      })}
    </>
  );
}

export function MarkdownBody({
  source,
  className = "",
}: {
  source: string;
  className?: string;
}) {
  const blocks = parseFaqMarkdown(source);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 text-sm text-slate-700 leading-relaxed font-aileron ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <div key={index} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              {block.language ? (
                <div className="border-b border-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-quicksand">
                  {block.language}
                </div>
              ) : null}
              <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed text-slate-100">
                <code>{block.value}</code>
              </pre>
            </div>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            <InlineNodes inlines={block.inlines} />
          </p>
        );
      })}
    </div>
  );
}
