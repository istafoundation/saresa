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
  Wand2,
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

  // Form state
  const [sentence, setSentence] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [explanation, setExplanation] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-split sentence into words
  const words = sentence.trim().split(/\s+/).filter(Boolean);

  const filteredContent = content?.filter((item) => {
    const data = item.data as POSQuestion;
    const matchesSearch =
      data.sentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && item.status !== "archived";
  });

  const toggleWordIndex = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleAdd = async () => {
    setError("");

    if (!sentence.trim()) {
      setError("Sentence is required");
      return;
    }

    if (words.length === 0) {
      setError("Sentence must have at least one word");
      return;
    }

    if (!questionText.trim()) {
      setError("Question text is required");
      return;
    }

    if (selectedIndices.length === 0) {
      setError("Please select at least one correct word");
      return;
    }

    if (!explanation.trim()) {
      setError("Explanation is required");
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
      // Reset form
      setSentence("");
      setQuestionText("");
      setSelectedIndices([]);
      setExplanation("");
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
              <Wand2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Grammar Detective</h1>
              <p className="text-slate-600">
                {totalQuestions} questions
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

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
              const correctWords = data.correctIndices.map((i) => data.words[i]).join(", ");
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
                  Sentence
                </label>
                <textarea
                  value={sentence}
                  onChange={(e) => {
                    setSentence(e.target.value);
                    setSelectedIndices([]);
                  }}
                  placeholder="The quick brown fox jumps over the lazy dog."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Text
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Find ALL the adjectives in this sentence."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {words.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Click to mark correct word(s)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
                    {words.map((word, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleWordIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg border-2 font-medium transition-colors ${
                          selectedIndices.includes(idx)
                            ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                  {selectedIndices.length > 0 && (
                    <p className="text-xs text-indigo-600 mt-1">
                      Selected: {selectedIndices.map((i) => words[i]).join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Explanation
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why are these the correct answers?"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
