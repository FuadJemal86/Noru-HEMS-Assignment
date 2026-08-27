import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./Components/app-sidebar";

function IndexLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();




  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-collapse sidebar whenever current route is POS
  useEffect(() => {
    const isPOSRoute =
      location.pathname === "/pos" || location.pathname.startsWith("/pos/");
    if (isPOSRoute) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);




  // Function to get page title from path
  const getPageTitle = (path: string) => {
    if (!path) return "Dashboard";

    const segments = path.split("/").filter(Boolean);

    if (segments.length === 0) return "Dashboard";

    if (segments.length === 1 && segments[0] === "admin") {
      return "Dashboard";
    }

    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) return "Dashboard";

    return lastSegment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const currentPageTitle = getPageTitle(location?.pathname || "");

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AppSidebar
        isCollapsed={!sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <motion.main
        className="flex-1 flex flex-col overflow-hidden"
        initial={false}
        animate={{
          marginLeft: isMobile ? 0 : sidebarOpen ? 288 : 64,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onClick={() => {
          if (isMobile && sidebarOpen) {
            setSidebarOpen(false);
          }
        }}
      >
        {/* Header */}
        <header
          className="bg-white dark:bg-gray-900 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 md:px-6 transition-colors duration-300"
          onClick={(e) => e.stopPropagation()}
        >

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink
                    href="/"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-gray-900 dark:text-gray-100 font-semibold">
                    {currentPageTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>


          {/* Header Actions */}
          {/* Store-only features (hide for owners) */}

        </header>

        {/* Content */}
        <motion.div
          className="flex-1 overflow-y-auto  "
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Outlet />
        </motion.div>
      </motion.main>
    </div>
  );
}

export default IndexLayout;
