import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  time: string;
  onTimeChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  placeholder?: string;
  disabledDates?: ((date: Date) => boolean) | { before?: Date; after?: Date };
}

export function DateTimePicker({
  date,
  onDateChange,
  time,
  onTimeChange,
  className,
  disabled = false,
  minDate,
  placeholder = "Pick a date",
  disabledDates,
}: DateTimePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine the disabled prop for Calendar (must match DayPicker's Matcher type)
  const getDisabledProp = (): Matcher | Matcher[] | undefined => {
    // If disabledDates is a function, pass through
    if (typeof disabledDates === "function") return disabledDates;

    const matchers: Matcher[] = [];

    // Merge object-based disabled dates (before/after) with minDate if present
    if (disabledDates) {
      if ("before" in disabledDates && disabledDates.before) {
        const beforeDate =
          minDate && minDate > disabledDates.before ? minDate : disabledDates.before;
        matchers.push({ before: beforeDate });
      }

      if ("after" in disabledDates && disabledDates.after) {
        matchers.push({ after: disabledDates.after });
      }
    }

    // Apply minDate as a fallback minimum if no 'before' matcher was added
    if (
      minDate &&
      !matchers.some(
        (m) => typeof m === "object" && m !== null && "before" in m
      )
    ) {
      matchers.push({ before: minDate });
    }

    if (matchers.length === 0) return undefined;
    return matchers.length === 1 ? matchers[0] : matchers;
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 sm:gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full sm:flex-1 justify-start text-left font-normal text-sm sm:text-base",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 sm:max-w-none" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            disabled={getDisabledProp()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <div className="relative w-full sm:w-32">
        <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
        <Input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="pl-8 w-full text-sm sm:text-base"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
