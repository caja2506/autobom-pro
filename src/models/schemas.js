/**
 * Firestore Collection Schemas
 * ============================
 * 
 * This file defines the data model for all Firestore collections
 * used by the Engineering Management Platform.
 * 
 * Each schema exports:
 * - COLLECTION_NAME: string constant for the collection path
 * - Field definitions with types and descriptions
 * - createDocument(): factory function for new documents
 * - STATUS constants where applicable
 * 
 * IMPORTANT: These are reference schemas. Firestore is schema-less,
 * but these definitions ensure consistency across the codebase.
 */

// ============================================================
// COLLECTION NAME CONSTANTS
// ============================================================

export const COLLECTIONS = {
    // --- Existing Collections (preserved) ---
    USERS_ROLES: 'users_roles',
    PROYECTOS_BOM: 'proyectos_bom',
    CATALOGO_MAESTRO: 'catalogo_maestro',
    ITEMS_BOM: 'items_bom',
    MARCAS: 'marcas',
    CATEGORIAS: 'categorias',
    PROVEEDORES: 'proveedores',

    // --- New Collections (Phase 2+) ---
    USERS: 'users',
    PROJECTS: 'projects',
    TASKS: 'tasks',
    SUBTASKS: 'subtasks',
    TIME_LOGS: 'timeLogs',
    DELAY_CAUSES: 'delayCauses',
    DELAYS: 'delays',
    RISKS: 'risks',
    DAILY_REPORTS: 'dailyReports',
    NOTIFICATIONS: 'notifications',
    TASK_TYPES: 'taskTypes',
    SETTINGS: 'settings',
    AUDIT_LOGS: 'auditLogs',
};


// ============================================================
// ENUM CONSTANTS
// ============================================================

/**
 * Engineering team roles (new system)
 * Coexist alongside existing RBAC roles (admin, editor, viewer)
 */
export const TEAM_ROLES = {
    MANAGER: 'manager',
    TEAM_LEAD: 'team_lead',
    ENGINEER: 'engineer',
    TECHNICIAN: 'technician',
};

/**
 * Existing RBAC roles (preserved)
 */
export const RBAC_ROLES = {
    ADMIN: 'admin',
    EDITOR: 'editor',
    VIEWER: 'viewer',
};

/**
 * Task workflow statuses
 */
export const TASK_STATUS = {
    BACKLOG: 'backlog',
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    VALIDATION: 'validation',
    COMPLETED: 'completed',
    BLOCKED: 'blocked',
    CANCELLED: 'cancelled',
};

/**
 * Task status display configuration
 */
export const TASK_STATUS_CONFIG = {
    [TASK_STATUS.BACKLOG]: {
        label: 'Backlog',
        color: 'slate',
        icon: 'Inbox',
        order: 0,
    },
    [TASK_STATUS.PENDING]: {
        label: 'Pendiente',
        color: 'red',
        icon: 'Clock',
        order: 1,
    },
    [TASK_STATUS.IN_PROGRESS]: {
        label: 'En Progreso',
        color: 'amber',
        icon: 'Play',
        order: 2,
    },
    [TASK_STATUS.VALIDATION]: {
        label: 'Validación',
        color: 'purple',
        icon: 'CheckCircle',
        order: 3,
    },
    [TASK_STATUS.COMPLETED]: {
        label: 'Completado',
        color: 'green',
        icon: 'CheckCheck',
        order: 4,
    },
    [TASK_STATUS.BLOCKED]: {
        label: 'Bloqueado',
        color: 'red',
        icon: 'Ban',
        order: 5,
    },
    [TASK_STATUS.CANCELLED]: {
        label: 'Cancelado',
        color: 'gray',
        icon: 'XCircle',
        order: 6,
    },
};

/**
 * Task priority levels
 */
export const TASK_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
};

