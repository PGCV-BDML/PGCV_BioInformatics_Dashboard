import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function DashboardBreadcrumbs({ items }: DashboardBreadcrumbsProps) {
  return (
    <nav className="flex items-center flex-wrap gap-2 text-sm font-normal font-aileron">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-[#5a9bb5] hover:text-[#2a7797] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast ? "text-[#2a7797] font-semibold" : "text-[#5a9bb5]"
                }
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="w-4 h-4 text-[#5a9bb5]/60 shrink-0 stroke-[2]" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
