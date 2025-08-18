import React from "react";

export default function ContentSkeleton() {
  return (
    <div
      className="p-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div className="space-y-4 animate-pulse">
        {/* Title bar */}
        <div className="h-7 w-1/3 rounded-md bg-gray-200" />

        {/* Cards grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-40 rounded-xl bg-gray-200" />
          <div className="h-40 rounded-xl bg-gray-200" />
          <div className="h-40 rounded-xl bg-gray-200" />
        </div>

        {/* Paragraph lines */}
        <div className="h-4 w-full rounded-md bg-gray-200" />
        <div className="h-4 w-5/6 rounded-md bg-gray-200" />
        <div className="h-4 w-3/4 rounded-md bg-gray-200" />
      </div>
    </div>
  );
}
