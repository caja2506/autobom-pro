import React, { useState, useMemo, useCallback } from 'react';
import {
    DndContext, DragOverlay, closestCorners,
    PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useAppData } from '../contexts/AppDataContext';
import TaskCard from '../components/tasks/TaskCard';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { updateTaskStatus } from '../services/taskService';
import { startTimer, stopTimer, getActiveTimer } from '../services/timeService';
import {
    TASK_STATUS, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG
} from '../models/schemas';
import {
    Plus, Search, ListTodo, ArrowRight
} from 'lucide-react';

// ============================================================
// DROPPABLE COLUMN COMPONENT
// ============================================================

function KanbanColumn({ status, children, taskCount }) {
    const cfg = TASK_STATUS_CONFIG[status];
    const { isOver, setNodeRef } = useDroppable({
        id: `column-${status}`,
        data: { type: 'column', status },
    });

    return (
        <div className="min-w-[280px] w-[280px] flex flex-col rounded-2xl">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{cfg.label}</h3>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
                        {taskCount}
                    </span>
                </div>
            </div>

            {/* Column Drop Zone */}
            <div
                ref={setNodeRef}
                className={`flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin pb-2 rounded-2xl transition-all duration-200 ${isOver
                    ? 'bg-indigo-500/10 ring-2 ring-indigo-500/40 ring-dashed p-2'
                    : 'p-0'
                    }`}
                style={{ minHeight: '120px' }}
            >
                {children}
            </div>
        </div>
    );
}

// ============================================================
// KANBAN COLUMNS CONFIG
// ============================================================

