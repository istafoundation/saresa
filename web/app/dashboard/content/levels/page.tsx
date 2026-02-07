"use client";

import { useState, Suspense, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import ImageUpload from "@/app/components/ImageUpload";
import GroupManagement from "./GroupManagement";

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
  Download,
  Upload,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Id, Doc } from "@convex/_generated/dataModel";
import ImageKit from "imagekit-javascript";

// Initialize ImageKit for client-side uploads
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
  authenticationEndpoint: "/api/imagekit",
} as any);

type Level = Doc<"levels"> & {
  questionCounts: Record<string, number>;
  totalQuestions: number;
  groupId?: Id<"levelGroups">;
};

type LevelQuestion = Doc<"levelQuestions">;

type QuestionType = "mcq" | "grid" | "map" | "select" | "match" | "speaking" | "make_sentence" | "fill_in_the_blanks";

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: "mcq", label: "Multiple Choice", icon: <Zap className="w-4 h-4" /> },
  { value: "select", label: "Word Select", icon: <Type className="w-4 h-4" /> },
  { value: "grid", label: "Word Grid", icon: <Grid3X3 className="w-4 h-4" /> },
  { value: "map", label: "Map Location", icon: <Map className="w-4 h-4" /> },
  { value: "match", label: "Picture Match", icon: <LinkIcon className="w-4 h-4" /> },
  { value: "speaking", label: "Speaking", icon: <Zap className="w-4 h-4" /> },

  { value: "make_sentence", label: "Make Sentence", icon: <Pencil className="w-4 h-4" /> },
  { value: "fill_in_the_blanks", label: "Fill Blanks", icon: <Type className="w-4 h-4" /> },
];

