import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MonthComparisonSelectorProps {
  selectedMonths: number[];
  onMonthsChange: (months: number[]) => void;
  className?: string;
}

export function MonthComparisonSelector({
  selectedMonths,
  onMonthsChange,
  className,
}: MonthComparisonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Available months to compare (1-12 months back)
  const availableMonths = Array.from({ length: 12 }, (_, i) => i + 1);

  const toggleMonth = (month: number) => {
    // Get the current maximum selected month
    const maxSelected =
      selectedMonths.length > 0 ? Math.max(...selectedMonths) : 0;

    // If clicking the same max month, deselect all
    if (month === maxSelected && selectedMonths.length === month) {
      onMonthsChange([]);
    } else {
      // Select all months from 1 to the clicked month
      const newSelection = Array.from({ length: month }, (_, i) => i + 1);
      onMonthsChange(newSelection);
    }
  };

  const getDisplayText = () => {
    if (selectedMonths.length === 0) {
      return "Select months to compare";
    }
    if (selectedMonths.length === 1) {
      return `1 month before`;
    }
    const maxMonth = Math.max(...selectedMonths);
    return `Months 1-${maxMonth} (${selectedMonths.length} selected)`;
  };

  const handleQuickSelect = (months: number[]) => {
    onMonthsChange(months);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              selectedMonths.length === 0 && "text-muted-foreground"
            )}
          >
            <span className="mr-2">📊</span>
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div>
              <h4 className="font-semibold text-sm mb-1">Compare Periods</h4>
              <p className="text-xs text-muted-foreground">
                Click a month to select all months from 1 to that month
              </p>
            </div>

            {/* Quick Select */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Quick Select
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleQuickSelect([1, 2, 3])}
                >
                  Last 3 months
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleQuickSelect([1, 2, 3, 4, 5, 6])}
                >
                  Last 6 months
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleQuickSelect(availableMonths)}
                >
                  All 12 months
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleQuickSelect([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Month Selection Grid */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Select Months
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableMonths.map((month) => {
                  const isSelected = selectedMonths.includes(month);
                  return (
                    <button
                      key={month}
                      onClick={() => toggleMonth(month)}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input"
                      )}
                    >
                      <span className="font-medium">{month}M</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Count */}
            {selectedMonths.length > 0 && (
              <div className="text-xs text-muted-foreground border-t pt-3">
                Selected: {selectedMonths.join(", ")}{" "}
                {selectedMonths.length === 1 ? "month" : "months"} before
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
