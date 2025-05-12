"use client";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-lg shadow-2xl">
        <LoadingSpinner size={48} />
        <p className="text-lg font-medium text-primary">正在加载您的页面...</p>
      </div>
    </div>
  );
}
