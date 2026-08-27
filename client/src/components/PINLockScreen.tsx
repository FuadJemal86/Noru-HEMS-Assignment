// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { AuthContext } from "@/Context/AuthContext";
// import { useLockPIN } from "@/Context/LockPIN";
// import { motion } from "framer-motion";
// import { Lock, Shield } from "lucide-react";
// import { useContext, useMemo, useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { toast } from "sonner";

// // TODO: Set to false to enable PIN lock screen
// const BYPASS_PIN_LOCK = true;

// const PINLockScreen = () => {
//   const { company, loading: authLoading } = useContext(AuthContext)!;
//   const { isLocked, authenticatePin } = useLockPIN();
//   const [pinCode, setPinCode] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const location = useLocation();
//   const navigate = useNavigate();

//   // Normalize path to permission key (remove leading slash)
//   const requestedPathKey = useMemo(() => {
//     const path = location.pathname.replace(/^\/+/, "");
//     // Root path maps to "/"
//     return path.length === 0 ? "/" : path;
//   }, [location.pathname]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!pinCode.trim()) {
//       toast.error("Please enter a PIN code");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const staff = await authenticatePin(pinCode);
//       if (staff) {
//         // Permission check: if current route is not in staff permissions, block access
//         const hasAccess = staff.permissions?.includes(requestedPathKey);
//         if (!hasAccess) {
//           toast.error("You can't access this page with your role");
//           // Redirect to first allowed page or dashboard if none
//           const fallback =
//             staff.permissions && staff.permissions.length > 0
//               ? staff.permissions[0]
//               : "/";
//           navigate(fallback === "/" ? "/" : `/${fallback}`, { replace: true });
//         } else {
//           toast.success(`Welcome, ${staff.name || "Staff"}!`);
//         }
//         setPinCode("");
//       } else {
//         toast.error("Invalid PIN code");
//         setPinCode("");
//       }
//     } catch (error) {
//       console.error("PIN authentication error:", error);
//       toast.error("Authentication failed. Please try again.");
//       setPinCode("");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // TODO: Bypass PIN lock - comment out this block to re-enable PIN lock
//   if (BYPASS_PIN_LOCK) {
//     return null;
//   }

//   // Do not show PIN overlay on login route
//   if (location.pathname.startsWith("/login")) {
//     return null;
//   }

//   // Don't show PIN screen while auth is loading
//   if (authLoading) {
//     return null;
//   }

//   // Don't show PIN screen for owners
//   if (company && company.role === "owner") {
//     return null;
//   }

//   // Don't show PIN screen if not locked
//   if (!isLocked) {
//     return null;
//   }

//   return (
//     <>
//       {/* Backdrop for mobile - full screen */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md md:hidden"
//         onClick={(e) => e.stopPropagation()}
//       />

//       {/* Backdrop for desktop - only main content area */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         className="fixed top-0 right-0 bottom-0 left-72 z-[9998] bg-black/80 backdrop-blur-md hidden md:block"
//         onClick={(e) => e.stopPropagation()}
//       />

//       {/* PIN Modal */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:top-0 md:right-0 md:bottom-0 md:left-72"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <motion.div
//           initial={{ scale: 0.9, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1 }}
//           transition={{ delay: 0.1 }}
//           className="w-full max-w-md mx-4 sm:mx-6 md:mx-8 lg:mx-12 relative"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
//             {/* Header */}
//             <div className="bg-gray-50 dark:bg-gray-700 p-8 text-center border-b border-gray-200 dark:border-gray-600">
//               <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mb-4">
//                 <Shield className="w-10 h-10 text-gray-600 dark:text-gray-300" />
//               </div>
//               <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
//                 Staff Login
//               </h2>
//               <p className="text-gray-600 dark:text-gray-300 text-sm">
//                 Enter your PIN code to access the system
//               </p>
//             </div>

//             {/* PIN Entry Form */}
//             <div className="p-8">
//               <form onSubmit={handleSubmit} className="space-y-6">
//                 <div className="space-y-3">
//                   <label
//                     htmlFor="pin"
//                     className="text-sm font-semibold text-gray-700 dark:text-gray-300 block text-center"
//                   >
//                     PIN Code
//                   </label>
//                   <div className="relative">
//                     <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
//                     <Input
//                       id="pin"
//                       type="password"
//                       value={pinCode}
//                       onChange={(e) =>
//                         setPinCode(e.target.value.replace(/\D/g, ""))
//                       }
//                       // placeholder="••••••"
//                       className="h-16 pl-12 text-center text-2xl tracking-widest font-bold border-2 border-gray-300 dark:border-gray-600 focus:border-gray-500 dark:focus:border-gray-400 focus:ring-gray-500 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                       maxLength={6}
//                       autoComplete="off"
//                       autoFocus
//                       disabled={isLoading}
//                     />
//                   </div>
//                   <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
//                     Enter 4-6 digit PIN code
//                   </p>
//                 </div>

//                 <Button
//                   type="submit"
//                   disabled={isLoading || !pinCode.trim()}
//                   className="w-full h-14 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {isLoading ? (
//                     <div className="flex items-center gap-2">
//                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                       <span>Verifying...</span>
//                     </div>
//                   ) : (
//                     <>
//                       <Lock className="w-5 h-5 mr-2" />
//                       <span>Unlock Dashboard</span>
//                     </>
//                   )}
//                 </Button>
//               </form>

//               <div className="mt-6 text-center">
//                 <p className="text-xs text-gray-500 dark:text-gray-400">
//                   Your session is secure and will automatically lock after 30
//                   seconds of inactivity
//                 </p>
//               </div>
//             </div>
//           </div>
//         </motion.div>
//       </motion.div>
//     </>
//   );
// };

// export default PINLockScreen;
