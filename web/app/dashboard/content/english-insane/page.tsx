"use client";

import { useState, Suspense, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  Search,
  Archive,
  X,
  Brain,
  Pencil,
  Download,
  Upload,
} from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

interface GKQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  explanation: string;
}

export default function EnglishInsaneContentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
      <EnglishInsaneContent />
    </Suspense>
  );
}

function EnglishInsaneContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const content = useQuery(api.content.getAllContent, { gameId: "english-insane" });
  const addContent = useMutation(api.content.addContent);
  const updateContent = useMutation(api.content.updateContent);
  const archiveContent = useMutation(api.content.archiveContent);

  const [isAddModalOpen, setIsAddModalOpen] = useState(action === "add");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"gameContent"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [setFilter, setSetFilter] = useState<"all" | 1 | 2 | 3 | 4 | 5>("all");

  // Set options with descriptive labels
  const SET_OPTIONS = [
    { value: 1, label: "Set 1 (EasyC, MediumB, HardA)" },
    { value: 2, label: "Set 2 (MediumC, HardB)" },
    { value: 3, label: "Set 3 (EasyB, MediumA)" },
    { value: 4, label: "Set 4 (HardC)" },
    { value: 5, label: "Set 5 (EasyA)" },
  ];

  // Form state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [category, setCategory] = useState("grammar");
  const [explanation, setExplanation] = useState("");
  const [questionSet, setQuestionSet] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredContent = content?.filter((item) => {
    const data = item.data as GKQuestion;
    const matchesSearch =
      data.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data.options.some((o) => o.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSet = setFilter === "all" || (item.questionSet ?? 1) === setFilter;
    return matchesSearch && matchesSet && item.status !== "archived";
  });

  const handleAdd = async () => {
    setError("");

    if (!question.trim()) {
      setError("Question is required");
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length !== 4) {
      setError("Exactly 4 options are required");
      return;
    }

    if (correctIndex < 0 || correctIndex > 3) {
      setError("Please select the correct answer");
      return;
    }

    if (!explanation.trim()) {
      setError("Explanation is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await addContent({
        type: "gk_question",
        gameId: "english-insane",
        data: {
          question: question.trim(),
          options: options.map((o) => o.trim()),
          correctIndex,
          category,
          explanation: explanation.trim(),
        },
        status: "active",
        questionSet,
      });
      // Reset form
      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      setCategory("grammar");
      setExplanation("");
      setQuestionSet(1);
      setIsAddModalOpen(false);
    } catch (err) {
      setError("Failed to add question");
    }
    setIsSubmitting(false);
  };

  const handleArchive = async (id: Id<"gameContent">) => {
    if (confirm("Archive this question?")) {
      await archiveContent({ contentId: id });
    }
  };

  const openEditModal = (item: typeof content extends (infer T)[] | undefined ? T : never) => {
    if (!item) return;
    const data = item.data as GKQuestion;
    setEditingId(item._id);
    setQuestion(data.question);
    setOptions([...data.options]);
    setCorrectIndex(data.correctIndex);
    setCategory(data.category);
    setExplanation(data.explanation);
    setQuestionSet((item.questionSet ?? 1) as 1 | 2 | 3 | 4 | 5);
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setError("");

    if (!question.trim()) {
      setError("Question is required");
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length !== 4) {
      setError("Exactly 4 options are required");
      return;
    }

    if (!explanation.trim()) {
      setError("Explanation is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateContent({
        contentId: editingId,
        data: {
          question: question.trim(),
          options: options.map((o) => o.trim()),
          correctIndex,
          category,
          explanation: explanation.trim(),
        },
        questionSet,
      });
      closeEditModal();
    } catch (err) {
      setError("Failed to update question");
    }
    setIsSubmitting(false);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingId(null);
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setCategory("grammar");
    setExplanation("");
    setQuestionSet(1);
    setError("");
  };

  const totalCount = content?.length ?? 0;

  const categories = ["grammar", "vocabulary", "idioms", "syntax"];

  // CSV Download Handler
  const handleDownloadCSV = () => {
    if (!filteredContent || filteredContent.length === 0) return;

    // Escape function for CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Option', 'Category', 'Explanation', 'Question Set'];
    const rows = filteredContent.map((item) => {
      const data = item.data as GKQuestion;
      const setLabel = SET_OPTIONS.find(s => s.value === (item.questionSet ?? 1))?.label ?? 'Set 1';
      return [
        escapeCSV(data.question),
        escapeCSV(data.options[0] ?? ''),
        escapeCSV(data.options[1] ?? ''),
        escapeCSV(data.options[2] ?? ''),
        escapeCSV(data.options[3] ?? ''),
        String(data.correctIndex + 1),
        escapeCSV(data.category),
        escapeCSV(data.explanation),
        escapeCSV(setLabel),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `english-insane-questions-${new Date().toISOString().split('T')[0]}.csv`;
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

      // Skip header row
      const dataRows = rows.slice(1);
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // Account for header and 0-indexing

        // Validate row has enough columns
        if (row.length < 9) {
          errors.push(`Row ${rowNum}: Not enough columns (expected 9, got ${row.length})`);
          failed++;
          continue;
        }

        const [questionText, opt1, opt2, opt3, opt4, correctOptStr, categoryText, explanationText, questionSetStr] = row;

        // Validate required fields
        if (!questionText?.trim()) {
          errors.push(`Row ${rowNum}: Question is required`);
          failed++;
          continue;
        }

        if (!opt1?.trim() || !opt2?.trim() || !opt3?.trim() || !opt4?.trim()) {
          errors.push(`Row ${rowNum}: All 4 options are required`);
          failed++;
          continue;
        }

        const correctOpt = parseInt(correctOptStr, 10);
        if (isNaN(correctOpt) || correctOpt < 1 || correctOpt > 4) {
          errors.push(`Row ${rowNum}: Correct Option must be 1, 2, 3, or 4`);
          failed++;
          continue;
        }

        const category = categoryText?.trim().toLowerCase() || 'grammar';
        if (!categories.includes(category)) {
          errors.push(`Row ${rowNum}: Invalid category "${category}". Must be: ${categories.join(', ')}`);
          failed++;
          continue;
        }

        if (!explanationText?.trim()) {
          errors.push(`Row ${rowNum}: Explanation is required`);
          failed++;
          continue;
        }

        // Parse question set from label or number
        let qSet: 1 | 2 | 3 | 4 | 5 = 1;
        const setMatch = questionSetStr?.match(/Set\s*(\d)/);
        if (setMatch) {
          const setNum = parseInt(setMatch[1], 10);
          if (setNum >= 1 && setNum <= 5) qSet = setNum as 1 | 2 | 3 | 4 | 5;
        } else {
          const setNum = parseInt(questionSetStr, 10);
          if (setNum >= 1 && setNum <= 5) qSet = setNum as 1 | 2 | 3 | 4 | 5;
        }

        try {
          await addContent({
            type: "gk_question",
            gameId: "english-insane",
            data: {
              question: questionText.trim(),
              options: [opt1.trim(), opt2.trim(), opt3.trim(), opt4.trim()],
              correctIndex: correctOpt - 1,
              category,
              explanation: explanationText.trim(),
            },
            status: "active",
            questionSet: qSet,
          });
          success++;
        } catch (err) {
          errors.push(`Row ${rowNum}: Failed to add - ${err instanceof Error ? err.message : 'Unknown error'}`);
          failed++;
        }
      }

      setUploadStatus({ success, failed, errors: errors.slice(0, 10) }); // Show first 10 errors
    } catch (err) {
      setUploadStatus({ success: 0, failed: 0, errors: ['Failed to parse CSV file'] });
    }

    setIsSubmitting(false);
    // Reset file input
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
          i++; // Skip next quote
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
          if (char === '\r') i++; // Skip \n after \r
        } else if (char !== '\r') {
          currentCell += char;
        }
      }
    }

    // Don't forget the last cell/row
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">English Insane</h1>
              <p className="text-slate-600">
                {totalCount} questions
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
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Upload Status Notification */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg ${uploadStatus.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${uploadStatus.failed > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                {uploadStatus.success > 0 && `✓ ${uploadStatus.success} question${uploadStatus.success !== 1 ? 's' : ''} imported successfully`}
                {uploadStatus.success > 0 && uploadStatus.failed > 0 && ' • '}
                {uploadStatus.failed > 0 && `✗ ${uploadStatus.failed} failed`}
                {uploadStatus.success === 0 && uploadStatus.failed === 0 && 'No questions imported'}
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
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={setFilter}
          onChange={(e) => setSetFilter(e.target.value === "all" ? "all" : Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Sets</option>
          {SET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Set
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Answer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContent?.map((item) => {
              const data = item.data as GKQuestion;
              return (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-slate-900 truncate">{data.question}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {data.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                      {SET_OPTIONS.find(s => s.value === (item.questionSet ?? 1))?.label ?? 'Set 1'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">
                      {data.options[data.correctIndex]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
            No questions found
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Add Question
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
                  Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Which sentence is grammatically correct?"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Options (click to mark correct)
                </label>
                <div className="space-y-2">
                  {options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectIndex(idx)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          correctIndex === idx
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {correctIndex === idx && "✓"}
                      </button>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[idx] = e.target.value;
                          setOptions(newOptions);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Explanation
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why is this the correct answer?"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Set
                </label>
                <select
                  value={questionSet}
                  onChange={(e) => setQuestionSet(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {SET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Group Access Reference */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Group Access Reference:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-emerald-700 font-medium">Group A (Class 1-4):</span>
                  <span className="text-slate-600">Set 1, Set 3, Set 5</span>
                  <span className="text-blue-700 font-medium">Group B (Class 5-8):</span>
                  <span className="text-slate-600">Set 1, Set 2, Set 3</span>
                  <span className="text-purple-700 font-medium">Group C (Class 9-10):</span>
                  <span className="text-slate-600">Set 1, Set 2, Set 4</span>
                </div>
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
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Question
              </h2>
              <button
                onClick={closeEditModal}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter your question..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Options (select correct answer)
                </label>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="editCorrectAnswer"
                        checked={correctIndex === idx}
                        onChange={() => setCorrectIndex(idx)}
                        className="text-purple-600"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[idx] = e.target.value;
                          setOptions(newOptions);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Explanation
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why is this the correct answer?"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Set
                </label>
                <select
                  value={questionSet}
                  onChange={(e) => setQuestionSet(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {SET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Group Access Reference */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Group Access Reference:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-emerald-700 font-medium">Group A (Class 1-4):</span>
                  <span className="text-slate-600">Set 1, Set 3, Set 5</span>
                  <span className="text-blue-700 font-medium">Group B (Class 5-8):</span>
                  <span className="text-slate-600">Set 1, Set 2, Set 3</span>
                  <span className="text-purple-700 font-medium">Group C (Class 9-10):</span>
                  <span className="text-slate-600">Set 1, Set 2, Set 4</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={closeEditModal}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
