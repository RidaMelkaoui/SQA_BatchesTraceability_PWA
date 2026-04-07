"use client";

import React, { useState } from "react";
import CertificateDropzone from "@/components/CertificateDropzone";
import { useRouter } from "next/navigation";
import { CheckCircle2, Factory, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TrackClient({ initialBatches }: { initialBatches: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | "RECEIVED" | "VALIDATED">("ALL");

  const filteredBatches = initialBatches.filter(batch => {
    if (filter === "ALL") return true;
    return batch.status === filter;
  });

  const handleUploadComplete = () => {
    router.refresh();
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-semibold flex items-center gap-2">
            <Factory className="w-8 h-8 text-indigo-500" />
            Tracking & Validation
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Review incoming material and attach certificates.</p>
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-gray-200 dark:bg-gray-800 p-1.5 rounded-xl shadow-inner">
          {["ALL", "RECEIVED", "VALIDATED"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                filter === f ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100 scale-105" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Vertical stacked feed */}
      <div className="space-y-6">
        {filteredBatches.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 font-medium">No batches match the selected filter.</p>
          </div>
        ) : (
          filteredBatches.map(batch => (
            <div key={batch.id} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition flex flex-col md:flex-row gap-8">
              
              <div className="flex-1 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-extrabold text-2xl dark:text-white tracking-tight">{batch.reference}</span>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    batch.status === 'RECEIVED' 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                  }`}>
                    {batch.status === 'VALIDATED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {batch.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <span className="text-gray-400 block mb-1 text-xs uppercase tracking-wider font-bold">Operator</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{batch.operator?.username}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1 text-xs uppercase tracking-wider font-bold">Scanned On</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(batch.receivedAt).toLocaleString()}</span>
                  </div>
                </div>

                {batch.labelImagePath && (
                  /* eslint-disable @next/next/no-img-element */
                  <img src={batch.labelImagePath} alt="Label" className="w-full max-w-[280px] h-36 object-cover rounded-xl border-2 border-gray-100 dark:border-gray-700 shadow-sm" />
                )}
              </div>

              {/* Validation Zone */}
              <div className="w-full md:w-[350px] flex-shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-8 md:pt-0 md:pl-8">
                {batch.status === "RECEIVED" ? (
                  <CertificateDropzone batchId={batch.id} onUploadSuccess={handleUploadComplete} />
                ) : (
                  <a 
                    href={batch.certificatePath || "#"} 
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center p-8 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-2xl font-semibold border border-green-200 dark:border-green-800/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition group"
                  >
                    <CheckCircle2 className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-lg">View Certificate</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