export const TASK_PRIORITY_CONFIG = {
    [TASK_PRIORITY.LOW]: {
        label: 'Baja',
        color: 'slate',
        order: 0,
    },
    [TASK_PRIORITY.MEDIUM]: {
        label: 'Media',
        color: 'blue',
        order: 1,
    },
    [TASK_PRIORITY.HIGH]: {
        label: 'Alta',
        color: 'amber',
        order: 2,
    },
    [TASK_PRIORITY.CRITICAL]: {
        label: 'Crítica',
        color: 'red',
        order: 3,
    },
};

/**
 * Project statuses
 */
export const PROJECT_STATUS = {
    PLANNING: 'planning',
    ACTIVE: 'active',
    ON_HOLD: 'on_hold',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const PROJECT_STATUS_CONFIG = {
    [PROJECT_STATUS.PLANNING]: {
        label: 'Planificación',
        color: 'blue',
        order: 0,
    },
    [PROJECT_STATUS.ACTIVE]: {
        label: 'Activo',
        color: 'green',
        order: 1,
    },
    [PROJECT_STATUS.ON_HOLD]: {
        label: 'En Pausa',
        color: 'amber',
        order: 2,
    },
    [PROJECT_STATUS.COMPLETED]: {
        label: 'Completado',
        color: 'slate',
        order: 3,
    },
    [PROJECT_STATUS.CANCELLED]: {
        label: 'Cancelado',
        color: 'gray',
        order: 4,
    },
};

/**
 * Risk levels
 */
export const RISK_LEVEL = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
};

export const RISK_LEVEL_CONFIG = {
    [RISK_LEVEL.LOW]: {
        label: 'Bajo',
        color: 'green',
        minScore: 0,
        maxScore: 29,
        icon: 'Shield',
    },
    [RISK_LEVEL.MEDIUM]: {
        label: 'Medio',
        color: 'amber',
        minScore: 30,
        maxScore: 59,
        icon: 'AlertTriangle',
    },
    [RISK_LEVEL.HIGH]: {
        label: 'Alto',
        color: 'red',
        minScore: 60,
        maxScore: Infinity,
        icon: 'AlertOctagon',
    },
};

/**
 * Notification types
 */
export const NOTIFICATION_TYPE = {
    TASK_ASSIGNED: 'task_assigned',
    TASK_STATUS_CHANGED: 'task_status_changed',
    TASK_BLOCKED: 'task_blocked',
    DELAY_REPORTED: 'delay_reported',
    RISK_ALERT: 'risk_alert',
    OVERTIME_ALERT: 'overtime_alert',
    REPORT_GENERATED: 'report_generated',
    SYSTEM: 'system',
};


// ============================================================
// DOCUMENT FACTORY FUNCTIONS
// ============================================================

/**
 * Users Collection
 * Extended user profiles for the engineering platform.
 * Separate from users_roles to preserve backward compatibility.
 *
 * Document ID: Firebase Auth UID
 */
