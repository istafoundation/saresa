"use client";

import { useState, Suspense, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Search,
  Archive,
  X,
  Check,
  Download,
  Upload,

} from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

interface POSQuestion {
  sentence: string;
  words: string[];
  questionText: string;
  correctIndices: number[];
  explanation: string;
}

export default function GrammarDetectiveContentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <GrammarDetectiveContent />
    </Suspense>
  );
}

function GrammarDetectiveContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const content = useQuery(api.content.getAllContent, { gameId: "grammar-detective" });
  const addContent = useMutation(api.content.addContent);
  const archiveContent = useMutation(api.content.archiveContent);

  const [isAddModalOpen, setIsAddModalOpen] = useState(action === "add");
  const [searchQuery, setSearchQuery] = useState("");

  // Wizard state
  const [step, setStep] = useState(1);
  const [sentence, setSentence] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-split sentence into words
  const words = sentence.trim().split(/\s+/).filter(Boolean);

  const filteredContent = content?.filter((item) => {
    const data = item.data as POSQuestion;
    const matchesSearch =
      data.sentence?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data.questionText?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && item.status !== "archived";
  });

  const toggleWordIndex = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const resetForm = () => {
    setStep(1);
    setSentence("");
    setQuestionText("");
    setSelectedIndices([]);
    setExplanation("");
    setError("");
  };

  const handleNextStep = () => {
    setError("");
    if (!sentence.trim()) {
      setError("Please enter a sentence");
      return;
    }
    if (!questionText.trim()) {
      setError("Please enter a question");
      return;
    }
    if (words.length === 0) {
      setError("Sentence must have at least one word");
      return;
    }
    setStep(2);
  };

  const handleAdd = async () => {
    setError("");

    if (selectedIndices.length === 0) {
      setError("Please select at least one correct word");
      return;
    }

    if (!explanation.trim()) {
      setError("Please add an explanation");
      return;
    }

    setIsSubmitting(true);
    try {
      await addContent({
        type: "pos_question",
        gameId: "grammar-detective",
        data: {
          sentence: sentence.trim(),
          words,
          questionText: questionText.trim(),
          correctIndices: selectedIndices.sort((a, b) => a - b),
          explanation: explanation.trim(),
        },
        status: "active",
      });
      resetForm();
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

  const totalQuestions = content?.filter((c) => c.status !== "archived").length ?? 0;

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

  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // CSV Download Handler
  const handleDownloadCSV = () => {
    if (!filteredContent || filteredContent.length === 0) return;

    const headers = ['Sentence', 'Question Text', 'Correct Word Indices', 'Explanation'];
    const rows = filteredContent.map((item) => {
      const data = item.data as POSQuestion;
      // Use pipe-separated indices since commas are CSV delimiters
      const indicesStr = data.correctIndices?.join('|') ?? '';
      return [
        escapeCSV(data.sentence),
        escapeCSV(data.questionText),
        indicesStr,
        escapeCSV(data.explanation),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grammar-detective-questions-${new Date().toISOString().split('T')[0]}.csv`;
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

        if (row.length < 4) {
          errors.push(`Row ${rowNum}: Not enough columns (need Sentence, Question, Indices, Explanation)`);
          failed++;
          continue;
        }

        const [sentenceText, questionTextRaw, indicesStr, explanationText] = row;

        if (!sentenceText?.trim()) {
          errors.push(`Row ${rowNum}: Sentence is required`);
          failed++;
          continue;
        }

        if (!questionTextRaw?.trim()) {
          errors.push(`Row ${rowNum}: Question text is required`);
          failed++;
          continue;
        }

        // Parse pipe-separated indices
        const wordsArray = sentenceText.trim().split(/\s+/).filter(Boolean);
        if (wordsArray.length === 0) {
          errors.push(`Row ${rowNum}: Sentence must have at least one word`);
          failed++;
          continue;
        }

        const indices = indicesStr?.split('|')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n) && n >= 0 && n < wordsArray.length);
        
        if (!indices || indices.length === 0) {
          errors.push(`Row ${rowNum}: At least one valid word index is required (0-${wordsArray.length - 1})`);
          failed++;
          continue;
        }

        if (!explanationText?.trim()) {
          errors.push(`Row ${rowNum}: Explanation is required`);
          failed++;
          continue;
        }

        try {
          await addContent({
            type: "pos_question",
            gameId: "grammar-detective",
            data: {
              sentence: sentenceText.trim(),
              words: wordsArray,
              questionText: questionTextRaw.trim(),
              correctIndices: indices.sort((a, b) => a - b),
              explanation: explanationText.trim(),
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
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Search className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Grammar Detective</h1>
              <p className="text-slate-600">
                {totalQuestions} questions • Parts of speech
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
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Sentence
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Correct Words
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContent?.map((item) => {
              const data = item.data as POSQuestion;
              const correctWords = data.correctIndices?.map((i) => data.words?.[i]).filter(Boolean).join(", ") || "-";
              return (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-slate-900 truncate">{data.sentence}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-slate-600 truncate">{data.questionText}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                      {correctWords}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleArchive(item._id)}
                      className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredContent?.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No questions found. Add your first question!
          </div>
        )}
      </div>

      {/* Add Modal - 2 Step Wizard */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    1
                  </div>
                  <div className="w-8 h-0.5 bg-slate-200" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    2
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {step === 1 ? "Enter Sentence & Question" : "Select Correct Words"}
                </span>
              </div>
              <button
                onClick={() => { resetForm(); setIsAddModalOpen(false); }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sentence
                    </label>
                    <textarea
                      value={sentence}
                      onChange={(e) => {
                        setSentence(e.target.value);
                        setSelectedIndices([]);
                      }}
                      placeholder="The quick brown fox jumps over the lazy dog."
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {words.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {words.length} words detected
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Question
                    </label>
                    <input
                      type="text"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Find ALL the adjectives in this sentence."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Preview of words */}
                  {words.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-500 mb-2">PREVIEW</p>
                      <p className="text-slate-800">{words.join(" ")}</p>
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm font-medium text-indigo-800 mb-1">Question:</p>
                    <p className="text-indigo-900">{questionText}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tap the correct word(s)
                    </label>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg min-h-[100px]">
                      {words.map((word, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleWordIndex(idx)}
                          className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                            selectedIndices.includes(idx)
                              ? "border-indigo-500 bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {word}
                          {selectedIndices.includes(idx) && (
                            <Check className="inline w-4 h-4 ml-1" />
                          )}
                        </button>
                      ))}
                    </div>
                    {selectedIndices.length > 0 && (
                      <p className="text-sm text-indigo-600 mt-2 font-medium">
                        ✓ Selected: {selectedIndices.map((i) => words[i]).join(", ")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Explanation (Why are these correct?)
                    </label>
                    <textarea
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Explain why these words are the correct answers..."
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-200">
              {step === 1 ? (
                <>
                  <button
                    onClick={() => { resetForm(); setIsAddModalOpen(false); }}
                    className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Next: Select Words
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={isSubmitting || selectedIndices.length === 0}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? "Adding..." : "Add Question"}
                    <Check className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
