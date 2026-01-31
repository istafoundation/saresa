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
  Puzzle,
  Pencil,
  Download,
  Upload,
  FileText,
} from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

interface WordSet {
  theme: string;
  words: string[];
}

interface HardQuestion {
  question: string;
  answer: string;
  hint: string;
}

type ContentType = "word_set" | "hard_question";

export default function WordFinderContentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <WordFinderContent />
    </Suspense>
  );
}

function WordFinderContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const content = useQuery(api.content.getAllContent, { gameId: "word-finder" });
  const addContent = useMutation(api.content.addContent);
  const updateContent = useMutation(api.content.updateContent);
  const archiveContent = useMutation(api.content.archiveContent);

  const [isAddModalOpen, setIsAddModalOpen] = useState(action === "add");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"gameContent"> | null>(null);
  const [editingType, setEditingType] = useState<ContentType>("word_set");
  const [contentType, setContentType] = useState<ContentType>("word_set");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "word_set" | "hard_question">("all");
  // setFilter removed
  
  // SET_OPTIONS removed

  // Word Set form
  const [theme, setTheme] = useState("");
  const [words, setWords] = useState<string[]>(["", "", "", "", ""]);
  // questionSet removed

  // Hard Question form
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const wordSetFileInputRef = useRef<HTMLInputElement>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);

  const filteredContent = content?.filter((item: { type: string; data: WordSet | HardQuestion; questionSet?: number; status?: string }) => {
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    if (!matchesType) return false;
    if (item.status === "archived") return false;

    if (item.type === "word_set") {
      const data = item.data as WordSet;
      return (
        data.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.words.some((w: string) => w.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else {
      const data = item.data as HardQuestion;
      return (
        data.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  });

  const handleAddWordSet = async () => {
    setError("");

    if (!theme.trim()) {
      setError("Theme is required");
      return;
    }

    const validWords = words.filter((w) => w.trim());
    if (validWords.length !== 5) {
      setError("Exactly 5 words are required");
      return;
    }

    if (validWords.some((w) => w.length > 6)) {
      setError("Words must be 6 letters or less");
      return;
    }

    setIsSubmitting(true);
    try {
      await addContent({
        type: "word_set",
        gameId: "word-finder",
        data: {
          theme: theme.trim(),
          words: validWords.map((w) => w.toUpperCase()),
        },
        status: "active",
        // questionSet removed
      });
      setTheme("");
      setWords(["", "", "", "", ""]);
      // setQuestionSet removed
      setIsAddModalOpen(false);
    } catch (err) {
      setError("Failed to add word set");
    }
    setIsSubmitting(false);
  };

  const handleAddQuestion = async () => {
    setError("");

    if (!question.trim()) {
      setError("Question is required");
      return;
    }
    if (!answer.trim()) {
      setError("Answer is required");
      return;
    }
    if (answer.length > 6) {
      setError("Answer must be 6 letters or less");
      return;
    }
    if (!hint.trim()) {
      setError("Hint is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await addContent({
        type: "hard_question",
        gameId: "word-finder",
        data: {
          question: question.trim(),
          answer: answer.toUpperCase().trim(),
          hint: hint.trim(),
        },
        status: "active",
        // questionSet removed
      });
      setQuestion("");
      setAnswer("");
      setHint("");
      // setQuestionSet removed
      setIsAddModalOpen(false);
    } catch (err) {
      setError("Failed to add question");
    }
    setIsSubmitting(false);
  };

  const handleArchive = async (id: Id<"gameContent">) => {
    if (confirm("Archive this content?")) {
      await archiveContent({ contentId: id });
    }
  };

  // Edit word set
  const openEditWordSet = (item: any) => {
    const data = item.data as WordSet;
    setEditingId(item._id);
    setEditingType("word_set");
    setTheme(data.theme);
    setWords([...data.words]);
    // setQuestionSet removed
    setIsEditModalOpen(true);
  };

  // Edit hard question
  const openEditQuestion = (item: any) => {
    const data = item.data as HardQuestion;
    setEditingId(item._id);
    setEditingType("hard_question");
    setQuestion(data.question);
    setAnswer(data.answer);
    setHint(data.hint);
    // setQuestionSet removed
    setIsEditModalOpen(true);
  };

  const handleEditWordSet = async () => {
    if (!editingId) return;
    setError("");

    if (!theme.trim()) {
      setError("Theme is required");
      return;
    }
    const validWords = words.filter((w) => w.trim());
    if (validWords.length !== 5) {
      setError("Exactly 5 words are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateContent({
        contentId: editingId,
        data: {
          theme: theme.trim(),
          words: validWords.map((w) => w.toUpperCase()),
        },
        // questionSet removed
      });
      closeEditModal();
    } catch (err) {
      setError("Failed to update word set");
    }
    setIsSubmitting(false);
  };

  const handleEditQuestion = async () => {
    if (!editingId) return;
    setError("");

    if (!question.trim() || !answer.trim() || !hint.trim()) {
      setError("All fields are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateContent({
        contentId: editingId,
        data: {
          question: question.trim(),
          answer: answer.toUpperCase().trim(),
          hint: hint.trim(),
        },
        // questionSet removed
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
    setTheme("");
    setWords(["", "", "", "", ""]);
    setQuestion("");
    setAnswer("");
    setHint("");
    // setQuestionSet removed
    setError("");
  };

  const wordSetCount = content?.filter((c: { type: string }) => c.type === "word_set").length ?? 0;
  const questionCount = content?.filter((c: { type: string }) => c.type === "hard_question").length ?? 0;

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

  // Word Sets CSV Download
  const handleDownloadWordSetsCSV = () => {
    const wordSets = content?.filter((c: { type: string; status?: string }) => c.type === "word_set" && c.status !== "archived");
    if (!wordSets || wordSets.length === 0) return;

    const headers = ['Theme', 'Word 1', 'Word 2', 'Word 3', 'Word 4', 'Word 5'];
    const rows = wordSets.map((item) => {
      const data = item.data as WordSet;
      return [
        escapeCSV(data.theme),
        ...data.words.map(w => escapeCSV(w)),
        // questionSet column removed
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `word-finder-word-sets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Hard Questions CSV Download
  const handleDownloadQuestionsCSV = () => {
    const questions = content?.filter((c: { type: string; status?: string }) => c.type === "hard_question" && c.status !== "archived");
    if (!questions || questions.length === 0) return;

    const headers = ['Question', 'Answer', 'Hint'];
    const rows = questions.map((item) => {
      const data = item.data as HardQuestion;
      return [
        escapeCSV(data.question),
        escapeCSV(data.answer),
        escapeCSV(data.hint),
        // questionSet column removed
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `word-finder-questions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Set Instructions Download Handler
  // Set Instructions Download Removed
  const handleDownloadSetInstructions = () => {
      alert("Set system has been removed.");
  };

  // Word Sets CSV Upload
  const handleUploadWordSetsCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

        if (row.length < 6) {
          errors.push(`Row ${rowNum}: Not enough columns (need Theme + 5 Words)`);
          failed++;
          continue;
        }

        const [themeText, ...rest] = row;
        const wordTexts = rest.slice(0, 5);
        // questionSet logic removed

        if (!themeText?.trim()) {
          errors.push(`Row ${rowNum}: Theme is required`);
          failed++;
          continue;
        }

        const validWords = wordTexts.filter(w => w?.trim()).map(w => w.trim().toUpperCase());
        if (validWords.length !== 5) {
          errors.push(`Row ${rowNum}: Exactly 5 words are required`);
          failed++;
          continue;
        }

        if (validWords.some(w => w.length > 6)) {
          errors.push(`Row ${rowNum}: Words must be 6 letters or less`);
          failed++;
          continue;
        }

        // questionSet logic removed

        try {
          await addContent({
            type: "word_set",
            gameId: "word-finder",
            data: {
              theme: themeText.trim(),
              words: validWords,
            },
            status: "active",
            // questionSet removed
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
    if (wordSetFileInputRef.current) wordSetFileInputRef.current.value = '';
  };

  // Hard Questions CSV Upload
  const handleUploadQuestionsCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

        if (row.length < 3) {
          errors.push(`Row ${rowNum}: Not enough columns (need Question, Answer, Hint)`);
          failed++;
          continue;
        }

        const [questionText, answerText, hintText] = row;

        if (!questionText?.trim()) {
          errors.push(`Row ${rowNum}: Question is required`);
          failed++;
          continue;
        }

        const cleanAnswer = answerText?.trim().toUpperCase();
        if (!cleanAnswer) {
          errors.push(`Row ${rowNum}: Answer is required`);
          failed++;
          continue;
        }
        if (cleanAnswer.length > 6) {
          errors.push(`Row ${rowNum}: Answer must be 6 letters or less`);
          failed++;
          continue;
        }

        if (!hintText?.trim()) {
          errors.push(`Row ${rowNum}: Hint is required`);
          failed++;
          continue;
        }

        // questionSet logic removed

        try {
          await addContent({
            type: "hard_question",
            gameId: "word-finder",
            data: {
              question: questionText.trim(),
              answer: cleanAnswer,
              hint: hintText.trim(),
            },
            status: "active",
            // questionSet removed
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
    if (questionFileInputRef.current) questionFileInputRef.current.value = '';
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Puzzle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Word Finder</h1>
              <p className="text-slate-600">
                {wordSetCount} word sets · {questionCount} hard questions
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleDownloadSetInstructions}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          title="Download Set Instructions"
        >
          <FileText className="w-4 h-4" />
          Guide
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadWordSetsCSV}
            disabled={wordSetCount === 0}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="Download Word Sets CSV"
          >
            <Download className="w-4 h-4" />
            Sets
          </button>
          <button
            onClick={handleDownloadQuestionsCSV}
            disabled={questionCount === 0}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="Download Questions CSV"
          >
            <Download className="w-4 h-4" />
            Qs
          </button>
        </div>
        <input
          ref={wordSetFileInputRef}
          type="file"
          accept=".csv"
          onChange={handleUploadWordSetsCSV}
          className="hidden"
        />
        <input
          ref={questionFileInputRef}
          type="file"
          accept=".csv"
          onChange={handleUploadQuestionsCSV}
          className="hidden"
        />
        <div className="flex gap-2">
          <button
            onClick={() => wordSetFileInputRef.current?.click()}
            disabled={isSubmitting}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm"
            title="Upload Word Sets CSV"
          >
            <Upload className="w-4 h-4" />
            Sets
          </button>
          <button
            onClick={() => questionFileInputRef.current?.click()}
            disabled={isSubmitting}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm"
            title="Upload Questions CSV"
          >
            <Upload className="w-4 h-4" />
            Qs
          </button>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </button>
      </div>

      {/* Upload Status Notification */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg ${uploadStatus.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${uploadStatus.failed > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                {uploadStatus.success > 0 && `✓ ${uploadStatus.success} item${uploadStatus.success !== 1 ? 's' : ''} imported successfully`}
                {uploadStatus.success > 0 && uploadStatus.failed > 0 && ' • '}
                {uploadStatus.failed > 0 && `✗ ${uploadStatus.failed} failed`}
                {uploadStatus.success === 0 && uploadStatus.failed === 0 && 'No items imported'}
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
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "word_set", "hard_question"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === type
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {type === "all" ? "All" : type === "word_set" ? "Word Sets" : "Questions"}
            </button>
          ))}
        </div>

        {/* Set filter removed */}
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Content
              </th>
              {/* Set column removed */}
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
              if (item.type === "word_set") {
                const data = item.data as WordSet;
                return (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        Word Set
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{data.theme}</p>
                        <p className="text-sm text-slate-500 font-mono">
                          {data.words.join(", ")}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* Set cell removed */}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditWordSet(item)}
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
              } else {
                const data = item.data as HardQuestion;
                return (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        Question
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900 max-w-md truncate">
                          {data.question}
                        </p>
                        <p className="text-sm text-slate-500">
                          Answer: <span className="font-mono">{data.answer}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* Set cell removed */}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditQuestion(item)}
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
              }
            })}
          </tbody>
        </table>

        {filteredContent?.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No content found
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Add {contentType === "word_set" ? "Word Set" : "Question"}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Content Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setContentType("word_set")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    contentType === "word_set"
                      ? "bg-green-100 text-green-700 ring-2 ring-green-500"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Word Set (Easy)
                </button>
                <button
                  onClick={() => setContentType("hard_question")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    contentType === "hard_question"
                      ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Question (Hard)
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {contentType === "word_set" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Theme
                    </label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="e.g., Colors, Animals"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Words (5 words, max 6 letters each)
                    </label>
                    <div className="space-y-2">
                      {words.map((word, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={word}
                          onChange={(e) => {
                            const newWords = [...words];
                            newWords[idx] = e.target.value.toUpperCase();
                            setWords(newWords);
                          }}
                          placeholder={`Word ${idx + 1}`}
                          maxLength={6}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Question
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder='What word means "extremely happy"?'
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Answer (max 6 letters)
                    </label>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                      placeholder="ELATED"
                      maxLength={6}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hint
                    </label>
                    <input
                      type="text"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="Feeling great joy"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Group Access removed */}
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={contentType === "word_set" ? handleAddWordSet : handleAddQuestion}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add"}
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
                Edit {editingType === "word_set" ? "Word Set" : "Hard Question"}
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

              {editingType === "word_set" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Theme
                    </label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="e.g., Colors, Animals, Fruits"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      5 Words (5 letters each)
                    </label>
                    <div className="space-y-2">
                      {words.map((word, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={word}
                          onChange={(e) => {
                            const newWords = [...words];
                            newWords[idx] = e.target.value.toUpperCase().slice(0, 5);
                            setWords(newWords);
                          }}
                          placeholder={`Word ${idx + 1}`}
                          maxLength={5}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Question
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., What word means 'very happy'?"
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Answer (5 letters)
                    </label>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value.toUpperCase().slice(0, 5))}
                      placeholder="HAPPY"
                      maxLength={5}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hint
                    </label>
                    <input
                      type="text"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="A clue to help the player"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Group Access removed */}
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={closeEditModal}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingType === "word_set" ? handleEditWordSet : handleEditQuestion}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