// Helper to process image URLs (used by CSV and Manual entry)
const processImageUrl = async (url: string, context: string): Promise<string> => {
  if (!url) throw new Error(`${context}: Image URL missing`);
  
  if (url.includes("imagekit.io")) {
    return url; 
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
    const blob = await response.blob();
    
    const file = new File([blob], "match-upload.jpg", { type: blob.type });
    
    const authRes = await fetch("/api/imagekit");
    if (!authRes.ok) throw new Error("Failed to get upload auth");
    const authParams = await authRes.json();

    const result = await imagekit.upload({
      file: file,
      fileName: `match_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      useUniqueFileName: true,
      tags: ["match-import"],
      folder: "/match-questions",
      token: authParams.token,
      signature: authParams.signature,
      expire: authParams.expire
    });
    
    return result.url;
  } catch (err) {
    console.error("Image processing error:", err);
    throw new Error(`${context}: Failed to process image ${url}. Error: ${(err as Error).message}`);
  }
};

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
  const bulkReplaceQuestions = useMutation(api.levels.bulkReplaceQuestions);
  const bulkReplaceDifficultyQuestions = useMutation(api.levels.bulkReplaceDifficultyQuestions);
  
  const reorderLevels = useMutation(api.levels.reorderLevels);
  const reorderDifficulties = useMutation(api.levels.reorderDifficulties);
  const reorderQuestions = useMutation(api.levels.reorderQuestions);

  const groups = useQuery(api.groups.getGroups);



  // UI State
  // UI State
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [expandedDifficulties, setExpandedDifficulties] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");

  
  // Modals
  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [showAddDifficultyModal, setShowAddDifficultyModal] = useState<Id<"levels"> | null>(null);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<{ levelId: Id<"levels">; difficultyName: string } | null>(null);
  const [showEditLevelModal, setShowEditLevelModal] = useState<Level | null>(null);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState<LevelQuestion | null>(null);
  const [showEditDifficultyModal, setShowEditDifficultyModal] = useState<{ levelId: Id<"levels">; difficulty: { name: string; displayName: string; requiredScore: number } } | null>(null);
  
  // Form state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLevelId, setUploadLevelId] = useState<Id<"levels"> | null>(null);
  const [uploadDifficultyName, setUploadDifficultyName] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = useQuery(api.levels.searchQuestionsAdmin, { query: searchQuery });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  // CSV Helpers
  const escapeCSV = (value: string | undefined | null) => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };



  // Guide Download
  const handleDownloadGuide = () => {
    const guide = `===========================================
LEVEL CREATION GUIDE - CSV FORMAT
===========================================

This guide explains how to create levels using the CSV upload feature.
Each level requires a specific CSV format that can contain MULTIPLE types of questions.

REQUIRED CSV HEADERS (exact spelling):
Order,Type,Difficulty,Question,Option 1,Option 2,Option 3,Option 4,Correct Option,Solution,Statement,Correct Words,Select Mode,Explanation,Pairs,Sentence

-------------------------------------------
COLUMN EXPLANATIONS
-------------------------------------------

1. Order (Required)
   - Number (1, 2, 3...)
   - Determines the sequence of questions in the level.
   - EXISTING QUESTIONS WILL BE REPLACED by this upload to match this exact order.

2. Type (Required)
   - Must be one of: mcq, grid, map, select, match, speaking

3. Difficulty (Required)
   - Must be one of: easy, medium, hard
   - The difficulty must exist in the level settings.

4. Question (Required)
   - The main question text displayed to the child.

-------------------------------------------
TYPE-SPECIFIC COLUMNS
-------------------------------------------

A. For MCQ Questions (Type = mcq):
   - Option 1, Option 2, Option 3, Option 4: The 4 answer choices.
   - Correct Option: Number 1-4 indicating which option is correct.
   - Explanation: (Optional) Text explaining why.

B. For Grid Questions (Type = grid):
   - Solution: The single word to find in the letter grid.
   - (Leave Option columns empty)

C. For Map Questions (Type = map):
   - Solution: The ISO code for the state/region (e.g., IN-MH, IN-DL).
   - (Leave Option columns empty)

D. For Select Questions (Type = select):
   - Statement: The full sentence/text to display.
   - Correct Words: Comma-separated list of words to select (e.g. "cat, mat").
   - Select Mode: "single" or "multiple".
   - Explanation: (Optional) Text explaining why.
   - (Leave Option columns empty)

E. For Match Questions (Type = match):
   - Pairs: Semicolon separated pairs of "ImageURL|Text".
     Format: url1|text1;url2|text2;url3|text3
     Example: https://site.com/cat.jpg|Cat;https://site.com/dog.jpg|Dog
     Note: If Image URL is not from ImageKit, it will be automatically uploaded.
256: 
257: F. For Speaking Questions (Type = speaking):
258:    - Sentence: The text the child needs to speak aloud.
259:    - (Level Option columns empty)

-------------------------------------------
EXAMPLE ROWS
-------------------------------------------

1,mcq,easy,What is 2+2?,3,4,5,6,2,,,,,Simple addition,
2,grid,medium,Find the word 'happy',,,,,glad,,,,,
3,select,hard,Find the nouns,,, ,,,,The cat sat,cat,single,,
4,map,hard,Where is Mumbai?,,,,,IN-MH,,,,-
5,match,easy,Match animals to names,,,,,,,,,,,https://url.com/c.jpg|Cat;https://url.com/d.jpg|Dog

===========================================
`;
    
    const blob = new Blob([guide], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'level-creation-guide.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Download
  const handleDownloadCSV = async (levelId: Id<"levels">) => {
    // We need to fetch questions for this level to download them
    // Since we don't have direct access to all questions in this component state (they are fetched inside Accordion)
    // We will cheat slightly by triggering a window alert or simpler:
    // Ideally we should move the questions query up or use a separate query here.
    // For simplicity/reliability in this architecture, let's create a one-off query component or just ask user to fix it?
    // Actually, we can use the `useQuery` hook here but we need to pass arguments.
    // Better approach: Passes data DOWN from LevelAccordion or fetch on demand?
    // Fetch on demand is hard with hooks.
    // Let's implement a "Download" button inside the Accordion where data exists!
    // -> Moved logic to LevelAccordion component (see below changes)
  };

  // CSV Upload
  const handleUploadCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadLevelId) return;

    setUploadStatus(null);
    setIsSubmitting(true);

    try {
      const text = await file.text();
      // Parse CSV
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

      // Validate Headers
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const expectedHeaders = ['order','type','difficulty','question','option 1','option 2','option 3','option 4','correct option','solution','statement','correct words','select mode','explanation','pairs','sentence'];
      
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h) && h !== 'pairs'); // pairs is optional for other types
      // Actually, if we enforce all headers to be present in CSV even if empty, strictly checking might be annoying.
      // Let's check for critical ones. 
      // The current code checks for ALL. I should append 'pairs' to the check list but maybe make it lenient if missing in old CSVs?
      // For now, let's just add it to expectedHeaders. Users downloading new CSVs will get it.
      
      const idx = expectedHeaders.reduce((acc, h) => {
        const foundIndex = headers.indexOf(h);
        if (foundIndex !== -1) acc[h] = foundIndex;
        // If not found (e.g. old CSV upload), verify later if needed
        return acc;
      }, {} as Record<string, number>);

      // Check strictly required headers
      // If uploading for specific difficulty, 'difficulty' header is optional/ignored but good to have for validation
      const requiredCols = ['order','type','question']; 
      if (!uploadDifficultyName) {
        requiredCols.push('difficulty');
      }
      
      const missingRequired = requiredCols.filter(h => !headers.includes(h));
      if (missingRequired.length > 0) {
        throw new Error(`Missing required headers: ${missingRequired.join(', ')}`);
      }

      const dataRows = rows.slice(1);
      const parsedQuestions: any[] = [];
      const errors: string[] = [];

      // Use for...of loop to handle async image processing
      let rowIndex = 0;
      for (const row of dataRows) {
        rowIndex++;
        const rowNum = rowIndex + 2;
        
        const getVal = (header: string) => {
            const i = idx[header];
            if (i === undefined || i >= row.length) return '';
            return row[i]?.trim();
        };

        const orderStr = getVal('order');
        const type = getVal('type').toLowerCase();
        let diff = getVal('difficulty');
        const question = getVal('question');

        if (uploadDifficultyName) {
            // Force difficulty if uploading to specific slot
            diff = uploadDifficultyName;
        } else if (!diff) {
             errors.push(`Row ${rowNum}: Difficulty is required`);
             continue;
        }

        if (!question) {
          errors.push(`Row ${rowNum}: Question is required`);
          continue;
        }
        if (!['mcq', 'grid', 'map', 'select', 'match', 'speaking'].includes(type)) {
          errors.push(`Row ${rowNum}: Invalid Type "${type}"`);
          continue;
        }

        const order = parseInt(orderStr);
        if (isNaN(order)) {
          errors.push(`Row ${rowNum}: Invalid Order "${orderStr}"`);
          continue;
        }

        let data: any = {};
        
        try {
          if (type === 'mcq') {
            const opt1 = getVal('option 1');
            const opt2 = getVal('option 2');
            const opt3 = getVal('option 3');
            const opt4 = getVal('option 4');
            const correctStr = getVal('correct option');
            
            if (!opt1 || !opt2 || !opt3 || !opt4) {
              throw new Error("MCQ requires all 4 options");
            }
            const correct = parseInt(correctStr);
            if (isNaN(correct) || correct < 1 || correct > 4) {
               throw new Error("Correct Option must be 1-4");
            }
            data = {
              options: [opt1, opt2, opt3, opt4],
              correctIndex: correct - 1,
              explanation: getVal('explanation')
            };
          } else if (type === 'grid') {
            const sol = getVal('solution');
            if (!sol) throw new Error("Grid requires Solution");
            data = { solution: sol.toLowerCase() };
          } else if (type === 'map') {
            const sol = getVal('solution');
            if (!sol) throw new Error("Map requires Solution");
            data = { solution: sol, mapType: 'india' };
          } else if (type === 'select') {
            const stmt = getVal('statement');
            const words = getVal('correct words');
            const mode = getVal('select mode') || 'single';
            
            if (!stmt || !words) throw new Error("Select requires Statement and Correct Words");
            data = {
              statement: stmt,
              correctWords: words.split(',').map(w => w.trim()),
              selectMode: mode
            };
          } else if (type === 'match') {
            const pairsStr = getVal('pairs');
            if (!pairsStr) throw new Error("Match requires 'Pairs' (format: url|text;url|text)");
            
            // Parse pairs: "url|text;url2|text2"
            const rawPairs = pairsStr.split(';').filter(p => p.trim());
            const processedPairs = [];
            
            for (const p of rawPairs) {
                const parts = p.split('|');
                if (parts.length < 2) throw new Error(`Invalid pair format: ${p}. Expected url|text`);
                
                const rawUrl = parts[0].trim();
                const text = parts.slice(1).join('|').trim(); // Join back in case text has pipes?
                
                // Process Image
                const finalUrl = await processImageUrl(rawUrl, `Row ${rowNum}`);
                processedPairs.push({ imageUrl: finalUrl, text });
            }
            
            if (processedPairs.length < 2) throw new Error("Match requires at least 2 pairs");
            data = { pairs: processedPairs };
          } else if (type === 'speaking') {
            const sentence = getVal('sentence');
            if (!sentence) throw new Error("Speaking requires 'Sentence'");
            data = { sentence };
          }
  
          parsedQuestions.push({
            difficultyName: diff,
            questionType: type,
            question,
            data,
            order
          });

        } catch (e) {
          errors.push(`Row ${rowNum}: ${(e as Error).message}`);
        }
      }

      if (errors.length > 0) {
        setUploadStatus({ success: 0, failed: errors.length, errors: errors.slice(0, 10) });
      } else {
        // EXECUTE BULK REPLACE
        if (uploadDifficultyName) {
             // Strip difficultyName as the mutation doesn't expect it in the question object
             const questionsForDifficulty = parsedQuestions.map(({ difficultyName, ...rest }) => rest);
             
             await bulkReplaceDifficultyQuestions({
                levelId: uploadLevelId,
                difficultyName: uploadDifficultyName,
                questions: questionsForDifficulty
             });
        } else {
            await bulkReplaceQuestions({
                levelId: uploadLevelId,
                questions: parsedQuestions
            });
        }
        setUploadStatus({ success: parsedQuestions.length, failed: 0, errors: [] });
      }

    } catch (err) {
      console.error(err);
      setUploadStatus({ success: 0, failed: 1, errors: [(err as Error).message] });
    }
    
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadLevelId(null);
    setUploadDifficultyName(null);
  };

  const totalLevels = levels?.length ?? 0;
  const totalQuestions = levels?.reduce((sum, l) => sum + l.totalQuestions, 0) ?? 0;

  const filteredLevels = levels?.filter(level => {
      if (selectedGroupId === "all") return true;
      if (selectedGroupId === "ungrouped") return !level.groupId;
      return level.groupId === selectedGroupId;
  });


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
          onClick={handleDownloadGuide}
          className="flex items-center gap-2 text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4" />
          Instructions
        </button>
        <button
          onClick={() => setShowAddLevelModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Level
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadCSV}
        accept=".csv"
        className="hidden"
      />

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          uploadStatus.failed > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">
              Upload Complete: {uploadStatus.success} imported, {uploadStatus.failed} failed
            </p>
            {uploadStatus.errors.length > 0 && (
              <ul className="text-sm list-disc pl-4 space-y-1">
                {uploadStatus.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            <button 
              onClick={() => setUploadStatus(null)}
              className="text-sm underline mt-2 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

        {/* Group Management */}
      <GroupManagement groups={groups ?? []} />

      {/* Group Tabs */}
      {groups && groups.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                  onClick={() => setSelectedGroupId("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedGroupId === "all" 
                      ? "bg-slate-900 text-white" 
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
              >
                  All Levels
              </button>
              {groups.map((group: Doc<"levelGroups">) => (
                  <button
                      key={group._id}
                      onClick={() => setSelectedGroupId(group._id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                          selectedGroupId === group._id 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                      }`}
                  >
                      {group.theme?.emoji} {group.name}
                  </button>
              ))}
              <button
                  onClick={() => setSelectedGroupId("ungrouped")}
                   className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                      selectedGroupId === "ungrouped" 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                  }`}
              >
                  Ungrouped
              </button>
          </div>
      )}

      {/* Search Bar */}

        <div className="relative z-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Question Code (6 digits)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full px-4 py-3 pl-10 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Target className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {searchQuery && (searchResults !== undefined) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-96 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No question found with code "{searchQuery}"</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((result: any) => (
                    <div key={result._id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{result.question}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                            <span className="font-mono bg-slate-100 px-1 rounded">#{result.questionCode}</span>
                            <span>•</span>
                            <span>Level {result.levelNumber}: {result.levelName}</span>
                            <span>•</span>
                            <span className="capitalize">{result.difficultyName}</span>
                          </div>
                        </div>
                        <button 
                            onClick={() => {
                                // Expand the level and difficulty
                                if (!expandedLevels.has(result.levelId)) toggleLevel(result.levelId);
                                const diffKey = `${result.levelId}-${result.difficultyName}`;
                                if (!expandedDifficulties.has(diffKey)) toggleDifficulty(diffKey);
                                setSearchQuery(""); // Clear search to show view
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-lg hover:bg-indigo-50"
                        >
                            Locate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      {/* Levels accordion */}
      <div className="space-y-4">
        {filteredLevels?.map((level) => (
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
            onEditDifficulty={(diff) => setShowEditDifficultyModal({ levelId: level._id, difficulty: diff })}
            onEditQuestion={(q) => setShowEditQuestionModal(q)}
            onDeleteQuestion={handleDeleteQuestion}
            onUploadCSV={() => {
              setUploadLevelId(level._id);
              setUploadDifficultyName(null);
              fileInputRef.current?.click();
            }}
            onUploadDifficultyCSV={(diffName) => {
              setUploadLevelId(level._id);
              setUploadDifficultyName(diffName);
              fileInputRef.current?.click();
            }}

            escapeCSV={escapeCSV} // Pass helper down
            onReorderLevel={async (direction) => {
              try {
                await reorderLevels({ levelId: level._id, direction });
              } catch (e) {
                console.error("Reorder Level Error:", e);
                alert("Failed to reorder level: " + (e as Error).message);
              }
            }}
            onReorderDifficulty={async (diffName, direction) => {
              try {
                await reorderDifficulties({ levelId: level._id, difficultyName: diffName, direction });
              } catch (e) {
                console.error("Reorder Difficulty Error:", e);
                alert("Failed to reorder difficulty: " + (e as Error).message);
              }
            }}
            onReorderQuestion={async (qId, direction) => {
              try {
                await reorderQuestions({ questionId: qId, direction });
              } catch (e) {
                console.error("Reorder Question Error:", e);
                alert("Failed to reorder question: " + (e as Error).message);
              }
            }}
          />
        ))}

        {(!filteredLevels || filteredLevels.length === 0) && (
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
          groups={groups}
          initialGroupId={selectedGroupId}
          onCreate={async (name, description, groupId) => {
            await createLevel({ name, description, groupId });
            setShowAddLevelModal(false);
          }}
        />
      )}

      {/* Edit Level Modal */}
      {showEditLevelModal && (
        <EditLevelModal
          level={showEditLevelModal}
          groups={groups}
          onClose={() => setShowEditLevelModal(null)}
          onSave={async (name, description, theme, groupId) => {
            await updateLevel({
              levelId: showEditLevelModal._id,
              name,
              description,
              theme,
              groupId
            });
            setShowEditLevelModal(null);
          }}
        />
      )}

      {/* Edit Difficulty Modal */}
      {showEditDifficultyModal && (
        <EditDifficultyModal
          difficulty={showEditDifficultyModal.difficulty}
          onClose={() => setShowEditDifficultyModal(null)}
          onSave={async (displayName, requiredScore) => {
            await updateDifficulty({
              levelId: showEditDifficultyModal.levelId,
              difficultyName: showEditDifficultyModal.difficulty.name,
              displayName,
              requiredScore,
            });
            setShowEditDifficultyModal(null);
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
  onEditDifficulty,
  onDeleteDifficulty,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onUploadCSV,
  onUploadDifficultyCSV,
  escapeCSV,
  onReorderLevel,
  onReorderDifficulty,
  onReorderQuestion,
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
  onEditDifficulty: (diff: { name: string; displayName: string; requiredScore: number }) => void;
  onDeleteDifficulty: (diffName: string) => void;
  onAddQuestion: (diffName: string) => void;
  onEditQuestion: (q: LevelQuestion) => void;
  onDeleteQuestion: (id: Id<"levelQuestions">) => void;
  onUploadCSV: () => void;
  onUploadDifficultyCSV: (diffName: string) => void;
  escapeCSV: (val: string | undefined | null) => string;
  onReorderLevel: (direction: "up" | "down") => Promise<void>;
  onReorderDifficulty: (diffName: string, direction: "up" | "down") => Promise<void>;
  onReorderQuestion: (qId: Id<"levelQuestions">, direction: "up" | "down") => Promise<void>;
}) {
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

            {/* Level Reordering */}
            <div className="flex flex-col gap-0.5 ml-2">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onReorderLevel("up"); }}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 active:bg-slate-300"
                title="Move Up"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onReorderLevel("down"); }}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 active:bg-slate-300"
                title="Move Down"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {level.difficulties.length} difficulties • {level.totalQuestions ?? 0} questions
          </p>
        </div>

        <div className="flex items-center gap-2">
        {/* Actions moved to expanded view or remaining simple ones here */}
          
          <div className="w-px h-6 bg-slate-300 mx-2" />

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

      {/* Difficulties (Lazy Loaded) */}
      {isExpanded && (
        <LevelExpandedContent
            level={level}
            expandedDifficulties={expandedDifficulties}
            onToggleDifficulty={onToggleDifficulty}
            onAddDifficulty={onAddDifficulty}
            onEditDifficulty={onEditDifficulty}
            onDeleteDifficulty={onDeleteDifficulty}
            onAddQuestion={onAddQuestion}
            onEditQuestion={onEditQuestion}
            onDeleteQuestion={onDeleteQuestion}
            onUploadCSV={onUploadCSV}
            onUploadDifficultyCSV={onUploadDifficultyCSV}
            escapeCSV={escapeCSV}
            onReorderDifficulty={onReorderDifficulty}
            onReorderQuestion={onReorderQuestion}
        />
      )}
    </div>
  );
}

function LevelExpandedContent({
    level,
    expandedDifficulties,
    onToggleDifficulty,
    onAddDifficulty,
    onEditDifficulty,
    onDeleteDifficulty,
    onAddQuestion,
    onEditQuestion,
    onDeleteQuestion,
    onUploadCSV,
    onUploadDifficultyCSV,
    escapeCSV,
    onReorderDifficulty,
    onReorderQuestion,
}: {
    level: Level;
    expandedDifficulties: Set<string>;
    onToggleDifficulty: (key: string) => void;
    onAddDifficulty: () => void;
    onEditDifficulty: (diff: { name: string; displayName: string; requiredScore: number }) => void;
    onDeleteDifficulty: (diffName: string) => void;
    onAddQuestion: (diffName: string) => void;
    onEditQuestion: (q: LevelQuestion) => void;
    onDeleteQuestion: (id: Id<"levelQuestions">) => void;
    onUploadCSV: () => void;
    onUploadDifficultyCSV: (diffName: string) => void;
    escapeCSV: (val: string | undefined | null) => string;
    onReorderDifficulty: (diffName: string, direction: "up" | "down") => Promise<void>;
    onReorderQuestion: (qId: Id<"levelQuestions">, direction: "up" | "down") => Promise<void>;
}) {
  const questions = useQuery(api.levels.getLevelQuestionsAdmin, { levelId: level._id });
  const sortedDifficulties = [...level.difficulties].sort((a, b) => a.order - b.order);

  const handleDownloadDifficulty = (diffName: string) => {
    if (!questions || !questions[diffName]) return;
    
    const diffQuestions = questions[diffName];
    // Sort
    const sortedQs = [...diffQuestions].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.createdAt - b.createdAt;
    });

    const headers = ['Order','Type','Difficulty','Question','Option 1','Option 2','Option 3','Option 4','Correct Option','Solution','Statement','Correct Words','Select Mode','Explanation','Pairs','Sentence'];
    
    const rows = sortedQs.map((q, index) => {
      const order = index + 1;
      const type = q.questionType;
      const diff = q.difficultyName;
      const qt = escapeCSV(q.question);
      
      let opt1 = '', opt2 = '', opt3 = '', opt4 = '', correct = '', solution = '', stmt = '', words = '', mode = '', expl = '', pairs = '';
      
      const d = q.data as any;
      if (type === 'mcq') {
        opt1 = escapeCSV(d.options?.[0]);
        opt2 = escapeCSV(d.options?.[1]);
        opt3 = escapeCSV(d.options?.[2]);
        opt4 = escapeCSV(d.options?.[3]);
        correct = String(d.correctIndex + 1);
        expl = escapeCSV(d.explanation);
      } else if (type === 'grid') {
        solution = escapeCSV(d.solution);
      } else if (type === 'map') {
        solution = escapeCSV(d.solution);
      } else if (type === 'select') {
        stmt = escapeCSV(d.statement);
        words = escapeCSV(d.correctWords?.join(', '));
        mode = escapeCSV(d.selectMode);
      } else if (type === 'match') {
        if (d.pairs && Array.isArray(d.pairs)) {
           const pairStrings = d.pairs.map((p: any) => `${p.imageUrl}|${p.text}`);
           pairs = escapeCSV(pairStrings.join(';'));
        }
      } else if (type === 'speaking') {
        solution = escapeCSV(d.sentence); 
      }

      return [
        order,
        type,
        diff,
        qt,
        opt1, opt2, opt3, opt4, correct,
        solution,
        stmt,
        words,
        mode,
        expl,
        pairs,
        (type === 'speaking' ? escapeCSV(d.sentence) : '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Level-${level.levelNumber}-${diffName}-${level.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = () => {
    if (!questions) return;
    const headers = ['Order','Type','Difficulty','Question','Option 1','Option 2','Option 3','Option 4','Correct Option','Solution','Statement','Correct Words','Select Mode','Explanation','Pairs','Sentence'];
    const allQuestions: LevelQuestion[] = [];
    Object.values(questions).forEach(qs => allQuestions.push(...qs));
    allQuestions.sort((a, b) => a.createdAt - b.createdAt);

    const rows = allQuestions.map((q, index) => {
        const order = index + 1;
        const type = q.questionType;
        const diff = q.difficultyName;
        const qt = escapeCSV(q.question);
        
        // ... (Similar mapping as detailed in original code)
        // I will implement a helper or inline it to save context if it's identical
        // For brevity in replacement, re-using logic
        let opt1 = '', opt2 = '', opt3 = '', opt4 = '', correct = '', solution = '', stmt = '', words = '', mode = '', expl = '', pairs = '';
        
        const d = q.data as any;
        if (type === 'mcq') {
            opt1 = escapeCSV(d.options?.[0]);
            opt2 = escapeCSV(d.options?.[1]);
            opt3 = escapeCSV(d.options?.[2]);
            opt4 = escapeCSV(d.options?.[3]);
            correct = String(d.correctIndex + 1);
            expl = escapeCSV(d.explanation);
        } else if (type === 'grid') {
            solution = escapeCSV(d.solution);
        } else if (type === 'map') {
            solution = escapeCSV(d.solution);
        } else if (type === 'select') {
            stmt = escapeCSV(d.statement);
            words = escapeCSV(d.correctWords?.join(', '));
            mode = escapeCSV(d.selectMode);
        } else if (type === 'match') {
            if (d.pairs && Array.isArray(d.pairs)) {
            const pairStrings = d.pairs.map((p: any) => `${p.imageUrl}|${p.text}`);
            pairs = escapeCSV(pairStrings.join(';'));
            }
        }

        return [
            order, type, diff, qt, opt1, opt2, opt3, opt4, correct, solution, stmt, words, mode, expl, pairs
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Level-${level.levelNumber}-${level.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="divide-y divide-slate-100 border-t border-slate-100">
        {/* Level Actions Toolbar */}
        <div className="p-3 bg-slate-50 flex justify-end gap-2">
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                title="Download all questions in level as CSV"
            >
                <Download className="w-4 h-4" />
                Download CSV
            </button>
            <button
                onClick={onUploadCSV}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                title="Upload CSV to replace all questions"
            >
                <Upload className="w-4 h-4" />
                Upload CSV
            </button>
        </div>

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
                
                {/* Difficulty Reordering */}
                <div className="flex flex-col gap-0.5 mx-1">
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onReorderDifficulty(difficulty.name, "up"); }}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 active:bg-slate-300"
                    title="Move Up"
                >
                    <ArrowUp className="w-3 h-3" />
                </button>
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onReorderDifficulty(difficulty.name, "down"); }}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 active:bg-slate-300"
                    title="Move Down"
                >
                    <ArrowDown className="w-3 h-3" />
                </button>
                </div>

                <div className="flex items-center gap-1 mx-2">
                <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadDifficulty(difficulty.name); }}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Download CSV"
                >
                    <Download className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onUploadDifficultyCSV(difficulty.name); }}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Upload CSV"
                >
                    <Upload className="w-3.5 h-3.5" />
                </button>
                </div>

                <span className="text-sm text-slate-500">({difficulty.requiredScore}% to pass)</span>
                <button
                onClick={() => onEditDifficulty(difficulty)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors ml-2"
                title="Edit difficulty"
                >
                <Pencil className="w-3 h-3" />
                </button>
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
                        <span className="flex-1 text-sm text-slate-700 truncate flex items-center gap-2">
                        {q.question}
                        {q.questionCode && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-xs font-mono border border-slate-200">
                                #{q.questionCode}
                            </span>
                        )}
                        </span>

                        <div className="flex flex-col gap-0.5 px-2">
                            <button 
                            type="button"
                            onClick={() => onReorderQuestion(q._id, "up")}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 active:bg-slate-300"
                            title="Move Up"
                        >
                            <ArrowUp className="w-3 h-3" />
                        </button>
                        <button 
                            type="button"
                            onClick={() => onReorderQuestion(q._id, "down")}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 active:bg-slate-300"
                            title="Move Down"
                        >
                            <ArrowDown className="w-3 h-3" />
                        </button>
                        </div>

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
  );
}

// Modals
function AddLevelModal({ onClose, onCreate, groups, initialGroupId }: { 
  onClose: () => void; 
  onCreate: (name: string, description: string, groupId?: Id<"levelGroups">) => Promise<void>;
  groups?: Doc<"levelGroups">[];
  initialGroupId?: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState<string>(initialGroupId === "all" ? "" : (initialGroupId ?? ""));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    await onCreate(name.trim(), description.trim(), groupId ? groupId as Id<"levelGroups"> : undefined);
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
        
        {groups && groups.length > 0 && (
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Group (World)</label>
            <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">No Group</option>
                {groups.map((g: Doc<"levelGroups">) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                ))}
            </select>
            </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
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

function EditLevelModal({ level, onClose, onSave, groups }: {
  level: Level;
  onClose: () => void;
  onSave: (name: string, description: string, theme?: { emoji: string; color: string }, groupId?: Id<"levelGroups">) => Promise<void>;
  groups?: Doc<"levelGroups">[];
}) {
  const [name, setName] = useState(level.name);
  const [description, setDescription] = useState(level.description ?? "");
  const [groupId, setGroupId] = useState<string>(level.groupId ?? "");
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
      emoji ? { emoji, color } : undefined,
      groupId ? groupId as Id<"levelGroups"> : undefined
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

        {groups && groups.length > 0 && (
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Group (World)</label>
            <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">No Group</option>
                {groups.map((g: Doc<"levelGroups">) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                ))}
            </select>
            </div>
        )}

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

function EditDifficultyModal({ difficulty, onClose, onSave }: {
  difficulty: { name: string; displayName: string; requiredScore: number };
  onClose: () => void;
  onSave: (displayName: string, requiredScore: number) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(difficulty.displayName);
  const [requiredScore, setRequiredScore] = useState(difficulty.requiredScore);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    await onSave(displayName.trim(), requiredScore);
    setIsSubmitting(false);
  };

  return (
    <Modal title={`Edit Difficulty: ${difficulty.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
            disabled={!displayName.trim() || isSubmitting}
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
  const [selectMode, setSelectMode] = useState<"single" | "multiple" | "boxed">("single");

  // Map fields
  const [mapSolution, setMapSolution] = useState("IN-MH");

  // Match fields (picture matching)
  const [matchPairs, setMatchPairs] = useState<{imageUrl: string; text: string}[]>([
    { imageUrl: "", text: "" },
    { imageUrl: "", text: "" },
  ]);

  // Speaking fields
  const [speakingSentence, setSpeakingSentence] = useState("");
  
  // Make Sentence fields
  const [makeSentenceWord, setMakeSentenceWord] = useState("");

  // Fill in Blanks fields
  const [fillBlanksDistractors, setFillBlanksDistractors] = useState("");



  const addMatchPair = () => {
    if (matchPairs.length < 6) {
      setMatchPairs([...matchPairs, { imageUrl: "", text: "" }]);
    }
  };

  const removeMatchPair = (index: number) => {
    if (matchPairs.length > 2) {
      setMatchPairs(matchPairs.filter((_, i) => i !== index));
    }
  };

  const updateMatchPair = (index: number, field: 'imageUrl' | 'text', value: string) => {
    const updated = [...matchPairs];
    updated[index] = { ...updated[index], [field]: value };
    setMatchPairs(updated);
  };

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
        // Handle comma-separated list or single word
        const solutionVal = solution.trim().toLowerCase();
        if (solutionVal.includes(',')) {
          data = { solution: solutionVal.split(',').map(s => s.trim()).filter(s => s.length > 0) };
        } else {
          data = { solution: solutionVal };
        }
        break;
      case "select":
        data = {
          statement: statement.trim(),
          correctWords: correctWords.split(",").map(w => w.trim()),
          selectMode,
          explanation: explanation.trim(),
        };
        break;
      case "map":
        data = { solution: mapSolution, mapType: "india" };
        break;
      case "match":
        try {
          const processedPairs = await Promise.all(matchPairs.filter(p => p.imageUrl.trim() && p.text.trim()).map(async (p, idx) => {
             const finalUrl = await processImageUrl(p.imageUrl, `Pair ${idx + 1}`);
             return { ...p, imageUrl: finalUrl };
          }));
          data = { pairs: processedPairs };
        } catch (err) {
          alert((err as Error).message);
          setIsSubmitting(false);
          return;
        }
        break;
      case "speaking":
        data = { sentence: speakingSentence.trim() };
        break;
      case "make_sentence":
        data = { word: makeSentenceWord.trim() };
        break;
      case "fill_in_the_blanks":
        data = { 
          distractors: fillBlanksDistractors.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) 
        };
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
              questionType === 'match' ? "Match the fruits to their names" :
              questionType === 'speaking' ? "Read the sentence aloud" :
              questionType === 'make_sentence' ? "Make a sentence with the word..." :
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
            <p className="text-xs text-slate-500 mt-1">Word or comma-separated words (e.g., apple, banana)</p>
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
                onChange={(e) => setSelectMode(e.target.value as "single" | "multiple" | "boxed")}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="single">Single Word</option>
                <option value="multiple">Multiple Words</option>
                <option value="boxed">Boxed (Sequential)</option>
              </select>
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

        {questionType === "match" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Image-Text Pairs ({matchPairs.length}/6)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Click to upload images for each pair. Images will be cropped to 1:1 ratio.
            </p>
            <div className="space-y-3">
              {matchPairs.map((pair, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <ImageUpload
                      value={pair.imageUrl}
                      onChange={(url) => updateMatchPair(idx, 'imageUrl', url)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                     <input
                      type="text"
                      value={pair.imageUrl}
                      onChange={(e) => updateMatchPair(idx, 'imageUrl', e.target.value)}
                      placeholder="Or paste image URL..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    />
                    <input
                      type="text"
                      value={pair.text}
                      onChange={(e) => updateMatchPair(idx, 'text', e.target.value)}
                      placeholder="Label text (e.g., Apple)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <span className="text-xs text-slate-400">Pair {idx + 1}</span>
                  </div>
                  {matchPairs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMatchPair(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {matchPairs.length < 6 && (
              <button
                type="button"
                onClick={addMatchPair}
                className="mt-3 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Pair
              </button>
            )}
          </div>
        )}

        {questionType === "speaking" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sentence to Speak</label>
            <textarea
              value={speakingSentence}
              onChange={(e) => setSpeakingSentence(e.target.value)}
              placeholder="e.g., The quick brown fox jumps over the lazy dog."
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              The child must speak this sentence. Punctuation and case are ignored during validation.
            </p>
          </div>
        )}

        {questionType === "make_sentence" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Word</label>
            <input
              type="text"
              value={makeSentenceWord}
              onChange={(e) => setMakeSentenceWord(e.target.value)}
              placeholder="e.g., Apple"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              The word (or form of the word) that must be included in the sentence.
            </p>
          </div>
        )}

        {questionType === "fill_in_the_blanks" && (
          <>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
              <p className="text-sm text-blue-800">
                <strong>How to write the question:</strong> Use curly braces to create blanks.
                <br />
                Example: <code className="bg-blue-100 px-1 rounded">The sky is &#123;blue&#125; and grass is &#123;green&#125;.</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distractors (comma-separated)</label>
              <input
                type="text"
                value={fillBlanksDistractors}
                onChange={(e) => setFillBlanksDistractors(e.target.value)}
                placeholder="e.g., red, yellow, purple"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Wrong options that will be mixed with the correct answers.
              </p>
            </div>
          </>
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
  const [solution, setSolution] = useState(
    Array.isArray(data.solution) ? data.solution.join(", ") : data.solution ?? ""
  );
  const [statement, setStatement] = useState(data.statement ?? "");
  const [correctWords, setCorrectWords] = useState((data.correctWords ?? []).join(", "));
  const [selectMode, setSelectMode] = useState<"single" | "multiple" | "boxed">(data.selectMode ?? "single");
  
  // Match question fields
  const [matchPairs, setMatchPairs] = useState<{imageUrl: string; text: string}[]>(
    data.pairs ?? [{ imageUrl: "", text: "" }, { imageUrl: "", text: "" }]
  );

  // Speaking fields
  const [speakingSentence, setSpeakingSentence] = useState(
    question.questionType === "speaking" ? data.sentence ?? "" : ""
  );

  // Make Sentence fields
  const [makeSentenceWord, setMakeSentenceWord] = useState(
    question.questionType === "make_sentence" ? data.word ?? "" : ""
  );

  // Fill in Blanks fields
  const [fillBlanksDistractors, setFillBlanksDistractors] = useState(
    question.questionType === "fill_in_the_blanks" ? (data.distractors ?? []).join(", ") : ""
  );

  const addMatchPair = () => {
    if (matchPairs.length < 6) {
      setMatchPairs([...matchPairs, { imageUrl: "", text: "" }]);
    }
  };

  const removeMatchPair = (index: number) => {
    if (matchPairs.length > 2) {
      setMatchPairs(matchPairs.filter((_, i) => i !== index));
    }
  };

  const updateMatchPair = (index: number, field: 'imageUrl' | 'text', value: string) => {
    const updated = [...matchPairs];
    updated[index] = { ...updated[index], [field]: value };
    setMatchPairs(updated);
  };

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
        const solutionVal = solution.trim().toLowerCase();
        if (solutionVal.includes(',')) {
          newData = { solution: solutionVal.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) };
        } else {
          newData = { solution: solutionVal };
        }
        break;
      case "select":
        newData = {
          statement: statement.trim(),
          correctWords: correctWords.split(",").map((w: string) => w.trim()),
          selectMode,
          explanation: explanation.trim(),
        };
        break;
      case "map":
        newData = { solution: solution, mapType: "india" };
        break;
      case "match":
        try {
          const processedPairs = await Promise.all(matchPairs.filter(p => p.imageUrl.trim() && p.text.trim()).map(async (p, idx) => {
             const finalUrl = await processImageUrl(p.imageUrl, `Pair ${idx + 1}`);
             return { ...p, imageUrl: finalUrl };
          }));
          newData = { pairs: processedPairs };
        } catch (err) {
          alert((err as Error).message);
          setIsSubmitting(false);
          return;
        }
        break;
      case "speaking":
        newData = { sentence: speakingSentence.trim() };
        break;
      case "make_sentence":
        newData = { word: makeSentenceWord.trim() };
        break;
      case "fill_in_the_blanks":
        newData = { 
          distractors: fillBlanksDistractors.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) 
        };
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
            <p className="text-xs text-slate-500 mt-1">Word or comma-separated words (e.g., apple, banana)</p>
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
                onChange={(e) => setSelectMode(e.target.value as "single" | "multiple" | "boxed")}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="single">Single Word</option>
                <option value="multiple">Multiple Words</option>
                <option value="boxed">Boxed (Sequential)</option>
              </select>
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

        {question.questionType === "match" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Image-Text Pairs ({matchPairs.length}/6)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Click to upload/change images for each pair.
            </p>
            <div className="space-y-3">
              {matchPairs.map((pair, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <ImageUpload
                      value={pair.imageUrl}
                      onChange={(url) => updateMatchPair(idx, 'imageUrl', url)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                     <input
                      type="text"
                      value={pair.imageUrl}
                      onChange={(e) => updateMatchPair(idx, 'imageUrl', e.target.value)}
                      placeholder="Or paste image URL..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    />
                    <input
                      type="text"
                      value={pair.text}
                      onChange={(e) => updateMatchPair(idx, 'text', e.target.value)}
                      placeholder="Label text (e.g., Apple)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <span className="text-xs text-slate-400">Pair {idx + 1}</span>
                  </div>
                  {matchPairs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMatchPair(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {matchPairs.length < 6 && (
              <button
                type="button"
                onClick={addMatchPair}
                className="mt-3 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Pair
              </button>
            )}
          </div>
        )}

        {question.questionType === "speaking" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sentence to Speak</label>
            <textarea
              value={speakingSentence}
              onChange={(e) => setSpeakingSentence(e.target.value)}
              placeholder="e.g., The quick brown fox jumps over the lazy dog."
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {question.questionType === "make_sentence" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Word</label>
            <input
              type="text"
              value={makeSentenceWord}
              onChange={(e) => setMakeSentenceWord(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {question.questionType === "fill_in_the_blanks" && (
          <>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
              <p className="text-sm text-blue-800">
                <strong>How to edit:</strong> Use curly braces to create blanks.
                <br />
                Example: <code className="bg-blue-100 px-1 rounded">The sky is &#123;blue&#125; and grass is &#123;green&#125;.</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distractors (comma-separated)</label>
              <input
                type="text"
                value={fillBlanksDistractors}
                onChange={(e) => setFillBlanksDistractors(e.target.value)}
                placeholder="e.g., red, yellow, purple"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
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
