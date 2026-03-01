import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Image, Check, ExternalLink, AlertTriangle, Camera, Globe } from 'lucide-react';

// ========================================================
// MODAL: BUSCADOR DE IMÁGENES
// Modo 1: Abrir Google Images y pegar URL
// Modo 2: URL directa
// ========================================================

const ImagePickerModal = ({ isOpen, onClose, onSelect, itemName, partNumber }) => {
    const [customUrl, setCustomUrl] = useState('');
    const [previewError, setPreviewError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCustomUrl('');
            setPreviewError(false);
        }
    }, [isOpen]);

    const searchQuery = [partNumber, itemName?.split(' ').slice(0, 4).join(' ')].filter(Boolean).join(' ');

    const openGoogleImages = () => {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' product')}&tbm=isch`, '_blank');
    };

    const openGoogleLens = () => {
        window.open(`https://lens.google.com/search?p=${encodeURIComponent(searchQuery)}`, '_blank');
    };

    const handleConfirm = () => {
        if (customUrl && !previewError) {
            onSelect(customUrl);
            onClose();
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                setCustomUrl(text);
                setPreviewError(false);
            }
        } catch (err) {
            // Clipboard API may not be available
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Camera className="w-6 h-6 text-indigo-600" /> Imagen del Producto
                        </h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 font-bold">{partNumber} — {itemName?.substring(0, 50)}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">

                    {/* Step 1: Search buttons */}
                    <div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">① Buscar imagen</div>
                        <div className="flex gap-2">
                            <button
                                onClick={openGoogleImages}
                                className="flex-1 bg-white border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 px-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                            >
                                <Globe className="w-5 h-5 text-indigo-500" />
                                Google Images
                            </button>
                            <button
                                onClick={openGoogleLens}
                                className="flex-1 bg-white border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-700 px-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                            >
                                <Search className="w-5 h-5 text-teal-500" />
                                Google Lens
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                            Click derecho en la imagen → <strong>"Copiar dirección de imagen"</strong> → Pega abajo
                        </p>
                    </div>

                    {/* Step 2: Paste URL */}
                    <div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">② Pegar URL de la imagen</div>
                        <div className="flex gap-2">
                            <input
                                value={customUrl}
                                onChange={e => { setCustomUrl(e.target.value); setPreviewError(false); }}
                                placeholder="https://ejemplo.com/imagen.jpg"
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                            <button
                                onClick={handlePaste}
                                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5"
                                title="Pegar del portapapeles"
                            >
                                📋 Pegar
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    {customUrl && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">③ Vista previa</div>
                            {previewError ? (
                                <div className="flex items-center gap-2 text-red-500 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>No se pudo cargar la imagen. Verifica la URL.</span>
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <img
                                        src={customUrl}
                                        alt="Preview"
                                        className="max-h-48 max-w-full rounded-xl object-contain shadow-md"
                                        onError={() => setPreviewError(true)}
                                        onLoad={() => setPreviewError(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!customUrl || previewError}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg disabled:opacity-40 disabled:shadow-none transition-all active:scale-95 flex items-center text-sm"
                    >
                        <Check className="w-4 h-4 mr-2" /> Guardar imagen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImagePickerModal;
