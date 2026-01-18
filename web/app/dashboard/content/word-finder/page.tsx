"use client";

import { useState, Suspense } from "react";
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
  const [setFilter, setSetFilter] = useState<"all" | 1 | 2 | 3 | 4 | 5>("all");

  // Set options with descriptive labels
  const SET_OPTIONS = [
    { value: 1, label: "Set 1 (EasyC, MediumB, HardA)" },
    { value: 2, label: "Set 2 (MediumC, HardB)" },
    { value: 3, label: "Set 3 (EasyB, MediumA)" },
    { value: 4, label: "Set 4 (HardC)" },
    { value: 5, label: "Set 5 (EasyA)" },
  ];

  // Word Set form
  const [theme, setTheme] = useState("");
  const [words, setWords] = useState<string[]>(["", "", "", "", ""]);
  const [questionSet, setQuestionSet] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Hard Question form
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredContent = content?.filter((item: { type: string; data: WordSet | HardQuestion; questionSet?: number; status?: string }) => {
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesSet = setFilter === "all" || (item.questionSet ?? 1) === setFilter;
    if (!matchesType || !matchesSet) return false;
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
        questionSet,
      });
      setTheme("");
      setWords(["", "", "", "", ""]);
      setQuestionSet(1);
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
        questionSet,
      });
      setQuestion("");
      setAnswer("");
      setHint("");
      setQuestionSet(1);
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
    setQuestionSet((item.questionSet ?? 1) as 1 | 2 | 3 | 4 | 5);
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
    setQuestionSet((item.questionSet ?? 1) as 1 | 2 | 3 | 4 | 5);
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
        questionSet,
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
    setTheme("");
    setWords(["", "", "", "", ""]);
    setQuestion("");
    setAnswer("");
    setHint("");
    setQuestionSet(1);
    setError("");
  };

  const wordSetCount = content?.filter((c: { type: string }) => c.type === "word_set").length ?? 0;
  const questionCount = content?.filter((c: { type: string }) => c.type === "hard_question").length ?? 0;

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
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </button>
      </div>

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

        <select
          value={setFilter}
          onChange={(e) => setSetFilter(e.target.value === "all" ? "all" : Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Set
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
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                        {SET_OPTIONS.find(s => s.value === (item.questionSet ?? 1))?.label ?? 'Set 1'}
                      </span>
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
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                        {SET_OPTIONS.find(s => s.value === (item.questionSet ?? 1))?.label ?? 'Set 1'}
                      </span>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Set
                </label>
                <select
                  value={questionSet}
                  onChange={(e) => setQuestionSet(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Set
                </label>
                <select
                  value={questionSet}
                  onChange={(e) => setQuestionSet(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
