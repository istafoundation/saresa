"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Check } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  folder?: string;
}

export default function ImageUpload({ value, onChange, className, folder }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Get auth params from our API
      const authRes = await fetch("/api/imagekit");
      if (!authRes.ok) throw new Error("Failed to get upload auth");
      const authParams = await authRes.json();

      // Prepare form data for ImageKit
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("publicKey", process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "");
      formData.append("signature", authParams.signature);
      formData.append("expire", authParams.expire.toString());
      formData.append("token", authParams.token);
      formData.append("folder", folder || "/match-questions");

      // Upload to ImageKit
      const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.message || "Upload failed");
      }

      const result = await uploadRes.json();
      onChange(result.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleClear = () => {
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <img
            src={value + "?tr=w-100,h-100,fo-center"}
            alt="Uploaded"
            className="w-16 h-16 object-cover rounded-lg border border-slate-200"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-0 right-0 p-1 bg-green-500 text-white rounded-full">
            <Check className="w-3 h-3" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-400 mt-1">Upload</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
