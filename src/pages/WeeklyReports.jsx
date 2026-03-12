import React from 'react';
import PlaceholderPage from './PlaceholderPage';
import { BarChart3 } from 'lucide-react';

export default function WeeklyReports() {
    return (
        <PlaceholderPage
            icon={BarChart3}
            title="Reportes Semanales"
            description="Analítica semanal con tendencias de rendimiento, utilización y métricas del equipo."
            phase={7}
            features={[
                'Agregación semanal de métricas',
                'Tendencias de horas extra (gráficas)',
                'Análisis de velocidad del equipo',
                'Comparativa semana contra semana',
                'Exportación a Excel',
            ]}
        />
    );
}
