import React from 'react';
import PlaceholderPage from './PlaceholderPage';
import { User } from 'lucide-react';

export default function MyWork() {
    return (
        <PlaceholderPage
            icon={User}
            title="Mi Trabajo"
            description="Vista personal con tus tareas activas, timers en ejecución y resumen del día."
            phase={5}
            features={[
                'Tareas asignadas a ti con estado actual',
                'Timer activo con start/pause/stop',
                'Resumen de horas trabajadas hoy',
                'Registro de horas extra del día',
                'Feed de actividad reciente',
            ]}
        />
    );
}
