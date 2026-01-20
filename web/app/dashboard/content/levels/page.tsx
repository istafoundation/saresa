"use client";

import { useState, Suspense, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Layers,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Zap,
  Target,
  Map,
  Type,
  Grid3X3,
  X,
  AlertCircle,
} from "lucide-react";
import type { Id, Doc } from "@convex/_generated/dataModel";

type Level = Doc<"levels"> & {
  questionCounts: Record<string, number>;
  totalQuestions: number;
};

type LevelQuestion = Doc<"levelQuestions">;

type QuestionType = "mcq" | "grid" | "map" | "select";

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: "mcq", label: "Multiple Choice", icon: <Zap className="w-4 h-4" /> },
  { value: "select", label: "Word Select", icon: <Type className="w-4 h-4" /> },
  { value: "grid", label: "Word Grid", icon: <Grid3X3 className="w-4 h-4" /> },
  { value: "map", label: "Map Location", icon: <Map className="w-4 h-4" /> },
];

export default function LevelsContentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <LevelsContent />
    </Suspense>
  );
}

function LevelsContent() {
  const levels = useQuery(api.levels.getLevelsAdmin) as Level[] | undefined;
  
  const createLevel = useMutation(api.levels.createLevel);
  const updateLevel = useMutation(api.levels.updateLevel);
  const toggleLevelEnabled = useMutation(api.levels.toggleLevelEnabled);
  const deleteLevel = useMutation(api.levels.deleteLevel);
  const addDifficulty = useMutation(api.levels.addDifficulty);
  const updateDifficulty = useMutation(api.levels.updateDifficulty);
  const deleteDifficulty = useMutation(api.levels.deleteDifficulty);
  const addQuestion = useMutation(api.levels.addQuestion);
  const updateQuestion = useMutation(api.levels.updateQuestion);
  const deleteQuestion = useMutation(api.levels.deleteQuestion);

  // UI State
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [expandedDifficulties, setExpandedDifficulties] = useState<Set<string>>(new Set());
  
  // Modals
  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [showAddDifficultyModal, setShowAddDifficultyModal] = useState<Id<"levels"> | null>(null);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<{ levelId: Id<"levels">; difficultyName: string } | null>(null);
  const [showEditLevelModal, setShowEditLevelModal] = useState<Level | null>(null);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState<LevelQuestion | null>(null);
  
  // Form state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleLevel = (levelId: string) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(levelId)) {
      newExpanded.delete(levelId);
    } else {
      newExpanded.add(levelId);
    }
    setExpandedLevels(newExpanded);
  };

  const toggleDifficulty = (key: string) => {
    const newExpanded = new Set(expandedDifficulties);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDifficulties(newExpanded);
  };

  const handleToggleEnabled = async (levelId: Id<"levels">) => {
    await toggleLevelEnabled({ levelId });
  };

  const handleDeleteLevel = async (levelId: Id<"levels">) => {
    if (confirm("Delete this level and all its questions? This cannot be undone.")) {
      await deleteLevel({ levelId });
    }
  };

  const handleDeleteDifficulty = async (levelId: Id<"levels">, difficultyName: string) => {
    if (confirm(`Delete "${difficultyName}" difficulty and all its questions?`)) {
      await deleteDifficulty({ levelId, difficultyName });
    }
  };

  const handleDeleteQuestion = async (questionId: Id<"levelQuestions">) => {
    if (confirm("Delete this question?")) {
      await deleteQuestion({ questionId });
    }
  };

  const totalLevels = levels?.length ?? 0;
  const totalQuestions = levels?.reduce((sum, l) => sum + l.totalQuestions, 0) ?? 0;

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
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Level Management</h1>
              <p className="text-slate-600">
                {totalLevels} levels • {totalQuestions} questions
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddLevelModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Level
        </button>
      </div>

      {/* Levels accordion */}
      <div className="space-y-4">
        {levels?.map((level) => (
          <LevelAccordion
            key={level._id}
            level={level}
            isExpanded={expandedLevels.has(level._id)}
            expandedDifficulties={expandedDifficulties}
            onToggle={() => toggleLevel(level._id)}
            onToggleDifficulty={toggleDifficulty}
            onToggleEnabled={() => handleToggleEnabled(level._id)}
            onEdit={() => setShowEditLevelModal(level)}
            onDelete={() => handleDeleteLevel(level._id)}
            onAddDifficulty={() => setShowAddDifficultyModal(level._id)}
            onDeleteDifficulty={(diffName) => handleDeleteDifficulty(level._id, diffName)}
            onAddQuestion={(diffName) => setShowAddQuestionModal({ levelId: level._id, difficultyName: diffName })}
            onEditQuestion={(q) => setShowEditQuestionModal(q)}
            onDeleteQuestion={handleDeleteQuestion}
          />
        ))}

        {(!levels || levels.length === 0) && (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No levels yet</p>
            <p className="text-sm mt-1">Create your first level to get started</p>
          </div>
        )}
      </div>

      {/* Add Level Modal */}
      {showAddLevelModal && (
        <AddLevelModal
          onClose={() => setShowAddLevelModal(false)}
          onCreate={async (name, description) => {
            await createLevel({ name, description });
            setShowAddLevelModal(false);
          }}
        />
      )}

      {/* Edit Level Modal */}
      {showEditLevelModal && (
        <EditLevelModal
          level={showEditLevelModal}
          onClose={() => setShowEditLevelModal(null)}
          onSave={async (name, description, theme) => {
            await updateLevel({
              levelId: showEditLevelModal._id,
              name,
              description,
              theme,
            });
            setShowEditLevelModal(null);
          }}
        />
      )}

      {/* Add Difficulty Modal */}
      {showAddDifficultyModal && (
        <AddDifficultyModal
          onClose={() => setShowAddDifficultyModal(null)}
          onCreate={async (name, displayName, requiredScore) => {
            await addDifficulty({
              levelId: showAddDifficultyModal,
              name,
              displayName,
              requiredScore,
            });
            setShowAddDifficultyModal(null);
          }}
        />
      )}

      {/* Add Question Modal */}
      {showAddQuestionModal && (
        <AddQuestionModal
          levelId={showAddQuestionModal.levelId}
          difficultyName={showAddQuestionModal.difficultyName}
          onClose={() => setShowAddQuestionModal(null)}
          onCreate={async (type, question, data) => {
            await addQuestion({
              levelId: showAddQuestionModal.levelId,
              difficultyName: showAddQuestionModal.difficultyName,
              questionType: type,
              question,
              data,
            });
            setShowAddQuestionModal(null);
          }}
        />
      )}

      {/* Edit Question Modal */}
      {showEditQuestionModal && (
        <EditQuestionModal
          question={showEditQuestionModal}
          onClose={() => setShowEditQuestionModal(null)}
          onSave={async (questionText, data) => {
            await updateQuestion({
              questionId: showEditQuestionModal._id,
              question: questionText,
              data,
            });
            setShowEditQuestionModal(null);
          }}
        />
      )}
    </div>
  );
}

