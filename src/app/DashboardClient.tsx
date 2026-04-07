/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import CertificateDropzone from "@/components/CertificateDropzone";
import { useRouter } from "next/navigation";
import { CheckCircle2, Factory, Clock } from "lucide-react";

export default function DashboardClient({ initialBatches }: { initialBatches: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"operator" | "dashboard">("operator");

  const handleUploadComplete = () => {
    router.refresh(); // Refresh the server component to get latest data
    setActiveTab("dashboard");
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl w-full max-w-sm mx-auto">
        <button
          onClick={() => setActiveTab("operator")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "operator"
              ? "bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          Operator View
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "dashboard"
              ? "bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          Validation Dashboard
        </button>
      </div>

      {/* Main Content Areas */}
      {activeTab === "operator" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CameraCapture onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-semibold flex items-center gap-2">
                <Factory className="w-8 h-8 text-blue-500" />
                Active Batches
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Review incoming material and attach certificates.</p>
            </div>
          </header>

          {initialBatches.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 pb-2">No batches have been scanned yet.</p>
              <button 
                onClick={() => setActiveTab("operator")}
                className="text-blue-600 hover:underline font-medium"
              >
                Scan your first batch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {initialBatches.map((batch) => (
                <div 
                  key={batch.id} 
                  className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-lg dark:text-white">{batch.reference}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${
                      batch.status === 'RECEIVED' 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                    }`}>
                      {batch.status === 'VALIDATED' && <CheckCircle2 className="w-3 h-3" />}
                      {batch.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                    <p className="flex items-center gap-2">
                       <span className="font-medium text-gray-900 dark:text-gray-200">Operator:</span> 
                       {batch.operator ? batch.operator.username : "Unknown"}
                    </p>
                    <p className="flex items-center gap-2">
                       <Clock className="w-4 h-4 text-gray-400" />
                       {new Date(batch.receivedAt).toLocaleString()}
                    </p>
                  </div>

                  {batch.labelImagePath && (
                    <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 relative group">
                       <img 
                         src={batch.labelImagePath} 
                         alt="Batch Label" 
                         className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                       />
                       <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                         <span className="text-white text-xs font-medium">Scanned Label Placeholder (if valid image path)</span>
                       </div>
                    </div>
                  )}

                  {batch.status === "RECEIVED" ? (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <p className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-200">Supplier Validation Needed</p>
                      <CertificateDropzone batchId={batch.id} onUploadSuccess={handleUploadComplete} />
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                       <a 
                         href={batch.certificatePath || "#"} 
                         target="_blank"
                         rel="noreferrer"
                         className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                       >
                         View Certificate PDF
                       </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