export function createUserDocument({
    name = '',
    email = '',
    photoURL = '',
    role = RBAC_ROLES.VIEWER,       // RBAC role (admin/editor/viewer) — synced from users_roles
    teamRole = null,                // Engineering role (manager/team_lead/engineer/technician)
    department = 'Engineering',
    weeklyCapacityHours = 40,       // Standard weekly hours
    active = true,
} = {}) {
    return {
        name,
        email,
        photoURL,
        role,
        teamRole,
        department,
        weeklyCapacityHours,
        active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Projects Collection (Engineering Projects)
 * Extends the concept from proyectos_bom with engineering management fields.
 * The existing proyectos_bom collection is preserved for BOM-specific data.
 *
 * Document ID: auto-generated
 */
export function createProjectDocument({
    name = '',
    description = '',
    client = '',
    priority = TASK_PRIORITY.MEDIUM,
    status = PROJECT_STATUS.PLANNING,
    ownerId = null,                 // Reference to user UID
    teamMemberIds = [],             // Array of user UIDs assigned to this project
    startDate = null,               // ISO string
    dueDate = null,                 // ISO string
    completedDate = null,           // ISO string — set when completed
    progress = 0,                   // 0-100
    bomProjectId = null,            // Optional link to existing proyectos_bom document
    tags = [],                      // Free-form tags
} = {}) {
    return {
        name,
        description,
        client,
        priority,
        status,
        ownerId,
        teamMemberIds,
        startDate,
        dueDate,
        completedDate,
        progress,
        bomProjectId,
        tags,
        // Risk fields — updated by risk calculation engine
        riskScore: 0,
        riskLevel: RISK_LEVEL.LOW,
        riskFactors: [],
        riskSummary: '',
        riskUpdatedAt: null,
        // Metadata
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Tasks Collection
 *
 * Document ID: auto-generated
 */
export function createTaskDocument({
    projectId = null,               // Reference to projects document
    subprojectId = null,            // Reference to subproject (optional)
    title = '',
    description = '',
    status = TASK_STATUS.BACKLOG,
    priority = TASK_PRIORITY.MEDIUM,
    taskTypeId = null,              // Reference to taskTypes document
    assignedBy = null,              // Creator / Assigner of the task
    assignedTo = null,              // Who must complete this task
    estimatedHours = 0,
    actualHours = 0,                // Calculated from timeLogs
    dueDate = null,                 // ISO string
    completedDate = null,           // ISO string
    blockedReason = '',             // If status === 'blocked'
    tags = [],
    order = 0,                      // Kanban column order
} = {}) {
    return {
        projectId,
        subprojectId,
        title,
        description,
        status,
        priority,
        taskTypeId,
        assignedBy,
        assignedTo,
        estimatedHours,
        actualHours,
        dueDate,
        completedDate,
        blockedReason,
        tags,
        order,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Subtasks Collection
 *
 * Document ID: auto-generated
 */
export function createSubtaskDocument({
    taskId = null,                  // Reference to tasks document
    title = '',
    completed = false,
    order = 0,
} = {}) {
    return {
        taskId,
        title,
        completed,
        order,
        createdAt: new Date().toISOString(),
    };
}

/**
 * TimeLogs Collection
 * Individual time tracking entries. Each user tracks independently.
 *
 * Document ID: auto-generated
 */
export function createTimeLogDocument({
    taskId = null,                  // Reference to tasks document
    projectId = null,               // Reference to projects document (denormalized)
    userId = null,                  // Auth UID
    startTime = null,               // ISO string
    endTime = null,                 // ISO string (null while timer running)
    totalHours = 0,                 // Calculated: (endTime - startTime) in hours
    overtime = false,               // Manually indicated by user
    overtimeHours = 0,              // Hours classified as overtime
    notes = '',
} = {}) {
    return {
        taskId,
        projectId,
        userId,
        startTime,
        endTime,
        totalHours,
        overtime,
        overtimeHours,
        notes,
        createdAt: new Date().toISOString(),
    };
}

/**
 * DelayCauses Collection
 * Configurable list of delay reasons. Managed by admin.
 *
 * Document ID: auto-generated
 */
export function createDelayCauseDocument({
    name = '',
    description = '',
    active = true,
    order = 0,
} = {}) {
    return {
        name,
        description,
        active,
        order,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Delays Collection
 * Records of delays linked to projects and/or tasks.
 *
 * Document ID: auto-generated
 */
export function createDelayDocument({
    projectId = null,               // Required — linked project
    taskId = null,                  // Optional — linked task
    causeId = null,                 // Reference to delayCauses document
    causeName = '',                 // Denormalized cause name for display
    comment = '',
    impact = '',                    // Optional impact description
    resolved = false,
    resolvedAt = null,              // ISO string
    createdBy = null,               // User UID
} = {}) {
    return {
        projectId,
        taskId,
        causeId,
        causeName,
        comment,
        impact,
        resolved,
        resolvedAt,
        createdBy,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Risks Collection
 * Computed risk snapshots for projects.
 * Can be recalculated periodically or on-demand.
 *
 * Document ID: projectId (one-to-one with projects)
 */
export function createRiskDocument({
    projectId = null,
    riskScore = 0,
    riskLevel = RISK_LEVEL.LOW,
    riskFactors = [],               // Array of { factor: string, score: number }
    riskSummary = '',
    metrics = {
        delayedTasks: 0,
        overtimeHours: 0,
        activeDelays: 0,
        tasksInValidation: 0,
        ownerOverloaded: false,
    },
} = {}) {
    return {
        projectId,
        riskScore,
        riskLevel,
        riskFactors,
        riskSummary,
        metrics,
        calculatedAt: new Date().toISOString(),
    };
}

/**
 * DailyReports Collection
 * Auto-generated daily engineering reports.
 *
 * Document ID: `{userId}_{YYYY-MM-DD}` for uniqueness
 */
export function createDailyReportDocument({
    date = '',                      // YYYY-MM-DD format
    userId = null,
    userName = '',                  // Denormalized for display
    data = {
        tasksWorked: [],              // Array of { taskId, taskTitle, projectName, hours }
        totalHours: 0,
        overtimeHours: 0,
        tasksCompleted: 0,
        delaysReported: 0,
        notesSummary: '',
    },
} = {}) {
    return {
        date,
        userId,
        userName,
        data,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Notifications Collection
 *
 * Document ID: auto-generated
 */
export function createNotificationDocument({
    userId = null,                  // Target user UID
    type = NOTIFICATION_TYPE.SYSTEM,
    title = '',
    message = '',
    read = false,
    actionUrl = null,               // Optional deep link
    relatedId = null,               // Related document ID (task, project, etc.)
    relatedCollection = null,       // Which collection the relatedId belongs to
} = {}) {
    return {
        userId,
        type,
        title,
        message,
        read,
        actionUrl,
        relatedId,
        relatedCollection,
        createdAt: new Date().toISOString(),
    };
}

/**
 * TaskTypes Collection
 * Configurable task categories/types.
 *
 * Document ID: auto-generated
 */
export function createTaskTypeDocument({
    name = '',
    icon = 'Wrench',               // lucide-react icon name
    color = 'indigo',              // Tailwind color name
    active = true,
    order = 0,
} = {}) {
    return {
        name,
        icon,
        color,
        active,
        order,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Settings Collection
 * System-wide configuration key-value store.
 *
 * Document ID: setting key name
 */
export function createSettingDocument({
    key = '',
    value = null,                   // Can be any JSON-serializable value
    description = '',
    category = 'general',
} = {}) {
    return {
        key,
        value,
        description,
        category,
        updatedAt: new Date().toISOString(),
        updatedBy: null,
    };
}

/**
 * AuditLogs Collection
 * Immutable audit trail for system actions.
 *
 * Document ID: auto-generated
 */
export function createAuditLogDocument({
    action = '',                    // e.g., 'create', 'update', 'delete', 'status_change'
    userId = null,
    userName = '',                  // Denormalized
    collection = '',                // Target collection name
    documentId = '',                // Target document ID
    changes = {},                   // { field: { before, after } }
    metadata = {},                  // Additional context
} = {}) {
    return {
        action,
        userId,
        userName,
        collection,
        documentId,
        changes,
        metadata,
        timestamp: new Date().toISOString(),
    };
}


// ============================================================
// RISK CALCULATION HELPERS
// ============================================================

/**
 * Default risk formula weights (stored in settings, configurable)
 */
export const DEFAULT_RISK_WEIGHTS = {
    delayedTaskWeight: 20,
    overtimeHoursWeight: 2,
    activeDelaysWeight: 15,
    tasksInValidationWeight: 10,
    ownerOverloadedBonus: 15,
};

/**
 * Calculate risk score based on project metrics
 * @param {Object} metrics - { delayedTasks, overtimeHours, activeDelays, tasksInValidation, ownerOverloaded }
 * @param {Object} weights - Configurable weights (defaults to DEFAULT_RISK_WEIGHTS)
 * @returns {{ riskScore: number, riskLevel: string }}
 */
export function calculateRiskScore(metrics, weights = DEFAULT_RISK_WEIGHTS) {
    const {
        delayedTasks = 0,
        overtimeHours = 0,
        activeDelays = 0,
        tasksInValidation = 0,
        ownerOverloaded = false,
    } = metrics;

    const riskScore =
        (delayedTasks * weights.delayedTaskWeight) +
        (overtimeHours * weights.overtimeHoursWeight) +
        (activeDelays * weights.activeDelaysWeight) +
        (tasksInValidation * weights.tasksInValidationWeight) +
        (ownerOverloaded ? weights.ownerOverloadedBonus : 0);

    let riskLevel = RISK_LEVEL.LOW;
    if (riskScore >= 60) riskLevel = RISK_LEVEL.HIGH;
    else if (riskScore >= 30) riskLevel = RISK_LEVEL.MEDIUM;

    return { riskScore: Math.round(riskScore), riskLevel };
}

/**
 * Classify risk level from score
 */
export function getRiskLevel(score) {
    if (score >= 60) return RISK_LEVEL.HIGH;
    if (score >= 30) return RISK_LEVEL.MEDIUM;
    return RISK_LEVEL.LOW;
}


// ============================================================
// DEFAULT SEED DATA
// ============================================================

/**
 * Default delay causes to seed on first setup
 */
export const DEFAULT_DELAY_CAUSES = [
    { name: 'Material faltante', description: 'Materiales necesarios no disponibles', order: 0 },
    { name: 'Cambio de prioridad', description: 'Priorización de otras tareas por gerencia', order: 1 },
    { name: 'Soporte a producción', description: 'Atención a urgencias o soporte de línea', order: 2 },
    { name: 'Decisión de ingeniería', description: 'Esperando definición técnica o de diseño', order: 3 },
    { name: 'Problema técnico', description: 'Dificultad técnica no prevista', order: 4 },
    { name: 'Dependencia externa', description: 'Esperando respuesta de proveedor o tercero', order: 5 },
    { name: 'Esperando validación', description: 'En espera de aprobación o revisión', order: 6 },
    { name: 'Recurso no disponible', description: 'Personal o equipo no disponible', order: 7 },
];

/**
 * Default task types to seed on first setup
 */
export const DEFAULT_TASK_TYPES = [
    { name: 'Diseño', icon: 'Pencil', color: 'blue', order: 0 },
    { name: 'Fabricación', icon: 'Wrench', color: 'amber', order: 1 },
    { name: 'Ensamble', icon: 'Layers', color: 'purple', order: 2 },
    { name: 'Programación', icon: 'Code', color: 'green', order: 3 },
    { name: 'Pruebas', icon: 'FlaskConical', color: 'teal', order: 4 },
    { name: 'Instalación', icon: 'HardDrive', color: 'indigo', order: 5 },
    { name: 'Documentación', icon: 'FileText', color: 'slate', order: 6 },
    { name: 'Soporte', icon: 'LifeBuoy', color: 'red', order: 7 },
];

/**
 * Default system settings
 */
export const DEFAULT_SETTINGS = [
    {
        key: 'risk_weights',
        value: DEFAULT_RISK_WEIGHTS,
        description: 'Pesos para la fórmula de cálculo de riesgo de proyecto',
        category: 'risk',
    },
    {
        key: 'overtime_threshold_weekly',
        value: 10,
        description: 'Umbral de horas extras semanales para generar alertas',
        category: 'time_tracking',
    },
    {
        key: 'work_hours_per_day',
        value: 8,
        description: 'Horas laborales estándar por día',
        category: 'time_tracking',
    },
    {
        key: 'work_days_per_week',
        value: 5,
        description: 'Días laborales por semana',
        category: 'time_tracking',
    },
    {
        key: 'daily_report_auto_generate',
        value: true,
        description: 'Generar reportes diarios automáticamente',
        category: 'reports',
    },
];
