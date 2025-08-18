import React from "react";

export default function DashboardSkeleton() {
  return (
    <div className="p-6" role="status" aria-busy>
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="h-8 w-1/3 rounded-md bg-gray-200 relative overflow-hidden"><div className="absolute inset-0 shimmer" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-36 rounded-lg bg-gray-200 relative overflow-hidden"><div className="absolute inset-0 shimmer" /></div>
            <div className="h-36 rounded-lg bg-gray-200 relative overflow-hidden"><div className="absolute inset-0 shimmer" /></div>
          </div>
        </div>
        <aside className="w-80 space-y-4 hidden lg:block">
          <div className="h-10 rounded-md bg-gray-200 relative overflow-hidden"><div className="absolute inset-0 shimmer" /></div>
          <div className="h-48 rounded-lg bg-gray-200 relative overflow-hidden"><div className="absolute inset-0 shimmer" /></div>
        </aside>
      </div>
    </div>
  );
}
