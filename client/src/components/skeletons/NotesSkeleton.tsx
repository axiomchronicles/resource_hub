import React from "react";

export default function NotesSkeleton() {
  return (
    <div className="p-6" role="status" aria-busy>
      <div className="space-y-4">
        <div className="h-8 w-1/3 rounded-md bg-gray-200 relative overflow-hidden"><div className="absolute inset-0 shimmer" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-gray-200 relative overflow-hidden"><div className="absolute inset-0 shimmer" /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
