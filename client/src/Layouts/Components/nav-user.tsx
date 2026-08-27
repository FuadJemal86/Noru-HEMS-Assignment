import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronsUpDown, Headphones, LogOut, User, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavUser({
  user,
  isCollapsed = false,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  isCollapsed?: boolean;
}) {
  const navigate = useNavigate();


  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            className={cn(
              "w-full rounded-xl  transition-all duration-200",
              "hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
              "focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700",
              "border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center w-full">
              <div className="relative">
                <Avatar className="h-10 w-10 rounded-xl ring-2 ring-gray-200 dark:ring-gray-700">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>

              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    key="expanded-user-info"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 text-left ml-3 min-w-0"
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <ChevronsUpDown className="h-4 w-4 text-gray-400 dark:text-gray-500 ml-auto" />
            </div>
          </motion.button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-64 ml-2"
          align="end"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-xl">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Online
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="rounded-lg"
              onClick={() => navigate("/edit-profile")}
            >
              <UserCircle className="mr-3 h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg">
              <Headphones className="mr-3 h-4 w-4" />
              <a href="/customer-support" target="_blank" className="w-full">
                Support and Feedback
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg">
              <Bell className="mr-3 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="rounded-lg text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
