import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  meta?: string;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Allows several panels to stay open (used on FAQ pages). */
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
  tone?: "default" | "plain";
}

/** Accessible disclosure list used by FAQs, product tabs and legal pages. */
export function Accordion({
  items,
  allowMultiple = true,
  defaultOpenIds = [],
  className,
  tone = "default",
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (allowMultiple) return isOpen ? prev.filter((item) => item !== id) : [...prev, id];
      return isOpen ? [] : [id];
    });
  };

  return (
    <div className={cn("divide-y divide-ink-100 overflow-hidden rounded-xl", tone === "default" && "border border-ink-100 bg-surface", className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div key={item.id}>
            <h3 className="min-w-0">
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={`${item.id}-panel`}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition hover:bg-ink-50/70 sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block font-display text-[14px] font-bold text-ink-950">{item.title}</span>
                  {item.meta && <span className="mt-1 block text-[11.5px] text-ink-500">{item.meta}</span>}
                </span>
                <Icon
                  name="chevronDown"
                  size={18}
                  className={cn("shrink-0 text-ink-400 transition-transform duration-200", isOpen && "rotate-180 text-brand-600")}
                />
              </button>
            </h3>
            <div id={`${item.id}-panel`} hidden={!isOpen} className="px-4 pb-4 text-[13px] leading-7 text-ink-600 sm:px-5">
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
