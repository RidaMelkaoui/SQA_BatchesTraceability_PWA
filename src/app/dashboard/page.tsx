import Link from "next/link";
import { Camera, ListTodo } from "lucide-react";

export default function DashboardIndex() {
  return (
    <main className="max-w-5xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold">Welcome to the QMS Workspace</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Select an action to proceed.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/dashboard/camera" className="group block h-full">
          <div className="h-full bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Take New Batch Photo</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Open the native camera module to scan a physical batch label and initialize its digital tracking passport.
            </p>
          </div>
        </Link>
        <Link href="/dashboard/track" className="group block h-full">
          <div className="h-full bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <ListTodo className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Track Batch Status</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              View the vertical validation feed. Attach digital supplier certificates to scanned batches to complete the QMS loop.
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}
