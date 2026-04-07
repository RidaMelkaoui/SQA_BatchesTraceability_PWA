"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp, File, CheckCircle } from "lucide-react";

export default function CertificateDropzone({ batchId, onUploadSuccess }: { batchId: string, onUploadSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("certificate", file);
    formData.append("batchId", batchId);

    try {
      const response = await fetch("/api/batches/validate", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Failed to upload certificate", error);
    } finally {
      setIsUploading(false);
    }
  }, [batchId, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpeg", ".png", ".jpg"]
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px] text-center cursor-pointer transition-all duration-300 ${
        isDragActive 
          ? "border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02]" 
          : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800/50"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
        ) : isDragActive ? (
          <FileUp className="w-12 h-12 text-green-500 animate-bounce" />
        ) : (
          <File className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        )}
        
        {isDragActive ? (
          <p className="text-green-600 dark:text-green-400 font-semibold text-lg">Drop the certificate here...</p>
        ) : (
          <div className="space-y-1">
            <p className="text-gray-700 dark:text-gray-300 font-medium">Drag & drop certificate PDF here</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse local files</p>
          </div>
        )}
      </div>
    </div>
  );
}
