import React from 'react';
import PlaceholderPage from './PlaceholderPage';
import { FileText } from 'lucide-react';

export default function DailyReports() {
    return (
        <PlaceholderPage
            icon={FileText}
            title="Reportes Diarios"
            description="Reportes diarios auto-generados con resumen de actividades por ingeniero/técnico."
            phase={7}
            features={[
                'Generación automática de reportes diarios',
                'Tareas trabajadas con horas dedicadas',
                'Horas totales y horas extra',
                'Tareas completadas y retrasos reportados',
                'Resumen de notas del día',
                'Exportación a Excel',
            ]}
        />
    );
}
