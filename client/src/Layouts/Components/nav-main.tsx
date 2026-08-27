import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Collapsible } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NavMain({
  items,
  isCollapsed = false,
  onExpandRequest,
  pendingOpenTitle,
  onPendingOpenHandled,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>>;
    isActive?: boolean;
    badgeCount?: number;
    color?: string;
    bgColor?: string;
    items?: {
      title: string;
      url: string;
      items?: {
        title: string;
        url: string;
      }[];
    }[];
  }[];
  isCollapsed?: boolean;
  onExpandRequest?: (title?: string) => void;
  pendingOpenTitle?: string;
  onPendingOpenHandled?: () => void;
}) {
  const location = useLocation();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  // Determine which items should be open based on current location
  useEffect(() => {
    const newOpenItems = new Set<string>();

    items.forEach((item) => {
      // Open parent if current path matches the main item URL
      if (item.url !== "#" && location.pathname === item.url) {
        newOpenItems.add(item.title);
      }

      // Open parent if current path matches any sub-item URL
      if (item.items) {
        item.items.forEach((subItem) => {
          if (location.pathname === subItem.url) {
            newOpenItems.add(item.title);
          }
          // Check 3rd level nested items
          if (subItem.items) {
            subItem.items.forEach((nestedItem) => {
              if (location.pathname === nestedItem.url) {
                newOpenItems.add(item.title); // Open parent
                newOpenItems.add(subItem.title); // Open sub-parent
              }
            });
          }
        });
      }
    });

    // Merge with existing open items so we don't auto-close user-opened menus
    setOpenItems((prev) => {
      const merged = new Set(prev);
      newOpenItems.forEach((t) => merged.add(t));
      return merged;
    });
  }, [location.pathname, items]);

  const toggleItem = (itemTitle: string, forceOpen?: boolean) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (forceOpen) {
        newSet.add(itemTitle);
        return newSet;
      }
      if (newSet.has(itemTitle)) {
        newSet.delete(itemTitle);
      } else {
        newSet.add(itemTitle);
      }
      return newSet;
    });
  };

  const handleItemClick = (
    e: React.MouseEvent,
    itemTitle: string,
    hasSubItems: boolean,
    itemUrl: string
  ) => {
    if (hasSubItems) {
      e.preventDefault();
      e.stopPropagation();
      // If collapsed, just request expansion and return; pendingOpenTitle will open it
      if (isCollapsed) {
        if (typeof onExpandRequest === "function") onExpandRequest(itemTitle);
        return;
      }
      // Expanded: toggle immediately
      toggleItem(itemTitle);
    } else if (itemUrl !== "#") {
      // Navigate to the URL if it's not a placeholder
      window.location.href = itemUrl;
    }
  };

  // Open pending title (after expand triggered by click)
  useEffect(() => {
    if (pendingOpenTitle) {
      // ensure open, and do not toggle-closed if already present
      setOpenItems((prev) => {
        const next = new Set(prev);
        next.add(pendingOpenTitle);
        return next;
      });
      if (typeof onPendingOpenHandled === "function") onPendingOpenHandled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpenTitle]);

  // Check if an item is active
  const isItemActive = (item: any) => {
    if (item.url !== "#" && location.pathname === item.url) {
      return true;
    }
    if (item.items) {
      return item.items.some(
        (subItem: any) => location.pathname === subItem.url
      );
    }
    return false;
  };

  // Check if a sub-item is active
  const isSubItemActive = (subItemUrl: string) => {
    return location.pathname === subItemUrl;
  };

  return (
    <TooltipProvider>
      <nav className="px-3">
        <div className="space-y-1">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Collapsible open={openItems.has(item.title)}>
                <div className="relative">
                  {isCollapsed ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <motion.div
                          className={cn(
                            "group flex items-center w-full rounded-xl transition-all duration-200 cursor-pointer",
                            "hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
                            isItemActive(item) &&
                              cn(
                                item.bgColor || "bg-gray-100 dark:bg-gray-800",
                                "shadow-sm"
                              )
                          )}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) =>
                            handleItemClick(
                              e,
                              item.title,
                              !!item.items?.length,
                              item.url
                            )
                          }
                        >
                          <div className="flex items-center justify-center w-12 h-12 mx-auto">
                            <div
                              className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                                item.bgColor || "bg-gray-100 dark:bg-gray-800",
                                isItemActive(item) && "shadow-sm"
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "w-5 h-5 transition-colors duration-200",
                                  item.color ||
                                    "text-gray-600 dark:text-gray-400",
                                  isItemActive(item) &&
                                    (item.color ||
                                      "text-gray-900 dark:text-gray-100")
                                )}
                              />
                            </div>
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={12}
                        className="max-w-xs p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg"
                      >
                        <div className="p-3">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-lg",
                                item.bgColor || "bg-gray-100 dark:bg-gray-800"
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "w-4 h-4",
                                  item.color ||
                                    "text-gray-600 dark:text-gray-400"
                                )}
                              />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {item.title}
                            </span>
                          </div>
                          {item.items?.length ? (
                            <div className="space-y-1">
                              {item.items.map((subItem) => (
                                <div
                                  key={subItem.title}
                                  className="flex  items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                  onClick={() =>
                                    (window.location.href = subItem.url)
                                  }
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {subItem.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Click to navigate
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <motion.div
                      className={cn(
                        "group flex items-center w-full rounded-xl transition-all duration-200 cursor-pointer",
                        "hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
                        isItemActive(item) &&
                          cn(
                            item.bgColor || "bg-gray-100 dark:bg-gray-800",
                            "shadow-sm"
                          )
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        handleItemClick(
                          e,
                          item.title,
                          !!item.items?.length,
                          item.url
                        );
                      }}
                    >
                      <div className="flex items-center w-full px-3 py-3">
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                            item.bgColor || "bg-gray-100 dark:bg-gray-800",
                            isItemActive(item) && "shadow-sm"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "w-5 h-5 transition-colors duration-200",
                              item.color || "text-gray-600 dark:text-gray-400",
                              isItemActive(item) &&
                                (item.color ||
                                  "text-gray-900 dark:text-gray-100")
                            )}
                          />
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div
                            key="expanded-content"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 ml-3 min-w-0"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-sm font-medium truncate transition-colors duration-200",
                                  isItemActive(item)
                                    ? "text-gray-900 dark:text-gray-100"
                                    : "text-gray-700 dark:text-gray-300"
                                )}
                              >
                                {item.title}
                              </span>

                              {item.badgeCount ? (
                                <Badge
                                  variant="destructive"
                                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                                >
                                  {item.badgeCount}
                                </Badge>
                              ) : null}

                              {item.items?.length ? (
                                <ChevronRight
                                  className={cn(
                                    "w-4 h-4 transition-all duration-200 ml-2",
                                    openItems.has(item.title)
                                      ? "rotate-90"
                                      : "",
                                    "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                                  )}
                                />
                              ) : null}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {item.items?.length &&
                      openItems.has(item.title) &&
                      !isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-6 mt-1 space-y-1"
                        >
                          {item.items.map((subItem, subIndex) => (
                            <motion.div
                              key={subItem.title}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: subIndex * 0.05 }}
                              className="group pt-1"
                            >
                              {subItem.items?.length ? (
                                // Sub-item with nested children (3rd level)
                                <div>
                                  <button
                                    onClick={() => toggleItem(subItem.title)}
                                    className={cn(
                                      "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                      "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                      openItems.has(subItem.title) &&
                                        "bg-gray-50 dark:bg-gray-800/50"
                                    )}
                                  >
                                    <div className="flex items-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {subItem.title}
                                      </span>
                                    </div>
                                    <ChevronRight
                                      className={cn(
                                        "w-4 h-4 transition-all duration-200",
                                        openItems.has(subItem.title)
                                          ? "rotate-90"
                                          : "",
                                        "text-gray-400"
                                      )}
                                    />
                                  </button>
                                  <AnimatePresence>
                                    {openItems.has(subItem.title) && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="ml-4 mt-1 space-y-1"
                                      >
                                        {subItem.items.map((nestedItem, nestedIndex) => (
                                          <motion.div
                                            key={nestedItem.title}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: nestedIndex * 0.05 }}
                                          >
                                            <button
                                              onClick={() =>
                                                (window.location.href = nestedItem.url)
                                              }
                                              className={cn(
                                                "flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                                "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                                isSubItemActive(nestedItem.url) &&
                                                  "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                                              )}
                                            >
                                              <div className="w-1 h-1 rounded-full bg-gray-300 mr-3 flex-shrink-0" />
                                              <span className="truncate">
                                                {nestedItem.title}
                                              </span>
                                            </button>
                                          </motion.div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ) : (
                                // Regular sub-item (no children)
                                <button
                                  onClick={() =>
                                    (window.location.href = subItem.url)
                                  }
                                  className={cn(
                                    "flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                    "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                    isSubItemActive(subItem.url) &&
                                      "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                                  )}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {subItem.title}
                                  </span>
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>
              </Collapsible>
            </motion.div>
          ))}
        </div>
      </nav>
    </TooltipProvider>
  );
}
