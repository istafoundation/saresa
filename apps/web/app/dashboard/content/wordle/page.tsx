"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  Search,
  Edit2,
  Archive,
  Check,
  X,
  Trash2,
  BookOpen,
  Download,
  Upload,

} from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

interface WordleWord {
  word: string;
  hint: string;
}

export default function WordleContentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>
      <WordleContent />
    </Suspense>
  );
}

function WordleContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const content = useQuery(api.content.getAllContent, { gameId: "wordle" });
  const addContent = useMutation(api.content.addContent);
  const updateContent = useMutation(api.content.updateContent);
  const archiveContent = useMutation(api.content.archiveContent);

  const [isAddModalOpen, setIsAddModalOpen] = useState(action === "add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");

  // Form state
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter content
  const filteredContent = content?.filter((item) => {
    const data = item.data as WordleWord;
    const matchesSearch =
      data.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data.hint.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = async () => {
    setError("");

    // Validation
    if (word.length !== 5) {
      setError("Word must be exactly 5 letters");
      return;
    }
    if (!/^[A-Za-z]+$/.test(word)) {
      setError("Word must contain only letters A-Z");
      return;
    }
    if (!hint.trim()) {
      setError("Hint is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await addContent({
        type: "wordle_word",
        gameId: "wordle",
        data: {
          word: word.toUpperCase(),
          hint: hint.trim(),
        },
        status: "active",
      });
      setWord("");
      setHint("");
      setIsAddModalOpen(false);
    } catch (err) {
      setError("Failed to add word. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleArchive = async (id: Id<"gameContent">) => {
    if (confirm("Are you sure you want to archive this word?")) {
      await archiveContent({ contentId: id });
    }
  };

  const activeCount = content?.filter((c) => c.status === "active").length ?? 0;
  const draftCount = content?.filter((c) => c.status === "draft").length ?? 0;
  const archivedCount = content?.filter((c) => c.status === "archived").length ?? 0;

  // CSV Download Handler
  const handleDownloadCSV = () => {
    if (!filteredContent || filteredContent.length === 0) return;

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = ['Word', 'Hint'];
    const rows = filteredContent.map((item) => {
      const data = item.data as WordleWord;
      return [
        escapeCSV(data.word),
        escapeCSV(data.hint),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wordle-words-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };



  // CSV Upload Handler
  const handleUploadCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus(null);
    setIsSubmitting(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        setUploadStatus({ success: 0, failed: 0, errors: ['CSV file is empty or has no data rows'] });
        setIsSubmitting(false);
        return;
      }

      const dataRows = rows.slice(1);
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;

        if (row.length < 2) {
          errors.push(`Row ${rowNum}: Not enough columns (need at least Word and Hint)`);
          failed++;
          continue;
        }

        const [wordText, hintText] = row;

        // Validate word
        const cleanWord = wordText?.trim().toUpperCase();
        if (!cleanWord || cleanWord.length !== 5) {
          errors.push(`Row ${rowNum}: Word must be exactly 5 letters`);
          failed++;
          continue;
        }
        if (!/^[A-Z]+$/.test(cleanWord)) {
          errors.push(`Row ${rowNum}: Word must contain only letters A-Z`);
          failed++;
          continue;
        }

        if (!hintText?.trim()) {
          errors.push(`Row ${rowNum}: Hint is required`);
          failed++;
          continue;
        }

        try {
          await addContent({
            type: "wordle_word",
            gameId: "wordle",
            data: {
              word: cleanWord,
              hint: hintText.trim(),
            },
            status: "active",
          });
          success++;
        } catch (err) {
          errors.push(`Row ${rowNum}: Failed to add - ${err instanceof Error ? err.message : 'Unknown error'}`);
          failed++;
        }
      }

      setUploadStatus({ success, failed, errors: errors.slice(0, 10) });
    } catch (err) {
      setUploadStatus({ success: 0, failed: 0, errors: ['Failed to parse CSV file'] });
    }

    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Parse CSV with proper escape handling
  const parseCSV = (text: string): string[][] => {
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

    return rows;
  };

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
            <div className="p-2 bg-emerald-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Wordle Words</h1>
              <p className="text-slate-600">
                {activeCount} active · {draftCount} drafts · {archivedCount} archived
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadCSV}
          disabled={!filteredContent || filteredContent.length === 0}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download CSV"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleUploadCSV}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Upload CSV"
        >
          <Upload className="w-4 h-4" />
          {isSubmitting ? 'Uploading...' : 'Upload'}
        </button>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Word
        </button>
      </div>

      {/* Upload Status Notification */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg ${uploadStatus.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${uploadStatus.failed > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                {uploadStatus.success > 0 && `✓ ${uploadStatus.success} word${uploadStatus.success !== 1 ? 's' : ''} imported successfully`}
                {uploadStatus.success > 0 && uploadStatus.failed > 0 && ' • '}
                {uploadStatus.failed > 0 && `✗ ${uploadStatus.failed} failed`}
                {uploadStatus.success === 0 && uploadStatus.failed === 0 && 'No words imported'}
              </p>
              {uploadStatus.errors.length > 0 && (
                <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                  {uploadStatus.errors.map((err, i) => <li key={i}>{err}</li>)}
                  {uploadStatus.failed > 10 && <li>...and {uploadStatus.failed - 10} more errors</li>}
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
            placeholder="Search words or hints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "active", "draft", "archived"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-emerald-100 text-emerald-700"
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
                Word
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Hint
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
            {filteredContent?.map((item) => {
              const data = item.data as WordleWord;
              return (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-lg text-slate-900">
                      {data.word}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                    {data.hint}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "draft"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleArchive(item._id)}
                        className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredContent?.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {searchQuery
              ? "No words match your search"
              : "No content yet. Add your first word!"}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Add Wordle Word
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Word (5 letters)
                </label>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="HELLO"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-lg uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={5}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {word.length}/5 letters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hint
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="A greeting"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Word"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
