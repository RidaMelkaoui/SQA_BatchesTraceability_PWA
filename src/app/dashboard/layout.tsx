"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [username, setUsername] = React.useState<string>("");

  React.useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUsername(JSON.parse(userStr).username);
    }
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <nav className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-sm flex items-center justify-center">
             <span className="text-white font-bold text-lg">Q</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hidden sm:block">
            SQA Traceability
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 py-1.5 px-3 rounded-full border border-gray-200 dark:border-gray-700">
            Welcome, <strong className="ml-1 text-blue-600 dark:text-blue-400">{username || "Operator"}</strong>
          </span>
          <ThemeToggle />
          <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition" aria-label="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
}
