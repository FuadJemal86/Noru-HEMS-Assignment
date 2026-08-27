import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
} from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  disableFutureDates?: boolean;
}

type DatePreset = {
  label: string;
  value: () => DateRange | undefined;
};

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  disableFutureDates = false,
}: DateRangePickerProps) {
  const today = new Date();

  const handleDateSelect = (range: DateRange | undefined) => {
    // If we have a complete range (both from and to are set) and user clicks a new date,
    // reset the selection to start fresh
    if (dateRange?.from && dateRange?.to && range?.from && range?.to) {
      const oldFromTime = dateRange.from.getTime();
      const oldToTime = dateRange.to.getTime();
      const newFromTime = range.from.getTime();
      const newToTime = range.to.getTime();

      // Check if the calendar is trying to extend from the old start date
      // This happens when from stays the same but to changes
      if (newFromTime === oldFromTime && newToTime !== oldToTime) {
        // User clicked a new date, start fresh with just that date
        onDateRangeChange({ from: range.to, to: undefined });
        return;
      }

      // Check if the calendar is trying to extend backwards (to stays same, from changes)
      if (newToTime === oldToTime && newFromTime !== oldFromTime) {
        // User clicked a new date, start fresh with just that date
        onDateRangeChange({ from: range.from, to: undefined });
        return;
      }
    }

    onDateRangeChange(range);
  };

  const datePresets: DatePreset[] = [
    {
      label: "Today",
      value: () => ({
        from: today,
        to: today,
      }),
    },
    {
      label: "Yesterday",
      value: () => ({
        from: subDays(today, 1),
        to: subDays(today, 1),
      }),
    },
    {
      label: "Last 7 Days",
      value: () => ({
        from: subDays(today, 6),
        to: today,
      }),
    },
    {
      label: "This Month",
      value: () => ({
        from: startOfMonth(today),
        to: endOfMonth(today),
      }),
    },
    {
      label: "Last Month",
      value: () => {
        const lastMonth = subMonths(today, 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      },
    },
    {
      label: "This Year",
      value: () => ({
        from: startOfYear(today),
        to: endOfYear(today),
      }),
    },
    {
      label: "All Time",
      value: () => undefined, // undefined means no date filtering
    },
  ];

  const handlePresetClick = (preset: DatePreset) => {
    const range = preset.value();
    // Ensure dates are set to start of day for proper filtering
    if (range?.from) {
      const fromDate = new Date(range.from);
      fromDate.setHours(0, 0, 0, 0);
      if (range.to) {
        const toDate = new Date(range.to);
        toDate.setHours(23, 59, 59, 999);
        onDateRangeChange({ from: fromDate, to: toDate });
      } else {
        onDateRangeChange({ from: fromDate, to: fromDate });
      }
    } else {
      onDateRangeChange(range);
    }
  };

  const getDisplayText = () => {
    if (!dateRange?.from && !dateRange?.to) {
      return <span>All Time</span>;
    }
    if (dateRange?.from) {
      if (dateRange.to) {
        return (
          <>
            {format(dateRange.from, "LLL dd, y")} -{" "}
            {format(dateRange.to, "LLL dd, y")}
          </>
        );
      }
      return format(dateRange.from, "LLL dd, y");
    }
    return <span>Pick a date range</span>;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{getDisplayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)] md:max-w-none" align="start">
          <div className="flex flex-col md:flex-row">
            {/* Calendar Section */}
            <div className="border-r-0 md:border-r border-b md:border-b-0">
              <div className="md:hidden">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={1}
                  disabled={disableFutureDates ? { after: today } : undefined}
                  className="p-3"
                />
              </div>
              <div className="hidden md:block">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  disabled={disableFutureDates ? { after: today } : undefined}
                  className="p-3"
                />
              </div>
            </div>
            {/* Shortcuts Section */}
            <div className="flex flex-row md:flex-col gap-1 p-3 w-full md:w-40 overflow-x-auto md:overflow-x-visible border-t md:border-t-0">
              <div className="text-sm font-semibold mb-2 text-muted-foreground whitespace-nowrap md:whitespace-normal flex-shrink-0">
                Quick Select
              </div>
              <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="justify-start text-sm h-9 px-2 whitespace-nowrap flex-shrink-0"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
