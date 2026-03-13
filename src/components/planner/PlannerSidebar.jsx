import React from 'react';
import { Search, Clock, Briefcase, Plus } from 'lucide-react';

/**
 * Unscheduled tasks panel for the Weekly Planner sidebar.
 * Supports:
 *  - HTML5 drag onto the grid
 *  - Quick-schedule button (fallback if drag doesn't work in the browser)
 */
export default function PlannerSidebar({ 
    unscheduledTasks,
    onDragStart,
    onQuickSchedule,
    searchQuery,
    setSearchQuery,
}) {
    const priorityColors = {
        critical: 'bg-red-500/15 border-red-500/30 text-red-400',
        high:     'bg-amber-500/15 border-amber-500/30 text-amber-400',
        medium:   'bg-blue-500/15 border-blue-500/30 text-blue-400',
        low:      'bg-slate-800 border-slate-700 text-slate-400',
    };

    const filtered = unscheduledTasks.filter(t =>
        t.title?.toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    return (
        <aside className="w-72 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-800">
                <h2 className="font-black text-slate-400 text-sm uppercase tracking-wider mb-3">Sin Planificar</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar tarea..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Quick-schedule tip */}
            <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 text-[10px] text-indigo-400 font-bold">
                💡 Arrastra a la grilla o usa <span className="bg-indigo-500/25 px-1 rounded">+</span> para planificar hoy
            </div>

            <ul className="flex-1 overflow-y-auto p-3 space-y-2">
                {filtered.length === 0 && (
                    <li className="text-center py-10 text-slate-400 text-xs font-bold uppercase">
                        Todas las tareas están planificadas ✓
                    </li>
                )}
                {filtered.map(task => {
                    const prioClass = priorityColors[task.priority] || priorityColors.low;
                    const remainingHours = (task.estimatedHours || 0) - (task.plannedHours || 0);

                    return (
                        <li
                            key={task.id}
                            draggable
                            onDragStart={e => {
                                e.dataTransfer.setData('text/plain', task.id);
                                e.dataTransfer.effectAllowed = 'copy';
                                onDragStart && onDragStart(task);
                            }}
                            className={`group relative p-3 rounded-2xl border-2 ${prioClass} select-none transition-all hover:shadow-md cursor-grab active:cursor-grabbing`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-sm leading-tight line-clamp-2 flex-1">{task.title}</p>

                                {/* Quick-schedule button */}
                                {onQuickSchedule && (
                                    <button
                                        onClick={e => { e.stopPropagation(); onQuickSchedule(task); }}
                                        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700"
                                        title="Planificar para hoy a las 9am"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-2 text-[10px] font-black uppercase opacity-80">
                                <span className="flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    <span className="truncate max-w-[100px]">{task.projectName || '—'}</span>
                                </span>
                                {(task.estimatedHours > 0) && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {remainingHours > 0 ? `${remainingHours}h pend.` : `${task.estimatedHours}h est.`}
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="p-3 border-t border-slate-800 bg-slate-800 text-[10px] font-bold text-slate-400 uppercase text-center">
                {filtered.length} tareas sin planificar
            </div>
        </aside>
    );
}
