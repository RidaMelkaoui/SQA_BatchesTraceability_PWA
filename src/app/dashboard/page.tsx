"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, ListTodo, UserPlus, X, CheckCircle2 } from "lucide-react";

export default function DashboardIndex() {
  const [role, setRole] = useState<string>("OPERATOR");
  const [showUserModal, setShowUserModal] = useState(false);
  
  // New user form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState("OPERATOR");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{text: string; type: 'error' | 'success'} | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setRole(JSON.parse(userStr).role);
    }
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email, role: userRole }),
      });

      if (res.ok) {
        setMessage({ text: "User created successfully!", type: "success" });
        setUsername("");
        setPassword("");
        setEmail("");
        setUserRole("OPERATOR");
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to create user", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold">Welcome to the QMS Workspace</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Select an action to proceed.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Card 1 */}
        <Link href="/dashboard/camera" className="group block h-full">
          <div className="h-full bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-50">Take Batch Photo</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed overflow-hidden">
              Capture or browse for a physical batch label image and initialize its digital tracking passport into the system.
            </p>
          </div>
        </Link>
        
        {/* Card 2 */}
        <Link href="/dashboard/track" className="group block h-full">
          <div className="h-full bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <ListTodo className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-50">Track & Validate</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed overflow-hidden">
              View the dynamic validation feed. Attach digital supplier PDF certificates to received batches to complete the QMS loop.
            </p>
          </div>
        </Link>

        {/* Card 3 - Admin Only */}
        {role === "ADMIN" && (
          <div onClick={() => setShowUserModal(true)} className="group block h-full cursor-pointer">
            <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-blue-400 transition-all duration-300">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <UserPlus className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-50">User Management</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                Add new local accounts to the P2P synchronization network. Only visible to QMS Supervisors.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => { setShowUserModal(false); setMessage(null); }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-600" /> 
              Add New User
            </h3>
            
            {message && (
              <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">Username</label>
                <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">Email Address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">Initial Password</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 ml-1">System Role</label>
                <select value={userRole} onChange={e => setUserRole(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition">
                  <option value="OPERATOR">Standard Operator</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <button disabled={loading} type="submit" className="w-full mt-4 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold tracking-wide active:scale-[0.98] transition">
                {loading ? "Creating..." : "Save Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
