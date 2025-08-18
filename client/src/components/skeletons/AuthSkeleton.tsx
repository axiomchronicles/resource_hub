import React from "react";

export default function AuthSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 rounded-lg shadow-sm bg-white animate-pulse">
        <div className="h-8 w-1/3 rounded-md bg-gray-200" />
        <div className="h-10 rounded-md bg-gray-200" />
        <div className="h-10 rounded-md bg-gray-200" />
        <div className="h-10 rounded-md bg-gray-200" />
        <div className="h-10 rounded-md bg-gray-200" />
      </div>
    </div>
  );
}