// Level Accordion Component
function LevelAccordion({
  level,
  isExpanded,
  expandedDifficulties,
  onToggle,
  onToggleDifficulty,
  onToggleEnabled,
  onEdit,
  onDelete,
  onAddDifficulty,
  onDeleteDifficulty,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
}: {
  level: Level;
  isExpanded: boolean;
  expandedDifficulties: Set<string>;
  onToggle: () => void;
  onToggleDifficulty: (key: string) => void;
  onToggleEnabled: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddDifficulty: () => void;
  onDeleteDifficulty: (diffName: string) => void;
  onAddQuestion: (diffName: string) => void;
  onEditQuestion: (q: LevelQuestion) => void;
  onDeleteQuestion: (id: Id<"levelQuestions">) => void;
}) {
  const questions = useQuery(api.levels.getLevelQuestionsAdmin, { levelId: level._id });
  
  const sortedDifficulties = [...level.difficulties].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Level Header */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 border-b border-slate-200">
        <button onClick={onToggle} className="p-1 hover:bg-slate-200 rounded transition-colors">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-slate-900">
              Level {level.levelNumber}: {level.name}
            </span>
            {level.theme?.emoji && (
              <span className="text-xl">{level.theme.emoji}</span>
            )}
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              level.isEnabled 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {level.isEnabled ? 'Enabled' : 'Coming Soon'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {level.difficulties.length} difficulties • {level.totalQuestions} questions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleEnabled}
            className={`p-2 rounded-lg transition-colors ${
              level.isEnabled ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={level.isEnabled ? 'Disable level' : 'Enable level'}
          >
            {level.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit level"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete level"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Difficulties */}
      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {sortedDifficulties.map((difficulty) => {
            const diffKey = `${level._id}-${difficulty.name}`;
            const diffExpanded = expandedDifficulties.has(diffKey);
            const diffQuestions = questions?.[difficulty.name] ?? [];

            return (
              <div key={difficulty.name} className="ml-8">
                {/* Difficulty Header */}
                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <button
                    onClick={() => onToggleDifficulty(diffKey)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    {diffExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium text-slate-800">{difficulty.displayName}</span>
                  <span className="text-sm text-slate-500">({difficulty.requiredScore}% to pass)</span>
                  <span className="text-xs text-slate-400 ml-auto mr-4">
                    {diffQuestions.length} questions
                  </span>
                  <button
                    onClick={() => onAddQuestion(difficulty.name)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add Question
                  </button>
                  {level.difficulties.length > 1 && (
                    <button
                      onClick={() => onDeleteDifficulty(difficulty.name)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete difficulty"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Questions List */}
                {diffExpanded && (
                  <div className="ml-10 pb-2 space-y-1">
                    {diffQuestions.length === 0 ? (
                      <p className="text-sm text-slate-400 italic p-2">No questions yet</p>
                    ) : (
                      diffQuestions.map((q) => (
                        <div
                          key={q._id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group"
                        >
                          <span className="w-5 h-5 flex items-center justify-center text-slate-400">
                            {QUESTION_TYPES.find(t => t.value === q.questionType)?.icon}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            q.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {q.questionType.toUpperCase()}
                          </span>
                          <span className="flex-1 text-sm text-slate-700 truncate">
                            {q.question}
                          </span>
                          <button
                            onClick={() => onEditQuestion(q)}
                            className="p-1 text-blue-600 opacity-0 group-hover:opacity-100 hover:bg-blue-50 rounded transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteQuestion(q._id)}
                            className="p-1 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Add Difficulty Button */}
          <div className="ml-8 p-3">
            <button
              onClick={onAddDifficulty}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Difficulty
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Modals
function AddLevelModal({ onClose, onCreate }: { 
  onClose: () => void; 
  onCreate: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    await onCreate(name.trim(), description.trim());
    setIsSubmitting(false);
  };

  return (
    <Modal title="Add New Level" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Level Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., The Beginning"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Start your learning journey!"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>New levels are disabled by default. Enable them when ready.</span>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Level"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditLevelModal({ level, onClose, onSave }: {
  level: Level;
  onClose: () => void;
  onSave: (name: string, description: string, theme?: { emoji: string; color: string }) => Promise<void>;
}) {
  const [name, setName] = useState(level.name);
  const [description, setDescription] = useState(level.description ?? "");
  const [emoji, setEmoji] = useState(level.theme?.emoji ?? "");
  const [color, setColor] = useState(level.theme?.color ?? "#4CAF50");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    await onSave(
      name.trim(),
      description.trim(),
      emoji ? { emoji, color } : undefined
    );
    setIsSubmitting(false);
  };

  return (
    <Modal title="Edit Level" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Level Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🌟"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddDifficultyModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, displayName: string, requiredScore: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [requiredScore, setRequiredScore] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !displayName.trim()) return;
    setIsSubmitting(true);
    await onCreate(name.trim().toLowerCase(), displayName.trim(), requiredScore);
    setIsSubmitting(false);
  };

  return (
    <Modal title="Add Difficulty" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Internal Name (lowercase)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, '_'))}
            placeholder="e.g., expert"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Expert"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Required Score (%)</label>
          <input
            type="number"
            value={requiredScore}
            onChange={(e) => setRequiredScore(Number(e.target.value))}
            min={1}
            max={100}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !displayName.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add Difficulty"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddQuestionModal({ levelId, difficultyName, onClose, onCreate }: {
  levelId: Id<"levels">;
  difficultyName: string;
  onClose: () => void;
  onCreate: (type: QuestionType, question: string, data: any) => Promise<void>;
}) {
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MCQ fields
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");

  // Grid/Select fields
  const [solution, setSolution] = useState("");

  // Select fields
  const [statement, setStatement] = useState("");
  const [correctWords, setCorrectWords] = useState("");
  const [selectMode, setSelectMode] = useState<"single" | "multiple">("single");

  // Map fields
  const [mapSolution, setMapSolution] = useState("IN-MH");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    
    setIsSubmitting(true);
    let data: any;

    switch (questionType) {
      case "mcq":
        data = {
          options: options.map(o => o.trim()),
          correctIndex,
          explanation: explanation.trim(),
        };
        break;
      case "grid":
        data = { solution: solution.trim().toLowerCase() };
        break;
      case "select":
        data = {
          statement: statement.trim(),
          correctWords: correctWords.split(",").map(w => w.trim()),
          selectMode,
        };
        break;
      case "map":
        data = { solution: mapSolution, mapType: "india" };
        break;
    }

    await onCreate(questionType, questionText.trim(), data);
    setIsSubmitting(false);
  };

  return (
    <Modal title={`Add Question - ${difficultyName}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question Type Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
          <div className="grid grid-cols-4 gap-2">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setQuestionType(type.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                  questionType === type.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {type.icon}
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={
              questionType === 'mcq' ? "What is the capital of India?" :
              questionType === 'grid' ? "Find the word meaning 'happy'" :
              questionType === 'select' ? "Select the noun in this sentence" :
              "Find Maharashtra on the map"
            }
            rows={2}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Type-specific fields */}
        {questionType === "mcq" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Options (click to mark correct)</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                        correctIndex === idx
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {correctIndex === idx && '✓'}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
              <input
                type="text"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Why is this the correct answer?"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        {questionType === "grid" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Solution Word</label>
            <input
              type="text"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="e.g., glad"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">The word that will be hidden in the grid</p>
          </div>
        )}

        {questionType === "select" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statement</label>
              <input
                type="text"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="The cat sat on the mat"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correct Words (comma-separated)</label>
              <input
                type="text"
                value={correctWords}
                onChange={(e) => setCorrectWords(e.target.value)}
                placeholder="cat, mat"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selection Mode</label>
              <select
                value={selectMode}
                onChange={(e) => setSelectMode(e.target.value as "single" | "multiple")}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="single">Single Word</option>
                <option value="multiple">Multiple Words</option>
              </select>
            </div>
          </>
        )}

        {questionType === "map" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State/Region Code</label>
            <input
              type="text"
              value={mapSolution}
              onChange={(e) => setMapSolution(e.target.value)}
              placeholder="e.g., IN-MH for Maharashtra"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Use ISO 3166-2:IN codes (e.g., IN-MH, IN-KL, IN-UP)
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!questionText.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add Question"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditQuestionModal({ question, onClose, onSave }: {
  question: LevelQuestion;
  onClose: () => void;
  onSave: (questionText: string, data: any) => Promise<void>;
}) {
  const [questionText, setQuestionText] = useState(question.question);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type-specific state based on question type
  const data = question.data as any;
  const [options, setOptions] = useState(data.options ?? ["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(data.correctIndex ?? 0);
  const [explanation, setExplanation] = useState(data.explanation ?? "");
  const [solution, setSolution] = useState(data.solution ?? "");
  const [statement, setStatement] = useState(data.statement ?? "");
  const [correctWords, setCorrectWords] = useState((data.correctWords ?? []).join(", "));
  const [selectMode, setSelectMode] = useState<"single" | "multiple">(data.selectMode ?? "single");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    
    setIsSubmitting(true);
    let newData: any;

    switch (question.questionType) {
      case "mcq":
        newData = {
          options: options.map((o: string) => o.trim()),
          correctIndex,
          explanation: explanation.trim(),
        };
        break;
      case "grid":
        newData = { solution: solution.trim().toLowerCase() };
        break;
      case "select":
        newData = {
          statement: statement.trim(),
          correctWords: correctWords.split(",").map((w: string) => w.trim()),
          selectMode,
        };
        break;
      case "map":
        newData = { solution: solution, mapType: "india" };
        break;
    }

    await onSave(questionText.trim(), newData);
    setIsSubmitting(false);
  };

  return (
    <Modal title={`Edit ${question.questionType.toUpperCase()} Question`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {question.questionType === "mcq" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
              <div className="space-y-2">
                {options.map((opt: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                        correctIndex === idx
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {correctIndex === idx && '✓'}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
              <input
                type="text"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        {question.questionType === "grid" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Solution Word</label>
            <input
              type="text"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {question.questionType === "select" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statement</label>
              <input
                type="text"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correct Words (comma-separated)</label>
              <input
                type="text"
                value={correctWords}
                onChange={(e) => setCorrectWords(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selection Mode</label>
              <select
                value={selectMode}
                onChange={(e) => setSelectMode(e.target.value as "single" | "multiple")}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="single">Single Word</option>
                <option value="multiple">Multiple Words</option>
              </select>
            </div>
          </>
        )}

        {question.questionType === "map" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State/Region Code</label>
            <input
              type="text"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!questionText.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Generic Modal Wrapper
function Modal({ title, onClose, children, wide }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`bg-white rounded-xl shadow-xl mx-4 max-h-[90vh] overflow-y-auto ${wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
