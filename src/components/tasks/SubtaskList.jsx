import React, { useState, useRef } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, X } from 'lucide-react';
import { createSubtask, toggleSubtask, deleteSubtask } from '../../services/taskService';

export default function SubtaskList({ subtasks = [], taskId, readOnly = false }) {
    const [newTitle, setNewTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const inputRef = useRef(null);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        await createSubtask(taskId, newTitle.trim());
        setNewTitle('');
        inputRef.current?.focus();
    };

    const handleToggle = async (subtask) => {
        await toggleSubtask(subtask.id, !subtask.completed);
    };

    const handleDelete = async (subtaskId) => {
        await deleteSubtask(subtaskId);
    };

    const completed = subtasks.filter(s => s.completed).length;
    const total = subtasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Subtareas {total > 0 && `(${completed}/${total})`}
                </h4>
                {total > 0 && (
                    <span className={`text-xs font-bold ${pct === 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                        {pct}%
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {total > 0 && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}

            {/* Subtask items */}
            <div className="space-y-1">
                {subtasks.map((st) => (
                    <div
                        key={st.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl group transition-all ${st.completed ? 'bg-green-50/50' : 'hover:bg-slate-50'
                            }`}
                    >
                        <button
                            onClick={() => !readOnly && handleToggle(st)}
                            disabled={readOnly}
                            className="flex-shrink-0 transition-transform active:scale-90"
                        >
                            {st.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-400" />
                            )}
                        </button>
                        <span className={`text-sm flex-1 ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                            }`}>
                            {st.title}
                        </span>
                        {!readOnly && (
                            <button
                                onClick={() => handleDelete(st.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add subtask */}
            {!readOnly && (
                <>
                    {isAdding ? (
                        <form onSubmit={handleAdd} className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Describe la subtarea..."
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                autoFocus
                            />
                            <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-90 transition-all">
                                <Plus className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsAdding(false); setNewTitle(''); }}
                                className="p-2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Agregar subtarea
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
