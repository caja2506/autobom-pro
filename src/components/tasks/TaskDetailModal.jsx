import React, { useState, useEffect } from 'react';
import {
    X, Save, Trash2, ListTodo, User, Calendar, Clock,
    Flag, FolderGit2, AlertTriangle, GanttChartSquare, BarChart2, Settings2
} from 'lucide-react';
import {
    TASK_STATUS, TASK_STATUS_CONFIG,
    TASK_PRIORITY, TASK_PRIORITY_CONFIG,
} from '../../models/schemas';
import SubtaskList from './SubtaskList';
import { createTask, updateTask, updateTaskStatus, deleteTask } from '../../services/taskService';
import { startTimer, stopTimer, getActiveTimer } from '../../services/timeService';
import { useAppData } from '../../contexts/AppDataContext';

const STATUS_FLOW = [
    TASK_STATUS.BACKLOG,
    TASK_STATUS.PENDING,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.VALIDATION,
    TASK_STATUS.COMPLETED,
];

// Tailwind safely-mapped classes for statuses
const STATUS_UI_COLORS = {
    slate: { bg: 'bg-slate-500', text: 'text-slate-500' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-500' },
    green: { bg: 'bg-emerald-500', text: 'text-emerald-500' },
    red: { bg: 'bg-red-500', text: 'text-red-500' },
    gray: { bg: 'bg-gray-500', text: 'text-gray-500' },
};

export default function TaskDetailModal({
    isOpen, onClose, task, projects, teamMembers, subtasks,
    taskTypes, userId, canEdit, canDelete
}) {
    const { setIsDelayReportOpen, setDelayReportTarget, setListManager } = useAppData();
    const isNew = !task;

    const [form, setForm] = useState({
        title: '',
        description: '',
        projectId: '',
        assignedBy: userId || '',
        assignedTo: '',
        priority: TASK_PRIORITY.MEDIUM,
        status: TASK_STATUS.BACKLOG,
        taskTypeId: '',
        dueDate: '',
        estimatedHours: '',
        blockedReason: '',
        // Gantt fields
        showInGantt: false,
        plannedStartDate: '',
        plannedEndDate: '',
        percentComplete: 0,
        milestone: false,
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const toDate = (iso) => iso ? iso.substring(0, 10) : '';
        if (task) {
            setForm({
                title: task.title || '',
                description: task.description || '',
                projectId: task.projectId || '',
                assignedBy: task.assignedBy || userId || '',
                assignedTo: task.assignedTo || '',
                priority: task.priority || TASK_PRIORITY.MEDIUM,
                status: task.status || TASK_STATUS.BACKLOG,
                taskTypeId: task.taskTypeId || '',
                dueDate: toDate(task.dueDate),
                estimatedHours: task.estimatedHours || '',
                blockedReason: task.blockedReason || '',
                // Gantt fields
                showInGantt: task.showInGantt ?? false,
                plannedStartDate: toDate(task.plannedStartDate),
                plannedEndDate: toDate(task.plannedEndDate),
                percentComplete: task.percentComplete ?? 0,
                milestone: task.milestone ?? false,
            });
        } else {
            setForm({
                title: '', description: '', projectId: '', assignedBy: userId || '',
                assignedTo: '', priority: TASK_PRIORITY.MEDIUM,
                status: TASK_STATUS.BACKLOG, taskTypeId: '', dueDate: '',
                estimatedHours: '', blockedReason: '',
                showInGantt: false, plannedStartDate: '', plannedEndDate: '', percentComplete: 0, milestone: false,
            });
        }
    }, [task]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setIsSaving(true);
        try {
            const toISO = (d) => d ? new Date(d + 'T00:00:00').toISOString() : null;
            const data = {
                ...form,
                dueDate: toISO(form.dueDate),
                estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : 0,
                // Gantt
                plannedStartDate: toISO(form.plannedStartDate),
                plannedEndDate: toISO(form.plannedEndDate),
                percentComplete: Number(form.percentComplete ?? 0),
            };
            if (isNew) {
                await createTask(data, userId);
            } else {
                await updateTask(task.id, data);
            }
            onClose();
        } catch (err) {
            console.error('Error saving task:', err);
        }
        setIsSaving(false);
    };
    const handleStatusChange = async (newStatus) => {
        if (!task) return;
        const oldStatus = form.status;
        setForm(f => ({ ...f, status: newStatus }));
        await updateTaskStatus(task.id, newStatus, task.projectId || form.projectId);

        // Auto-Timer logic for IN_PROGRESS
        if (newStatus === TASK_STATUS.IN_PROGRESS && oldStatus !== TASK_STATUS.IN_PROGRESS) {
            const currentActive = getActiveTimer();
            if (!currentActive && userId) {
                await startTimer({ taskId: task.id, projectId: task.projectId || form.projectId, userId, notes: 'Auto-started in detail modal' });
            }
        } else if (oldStatus === TASK_STATUS.IN_PROGRESS && newStatus !== TASK_STATUS.IN_PROGRESS) {
            const currentActive = getActiveTimer();
            if (currentActive && currentActive.taskId === task.id) {
                await stopTimer(currentActive.logId);
            }
        }
    };

    const handleDelete = async () => {
        if (!task || !confirm('¿Eliminar esta tarea y todas sus subtareas?')) return;
        await deleteTask(task.id);
        onClose();
    };

    const currentStatusCfg = TASK_STATUS_CONFIG[form.status] || {};
    const statusColorObj = STATUS_UI_COLORS[currentStatusCfg.color] || STATUS_UI_COLORS.slate;

    const engineers = teamMembers.filter(u => u.teamRole === 'engineer' || u.teamRole === 'team_lead' || u.teamRole === 'manager' || !u.teamRole);
    const technicians = teamMembers.filter(u => u.teamRole === 'technician' || !u.teamRole);

    return (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-start justify-center p-4 pt-8 overflow-y-auto">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl animate-in zoom-in-95 duration-200 my-4 flex flex-col max-h-[90vh] ring-1 ring-slate-700 border border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-800`}>
                            <ListTodo className={`w-5 h-5 ${statusColorObj.text}`} />
                        </div>
                        <div>
                            <h2 className="font-black text-xl tracking-tight">{isNew ? 'Nueva Tarea' : 'Editar Tarea'}</h2>
                            {!isNew && (
                                <span className="text-[10px] font-mono text-slate-400">{task.id.slice(0, 8)}...</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isNew && canDelete && (
                            <button
                                onClick={handleDelete}
                                className="p-2 text-red-400 hover:text-red-400 hover:bg-red-500/15 rounded-xl transition-all"
                                title="Eliminar tarea"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-800 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body - Two Columns on Large Screens */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                    {/* LEFT COLUMN: Data Form */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-5 lg:border-r border-slate-800">
                        {/* Title */}
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Título *</span>
                            <input
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="Describe la tarea..."
                                className="w-full px-4 py-3 border border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                disabled={!canEdit}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Descripción</span>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Detalles, notas, instrucciones..."
                                className="w-full px-4 py-3 border border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                rows={4}
                                disabled={!canEdit}
                            />
                        </div>

                        {/* Row: Project + Task Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                                    <FolderGit2 className="w-3 h-3 inline mr-1" />Proyecto
                                </span>
                                <select
                                    value={form.projectId}
                                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                    disabled={!canEdit}
                                >
                                    <option value="">Sin proyecto</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center justify-between ml-1 mb-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de tarea</span>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => setListManager({ isOpen: true, type: 'taskType', title: 'Gestionar Tipos de Tarea' })}
                                            className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                                            title="Gestionar tipos de tarea"
                                        >
                                            <Settings2 className="w-3 h-3" /> Gestionar
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={form.taskTypeId}
                                    onChange={e => setForm({ ...form, taskTypeId: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                    disabled={!canEdit}
                                >
                                    <option value="">General</option>
                                    {taskTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row: Priority + Due Date + Estimated Hours */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                                    <Flag className="w-3 h-3 inline mr-1" />Prioridad
                                </span>
                                <select
                                    value={form.priority}
                                    onChange={e => setForm({ ...form, priority: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                    disabled={!canEdit}
                                >
                                    {Object.entries(TASK_PRIORITY_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                                    <Calendar className="w-3 h-3 inline mr-1" />Fecha límite
                                </span>
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                    disabled={!canEdit}
                                />
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                                    <Clock className="w-3 h-3 inline mr-1" />Horas est.
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={form.estimatedHours}
                                    onChange={e => setForm({ ...form, estimatedHours: e.target.value })}
                                    placeholder="0"
                                    className="w-full px-3 py-2.5 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

                        {/* Row: Assigned By / To */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                                    <User className="w-3 h-3 inline mr-1" />Asignado por
                                </span>
                                <select
                                    value={form.assignedBy}
                                    onChange={e => setForm({ ...form, assignedBy: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                    disabled={!canEdit}
                                >
                                    <option value="">Desconocido</option>
                                    {teamMembers.map(u => (
                                        <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                                    <User className="w-3 h-3 inline mr-1" />Asignado a
                                </span>
                                <select
                                    value={form.assignedTo}
                                    onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800"
                                    disabled={!canEdit}
                                >
                                    <option value="">Sin asignar</option>
                                    {teamMembers.map(u => (
                                        <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Subtasks (only for existing tasks) */}
                        {!isNew && (
                            <div className="border-t border-slate-700 pt-5 mt-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Sub-tareas</span>
                                <SubtaskList subtasks={subtasks} taskId={task.id} readOnly={!canEdit} />
                            </div>
                        )}

                    </div>

                    {/* RIGHT COLUMN: Status + Gantt */}
                    <div className="w-full lg:w-80 flex flex-col flex-shrink-0 bg-slate-800 lg:bg-transparent overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {/* Status Flow (for existing tasks) */}
                            {!isNew && (
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-700 pb-2">Ciclo de la Tarea</span>
                                    <div className="flex flex-col gap-2">
                                        {STATUS_FLOW.map((s, idx) => {
                                            const cfg = TASK_STATUS_CONFIG[s];
                                            const isActive = form.status === s;
                                            const isPast = STATUS_FLOW.indexOf(form.status) > idx;

                                            const uiColor = STATUS_UI_COLORS[cfg.color] || STATUS_UI_COLORS.slate;

                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => canEdit && handleStatusChange(s)}
                                                    disabled={!canEdit}
                                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2 border ${isActive
                                                        ? `${uiColor.bg} text-white shadow-md border-transparent scale-105 origin-left`
                                                        : isPast
                                                            ? 'bg-slate-800/80 text-slate-400 border-transparent hover:bg-slate-700'
                                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                                                        }`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : isPast ? uiColor.bg : 'bg-slate-600'}`} />
                                                    {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Action statuses */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                                        {[TASK_STATUS.BLOCKED, TASK_STATUS.CANCELLED].map(s => {
                                            const cfg = TASK_STATUS_CONFIG[s];
                                            const isActive = form.status === s;
                                            const uiColor = STATUS_UI_COLORS[cfg.color] || STATUS_UI_COLORS.slate;

                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => {
                                                        if (!canEdit) return;
                                                        if (s === TASK_STATUS.BLOCKED) {
                                                            setDelayReportTarget({ type: 'task', id: task.id, projectId: task.projectId || form.projectId });
                                                            setIsDelayReportOpen(true);
                                                            onClose();
                                                        } else {
                                                            handleStatusChange(s);
                                                        }
                                                    }}
                                                    disabled={!canEdit}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${isActive
                                                        ? `${uiColor.bg} text-white shadow-md border-transparent`
                                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-600'
                                                        }`}
                                                >
                                                    {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Blocked reason */}
                                    {form.status === 'blocked' && (
                                        <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 animate-in fade-in duration-200 shadow-inner mt-2">
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                                                <AlertTriangle className="w-3 h-3" /> Motivo bloqueo
                                            </span>
                                            <textarea
                                                value={form.blockedReason}
                                                onChange={e => setForm({ ...form, blockedReason: e.target.value })}
                                                placeholder="Razón..."
                                                className="w-full px-2 py-1.5 border border-red-500/30 rounded-lg text-xs bg-slate-800 outline-none focus:ring-1 focus:ring-red-400 text-red-300"
                                                rows={2}
                                                disabled={!canEdit}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── GANTT QUICK-ADD (right column) ─── */}
                            {canEdit && (
                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <GanttChartSquare className="w-3.5 h-3.5" />
                                            Gantt
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, showInGantt: !f.showInGantt }))}
                                            className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${form.showInGantt ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                        >
                                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.showInGantt ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>

                                    {/* Dates — always show if showInGantt */}
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Inicio planif.</span>
                                            <input
                                                type="date"
                                                value={form.plannedStartDate}
                                                onChange={e => setForm(f => ({ ...f, plannedStartDate: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between ml-0.5 mb-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin planif.</span>
                                                {form.dueDate && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, plannedEndDate: f.dueDate }))}
                                                        className="text-[9px] font-bold text-indigo-500 hover:text-indigo-400 underline"
                                                    >
                                                        ← usar fecha límite
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="date"
                                                value={form.plannedEndDate}
                                                onChange={e => setForm(f => ({ ...f, plannedEndDate: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% Avance</span>
                                                <span className="text-xs font-bold text-indigo-500">{form.percentComplete}%</span>
                                            </div>
                                            <input
                                                type="range" min={0} max={100} step={5}
                                                value={form.percentComplete}
                                                onChange={e => setForm(f => ({ ...f, percentComplete: Number(e.target.value) }))}
                                                className="w-full accent-indigo-500"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, milestone: !f.milestone }))}
                                                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${form.milestone ? 'bg-amber-400 border-amber-500' : 'border-slate-600 bg-slate-800'}`}
                                            >
                                                {form.milestone && <span className="text-white text-[8px] font-black">✓</span>}
                                            </button>
                                            <span className="text-[10px] font-medium text-slate-500">Es un hito <span className="text-amber-400">◆</span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                {canEdit && (
                    <div className="p-4 lg:p-6 border-t border-slate-800 flex gap-3 bg-slate-800/50 rounded-b-3xl flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="flex-1 lg:flex-none lg:w-32 px-4 py-3 border border-slate-700 bg-slate-900 rounded-xl font-bold text-slate-500 hover:bg-slate-800 hover:text-slate-700 transition-all shadow-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !form.title.trim()}
                            className="flex-[2] lg:flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-md hover:shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando...' : isNew ? 'Crear Tarea' : 'Guardar Cambios'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
