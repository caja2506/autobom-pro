import React from 'react';
import { useRole } from '../contexts/RoleContext';
import UserAdminPanel from '../components/admin/UserAdminPanel';
import { Settings as SettingsIcon, Shield } from 'lucide-react';

export default function SettingsPage() {
    const { isAdmin } = useRole();

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-bold">Acceso Restringido</p>
                <p className="text-sm">Solo administradores pueden acceder a esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                        <SettingsIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="font-black text-2xl text-slate-800 tracking-tight">Configuración</h2>
                        <p className="text-xs text-slate-400 font-bold">Panel de administración del sistema</p>
                    </div>
                </div>
            </div>
            <UserAdminPanel />
        </div>
    );
}
