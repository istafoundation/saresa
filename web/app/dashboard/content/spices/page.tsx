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
  Eye,
  Maximize2,
  MoreVertical
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
  const [previewSpice, setPreviewSpice] = useState<Spice | null>(null);
  
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
    // Scroll to top or show modal? For now, we reuse the add/edit form or card view editing.
    // Let's toggle the add view for editing to keep it clean, or inline edit.
    // The previous design had inline table edit. 
    // New design: Let's use the main form area for editing if active.
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    if (url.includes("imagekit.io")) {
      return url; 
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
      const blob = await response.blob();
      
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
        setUploadStatus({ success: 0, failed: errors.length, errors: errors.slice(0, 10) });
      } else {
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/content"
            className="p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-orange-100 p-2 rounded-lg">
                <ChefHat className="w-6 h-6 text-orange-600" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Spices Library</h1>
            </div>
            <p className="text-slate-500 text-sm">Manage ingredients for Let'em Cook</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
           {/* Quick Stats */}
          {stats && (
            <div className="flex items-center gap-3 mr-4 pr-4 border-r border-slate-200">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</div>
                <div className="font-bold text-slate-900">{stats.total}</div>
              </div>
              <div className="text-right">
                 <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</div>
                 <div className="font-bold text-green-600">{stats.enabled}</div>
              </div>
            </div>
          )}

          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
             <button
              onClick={handleDownloadGuide}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all tooltip"
              title="Download CSV Guide"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadCSV}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all tooltip"
              title="Export CSV"
              disabled={!spices || spices.length === 0}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-all flex items-center gap-2"
              disabled={isSubmitting}
              title="Import CSV"
            >
               {isSubmitting ? (
                 <div className="w-4 h-4 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin"></div>
               ) : (
                 <Upload className="w-4 h-4" />
               )}
            </button>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: "", imageUrl: "", hindiName: "", description: "", isEnabled: true });
              setIsAdding(!isAdding);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-all shadow-sm
              ${isAdding ? 'bg-slate-800 hover:bg-slate-900' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Close' : 'Add Spice'}
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

      {/* Upload Status Banner */}
      {uploadStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 ${
          uploadStatus.failed > 0 
            ? 'bg-red-50 border-red-100 text-red-900' 
            : 'bg-green-50 border-green-100 text-green-900'
        }`}>
          {uploadStatus.failed > 0 ? (
            <div className="p-1 bg-red-100 rounded-full"><AlertCircle className="w-5 h-5 text-red-600" /></div>
          ) : (
            <div className="p-1 bg-green-100 rounded-full"><Save className="w-5 h-5 text-green-600" /></div>
          )}
          
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold">
              {uploadStatus.failed > 0 ? 'Upload Completed with Errors' : 'Upload Successful'}
            </h3>
            <p className="text-sm opacity-90">
              Processed {uploadStatus.success + uploadStatus.failed} items. {uploadStatus.success} imported successfully.
            </p>
            {uploadStatus.errors.length > 0 && (
              <div className="mt-2 bg-white/50 p-3 rounded-lg text-sm border border-black/5">
                <p className="font-semibold mb-1 text-xs uppercase tracking-wider opacity-70">Error Log</p>
                <ul className="list-disc pl-4 space-y-1 max-h-32 overflow-y-auto">
                  {uploadStatus.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button 
            onClick={() => setUploadStatus(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add/Edit Form Panel */}
      {isAdding && (
        <div className="bg-white border rounded-2xl p-6 shadow-lg animate-in fade-in zoom-in-95 ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Spice' : 'Add New Spice'}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Turmeric"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                />
              </div>
              
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hindi Name</label>
                <input
                  type="text"
                  placeholder="e.g. Haldi"
                  value={formData.hindiName}
                  onChange={(e) => setFormData({ ...formData, hindiName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                />
              </div>

               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none resize-none h-24"
                />
              </div>
            </div>

            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              {/* Image Preview */}
              <div className="aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative group">
                {formData.imageUrl ? (
                  <>
                     <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                     <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <p className="text-white text-xs font-medium truncate">{formData.imageUrl}</p>
                     </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Enter URL to preview</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                 <button
                    onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all border
                      ${formData.isEnabled 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    {formData.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    {formData.isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
             <button
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setFormData({ name: "", imageUrl: "", hindiName: "", description: "", isEnabled: true });
              }}
              className="px-6 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={editingId ? () => handleUpdate(editingId) : handleAdd}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-all shadow-md shadow-orange-200 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update Spice' : 'Save Spice'}
            </button>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      {!spices ? (
         <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Loading spices...</p>
         </div>
      ) : spices.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-3xl">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ChefHat className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No spices found</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">
            Get started by adding individual spices or importing a CSV list.
          </p>
          <button
             onClick={() => setIsAdding(true)}
             className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-all shadow-md shadow-orange-200"
          >
             Add First Spice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {spices.map((spice) => (
            <div 
              key={spice._id} 
              className={`group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-orange-200 transition-all duration-300 flex flex-col relative
                 ${!spice.isEnabled ? 'opacity-60 grayscale-[0.5]' : ''}`}
            >
              {/* Image Area */}
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                {spice.imageUrl ? (
                   <img 
                      src={spice.imageUrl} 
                      alt={spice.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                   />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-300">
                     <ImageIcon className="w-10 h-10" />
                   </div>
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                   <button 
                      onClick={() => setPreviewSpice(spice)}
                      className="p-2 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75"
                      title="Preview"
                   >
                     <Eye className="w-4 h-4" />
                   </button>
                   <button 
                      onClick={() => startEdit(spice)}
                      className="p-2 bg-white/90 hover:bg-white text-blue-600 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100"
                      title="Edit"
                   >
                     <Edit className="w-4 h-4" />
                   </button>
                   <button 
                      onClick={() => handleDelete(spice._id)}
                      className="p-2 bg-white/90 hover:bg-white text-red-600 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-150"
                      title="Delete"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3 pointer-events-none">
                   <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-white ${spice.isEnabled ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                   <h3 className="font-bold text-slate-900 truncate" title={spice.name}>{spice.name}</h3>
                </div>
                {spice.hindiName && (
                   <p className="text-sm text-orange-600 font-medium mb-2">{spice.hindiName}</p>
                )}
                {spice.description && (
                   <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3 flex-1">{spice.description}</p>
                )}
                
                <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                   <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                     {new Date(spice.createdAt).toLocaleDateString()}
                   </span>
                   <button
                    onClick={() => handleToggle(spice._id)}
                    className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors 
                      ${spice.isEnabled 
                        ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                   >
                     {spice.isEnabled ? 'ACTIVE' : 'DISABLED'}
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewSpice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div 
            className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
           >
              <button 
                onClick={() => setPreviewSpice(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative aspect-[4/3] bg-slate-100">
                 <img src={previewSpice.imageUrl} alt={previewSpice.name} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                 <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h2 className="text-3xl font-bold mb-1">{previewSpice.name}</h2>
                    {previewSpice.hindiName && <p className="text-xl opacity-90 font-medium text-orange-200">{previewSpice.hindiName}</p>}
                 </div>
              </div>

              <div className="p-6">
                 {previewSpice.description ? (
                    <p className="text-slate-600 leading-relaxed text-lg">{previewSpice.description}</p>
                 ) : (
                    <p className="text-slate-400 italic">No description available.</p>
                 )}
                 
                 <div className="mt-6 flex items-center gap-4 pt-6 border-t border-slate-100">
                    <button
                       onClick={() => {
                         startEdit(previewSpice);
                         setPreviewSpice(null);
                       }}
                       className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
                    >
                      Edit Spice
                    </button>
                    <button
                       onClick={() => setPreviewSpice(null)}
                       className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    >
                      Close
                    </button>
                 </div>
              </div>
           </div>
           
           {/* Backdrop click to close */}
           <div className="absolute inset-0 -z-10" onClick={() => setPreviewSpice(null)}></div>
        </div>
      )}
    </div>
  );
}
