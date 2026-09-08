import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function StorySections({
  sections,
}: {
  sections: { heading: string; description: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isLongStory =
    sections.length > 2 ||
    sections.reduce(
      (total, section) =>
        total + section.heading.length + section.description.length,
      0,
    ) > 650;
  const visible = expanded ? sections : sections.slice(0, 2);

  return (
    <div>
      <div
        className={`relative space-y-4 ${isLongStory && !expanded ? "max-h-[210px] overflow-hidden" : ""}`}
      >
        {visible.map((section, index) => (
          <div
            key={index}
            className="border-b border-[#E1E7ED] pb-5 last:border-0 last:pb-0"
          >
            <p className="text-base font-bold text-[#10233F]">
              {section.heading}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#53647A]">
              {section.description}
            </p>
          </div>
        ))}
        {isLongStory && !expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      {isLongStory && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#235DA7] hover:text-[#2563EB]"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

export function CollapsibleStoryText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLongStory = text.length > 650;

  return (
    <div>
      <div
        className={`relative ${isLongStory && !expanded ? "max-h-[210px] overflow-hidden" : ""}`}
      >
        <p className="whitespace-pre-line text-sm leading-7 text-[#53647A]">
          {text}
        </p>
        {isLongStory && !expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      {isLongStory && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#235DA7] hover:text-[#2563EB]"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
