import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  MoreVertical, 
  MoveUp, 
  MoveDown,
  Check,
  X,
  Palette
} from "lucide-react";
import type { Doc, Id } from "@convex/_generated/dataModel";

interface GroupManagementProps {
  groups: Doc<"levelGroups">[];
}

export default function GroupManagement({ groups }: GroupManagementProps) {
  const createGroup = useMutation(api.groups.createGroup);
  const updateGroup = useMutation(api.groups.updateGroup);
  const deleteGroup = useMutation(api.groups.deleteGroup);
  const reorderGroups = useMutation(api.groups.reorderGroups);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<Id<"levelGroups"> | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    primaryColor: "#4F46E5", // Indigo 600
    emoji: "🌍"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      primaryColor: "#4F46E5",
      emoji: "🌍"
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formData.name) return;
    await createGroup({
      name: formData.name,
      description: formData.description,
      theme: {
        primaryColor: formData.primaryColor,
        emoji: formData.emoji
      },
      isEnabled: true
    });
    resetForm();
  };

  const handleUpdate = async (groupId: Id<"levelGroups">) => {
    if (!formData.name) return;
    await updateGroup({
      groupId,
      name: formData.name,
      description: formData.description,
      theme: {
        primaryColor: formData.primaryColor,
        emoji: formData.emoji
      }
    });
    resetForm();
  };

  const startEdit = (group: Doc<"levelGroups">) => {
    setFormData({
      name: group.name,
      description: group.description ?? "",
      primaryColor: group.theme?.primaryColor ?? "#4F46E5",
      emoji: group.theme?.emoji ?? "🌍"
    });
    setEditingId(group._id);
    setIsCreating(false);
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Level Groups (Worlds)</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div 
            key={group._id}
            className={`border rounded-xl p-4 transition-all ${
              editingId === group._id ? 'ring-2 ring-indigo-500 border-transparent shadow-md' : 'border-slate-200 hover:border-indigo-200'
            }`}
          >
            {editingId === group._id ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                   <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                    className="w-12 px-2 py-1 border rounded"
                    placeholder="🌍"
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="Group Name"
                    autoFocus
                  />
                </div>
                <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Description"
                  />
                 <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                        className="w-8 h-8 rounded cursor-pointer"
                    />
                    <div className="flex-1 flex justify-end gap-2">
                        <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                            <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdate(group._id)} className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
                            <Check className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{group.theme?.emoji ?? "🌍"}</span>
                    <div>
                        <h3 className="font-semibold text-slate-900">{group.name}</h3>
                        <p className="text-xs text-slate-500">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                        onClick={() => reorderGroups({ groupId: group._id, direction: "up" })}
                        className="p-1 text-slate-400 hover:text-slate-600"
                    >
                        <MoveUp className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={() => reorderGroups({ groupId: group._id, direction: "down" })}
                        className="p-1 text-slate-400 hover:text-slate-600"
                    >
                        <MoveDown className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={() => startEdit(group)}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                         onClick={() => {
                             if(confirm("Delete group?")) deleteGroup({ groupId: group._id }).catch(e => alert(e.message));
                         }}
                        className="p-1 text-slate-400 hover:text-red-600"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <div className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {group.isEnabled ? 'Active' : 'Hidden'}
                    </div>
                    {/* Placeholder for level count if we want to pass it */}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Create New Card */}
        {isCreating && (
          <div className="border border-indigo-200 ring-2 ring-indigo-500/20 rounded-xl p-4 bg-indigo-50/50">
             <div className="space-y-3">
                <div className="flex gap-2">
                   <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                    className="w-12 px-2 py-1 border rounded"
                    placeholder="🌍"
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="New World Name"
                    autoFocus
                  />
                </div>
                <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Description (e.g. The Beginning)"
                  />
                 <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                        className="w-8 h-8 rounded cursor-pointer"
                    />
                    <div className="flex-1 flex justify-end gap-2">
                        <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                            <X className="w-4 h-4" />
                        </button>
                        <button onClick={handleCreate} className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
                            <Check className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
