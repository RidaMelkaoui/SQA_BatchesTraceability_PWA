/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { Camera, Upload, CheckCircle } from "lucide-react";

export default function CameraCapture({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview immediately for better UX
    setPreviewURL(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      // Compress image locally before sending to save bandwidth
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedBlob = await imageCompression(file, options);
      const compressedFile = new File([compressedBlob], file.name, { type: file.type });

      // Create FormData & upload via API
      const formData = new FormData();
      formData.append("labelImage", compressedFile);
      // Mocking reference and operator data for now
      formData.append("reference", "BATCH-" + Math.floor(Math.random() * 10000)); 
      formData.append("operatorId", "mock_operator_123"); 

      const response = await fetch("/api/batches/receive", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setPreviewURL(null);
        onUploadComplete();
      } else {
        console.error("Failed API call");
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Capture Label
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-4">
          Scan the part&apos;s physical etiquette clearly
        </p>
      </div>

      {!previewURL ? (
        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition duration-300 group">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-md group-hover:scale-110 transition-transform duration-300">
            <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="mt-4 font-semibold text-blue-700 dark:text-blue-300">Tap to Open Camera</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCapture}
            disabled={isUploading}
          />
        </label>
      ) : (
        <div className="relative w-full rounded-xl overflow-hidden shadow-md">
          <img src={previewURL} alt="Preview" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
            {isUploading ? (
              <>
                <Upload className="w-10 h-10 text-white animate-bounce mb-2" />
                <span className="text-white font-medium animate-pulse">Processing & Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-10 h-10 text-green-400 mb-2" />
                <span className="text-white font-medium">Success!</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