const KANBAN_COLUMNS = [
    TASK_STATUS.BACKLOG,
    TASK_STATUS.PENDING,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.VALIDATION,
    TASK_STATUS.COMPLETED,
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TaskManager() {
    const { user } = useAuth();
    const { canEdit, canDelete } = useRole();
    const { engProjects, engTasks, engSubtasks, teamMembers, taskTypes } = useAppData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterPriority, setFilterPriority] = useState('');

    // Drag state
    const [activeId, setActiveId] = useState(null);

    const openNew = () => { setSelectedTask(null); setIsModalOpen(true); };
    const openTask = (task) => { setSelectedTask(task); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setSelectedTask(null); };

    // --- Sensors (pointer + touch with activation distance) ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 6 },
        }),
    );

    // --- Filter tasks ---
    const filteredTasks = useMemo(() => {
        return engTasks.filter(task => {
            const s = search.toLowerCase();
            const matchSearch = !s || (task.title || '').toLowerCase().includes(s) || (task.description || '').toLowerCase().includes(s);
            const matchProject = !filterProject || task.projectId === filterProject;
            const matchAssignee = !filterAssignee || task.assignedBy === filterAssignee || task.assignedTo === filterAssignee;
            const matchPriority = !filterPriority || task.priority === filterPriority;
            return matchSearch && matchProject && matchAssignee && matchPriority;
        });
    }, [engTasks, search, filterProject, filterAssignee, filterPriority]);

    // --- Group by status ---
    const tasksByStatus = useMemo(() => {
        const map = {};
        Object.values(TASK_STATUS).forEach(s => { map[s] = []; });
        filteredTasks.forEach(t => {
            if (map[t.status]) map[t.status].push(t);
            else map[TASK_STATUS.BACKLOG].push(t);
        });
        // Sort each column by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        Object.keys(map).forEach(key => {
            map[key].sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
        });
        return map;
    }, [filteredTasks]);

    // Active dragged task
    const activeTask = activeId ? engTasks.find(t => t.id === activeId) : null;

    // Blocked/cancelled
    const blockedTasks = tasksByStatus[TASK_STATUS.BLOCKED] || [];
    const cancelledTasks = tasksByStatus[TASK_STATUS.CANCELLED] || [];

    // --- DnD Handlers ---
    const handleDragStart = useCallback((event) => {
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback(async (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over || !canEdit) return;

        const taskId = active.id;
        const task = engTasks.find(t => t.id === taskId);
        if (!task) return;

        // Determine target status
        let targetStatus = null;

        if (over.data?.current?.type === 'column') {
            targetStatus = over.data.current.status;
        } else if (over.data?.current?.type === 'task') {
            // Dropped over another task — use that task's status
            const overTask = engTasks.find(t => t.id === over.id);
            if (overTask) targetStatus = overTask.status;
        }

        if (!targetStatus || targetStatus === task.status) return;

        // Optimistic update is handled by Firestore subscription
        try {
            await updateTaskStatus(taskId, targetStatus, task.projectId);

            // Auto-Timer logic for IN_PROGRESS
            if (targetStatus === TASK_STATUS.IN_PROGRESS && task.status !== TASK_STATUS.IN_PROGRESS) {
                const currentActive = getActiveTimer();
                if (!currentActive) {
                    await startTimer({ taskId, projectId: task.projectId, userId: user.uid, notes: 'Auto-started from Kanban' });
                }
            } else if (task.status === TASK_STATUS.IN_PROGRESS && targetStatus !== TASK_STATUS.IN_PROGRESS) {
                const currentActive = getActiveTimer();
                if (currentActive && currentActive.taskId === taskId) {
                    await stopTimer(currentActive.logId);
                }
            }
        } catch (err) {
            console.error('Error updating task status:', err);
        }
    }, [engTasks, canEdit, user]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    return (
        <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
            <TaskDetailModal
                isOpen={isModalOpen}
                onClose={closeModal}
                task={selectedTask}
                projects={engProjects}
                teamMembers={teamMembers}
                subtasks={selectedTask ? engSubtasks.filter(s => s.taskId === selectedTask.id) : []}
                taskTypes={taskTypes}
                userId={user?.uid}
                canEdit={canEdit}
                canDelete={canDelete}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 shadow-lg flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
                        <ListTodo className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="font-black text-xl text-white tracking-tight">Tablero de Tareas</h2>
                        <p className="text-[10px] text-slate-400 font-bold">
                            {engTasks.length} tarea{engTasks.length !== 1 ? 's' : ''} en total
                            <span className="text-slate-600 mx-1.5">•</span>
                            <ArrowRight className="w-3 h-3 inline text-indigo-400" /> Arrastra para mover
                        </p>
                    </div>
                </div>
                {canEdit && (
                    <button
                        onClick={openNew}
                        className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-black shadow-lg shadow-indigo-500/20 flex items-center justify-center active:scale-95 transition-transform text-sm border border-indigo-500"
                    >
                        <Plus className="mr-2 w-4 h-4" /> Nueva Tarea
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex-shrink-0">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar tareas..."
                        className="pl-10 pr-4 py-2.5 w-full border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                    />
                </div>
                <select
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value)}
                    className="px-3 py-2.5 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800 min-w-[140px]"
                >
                    <option value="">Todos los proyectos</option>
                    {engProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select
                    value={filterAssignee}
                    onChange={e => setFilterAssignee(e.target.value)}
                    className="px-3 py-2.5 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800 min-w-[140px]"
                >
                    <option value="">Todos los miembros</option>
                    {teamMembers.map(u => <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>)}
                </select>
                <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="px-3 py-2.5 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800 min-w-[120px]"
                >
                    <option value="">Todas las prioridades</option>
                    {Object.entries(TASK_PRIORITY_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                    ))}
                </select>
            </div>

            {/* Kanban Board with DnD */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-h-[400px]">
                        {KANBAN_COLUMNS.map((status) => {
                            const columnTasks = tasksByStatus[status] || [];
                            return (
                                <KanbanColumn key={status} status={status} taskCount={columnTasks.length}>
                                    <SortableContext
                                        items={columnTasks.map(t => t.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {columnTasks.length === 0 ? (
                                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center min-h-[80px] flex items-center justify-center">
                                                <p className="text-[11px] text-slate-600 font-bold">Sin tareas</p>
                                            </div>
                                        ) : (
                                            columnTasks.map(task => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    project={engProjects.find(p => p.id === task.projectId)}
                                                    teamMembers={teamMembers}
                                                    subtasks={engSubtasks.filter(s => s.taskId === task.id)}
                                                    onClick={() => openTask(task)}
                                                />
                                            ))
                                        )}
                                    </SortableContext>
                                </KanbanColumn>
                            );
                        })}
                    </div>
                </div>

                {/* Drag Overlay — renders the card being dragged */}
                <DragOverlay dropAnimation={{
                    duration: 200,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                    {activeTask ? (
                        <div className="w-[280px]">
                            <TaskCard
                                task={activeTask}
                                project={engProjects.find(p => p.id === activeTask.projectId)}
                                teamMembers={teamMembers}
                                subtasks={engSubtasks.filter(s => s.taskId === activeTask.id)}
                                onClick={() => { }}
                                isDragOverlay
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Blocked / Cancelled Section */}
            {(blockedTasks.length > 0 || cancelledTasks.length > 0) && (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex-shrink-0">
                    {blockedTasks.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TASK_STATUS_CONFIG.blocked.color }} />
                                <h3 className="text-xs font-black text-red-400 uppercase tracking-widest">
                                    Bloqueadas ({blockedTasks.length})
                                </h3>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {blockedTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        project={engProjects.find(p => p.id === task.projectId)}
                                        teamMembers={teamMembers}
                                        subtasks={engSubtasks.filter(s => s.taskId === task.id)}
                                        onClick={() => openTask(task)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {cancelledTasks.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TASK_STATUS_CONFIG.cancelled.color }} />
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Canceladas ({cancelledTasks.length})
                                </h3>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {cancelledTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        project={engProjects.find(p => p.id === task.projectId)}
                                        teamMembers={teamMembers}
                                        subtasks={engSubtasks.filter(s => s.taskId === task.id)}
                                        onClick={() => openTask(task)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
