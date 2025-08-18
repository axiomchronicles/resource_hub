import { motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import { Suspense } from "react";
import { Navigation } from "./Navigation";
import ContentSkeleton from "./skeletons/ContentSkeleton";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Persistent navigation (never disappears) */}
      <Navigation />

      {/* Animate content area */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="pt-20"
      >
        {/* Suspense makes only the Outlet content show skeletons */}
        <Suspense fallback={<ContentSkeleton />}>
          <Outlet />
        </Suspense>
      </motion.main>
    </div>
  );
};
