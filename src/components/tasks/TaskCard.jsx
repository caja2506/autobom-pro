import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDuration, getActiveTimer, formatElapsed } from '../../services/timeService';
import {
    AlertTriangle, CheckCheck, User, Calendar, Clock,
    GripVertical
} from 'lucide-react';
import {
    TASK_STATUS_CONFIG,
    TASK_PRIORITY_CONFIG,
} from '../../models/schemas';

// Mapping tailwind color safe-classes so they don't get purged
const PRIORITY_STYLES = {
    low: { // Verde
        dot: 'bg-emerald-500',
        text: 'text-emerald-700',
        bg: 'bg-emerald-50/40 border-emerald-200',
        shadow: 'hover:shadow-emerald-200/50',
    },
    medium: { // Amarillo
        dot: 'bg-amber-400',
        text: 'text-amber-700',
        bg: 'bg-amber-50/40 border-amber-200',
        shadow: 'hover:shadow-amber-200/50',
    },
    high: { // Naranja
        dot: 'bg-orange-500',
        text: 'text-orange-700',
        bg: 'bg-orange-50/60 border-orange-300',
        shadow: 'hover:shadow-orange-300/50',
    },
    critical: { // Rojo Intenso
        dot: 'bg-red-700',
        text: 'text-red-800',
        bg: 'bg-red-100/70 border-red-400 ring-1 ring-red-400/30',
        shadow: 'hover:shadow-red-500/40',
    }
};

