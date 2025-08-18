import React from "react";
import "@/styles/skeleton.css"; // import the CSS above

export default function PageSkeleton() {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header / top */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 skeleton" />
          <div className="h-8 w-24 skeleton" />
        </div>

        {/* Main layout: sidebar + content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar compact: fewer elements */}
          <aside className="col-span-3 space-y-4">
            <div className="h-10 w-full skeleton" />
            <div className="h-10 w-5/6 skeleton" />
            <div className="h-10 w-4/6 skeleton" />
          </aside>

          {/* Main content */}
          <main className="col-span-9 space-y-4">
            <div className="h-6 w-1/3 skeleton" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 skeleton" />
              <div className="h-40 skeleton" />
            </div>
            <div className="h-4 w-full skeleton" />
            <div className="h-64 skeleton" />
          </main>
        </div>
      </div>
    </div>
  );
}
