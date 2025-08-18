import React from "react";

export default function PageSkeleton() {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 rounded-lg bg-gray-200" />
          <div className="h-8 w-24 rounded-lg bg-gray-200" />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-3 space-y-4">
            <div className="h-10 rounded-md bg-gray-200" />
            <div className="h-10 rounded-md bg-gray-200" />
            <div className="h-10 rounded-md bg-gray-200" />
            <div className="h-10 rounded-md bg-gray-200" />
          </aside>

          <main className="col-span-9 space-y-4">
            <div className="h-6 w-1/3 rounded-md bg-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 rounded-lg bg-gray-200" />
              <div className="h-40 rounded-lg bg-gray-200" />
            </div>

            <div className="h-4 w-full rounded-md bg-gray-200" />
            <div className="h-4 w-5/6 rounded-md bg-gray-200" />
            <div className="h-64 rounded-lg bg-gray-200" />
          </main>
        </div>
      </div>
    </div>
  );
}
