import React from "react";

export default function HomeSkeleton() {
  return (
    <div className="p-6" role="status" aria-busy>
      <div className="space-y-6">
        <div className="h-8 w-1/3 rounded-md bg-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-gray-200 relative overflow-hidden">
              <div className="absolute inset-0 shimmer" />
            </div>
          ))}
        </div>

        <div className="h-4 w-3/4 rounded-md bg-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>
      </div>
    </div>
  );
}
