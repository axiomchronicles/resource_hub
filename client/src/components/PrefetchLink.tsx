import React, { useCallback } from "react";
import { Link, LinkProps } from "react-router-dom";

/**
 * Map routes to module paths (adjust to match your pages folder structure).
 * import.meta.glob returns functions that dynamically import the module.
 */
const PAGE_MODULES = import.meta.glob("../pages/**/+(*.tsx|*.ts)");

/**
 * Try to find the module key that matches a route.
 * This is heuristic: match by filename.
 * If your file names differ, update mapping accordingly.
 */
function getModuleForPath(path: string) {
  // a few heuristics:
  const routeToFilename = {
    "/": "../pages/Home.tsx",
    "/dashboard": "../pages/Dashboard.tsx",
    "/notes": "../pages/Notes.tsx",
    "/ppts": "../pages/PPTs.tsx",
    "/past-papers": "../pages/PastPapers.tsx",
    "/tutorials": "../pages/Tutorials.tsx",
    "/upload": "../pages/Upload.tsx",
    "/classmates": "../pages/Classmates.tsx",
    "/mock-tests": "../pages/MockTests.tsx",
    "/library": "../pages/MyLibrary.tsx",
    "/community": "../pages/Community.tsx",
    "/notifications": "../pages/Notifications.tsx",
    "/login": "../pages/Auth/Login.tsx",
    "/register": "../pages/Auth/Register.tsx",
  } as Record<string, string>;

  return routeToFilename[path] || null;
}

export function PrefetchLink({ to, onMouseEnter, onFocus, ...rest }: LinkProps) {
  const prefetch = useCallback(() => {
    const key = getModuleForPath(String(to));
    if (!key) return;
    const loader = (PAGE_MODULES as Record<string, () => Promise<any>>)[key];
    if (typeof loader === "function") {
      loader();
    }
  }, [to]);

  return (
    <Link
      to={to}
      onMouseEnter={(e) => {
        prefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        onFocus?.(e);
      }}
      {...rest}
    />
  );
}
