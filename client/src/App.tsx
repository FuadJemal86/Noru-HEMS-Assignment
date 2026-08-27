import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { indexRoutes } from "./routes/indexRoutes";


function App() {
  return (
    <>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <Routes>
          {/* <Route path="/login" element={<Login />} />
          <Route path="/newlogin" element={<Newlogin />} /> */}
          <Route
            element={
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                storageKey="theme"
                disableTransitionOnChange={false}
              >
                <Outlet />
              </ThemeProvider>
            }
          >
            {indexRoutes}
          </Route>

          {/* 404 Route */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </Suspense>
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}

export default App;
