import { useRef, useState } from "react";

interface DragScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollSpeed?: number;
  showScrollIndicator?: boolean;
  disabled?: boolean;
}

/**
 * DragScrollContainer - A reusable component that enables drag-to-scroll functionality
 *
 * Usage:
 * ```tsx
 * <DragScrollContainer>
 *   <Table>...</Table>
 * </DragScrollContainer>
 * ```
 *
 * @param children - The content to make scrollable
 * @param className - Additional CSS classes for the container
 * @param scrollSpeed - Multiplier for scroll speed (default: 1.5)
 * @param showScrollIndicator - Show gradient shadow on right edge (default: true)
 * @param disabled - Disable drag-to-scroll functionality (default: false)
 */
export function DragScrollContainer({
  children,
  className = "",
  scrollSpeed = 1.5,
  showScrollIndicator = true,
  disabled = false,
}: DragScrollContainerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;

    // Helper to check if an element is within the container
    const isWithinContainer = (element: Element | null): boolean => {
      if (!element) return false;
      return container.contains(element);
    };

    // Check for [data-state] but only if it's within the container
    const dataStateElement = target.closest("[data-state]");
    const hasDataStateWithinContainer =
      dataStateElement && isWithinContainer(dataStateElement);

    if (
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "A" ||
      target.closest("a") ||
      target.closest("[role='combobox']") ||
      target.closest("[role='option']") ||
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[data-radix-portal]") ||
      target.closest("[data-radix-select-content]") ||
      target.closest("[data-radix-popover-content]") ||
      hasDataStateWithinContainer ||
      target.closest("label") ||
      target.closest(".radix-select") ||
      target.closest(".radix-popover")
    ) {
      return;
    }

    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Stop dragging if mouse is over interactive elements (like dropdowns)
    const target = e.target as HTMLElement;
    if (
      target.closest("[role='combobox']") ||
      target.closest("[role='option']") ||
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[data-radix-portal]") ||
      target.closest("[data-radix-select-content]") ||
      target.closest("[data-radix-popover-content]") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select")
    ) {
      // Stop dragging and reset cursor
      setIsDragging(false);
      container.style.cursor = "grab";
      container.style.userSelect = "auto";
      return;
    }

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * scrollSpeed;
    container.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    setIsDragging(false);
    container.style.cursor = "grab";
    container.style.userSelect = "auto";
  };

  const handleMouseLeave = () => {
    if (isDragging && !disabled) {
      const container = containerRef.current;
      if (!container) return;

      setIsDragging(false);
      container.style.cursor = "grab";
      container.style.userSelect = "auto";
    }
  };

  return (
    <div className="relative">
      {/* Scroll indicator shadow */}
      {showScrollIndicator && (
        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10 rounded-r-md" />
      )}

      <div
        ref={containerRef}
        className={`overflow-x-auto overflow-y-visible ${
          disabled ? "" : "cursor-grab active:cursor-grabbing"
        } ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}

export default DragScrollContainer;
