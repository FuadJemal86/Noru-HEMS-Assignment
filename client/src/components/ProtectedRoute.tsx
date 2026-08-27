// import { AuthContext } from "@/Context/AuthContext";
// import { useContext } from "react";
// import { Navigate, useLocation } from "react-router-dom";

// // Route protection is now enabled
// const BYPASS_ROUTE_PROTECTION = false;

// interface ProtectedRouteProps {
//   children: React.ReactNode;
//   allowedRoles?: ("owner" | "store")[];
//   requireOwner?: boolean;
//   requireStore?: boolean;
// }

// const ProtectedRoute = ({
//   children,
//   allowedRoles,
//   requireOwner = false,
//   requireStore = false,
// }: ProtectedRouteProps) => {
//   const { company, isAuthenticated, loading } = useContext(AuthContext)!;
//   const location = useLocation();

//   // Bypass route protection only if explicitly enabled (for development)
//   if (BYPASS_ROUTE_PROTECTION) {
//     return <>{children}</>;
//   }

//   // Show loading state while checking authentication
//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
//           <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Redirect to login if not authenticated
//   if (!isAuthenticated || !company) {
//     return <Navigate to="/login" state={{ from: location }} replace />;
//   }

//   const userRole = company.role;

//   // Check if route requires specific role
//   if (requireOwner && userRole !== "owner") {
//     // Store users trying to access admin pages -> redirect to regular dashboard
//     return <Navigate to="/" replace />;
//   }

//   if (requireStore && userRole === "owner") {
//     // Owners trying to access store pages -> redirect to admin dashboard
//     return <Navigate to="/admin/dashboard" replace />;
//   }

//   // Check allowed roles if specified
//   if (allowedRoles && !allowedRoles.includes(userRole)) {
//     // Redirect based on user role
//     if (userRole === "owner") {
//       return <Navigate to="/admin/dashboard" replace />;
//     } else {
//       return <Navigate to="/" replace />;
//     }
//   }

//   // User has access to this route
//   return <>{children}</>;
// };

// export default ProtectedRoute;
