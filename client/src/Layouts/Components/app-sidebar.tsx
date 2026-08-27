import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cpu,
  Users,
  X,
  Target,
  Building2,
} from "lucide-react";

import { useState } from "react";
import { NavMain } from "./nav-main";
import { ThemeToggle } from "./theme-toggle";

// TODO: Set to false to enable permission checking

export function AppSidebar({
  isCollapsed = false, // Collapsed state of the sidebar
  isMobile = false,
  onToggle,
}: {
  isCollapsed?: boolean;
  isMobile?: boolean;
  onToggle?: () => void;
}) {
  const [pendingOpenTitle, setPendingOpenTitle] = useState<string | null>(null);


  // Define menu items for electronic accessories inventory
  const getMenuItems = () => {
    const menuItems = [];

    // Check if user is owner (admin)

    // Regular store navigation for non-owners
    menuItems.push(
      {
        title: "Employee",
        url: "/admin/settings/modules",
        icon: Target,
        color: "text-indigo-500",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
        items: [
          {
            title: "Employees",
            url: "/hr/add-employee",
            icon: Users,
          },
          {
            title: "Departments",
            url: "/hr/departments",
            icon: Building2,
          },

        ]
      },
    );

    return menuItems;
  };

  return (
    <motion.aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-white dark:bg-gray-900 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-300",
        isMobile ? "w-72" : isCollapsed ? "w-16" : "w-72",
        isMobile && !isCollapsed ? "shadow-2xl" : ""
      )}
      initial={false}
      animate={{
        width: isMobile ? (isCollapsed ? 0 : 288) : isCollapsed ? 64 : 288,
        x: isMobile ? (isCollapsed ? -288 : 0) : 0,
        opacity: isMobile && isCollapsed ? 0 : 1,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 h-16 transition-colors duration-300">
        <AnimatePresence mode="wait">
          {(!isCollapsed || isMobile) && (
            <motion.div
              key="expanded-header"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 shadow-lg">
                <Cpu className="w-6 h-6 text-white dark:text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  HEMS
                </h1>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isCollapsed && !isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 shadow-lg"
          >
            <Cpu className="w-6 h-6 text-white dark:text-black" />
          </motion.div>
        )}

        <div className="flex items-center space-x-2">
          {/* Theme toggle - hide when collapsed on desktop */}
          {(!isCollapsed || isMobile) && <ThemeToggle />}
          {isMobile && onToggle && (
            <button
              onClick={() => onToggle()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        <NavMain
          items={getMenuItems()}
          isCollapsed={isCollapsed}
          onExpandRequest={(title) => {
            if (isCollapsed && title) {
              setPendingOpenTitle(title);
            }
          }}
          pendingOpenTitle={pendingOpenTitle || undefined}
          onPendingOpenHandled={() => setPendingOpenTitle(null)}
        />
      </div>
    </motion.aside>
  );
}
