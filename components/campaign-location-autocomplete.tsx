"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type LocationSuggestion = {
  id: string;
  label: string;
  type: "city" | "state" | "country";
};

type CampaignLocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
};

export function CampaignLocationAutocomplete({
  value,
  onChange,
  invalid = false,
  className,
}: CampaignLocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedValueRef = useRef(value);

  useEffect(() => {
    if (value !== selectedValueRef.current) {
      selectedValueRef.current = value;
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    const query = inputValue.trim();
    if (query.length < 2 || query === selectedValueRef.current) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/locations/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Location search failed");
        const results = (await response.json()) as LocationSuggestion[];
        setSuggestions(results);
        setActiveIndex(results.length > 0 ? 0 : -1);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setActiveIndex(-1);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [inputValue]);

  const selectLocation = (suggestion: LocationSuggestion) => {
    selectedValueRef.current = suggestion.label;
    setInputValue(suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(suggestion.label);
  };

  const updateInput = (nextValue: string) => {
    setInputValue(nextValue);
    setSuggestions([]);
    setActiveIndex(-1);
    selectedValueRef.current = nextValue;
    onChange(nextValue);
    setIsOpen(nextValue.trim().length >= 2);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="location"
            name="location-search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="campaign-location-suggestions"
            aria-invalid={invalid}
            autoComplete="off"
            placeholder="Start typing a city, state, or country"
            value={inputValue}
            onFocus={() => {
              if (
                inputValue.trim().length >= 2 &&
                inputValue !== selectedValueRef.current
              ) {
                setIsOpen(true);
              }
            }}
            onChange={(event) => updateInput(event.target.value)}
            onKeyDown={(event) => {
              if (!isOpen || suggestions.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => (index + 1) % suggestions.length);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex(
                  (index) =>
                    (index - 1 + suggestions.length) % suggestions.length,
                );
              } else if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault();
                selectLocation(suggestions[activeIndex]);
              } else if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
            className={cn("pl-10 pr-10", className, invalid && "border-red-500")}
          />
          {isLoading ? (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
          ) : value && inputValue === value ? (
            <span className="pointer-events-none absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-3.5 w-3.5 text-emerald-700" />
            </span>
          ) : (
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        id="campaign-location-suggestions"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border-slate-200 p-1.5 shadow-xl"
      >
        {isLoading && suggestions.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching places...
          </div>
        ) : suggestions.length > 0 ? (
          <div role="listbox" className="max-h-72 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectLocation(suggestion)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50",
                )}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">
                    {suggestion.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {suggestion.type}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-sm text-slate-500">
            No matching place found. Try a nearby city, state, or country.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
