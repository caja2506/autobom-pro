import React from 'react';
import PlaceholderPage from './PlaceholderPage';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
    return (
        <PlaceholderPage
            icon={LayoutDashboard}
            title="Dashboard Obeya"
            description="Panel de control estilo Obeya con visibilidad en tiempo real del estado de proyectos, equipo y métricas de ingeniería."
            phase={8}
            features={[
                'KPIs: proyectos activos, en riesgo, tareas retrasadas, horas extra',
                'Vista de salud de proyectos con nivel de riesgo',
                'Actividad diaria del equipo (horas, tareas completadas)',
                'Carga de trabajo del equipo con indicador de sobrecarga',
                'Panel de alertas (tareas bloqueadas, retrasos, overtime alto)',
                'Insights de riesgo por proyecto',
            ]}
        />
    );
}
