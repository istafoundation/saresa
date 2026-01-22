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
  Search,
  Settings,
} from "lucide-react";
import ImageKit from "imagekit-javascript";
import ImageUpload from "@/app/components/ImageUpload";

interface Spice {
  _id: string;
  name: string;
  imageUrl: string;
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
  const settings = useQuery(api.spices.getLetEmCookSettingsAdmin);
  
  const addSpice = useMutation(api.spices.addSpice);
  const updateSpice = useMutation(api.spices.updateSpice);
  const deleteSpice = useMutation(api.spices.deleteSpice);
  const toggleSpice = useMutation(api.spices.toggleSpice);
  const bulkReplaceSpices = useMutation(api.spices.bulkReplaceSpices);
  const updateSettings = useMutation(api.spices.updateLetEmCookSettings);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  
  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    description: "",
    isEnabled: true,
  });
  
  // Settings state
  const [questionsPerGame, setQuestionsPerGame] = useState<number>(settings?.questionsPerGame ?? 1);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // CSV Import State
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update questionsPerGame when settings load
  React.useEffect(() => {
    if (settings?.questionsPerGame) {
      setQuestionsPerGame(settings.questionsPerGame);
    }
  }, [settings?.questionsPerGame]);

  // Filter spices
  const filteredSpices = spices?.filter((spice) => {
    const matchesSearch = 
      spice.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "enabled" && spice.isEnabled) ||
      (statusFilter === "disabled" && !spice.isEnabled);
    return matchesSearch && matchesStatus;
  });

  const handleAdd = async () => {
    if (!formData.name || !formData.imageUrl) return;
    
    setIsSubmitting(true);
    try {
      await addSpice({
        name: formData.name,
        imageUrl: formData.imageUrl,
        description: formData.description || undefined,
        isEnabled: formData.isEnabled,
      });
      resetForm();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to add spice:", error);
      alert("Failed to add spice: " + (error as Error).message);
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    
    setIsSubmitting(true);
    try {
      await updateSpice({
        id: editingId as any,
        name: formData.name,
        imageUrl: formData.imageUrl,
        description: formData.description || undefined,
        isEnabled: formData.isEnabled,
      });
      resetForm();
    } catch (error) {
      console.error("Failed to update spice:", error);
    }
    setIsSubmitting(false);
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
      description: spice.description || "",
      isEnabled: spice.isEnabled,
    });
    setIsAddModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", imageUrl: "", description: "", isEnabled: true });
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSettings({ questionsPerGame });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
    setIsSavingSettings(false);
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
Name,Image,Description

COLUMN EXPLANATIONS:
1. Name (Required): The display name of the spice (e.g., "Turmeric")
2. Image (Required): URL of the spice image. 
   - Can be an direct link (jpg/png)
   - Will be automatically uploaded to ImageKit if not already there
3. Description (Optional): Brief description

EXAMPLE:
Turmeric,https://example.com/turmeric.jpg,Yellow powder
Cumin,https://example.com/jeera.jpg,Small brown seeds
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

    const headers = ['Name', 'Image', 'Description'];
    const rows = spices.map(s => [
      escapeCSV(s.name),
      escapeCSV(s.imageUrl),
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
      const expectedHeaders = ['name', 'image', 'description'];
      
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

  const enabledCount = stats?.enabled ?? 0;
  const disabledCount = stats?.disabled ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/content"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChefHat className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Let'em Cook - Spices</h1>
              <p className="text-slate-600">
                {enabledCount} enabled · {disabledCount} disabled
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleDownloadGuide}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          title="Download CSV Guide"
        >
          <FileText className="w-4 h-4" />
          Guide
        </button>
        <button
          onClick={handleDownloadCSV}
          disabled={!spices || spices.length === 0}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Download CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUploadCSV}
          accept=".csv"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Upload CSV"
        >
          <Upload className="w-4 h-4" />
          {isSubmitting ? 'Uploading...' : 'Import'}
        </button>
        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Spice
        </button>
      </div>

      {/* Game Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="font-medium text-slate-900">Game Settings</h3>
              <p className="text-sm text-slate-500">Configure Let'em Cook game parameters</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Questions per game:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={questionsPerGame}
                onChange={(e) => setQuestionsPerGame(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
              />
              <span className="text-sm text-slate-500">× 4 spices = {questionsPerGame * 4} total</span>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings || questionsPerGame === settings?.questionsPerGame}
              className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isSavingSettings ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Status Notification */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg ${uploadStatus.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${uploadStatus.failed > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                {uploadStatus.success > 0 && `✓ ${uploadStatus.success} spice${uploadStatus.success !== 1 ? 's' : ''} imported successfully`}
                {uploadStatus.success > 0 && uploadStatus.failed > 0 && ' • '}
                {uploadStatus.failed > 0 && `✗ ${uploadStatus.failed} failed`}
                {uploadStatus.success === 0 && uploadStatus.failed === 0 && 'No spices imported'}
              </p>
              {uploadStatus.errors.length > 0 && (
                <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                  {uploadStatus.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
            <button
              onClick={() => setUploadStatus(null)}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search spices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "enabled", "disabled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-orange-100 text-orange-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Image
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSpices?.map((spice) => (
              <tr key={spice._id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                    {spice.imageUrl ? (
                      <img 
                        src={spice.imageUrl} 
                        alt={spice.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900">{spice.name}</span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggle(spice._id)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      spice.isEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {spice.isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(spice)}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(spice._id)}
                      className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSpices?.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {searchQuery
              ? "No spices match your search"
              : "No spices yet. Add your first spice!"}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit Spice' : 'Add New Spice'}
              </h2>
              <button
                onClick={() => { resetForm(); setIsAddModalOpen(false); }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Turmeric"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image *</label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                  folder="/spices"
                  className="w-full"
                />
                <input
                  type="text"
                  placeholder="Or paste image URL..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {formData.imageUrl && (
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
                  formData.isEnabled
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {formData.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {formData.isEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => { resetForm(); setIsAddModalOpen(false); }}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={isSubmitting || !formData.name || !formData.imageUrl}
                className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : (editingId ? 'Update' : 'Add Spice')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
