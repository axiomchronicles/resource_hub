import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./context/AuthContext";
import { AuthGuard } from "./components/AuthGuard";

// KEEP Layout non-lazy so header/sidebar persist and don't flash
import { Layout } from "./components/Layout";

// Lightweight skeleton import
import PageSkeleton from "./components/PageSkeleton";
import TopProgressPro from "./components/TopProgress";

// Lazy-load only inner page components
const Home = lazy(() => import("./pages/Home"));
const Notes = lazy(() => import("./pages/Notes"));
const PPTs = lazy(() => import("./pages/PPTs"));
const PastPapers = lazy(() => import("./pages/PastPapers"));
const Tutorials = lazy(() => import("./pages/Tutorials"));
const Upload = lazy(() => import("./pages/Upload"));
const Classmates = lazy(() => import("./pages/Classmates"));
const MockTests = lazy(() => import("./pages/MockTests"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyLibrary = lazy(() => import("./pages/MyLibrary"));
const Community = lazy(() => import("./pages/Community"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Landing = lazy(() => import("./pages/Landing"));
const Aurora = lazy(() => import("./components/Aurora"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function SuspendedPage(Component: React.LazyExoticComponent<any>) {
  // small helper to avoid repeating Suspense on every route
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Component />
    </Suspense>
  );
}

function App() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TooltipProvider delayDuration={300}>
              <TopProgressPro height={3} rainbow showSpinner />
              <div className="min-h-screen bg-background">
                <Aurora />
                <Routes>
                  {/* Auth routes can stay lazy — they replace full content area */}
                  <Route
                    path="/landing"
                    element={
                        <Suspense fallback={<PageSkeleton />}>
                          <Landing />
                        </Suspense>
                    }
                  />
                  <Route
                    path="login"
                    element={
                      <AuthGuard isPublic>
                        <Suspense fallback={<PageSkeleton />}>
                          <Login />
                        </Suspense>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="register"
                    element={
                      <AuthGuard isPublic>
                        <Suspense fallback={<PageSkeleton />}>
                          <Register />
                        </Suspense>
                      </AuthGuard>
                    }
                  />

                  <Route path="/" element={<Layout />}>
                    <Route
                      index
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Home />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="dashboard"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Dashboard />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    {/* repeat pattern for other routes */}
                    <Route
                      path="notes"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Notes />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="ppts"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <PPTs />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="past-papers"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <PastPapers />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="tutorials"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Tutorials />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="upload"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Upload />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="classmates"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Classmates />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="mock-tests"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <MockTests />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="library"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <MyLibrary />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="community"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Community />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="notifications"
                      element={
                        <AuthGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <Notifications />
                          </Suspense>
                        </AuthGuard>
                      }
                    />

                    <Route
                      path="*"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <NotFound />
                        </Suspense>
                      }
                    />
                  </Route>
                </Routes>
              </div>

              <Toaster />
              <Sonner />
            </TooltipProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}

export default App;
