import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensures theme is loaded on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder to prevent layout shift
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        disabled
      >
        <Sun className="h-4 w-4 opacity-0" />
      </Button>
    );
  }

  // Toggle between light and dark themes
  const toggleTheme = () => {
    const currentTheme = resolvedTheme || theme || "light";
    // Force explicit theme (not system) when toggling
    if (currentTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  // Use resolvedTheme for icon display (handles system theme correctly)
  const displayTheme = resolvedTheme || theme || "light";
  const isDark = displayTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 relative"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {/* Show Sun icon for light mode */}
      <Sun
        className={`h-4 w-4 transition-all absolute inset-0 m-auto ${isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
          }`}
      />
      {/* Show Moon icon for dark mode */}
      <Moon
        className={`h-4 w-4 transition-all absolute inset-0 m-auto ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