export default function TaskCard({ task, project, teamMembers, subtasks = [], onClick, isDragOverlay = false }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const statusConfig = TASK_STATUS_CONFIG[task.status] || {};
    const priorityConfig = TASK_PRIORITY_CONFIG[task.priority] || {};

    // Safely fallback style to medium if priority isn't strictly recognized
    const priorityStyle = PRIORITY_STYLES[task.priority?.toLowerCase()] || PRIORITY_STYLES.medium;

    const assigner = teamMembers.find(u => u.uid === task.assignedBy);
    const assignee = teamMembers.find(u => u.uid === task.assignedTo);

    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : null;

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

    // Live Timer Engine specifically for IN_PROGRESS tasks
    const [liveElapsed, setLiveElapsed] = useState(null);

    useEffect(() => {
        let interval;
        const checkAndTick = () => {
            if (task.status === 'in_progress') {
                const active = getActiveTimer();
                if (active && active.taskId === task.id && active.startTime) {
                    setLiveElapsed(formatElapsed(active.startTime));
                } else {
                    setLiveElapsed(null);
                }
            } else {
                setLiveElapsed(null);
            }
        };

        checkAndTick(); // initial check

        if (task.status === 'in_progress') {
            interval = setInterval(checkAndTick, 1000);
        }

        return () => clearInterval(interval);
    }, [task.status, task.id]);

    // Base card class combining Tailwind, priority styles, and dynamic states
    let cardClassName = `rounded-2xl border-2 p-4 transition-all duration-200 ease-in-out group cursor-grab active:cursor-grabbing backdrop-blur-sm relative overflow-hidden ${priorityStyle.bg} ${priorityStyle.shadow}`;

    if (isDragging) {
        cardClassName += ' shadow-2xl ring-2 ring-indigo-400 scale-105 z-50';
    } else if (isDragOverlay) {
        cardClassName += ' shadow-2xl ring-2 ring-indigo-400 rotate-2';
    } else {
        cardClassName += ' hover:shadow-lg hover:-translate-y-1';
    }

    if (isOverdue) {
        cardClassName += ' border-red-400 shadow-red-100/50';
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cardClassName}
        >
            {/* Optional gradient accent on the left border to make it pop more */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${priorityStyle.dot} opacity-80`} />

            {/* Top Row: Drag Handle + Priority + Project */}
            <div className="flex items-center justify-between mb-2.5 ml-1">
                <div className="flex items-center gap-2">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 -ml-1 text-slate-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing touch-none rounded-md hover:bg-white/50 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1.5 bg-white/60 px-2 py-0.5 rounded-full border border-white/40 shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${priorityStyle.dot} shadow-inner`}></span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${priorityStyle.text}`}>
                            {priorityConfig.label}
                        </span>
                    </div>
                </div>
                {project && (
                    <span className="text-[10px] font-bold text-slate-500 bg-white/70 px-2.5 py-0.5 rounded-full truncate max-w-[120px] shadow-sm border border-white/50">
                        {project.name}
                    </span>
                )}
            </div>

            {/* Title — clickable to open modal */}
            <h4
                className="font-bold text-[15px] text-slate-800 leading-snug mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors cursor-pointer ml-1 drop-shadow-sm"
                onClick={onClick}
            >
                {task.title}
            </h4>

            {/* Description preview */}
            {task.description && (
                <p className="text-xs text-slate-500/90 line-clamp-2 mb-4 leading-relaxed ml-1 font-medium">
                    {task.description}
                </p>
            )}

            {/* Subtask progress */}
            {subtaskProgress != null && (
                <div className="mb-4 ml-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center">
                            <CheckCheck className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                            {completedSubtasks} / {totalSubtasks}
                        </span>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">{subtaskProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/80 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${subtaskProgress === 100 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-indigo-400 to-blue-500'} shadow-sm`}
                            style={{ width: `${subtaskProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Bottom Row: Assignees + Due Date */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 ml-1">
                {/* Assignee */}
                <div className="flex items-center">
                    {assignee ? (
                        <div className="flex items-center gap-1.5" title={`Asignado a: ${assignee.displayName || assignee.email}`}>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xs font-black text-amber-700 ring-2 ring-white shadow-sm">
                                {(assignee.displayName || assignee.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5 tracking-wider">Asignado a</span>
                                <span className="text-[11px] font-bold text-slate-700 leading-none truncate max-w-[85px]">
                                    {assignee.displayName?.split(' ')[0] || assignee.email?.split('@')[0]}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100/80 flex items-center justify-center ring-2 ring-white shadow-sm border border-slate-200/50">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 italic">Sin asignar</span>
                        </div>
                    )}
                </div>

                {/* Metrics: Hours & Dates */}
                <div className="flex items-center gap-2.5">
                    {/* Hours Tag / Live Timer */}
                    {liveElapsed ? (
                        <span className="text-[10px] font-black flex items-center gap-1 px-2 py-1 rounded-md shadow-sm border bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse ring-1 ring-indigo-300">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            <span className="tabular-nums tracking-tight">{liveElapsed}</span>
                        </span>
                    ) : (task.actualHours > 0 || task.estimatedHours > 0) ? (
                        <span className={`text-[10px] font-black flex items-center gap-1 px-2 py-1 rounded-md shadow-sm border ${task.actualHours > 0 && task.estimatedHours > 0 && task.actualHours > task.estimatedHours
                            ? 'bg-red-50 text-red-600 border-red-100' // Exceeded
                            : task.actualHours > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' // On track
                                : 'bg-white text-slate-500 border-slate-200' // Not started
                            }`}>
                            <Clock className={`w-3 h-3 ${task.actualHours > task.estimatedHours ? 'text-red-500' : 'text-slate-400'}`} />
                            {task.actualHours > 0 && task.estimatedHours > 0
                                ? <>{formatDuration(task.actualHours)} <span className="opacity-50">/ {task.estimatedHours}h</span></>
                                : task.actualHours > 0
                                    ? formatDuration(task.actualHours)
                                    : `${task.estimatedHours}h est.`
                            }
                        </span>
                    ) : null}

                    {/* Date Tag */}
                    {task.dueDate && (
                        <span className={`text-[10px] font-black flex items-center gap-1 px-2 py-1 rounded-md shadow-sm border ${isOverdue
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-white text-slate-500 border-slate-200'
                            }`}>
                            <Calendar className={`w-3 h-3 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                            {new Date(task.dueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                        </span>
                    )}
                </div>
            </div>

            {/* Blocked indicator */}
            {task.status === 'blocked' && task.blockedReason && (
                <div className="mt-3 bg-red-50/90 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2 shadow-sm ml-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] text-red-700 font-bold leading-tight">{task.blockedReason}</span>
                </div>
            )}
        </div>
    );
}
