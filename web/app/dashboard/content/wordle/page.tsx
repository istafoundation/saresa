"use client";

import { useState, useEffect, Suspense } from "react";
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
} from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

interface WordleWord {
  word: string;
  hint: string;
  difficulty?: "easy" | "medium" | "hard";
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
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          difficulty,
        },
        status: "active",
      });
      setWord("");
      setHint("");
      setDifficulty("medium");
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
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Word
        </button>
      </div>

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
                Difficulty
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
                        data.difficulty === "easy"
                          ? "bg-green-100 text-green-700"
                          : data.difficulty === "hard"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {data.difficulty || "medium"}
                    </span>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {(["easy", "medium", "hard"] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        difficulty === diff
                          ? diff === "easy"
                            ? "bg-green-100 text-green-700 ring-2 ring-green-500"
                            : diff === "hard"
                            ? "bg-red-100 text-red-700 ring-2 ring-red-500"
                            : "bg-amber-100 text-amber-700 ring-2 ring-amber-500"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
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
