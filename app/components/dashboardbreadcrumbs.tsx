import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function DashboardBreadcrumbs({ items }: DashboardBreadcrumbsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center flex-wrap gap-2 text-sm font-normal font-aileron">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        // Check if the current URL path exactly matches the item's href target
        const isCurrentPage = item.href ? pathname === item.href : false;

        // Item should look active if it's explicitly the last item OR if its URL matches the current page
        const isActive = isLast || isCurrentPage;

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href ? (
              <Link
                href={item.href}
                className={`transition-colors ${
                  isActive
                    ? "text-[#2A7797] font-semibold pointer-events-none"
                    : "text-[#9AB8C0] hover:text-[#2A7797]"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isActive ? "text-[#2A7797] font-semibold" : "text-[#9AB8C0]"
                }
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="w-4 h-4 text-[#9AB8C0]/70 shrink-0 stroke-[2]" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
