import { useMemo } from "react";
import { encode } from "uqr";

/**
 * QR code for a link (usually a paper's DOI), so visitors can open it on
 * their phones. Drawn as one SVG path; the white quiet zone is part of it.
 */
export function DoiQr({ url, label, className }: { url: string; label: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const { size, data } = encode(url, { border: 0, ecc: "M" });
    let d = "";
    data.forEach((row, y) => row.forEach((dark, x) => dark && (d += `M${x} ${y}h1v1h-1z`)));
    return { size, path: d };
  }, [url]);
  const quiet = 2;
  return (
    <svg
      viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
      className={className}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x={-quiet} y={-quiet} width={size + quiet * 2} height={size + quiet * 2} fill="#fff" />
      <path d={path} fill="#2b3278" />
    </svg>
  );
}
