import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Cpu, Zap, CircuitBoard } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function LoadingSpinner({
  className,
  size = "md",
  showText = true,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50/90 to-white/90 dark:from-black/90 dark:to-gray-900/90 backdrop-blur-sm z-50",
        className
      )}
    >
      {/* Main CPU Container */}
      <div className="relative flex items-center justify-center">
        {/* Multiple Circuit Effects */}
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={cn(
              "absolute rounded-lg border-2 border-gray-400/30 dark:border-gray-300/20",
              sizeClasses[size]
            )}
            animate={{
              scale: [0.3, 2],
              opacity: [0.8, 0],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.6,
              ease: "easeOut",
            }}
          />
        ))}

        {/* CPU Surface with Circuit Pattern */}
        <motion.div
          className={cn(
            "relative rounded-lg bg-gradient-to-b from-gray-200/20 to-gray-300/30 dark:from-gray-700/20 dark:to-gray-600/30 border border-gray-300/50 dark:border-gray-400/30",
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Inner CPU Core */}
          <div
            className={cn(
              "absolute inset-2 rounded-lg bg-gradient-to-b from-gray-100/40 to-gray-200/40 dark:from-gray-800/30 dark:to-gray-700/30",
              size === "sm" ? "inset-3" : size === "md" ? "inset-4" : "inset-6"
            )}
          />
        </motion.div>

        {/* Multiple Electronic Elements */}
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={`element-${index}`}
            className="absolute"
            style={{
              left: `${20 + index * 20}%`,
              top: `${10 + (index % 2) * 20}%`,
            }}
            initial={{ y: -30, opacity: 0 }}
            animate={{
              y: [-30, 0, -30],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: index * 0.4,
              ease: "easeInOut",
            }}
          >
            {index % 2 === 0 ? (
              <Zap
                className={cn(
                  "text-gray-600 dark:text-gray-300",
                  size === "sm"
                    ? "h-3 w-3"
                    : size === "md"
                    ? "h-4 w-4"
                    : "h-6 w-6"
                )}
              />
            ) : (
              <CircuitBoard
                className={cn(
                  "text-gray-600 dark:text-gray-300",
                  size === "sm"
                    ? "h-3 w-3"
                    : size === "md"
                    ? "h-4 w-4"
                    : "h-6 w-6"
                )}
              />
            )}
          </motion.div>
        ))}

        {/* Central CPU Icon */}
        <motion.div
          className="absolute"
          animate={{
            y: [-5, 0, -5],
            scale: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Cpu
            className={cn(
              "text-black dark:text-white",
              size === "sm"
                ? "h-6 w-6"
                : size === "md"
                ? "h-8 w-8"
                : "h-12 w-12"
            )}
          />
        </motion.div>

        {/* Floating Data Points */}
        {[0, 1, 2, 3, 4].map((index) => (
          <motion.div
            key={`datapoint-${index}`}
            className="absolute rounded-sm bg-gray-400/40 dark:bg-gray-300/30"
            style={{
              width: `${4 + (index % 3) * 2}px`,
              height: `${4 + (index % 3) * 2}px`,
              left: `${15 + index * 15}%`,
              top: `${20 + (index % 2) * 30}%`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: index * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Stock Wise Text */}
      {showText && (
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <motion.div
            className={cn(
              "font-bold bg-gradient-to-r from-black via-gray-700 to-black dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent",
              textSizeClasses[size]
            )}
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Stock Wise
          </motion.div>
          <motion.div
            className="text-xs text-gray-600/70 dark:text-gray-400/70 mt-1"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Loading...
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
