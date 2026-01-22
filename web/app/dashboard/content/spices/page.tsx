"use client";

import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import {
  ChefHat,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Download,
} from "lucide-react";
import ImageKit from "imagekit-javascript";

interface Spice {
  _id: string;
  name: string;
  imageUrl: string;
  hindiName?: string;
  description?: string;
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// Initialize ImageKit for client-side uploads
const imagekit = new ImageKit({
  publicKey: "public_S+qCGuJevV08lqWzX9O5Vfbq+OU=", 
  urlEndpoint: "https://ik.imagekit.io/rx4099", 
  authenticationEndpoint: "/api/imagekit",
} as any);

export default function SpicesManagementPage() {
  const spices = useQuery(api.spices.getAllSpices) as Spice[] | undefined;
  const stats = useQuery(api.spices.getSpiceStats);
  
  const addSpice = useMutation(api.spices.addSpice);
  const updateSpice = useMutation(api.spices.updateSpice);
  const deleteSpice = useMutation(api.spices.deleteSpice);
  const toggleSpice = useMutation(api.spices.toggleSpice);
  const bulkReplaceSpices = useMutation(api.spices.bulkReplaceSpices);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    hindiName: "",
    description: "",
    isEnabled: true,
  });
  
  // CSV Import State
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!formData.name || !formData.imageUrl) return;
    
    try {
      await addSpice({
        name: formData.name,
        imageUrl: formData.imageUrl,
        hindiName: formData.hindiName || undefined,
        description: formData.description || undefined,
        isEnabled: formData.isEnabled,
      });
      setFormData({ name: "", imageUrl: "", hindiName: "", description: "", isEnabled: true });
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add spice:", error);
      alert("Failed to add spice: " + (error as Error).message);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateSpice({
        id: id as any,
        name: formData.name,
        imageUrl: formData.imageUrl,
        hindiName: formData.hindiName || undefined,
        description: formData.description || undefined,
        isEnabled: formData.isEnabled,
      });
      setEditingId(null);
      setFormData({ name: "", imageUrl: "", hindiName: "", description: "", isEnabled: true });
    } catch (error) {
      console.error("Failed to update spice:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this spice?")) return;
    
    try {
      await deleteSpice({ id: id as any });
    } catch (error) {
      console.error("Failed to delete spice:", error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleSpice({ id: id as any });
    } catch (error) {
      console.error("Failed to toggle spice:", error);
    }
  };

  const startEdit = (spice: Spice) => {
    setEditingId(spice._id);
    setFormData({
      name: spice.name,
      imageUrl: spice.imageUrl,
      hindiName: spice.hindiName || "",
      description: spice.description || "",
      isEnabled: spice.isEnabled,
    });
  };

  // CSV Helpers
  const escapeCSV = (value: string | undefined | null) => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Helper to process image URLs in CSV
  const extractImagesAndUpload = async (url: string, rowNum: number): Promise<string> => {
    if (!url) throw new Error(`Row ${rowNum}: Image URL missing`);
    
    // 1. Check if already ImageKit
    if (url.includes("imagekit.io")) {
      return url; 
    }

    // 2. Upload from external source
    try {
      // Fetch the image
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
      const blob = await response.blob();
      
      // Upload to ImageKit
      const file = new File([blob], "spice-upload.jpg", { type: blob.type });
      
      const authRes = await fetch("/api/imagekit");
      if (!authRes.ok) throw new Error("Failed to get upload auth");
      const authParams = await authRes.json();

      const result = await imagekit.upload({
        file: file,
        fileName: `spice_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        useUniqueFileName: true,
        tags: ["spice-csv-import"],
        folder: "/spices",
        token: authParams.token,
        signature: authParams.signature,
        expire: authParams.expire
      });
      
      return result.url;
    } catch (err) {
      console.error("Image processing error:", err);
      throw new Error(`Row ${rowNum}: Failed to process image ${url}. Error: ${(err as Error).message}`);
    }
  };

  const handleDownloadGuide = () => {
    const guide = `===========================================
SPICE LIST CSV FORMAT
===========================================

REQUIRED HEADERS:
Name,Image,Hindi Name,Description

COLUMN EXPLANATIONS:
1. Name (Required): The display name of the spice (e.g., "Turmeric")
2. Image (Required): URL of the spice image. 
   - Can be an direct link (jpg/png)
   - Will be automatically uploaded to ImageKit if not already there
3. Hindi Name (Optional): The Hindi name (e.g., "Haldi")
4. Description (Optional): Brief description

EXAMPLE:
Turmeric,https://example.com/turmeric.jpg,Haldi,Yellow powder
Cumin,https://example.com/jeera.jpg,Jeera,Small brown seeds
`;
    
    const blob = new Blob([guide], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spice-csv-guide.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (!spices) return;

    const headers = ['Name', 'Image', 'Hindi Name', 'Description'];
    const rows = spices.map(s => [
      escapeCSV(s.name),
      escapeCSV(s.imageUrl),
      escapeCSV(s.hindiName),
      escapeCSV(s.description)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spices_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("WARNING: Uploading a CSV will REPLACE ALL existing spices with the new list. Continue?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadStatus(null);
    setIsSubmitting(true);

    try {
      const text = await file.text();
      // Parse CSV
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
          if (char === '"' && nextChar === '"') {
            currentCell += '"';
            i++; 
          } else if (char === '"') {
            inQuotes = false;
          } else {
            currentCell += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            currentRow.push(currentCell);
            currentCell = '';
          } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
            currentRow.push(currentCell);
            if (currentRow.some(c => c.trim())) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            if (char === '\r') i++;
          } else if (char !== '\r') {
            currentCell += char;
          }
        }
      }
      currentRow.push(currentCell);
      if (currentRow.some(c => c.trim())) rows.push(currentRow);

      if (rows.length < 2) {
        throw new Error("CSV file is empty or missing headers");
      }

      // Validate Headers
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const expectedHeaders = ['name', 'image', 'hindi name', 'description'];
      
      const idx = expectedHeaders.reduce((acc, h) => {
        const foundIndex = headers.indexOf(h);
        if (foundIndex !== -1) acc[h] = foundIndex;
        return acc;
      }, {} as Record<string, number>);

      if (idx['name'] === undefined || idx['image'] === undefined) {
        throw new Error("Missing required headers: Name, Image");
      }

      const dataRows = rows.slice(1);
      const parsedSpices: any[] = [];
      const errors: string[] = [];

      let rowIndex = 0;
      for (const row of dataRows) {
        rowIndex++;
        const rowNum = rowIndex + 2;

        const getVal = (header: string) => {
            const i = idx[header];
            if (i === undefined || i >= row.length) return '';
            return row[i]?.trim();
        };

        const name = getVal('name');
        const rawUrl = getVal('image');
        const hindiName = getVal('hindi name');
        const description = getVal('description');

        if (!name) {
          errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }
        if (!rawUrl) {
          errors.push(`Row ${rowNum}: Image URL is required`);
          continue;
        }

        try {
          const finalUrl = await extractImagesAndUpload(rawUrl, rowNum);
          
          parsedSpices.push({
            name,
            imageUrl: finalUrl,
            hindiName,
            description,
          });
        } catch (e) {
          errors.push((e as Error).message);
        }
      }

      if (errors.length > 0) {
        // Find how many succeeded?
        // Wait, if we are doing BULK REPLACE, if ANY fail, should we abort?
        // Let's adopt a "best effort" or "all or nothing" approach?
        // Current Level implementation processes valid ones and reports errors.
        // But for "Replace All", partial replacement is scary.
        // However, Level implementation replaces with parsedQuestions.
        
        // Let's block if there are errors to be safe?
        // Level games allowed partial success?
        // "if (errors.length > 0) setUploadStatus(...) else bulkReplaceQuestions"
        // Level code: if (errors.length > 0) { setUploadStatus... } else { bulkReplace... }
        // So it is ALL OR NOTHING. Perfect.
        
        setUploadStatus({ success: 0, failed: errors.length, errors: errors.slice(0, 10) });
      } else {
        // Execute Replace
        const result = await bulkReplaceSpices({ spices: parsedSpices });
        setUploadStatus({ success: result.imported, failed: 0, errors: [] });
      }

    } catch (err) {
      console.error(err);
      setUploadStatus({ success: 0, failed: 1, errors: [(err as Error).message] });
    }
    
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/content"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <ChefHat className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Let'em Cook - Spices</h1>
              <p className="text-gray-500">Manage spice matching game content</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownloadGuide}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Guide
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={!spices || spices.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <Upload className="w-4 h-4" />
            {isSubmitting ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Spice
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadCSV}
        accept=".csv"
        className="hidden"
      />

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          uploadStatus.failed > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">
              Upload Complete: {uploadStatus.success} imported, {uploadStatus.failed} failed
            </p>
            {uploadStatus.errors.length > 0 && (
              <ul className="text-sm list-disc pl-4 space-y-1">
                {uploadStatus.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            <button 
              onClick={() => setUploadStatus(null)}
              className="text-sm underline mt-2 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Spices</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-3xl font-bold text-green-600">{stats.enabled}</div>
            <div className="text-sm text-gray-500">Enabled</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-3xl font-bold text-gray-400">{stats.disabled}</div>
            <div className="text-sm text-gray-500">Disabled</div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-4">Add New Spice</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Spice Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Image URL *"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Hindi Name (optional)"
              value={formData.hindiName}
              onChange={(e) => setFormData({ ...formData, hindiName: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
              />
              Enabled
            </label>
            <div className="flex-1" />
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Spices List */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Image</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Hindi</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {spices?.map((spice) => (
              <tr key={spice._id} className={!spice.isEnabled ? "bg-gray-50 opacity-60" : ""}>
                <td className="px-4 py-3">
                  {editingId === spice._id ? (
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      {spice.imageUrl ? (
                        <img src={spice.imageUrl} alt={spice.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === spice._id ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  ) : (
                    <span className="font-medium">{spice.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === spice._id ? (
                    <input
                      type="text"
                      value={formData.hindiName}
                      onChange={(e) => setFormData({ ...formData, hindiName: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  ) : (
                    <span className="text-gray-500">{spice.hindiName || "-"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(spice._id)}
                    className="flex items-center gap-2"
                  >
                    {spice.isEnabled ? (
                      <>
                        <ToggleRight className="w-6 h-6 text-green-600" />
                        <span className="text-sm text-green-600">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-400">Disabled</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === spice._id ? (
                      <>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdate(spice._id)}
                          className="p-2 hover:bg-green-100 text-green-600 rounded-lg"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(spice)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(spice._id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {spices?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  <ChefHat className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No spices yet. Add your first spice above!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
