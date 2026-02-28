import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// ========================================================
// COMPONENTE: MODAL DE EDICIÓN DE ÍTEM DE BOM
// ========================================================
const BomItemEditModal = ({ item, onClose, onSave }) => {
    const [formData, setFormData] = useState({ quantity: 0, unitPrice: 0, prcr: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (item) {
            setFormData({
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                prcr: item.prcr || '',
            });
        }
    }, [item]);

    if (!item) return null;

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(item.id, formData);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                <h2 className="font-black text-xl mb-6">Editar Ítem del BOM</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Cantidad</label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full p-3 border rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Precio Unitario</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.unitPrice}
                            onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full p-3 border rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">#PRCR</label>
                        <input
                            type="text"
                            value={formData.prcr}
                            onChange={e => setFormData({ ...formData, prcr: e.target.value })}
                            placeholder="Ej: PRCR-2025-001"
                            className="w-full p-3 border rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-amber-500 font-mono uppercase"
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 p-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 p-3.5 bg-indigo-600 text-white rounded-xl font-black">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BomItemEditModal;
