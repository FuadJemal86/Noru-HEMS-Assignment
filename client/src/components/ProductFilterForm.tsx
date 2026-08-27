import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, X, Filter } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";

// Reusable component for displaying selected items with ellipsis
interface SelectedItemsDisplayProps {
  selectedItems: Array<{ id: string; name: string }>;
  maxVisible?: number;
  onRemove: (id: string) => void;
  placeholder?: string;
}

export const SelectedItemsDisplay: React.FC<SelectedItemsDisplayProps> = ({
  selectedItems,
  maxVisible = 2,
  onRemove,
  placeholder = "Select...",
}) => {
  if (selectedItems.length === 0) {
    return <span className="pr-2 text-muted-foreground">{placeholder}</span>;
  }

  const visibleItems = selectedItems.slice(0, maxVisible);
  const remainingCount = selectedItems.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1 items-center w-full pr-2 min-w-0">
      {visibleItems.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs whitespace-nowrap"
        >
          {item.name}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/80 text-primary-foreground text-xs whitespace-nowrap">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

// Filter form schema type
export type ProductFilterFormValues = {
  name: string;
  category: string[];
  device_model: string[];
  color: string[];
  screen_type: string[];
};

// Filter options types
export interface FilterOptions {
  categories: { id: string; name: string }[];
  deviceModels: {
    id: string;
    name: string;
    brand: { id: string; name: string };
  }[];
  colors: { id: string; name: string; hex_code: string | null }[];
  screenTypes: { id: string; name: string }[];
}

interface ProductFilterFormProps {
  form: UseFormReturn<ProductFilterFormValues>;
  filterOptions: FilterOptions;
  filterOptionsLoading: boolean;
  onResetFilters: () => void;
  className?: string;
  showAdditionalFilters?: boolean;
  additionalFilters?: React.ReactNode;
  gridCols?: string; // For custom grid layout
  defaultOpen?: boolean; // Whether the accordion is open by default
}

export const ProductFilterForm: React.FC<ProductFilterFormProps> = ({
  form,
  filterOptions,
  filterOptionsLoading,
  onResetFilters,
  className = "",
  showAdditionalFilters = false,
  additionalFilters,
  gridCols = "grid-cols-1 md:grid-cols-5",
  defaultOpen = true,
}) => {
  // Internal popover state management
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [deviceModelPopoverOpen, setDeviceModelPopoverOpen] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [screenTypePopoverOpen, setScreenTypePopoverOpen] = useState(false);

  return (
    <Form {...form}>
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpen ? "filters" : undefined}
        className={`border rounded-md bg-background/50 dark:bg-muted/20 ${className}`}
      >
        <AccordionItem value="filters" className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Filters
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 px-4 pb-4">
              {/* Main filter fields */}
              <div className={`grid ${gridCols} gap-4`}>
                {/* Name Filter */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        Name/ Barcode
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Search by name or barcode..."
                          {...field}
                          className="bg-background border-input h-10"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Category Filter */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        Category
                      </FormLabel>
                      <FormControl>
                        <Popover
                          open={categoryPopoverOpen}
                          onOpenChange={setCategoryPopoverOpen}
                          modal={true}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={categoryPopoverOpen}
                              className="w-full justify-between min-h-[40px] h-auto py-2 pr-10 relative bg-background border-input text-left font-normal"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <SelectedItemsDisplay
                                selectedItems={field.value
                                  .map((id: string) => {
                                    const category =
                                      filterOptions.categories.find(
                                        (c) => c.id === id
                                      );
                                    return category
                                      ? { id: category.id, name: category.name }
                                      : null;
                                  })
                                  .filter(
                                    (
                                      item
                                    ): item is { id: string; name: string } =>
                                      item !== null
                                  )}
                                maxVisible={2}
                                onRemove={(id) => {
                                  const newValues = field.value.filter(
                                    (itemId: string) => itemId !== id
                                  );
                                  field.onChange(newValues);
                                }}
                                placeholder="Select categories..."
                              />
                              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                            onInteractOutside={() => {
                              setCategoryPopoverOpen(false);
                            }}
                          >
                            <div className="p-2 max-h-[300px] overflow-y-auto">
                              {filterOptionsLoading ? (
                                <div className="space-y-1">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                      key={`skeleton-category-${index}`}
                                      className="flex items-center rounded-sm px-2 py-2"
                                    >
                                      <Skeleton className="h-4 w-4 mr-2 rounded" />
                                      <Skeleton className="h-4 w-24" />
                                    </div>
                                  ))}
                                </div>
                              ) : filterOptions.categories.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No categories found.
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filterOptions.categories.map((category) => {
                                    const isSelected = field.value?.includes(
                                      category.id
                                    );
                                    return (
                                      <div
                                        key={category.id}
                                        onClick={() => {
                                          const currentValues =
                                            field.value || [];
                                          const newValues = isSelected
                                            ? currentValues.filter(
                                                (id: string) =>
                                                  id !== category.id
                                              )
                                            : [...currentValues, category.id];
                                          field.onChange(newValues);
                                        }}
                                        className={cn(
                                          "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent transition-colors",
                                          isSelected && "bg-accent"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          className="mr-2 pointer-events-none"
                                        />
                                        <span className="font-medium text-xs">
                                          {category.name}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Device Model Filter */}
                <FormField
                  control={form.control}
                  name="device_model"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        Device Model
                      </FormLabel>
                      <FormControl>
                        <Popover
                          open={deviceModelPopoverOpen}
                          onOpenChange={setDeviceModelPopoverOpen}
                          modal={true}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={deviceModelPopoverOpen}
                              className="w-full justify-between min-h-[40px] h-auto py-2 pr-10 relative bg-background border-input text-left font-normal"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <SelectedItemsDisplay
                                selectedItems={field.value
                                  .map((id: string) => {
                                    const model =
                                      filterOptions.deviceModels.find(
                                        (m) => m.id === id
                                      );
                                    return model
                                      ? { id: model.id, name: model.name }
                                      : null;
                                  })
                                  .filter(
                                    (
                                      item
                                    ): item is { id: string; name: string } =>
                                      item !== null
                                  )}
                                maxVisible={2}
                                onRemove={(id) => {
                                  const newValues = field.value.filter(
                                    (itemId: string) => itemId !== id
                                  );
                                  field.onChange(newValues);
                                }}
                                placeholder="Select device models..."
                              />
                              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                            onInteractOutside={() => {
                              setDeviceModelPopoverOpen(false);
                            }}
                          >
                            <div className="p-2 max-h-[300px] overflow-y-auto">
                              {filterOptionsLoading ? (
                                <div className="space-y-1">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                      key={`skeleton-device-${index}`}
                                      className="flex items-center rounded-sm px-2 py-2"
                                    >
                                      <Skeleton className="h-4 w-4 mr-2 rounded" />
                                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : filterOptions.deviceModels.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No device models found.
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filterOptions.deviceModels.map((model) => {
                                    const isSelected = field.value?.includes(
                                      model.id
                                    );
                                    return (
                                      <div
                                        key={model.id}
                                        onClick={() => {
                                          const currentValues =
                                            field.value || [];
                                          const newValues = isSelected
                                            ? currentValues.filter(
                                                (id: string) => id !== model.id
                                              )
                                            : [...currentValues, model.id];
                                          field.onChange(newValues);
                                        }}
                                        className={cn(
                                          "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent transition-colors",
                                          isSelected && "bg-accent"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          className="mr-2 pointer-events-none"
                                        />
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium text-xs truncate">
                                            {model.name}
                                          </span>
                                          <span className="text-xs text-muted-foreground truncate">
                                            {model.brand.name}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Color Filter */}
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        Color
                      </FormLabel>
                      <FormControl>
                        <Popover
                          open={colorPopoverOpen}
                          onOpenChange={setColorPopoverOpen}
                          modal={true}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={colorPopoverOpen}
                              className="w-full justify-between min-h-[40px] h-auto py-2 pr-10 relative bg-background border-input text-left font-normal"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <SelectedItemsDisplay
                                selectedItems={field.value
                                  .map((id: string) => {
                                    const color = filterOptions.colors.find(
                                      (c) => c.id === id
                                    );
                                    return color
                                      ? { id: color.id, name: color.name }
                                      : null;
                                  })
                                  .filter(
                                    (
                                      item
                                    ): item is { id: string; name: string } =>
                                      item !== null
                                  )}
                                maxVisible={2}
                                onRemove={(id) => {
                                  const newValues = field.value.filter(
                                    (itemId: string) => itemId !== id
                                  );
                                  field.onChange(newValues);
                                }}
                                placeholder="Select colors..."
                              />
                              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                            onInteractOutside={() => {
                              setColorPopoverOpen(false);
                            }}
                          >
                            <div className="p-2 max-h-[300px] overflow-y-auto">
                              {filterOptionsLoading ? (
                                <div className="space-y-1">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                      key={`skeleton-color-${index}`}
                                      className="flex items-center rounded-sm px-2 py-2"
                                    >
                                      <Skeleton className="h-4 w-4 mr-2 rounded" />
                                      <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-4 rounded-full" />
                                        <Skeleton className="h-4 w-20" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : filterOptions.colors.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No colors found.
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filterOptions.colors.map((color) => {
                                    const isSelected = field.value?.includes(
                                      color.id
                                    );
                                    return (
                                      <div
                                        key={color.id}
                                        onClick={() => {
                                          const currentValues =
                                            field.value || [];
                                          const newValues = isSelected
                                            ? currentValues.filter(
                                                (id: string) => id !== color.id
                                              )
                                            : [...currentValues, color.id];
                                          field.onChange(newValues);
                                        }}
                                        className={cn(
                                          "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent transition-colors",
                                          isSelected && "bg-accent"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          className="mr-2 pointer-events-none"
                                        />
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div
                                            className="w-4 h-4 rounded-full border flex-shrink-0"
                                            style={{
                                              backgroundColor:
                                                color.hex_code ||
                                                color.name.toLowerCase(),
                                            }}
                                          />
                                          <span className="font-medium text-xs truncate">
                                            {color.name}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Screen Type Filter */}
                <FormField
                  control={form.control}
                  name="screen_type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        Screen Type
                      </FormLabel>
                      <FormControl>
                        <Popover
                          open={screenTypePopoverOpen}
                          onOpenChange={setScreenTypePopoverOpen}
                          modal={true}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={screenTypePopoverOpen}
                              className="w-full justify-between min-h-[40px] h-auto py-2 pr-10 relative bg-background border-input text-left font-normal"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <SelectedItemsDisplay
                                selectedItems={field.value
                                  .map((id: string) => {
                                    const screenType =
                                      filterOptions.screenTypes.find(
                                        (s) => s.id === id
                                      );
                                    return screenType
                                      ? {
                                          id: screenType.id,
                                          name: screenType.name,
                                        }
                                      : null;
                                  })
                                  .filter(
                                    (
                                      item
                                    ): item is { id: string; name: string } =>
                                      item !== null
                                  )}
                                maxVisible={2}
                                onRemove={(id) => {
                                  const newValues = field.value.filter(
                                    (itemId: string) => itemId !== id
                                  );
                                  field.onChange(newValues);
                                }}
                                placeholder="Select screen types..."
                              />
                              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                            onInteractOutside={() => {
                              setScreenTypePopoverOpen(false);
                            }}
                          >
                            <div className="p-2 max-h-[300px] overflow-y-auto">
                              {filterOptionsLoading ? (
                                <div className="space-y-1">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                      key={`skeleton-screen-${index}`}
                                      className="flex items-center rounded-sm px-2 py-2"
                                    >
                                      <Skeleton className="h-4 w-4 mr-2 rounded" />
                                      <Skeleton className="h-4 w-24" />
                                    </div>
                                  ))}
                                </div>
                              ) : filterOptions.screenTypes.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No screen types found.
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filterOptions.screenTypes.map(
                                    (screenType) => {
                                      const isSelected = field.value?.includes(
                                        screenType.id
                                      );
                                      return (
                                        <div
                                          key={screenType.id}
                                          onClick={() => {
                                            const currentValues =
                                              field.value || [];
                                            const newValues = isSelected
                                              ? currentValues.filter(
                                                  (id: string) =>
                                                    id !== screenType.id
                                                )
                                              : [
                                                  ...currentValues,
                                                  screenType.id,
                                                ];
                                            field.onChange(newValues);
                                          }}
                                          className={cn(
                                            "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm hover:bg-accent transition-colors",
                                            isSelected && "bg-accent"
                                          )}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            className="mr-2 pointer-events-none"
                                          />
                                          <span className="font-medium text-xs">
                                            {screenType.name}
                                          </span>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Filters (like toggles) */}
              {showAdditionalFilters && additionalFilters && (
                <div className="pt-2 border-t">{additionalFilters}</div>
              )}

              {/* Reset button */}
              <div className="flex items-center justify-end pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetFilters}
                  className="bg-background hover:bg-muted"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Form>
  );
};
