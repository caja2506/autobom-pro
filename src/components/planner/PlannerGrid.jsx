import React, { useCallback, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PlannerTaskBlock from './PlannerTaskBlock';

// ── Exported constants ─────────────────────────────────────────
export const PLANNER_START_HOUR = 7;
export const PLANNER_END_HOUR   = 19;
export const SLOT_HEIGHT_PX     = 64;  // pixels per 1-hour row

// ── Break time bands ───────────────────────────────────────────
// start/end in decimal hours (e.g. 15.5 = 15:30)
const TIME_BANDS = [
    {
        id:     'desayuno',
        label:  '🍳 Desayuno',
        start:  8,        // 08:00
        end:    9,        // 09:00
        bg:     'rgba(251, 191, 36, 0.10)',
        border: 'rgba(245, 158, 11, 0.40)',
        text:   '#fcd34d',
    },
    {
        id:     'almuerzo',
        label:  '🍽 Almuerzo',
        start:  12,       // 12:00
        end:    13,       // 13:00
        bg:     'rgba(52, 211, 153, 0.10)',
        border: 'rgba(16, 185, 129, 0.35)',
        text:   '#fde68a',
    },
    {
        id:     'cafe',
        label:  '☕ Café',
        start:  15.5,     // 15:30
        end:    16,       // 16:00
        bg:     'rgba(249, 115, 22, 0.10)',
        border: 'rgba(234, 88, 12, 0.35)',
        text:   '#fdba74',
    },
];

// Default scroll target: 9 AM
const DEFAULT_SCROLL_HOUR = 9;

// ── Calendar layout algorithm ──────────────────────────────────
function computeColumnLayout(items) {
    if (!items.length) return [];

    const sorted = items
        .map(item => ({
            ...item,
            _start: item.startDateTime ? parseISO(item.startDateTime) : new Date(),
            _end:   item.endDateTime   ? parseISO(item.endDateTime)   : new Date(),
        }))
        .sort((a, b) => a._start - b._start);

    const columns = [];

    const layoutItems = sorted.map(item => {
        let col = -1;
        for (let i = 0; i < columns.length; i++) {
            if (item._start >= columns[i]) { col = i; break; }
        }
        if (col === -1) { col = columns.length; columns.push(item._end); }
        else            { columns[col] = item._end; }
        return { ...item, _col: col };
    });

    const result = layoutItems.map(item => {
        const concurrent = layoutItems.filter(other =>
            other._start < item._end && other._end > item._start
        );
        const maxCols = Math.max(...concurrent.map(o => o._col)) + 1;
        return { ...item, columnIndex: item._col, totalColumns: maxCols };
    });

    return result;
}

/**
 * PlannerGrid — week columns × hour rows visual scheduler.
 */
export default function PlannerGrid({
    weekDays,
    planItems,
    conflictIds,
    onDropTask,
    onBlockMove,
    onBlockResize,
    onBlockClick,
    onBlockDelete,
}) {
    const totalHours   = PLANNER_END_HOUR - PLANNER_START_HOUR;
    const scrollBodyRef = useRef(null);

    // Scroll to DEFAULT_SCROLL_HOUR on first render
    useEffect(() => {
        if (scrollBodyRef.current) {
            const offset = (DEFAULT_SCROLL_HOUR - PLANNER_START_HOUR) * SLOT_HEIGHT_PX;
            scrollBodyRef.current.scrollTop = offset;
        }
    }, []);

    function getTopOffset(dateTimeStr) {
        if (!dateTimeStr) return 0;
        try {
            const dt    = parseISO(dateTimeStr);
            const hours = dt.getHours() + dt.getMinutes() / 60;
            return Math.max(0, hours - PLANNER_START_HOUR) * SLOT_HEIGHT_PX;
        } catch { return 0; }
    }

    function getBlockHeight(startStr, endStr) {
        if (!startStr || !endStr) return SLOT_HEIGHT_PX;
        try {
            const diffHours = (parseISO(endStr) - parseISO(startStr)) / 3_600_000;
            return Math.max(SLOT_HEIGHT_PX / 2, diffHours * SLOT_HEIGHT_PX);
        } catch { return SLOT_HEIGHT_PX; }
    }

    function snapToHour(relY) {
        const rawHours = PLANNER_START_HOUR + relY / SLOT_HEIGHT_PX;
        const snapped  = Math.floor(rawHours * 2) / 2;
        return { hour: Math.floor(snapped), minute: (snapped % 1) * 60 };
    }

    // ── Drag handlers ─────────────────────────────────────────
    const handleDragOver = useCallback(e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    function handleDrop(e, dayDate) {
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;

        const colEl = e.currentTarget;
        const rect  = colEl.getBoundingClientRect();
        const relY  = Math.max(0, e.clientY - rect.top);
        const { hour, minute } = snapToHour(relY);
        const dayStr = format(dayDate, 'yyyy-MM-dd');

        if (raw.startsWith('move:')) {
            const itemId = raw.replace('move:', '');
            onBlockMove && onBlockMove({ itemId, date: dayStr, hour, minute });
        } else {
            onDropTask && onDropTask({ taskId: raw, date: dayStr, hour, minute });
        }
    }

    const hours = Array.from({ length: totalHours }, (_, i) => PLANNER_START_HOUR + i);

    // ── Compute per-day layout (header + body share this) ────
    const dayLayouts = weekDays.map(({ date: dayDate, isToday }) => {
        const dayStr      = format(dayDate, 'yyyy-MM-dd');
        const rawItems    = planItems.filter(p => p.date === dayStr);
        const layoutItems = computeColumnLayout(rawItems);
        const maxSim = layoutItems.length
            ? Math.max(...layoutItems.map(i => i.totalColumns))
            : 1;
        const dynMinWidth = Math.max(160, maxSim * 80);
        return { dayDate, dayStr, isToday, layoutItems, dynMinWidth };
    });

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full">

            {/* ── Fixed header row (never scrolls) ── */}
            <div
                className="flex shrink-0 border-b border-slate-700 bg-slate-900 z-20"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
                {/* Corner cell above time ruler */}
                <div className="w-16 shrink-0 border-r border-slate-800" />

                {/* Day header cells */}
                <div className="flex flex-1 min-w-0">
                    {dayLayouts.map(({ dayDate, dayStr, isToday, dynMinWidth }) => (
                        <div
                            key={dayStr}
                            className={`border-r border-slate-800 last:border-r-0 flex flex-col items-center justify-center py-2 transition-colors
                                ${isToday
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-900 text-slate-300'
                                }`}
                            style={{ flex: `1 0 ${dynMinWidth}px` }}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-[0.15em]
                                ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {format(dayDate, 'EEE', { locale: es })}
                            </span>
                            <span className="text-2xl font-black leading-none mt-0.5">
                                {format(dayDate, 'd')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Scrollable body ── */}
            <div ref={scrollBodyRef} className="flex flex-1 overflow-auto">

                {/* Time ruler — sticky left */}
                <div className="w-16 shrink-0 border-r border-slate-800 bg-slate-800 sticky left-0 z-10">
                    {hours.map(h => (
                        <div
                            key={h}
                            className="border-b border-slate-800 flex items-start justify-end pr-2 pt-1"
                            style={{ height: SLOT_HEIGHT_PX }}
                        >
                            <span className="text-[10px] font-black text-slate-400 leading-none">
                                {`${String(h).padStart(2, '0')}:00`}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                <div className="flex flex-1 min-w-0" style={{ minHeight: totalHours * SLOT_HEIGHT_PX }}>
                    {dayLayouts.map(({ dayDate, dayStr, layoutItems, dynMinWidth }) => (
                        <div
                            key={dayStr}
                            className="flex flex-col border-r border-slate-800 last:border-r-0"
                            style={{ flex: `1 0 ${dynMinWidth}px` }}
                        >
                            {/* Drop zone */}
                            <div
                                className="relative"
                                style={{ height: totalHours * SLOT_HEIGHT_PX }}
                                onDragOver={handleDragOver}
                                onDrop={e => handleDrop(e, dayDate)}
                            >
                                {/* Hour grid lines */}
                                {hours.map(h => (
                                    <React.Fragment key={h}>
                                        <div
                                            className="absolute left-0 right-0 border-t border-slate-800"
                                            style={{ top: (h - PLANNER_START_HOUR) * SLOT_HEIGHT_PX }}
                                        />
                                        <div
                                            className="absolute left-0 right-0 border-t border-dashed border-slate-800/70"
                                            style={{ top: (h - PLANNER_START_HOUR) * SLOT_HEIGHT_PX + SLOT_HEIGHT_PX / 2 }}
                                        />
                                    </React.Fragment>
                                ))}

                                {/* ── Break / routine time bands (z-[5], below task blocks) ── */}
                                {TIME_BANDS.map(band => {
                                    const top    = (band.start - PLANNER_START_HOUR) * SLOT_HEIGHT_PX;
                                    const height = (band.end - band.start) * SLOT_HEIGHT_PX;
                                    return (
                                        <div
                                            key={band.id}
                                            className="absolute left-0 right-0 pointer-events-none flex items-center justify-center overflow-hidden"
                                            style={{
                                                top,
                                                height,
                                                zIndex:       5,
                                                background:   band.bg,
                                                borderTop:    `1.5px dashed ${band.border}`,
                                                borderBottom: `1.5px dashed ${band.border}`,
                                            }}
                                        >
                                            <span
                                                className="text-[9px] font-black uppercase tracking-[0.18em] select-none whitespace-nowrap"
                                                style={{ color: band.text, opacity: 0.75 }}
                                            >
                                                {band.label}
                                            </span>
                                        </div>
                                    );
                                })}

                                {/* ── Task blocks (z-20, above bands) ── */}
                                {layoutItems.map(item => {
                                    const { totalColumns, columnIndex } = item;
                                    const GAP_PX   = 3;
                                    const colWidth = `calc(${100 / totalColumns}% - ${GAP_PX}px)`;
                                    const colLeft  = `calc(${(columnIndex / totalColumns) * 100}% + ${GAP_PX / 2}px)`;

                                    return (
                                        <PlannerTaskBlock
                                            key={item.id}
                                            item={item}
                                            topOffset={getTopOffset(item.startDateTime)}
                                            height={getBlockHeight(item.startDateTime, item.endDateTime)}
                                            widthStyle={colWidth}
                                            leftStyle={colLeft}
                                            totalColumns={totalColumns}
                                            isConflict={conflictIds?.has(item.id)}
                                            onClick={() => onBlockClick && onBlockClick(item)}
                                            onDelete={() => onBlockDelete && onBlockDelete(item.id)}
                                            onResize={newEnd => onBlockResize && onBlockResize(item.id, newEnd)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
