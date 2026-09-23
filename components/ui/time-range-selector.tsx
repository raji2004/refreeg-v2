"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
} from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TimeRangeSelectorProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

type TimeUnit = "days" | "weeks" | "months" | "years";

export function TimeRangeSelector({
  date,
  setDate,
  className,
}: TimeRangeSelectorProps) {
  const [value, setValue] = React.useState<string>("30");
  const [unit, setUnit] = React.useState<TimeUnit>("days");
  const [isOpen, setIsOpen] = React.useState(false);

  const calculateRange = (val: number, u: TimeUnit): DateRange => {
    const end = endOfDay(new Date());
    let start = new Date();

    switch (u) {
      case "days":
        start = subDays(end, val);
        break;
      case "weeks":
        start = subWeeks(end, val);
        break;
      case "months":
        start = subMonths(end, val);
        break;
      case "years":
        start = subYears(end, val);
        break;
    }
    start = startOfDay(start);

    if (start > end) {
      start = end;
    }

    return { from: start, to: end };
  };

  const handleQuickSelect = (val: number, u: TimeUnit) => {
    setValue(val.toString());
    setUnit(u);
    const newRange = calculateRange(val, u);
    setDate(newRange);
    setIsOpen(false);
  };

  const handleManualChange = (newValue: string, newUnit: TimeUnit) => {
    setValue(newValue);
    setUnit(newUnit);
  };

  const handleManualApply = () => {
    const numVal = parseInt(value);
    if (!isNaN(numVal) && numVal > 0) {
      const newRange = calculateRange(numVal, unit);
      setDate(newRange);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Quick Ranges</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(7, "days")}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(4, "weeks")}
                >
                  Last 4 weeks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(3, "months")}
                >
                  Last 3 months
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(1, "years")}
                >
                  Last 1 year
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Custom Range</h4>
              <div className="flex gap-2">
                <div className="grid w-[100px] gap-1.5">
                  <Label htmlFor="value" className="sr-only">
                    Value
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min="1"
                    value={value}
                    onChange={(e) => handleManualChange(e.target.value, unit)}
                  />
                </div>
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="unit" className="sr-only">
                    Unit
                  </Label>
                  <Select
                    value={unit}
                    onValueChange={(val: TimeUnit) =>
                      handleManualChange(value, val)
                    }
                  >
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleManualApply} className="w-auto">
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
