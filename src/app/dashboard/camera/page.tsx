"use client";

import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import { ArrowLeft } from "lucide-react";

export default function CameraPage() {
  const router = useRouter();

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => router.push('/dashboard')}
        className="mb-8 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <CameraCapture onUploadComplete={() => router.push("/dashboard/track")} />
    </main>
  );
}
