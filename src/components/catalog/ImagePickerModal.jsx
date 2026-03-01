import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Image, Check, ExternalLink, AlertTriangle } from 'lucide-react';

// ========================================================
// MODAL: BUSCADOR DE IMÁGENES (Google Custom Search)
// ========================================================
const GOOGLE_API_KEY = "AIzaSyAgG7jwwxHRqDW2IaPRImr6GK-SqjFKDsQ";
// NOTA: El usuario necesita crear un Custom Search Engine en https://cse.google.com
// y pegar el CX ID aquí. Si no se configura, se usa un fallback de búsqueda libre.
const GOOGLE_CX = ""; // CONFIGURAR: Pegar el CX del Custom Search Engine

const ImagePickerModal = ({ isOpen, onClose, onSelect, itemName, partNumber }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [images, setImages] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUrl, setSelectedUrl] = useState(null);
    const [customUrl, setCustomUrl] = useState('');
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('search'); // 'search' | 'url'

    useEffect(() => {
        if (isOpen) {
            const q = [partNumber, itemName?.split(' ').slice(0, 3).join(' ')].filter(Boolean).join(' ');
            setSearchQuery(q);
            setImages([]);
            setSelectedUrl(null);
            setCustomUrl('');
            setError(null);
            setMode('search');
            // Auto-search on open
            if (q.trim()) handleSearch(q);
        }
    }, [isOpen, partNumber, itemName]);

    const handleSearch = async (q) => {
        const query = q || searchQuery;
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setImages([]);

        try {
            if (GOOGLE_CX) {
                // Google Custom Search API (official)
                const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query + ' product')}&searchType=image&num=8&imgSize=medium&safe=active`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.error) {
                    throw new Error(data.error.message || 'Error de API');
                }

                if (data.items && data.items.length > 0) {
                    setImages(data.items.map(item => ({
                        url: item.link,
                        thumbnail: item.image?.thumbnailLink || item.link,
                        title: item.title,
                        source: item.displayLink
                    })));
                } else {
                    setError('No se encontraron imágenes. Intenta con otros términos.');
                }
            } else {
                // Fallback: buscar en fuentes públicas de imágenes industriales
                // Usamos múltiples fuentes de thumbnails públicas
                const encodedQuery = encodeURIComponent(query);
                const fallbackImages = [
                    {
                        url: `https://source.unsplash.com/400x400/?${encodedQuery},industrial,component`,
                        thumbnail: `https://source.unsplash.com/200x200/?${encodedQuery},industrial,component`,
                        title: `Unsplash: ${query}`,
                        source: 'unsplash.com'
                    },
                    {
                        url: `https://loremflickr.com/400/400/${encodedQuery}`,
                        thumbnail: `https://loremflickr.com/200/200/${encodedQuery}`,
                        title: `Flickr: ${query}`,
                        source: 'loremflickr.com'
                    }
                ];
                setImages(fallbackImages);
                setError('⚠️ Configura tu Google Custom Search Engine (CX) para mejores resultados. Por ahora, puedes pegar una URL directamente.');
                setMode('url');
            }
        } catch (err) {
            console.error('Image search error:', err);
            setError(`Error buscando: ${err.message}. Puedes pegar una URL directamente.`);
            setMode('url');
        }

        setIsSearching(false);
    };

    const handleConfirm = () => {
        const url = mode === 'url' ? customUrl : selectedUrl;
        if (url) {
            onSelect(url);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Image className="w-6 h-6 text-indigo-600" /> Buscar Imagen
                        </h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                        <button onClick={() => setMode('search')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${mode === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                            <Search className="w-3 h-3 inline mr-1" /> Buscar
                        </button>
                        <button onClick={() => setMode('url')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${mode === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                            <ExternalLink className="w-3 h-3 inline mr-1" /> Pegar URL
                        </button>
                    </div>

                    {mode === 'search' ? (
                        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Buscar imagen del producto..."
                                    className="pl-10 pr-4 py-3 w-full border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button type="submit" disabled={isSearching} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:bg-slate-400 transition-all flex items-center">
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <input
                                value={customUrl}
                                onChange={e => setCustomUrl(e.target.value)}
                                placeholder="https://ejemplo.com/imagen-producto.jpg"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {customUrl && (
                                <div className="flex justify-center p-4 bg-slate-50 rounded-xl">
                                    <img
                                        src={customUrl}
                                        alt="Preview"
                                        className="max-h-48 rounded-xl object-contain"
                                        onError={e => { e.target.src = ''; e.target.alt = 'Error cargando imagen'; }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Results Grid */}
                {mode === 'search' && (
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-700 flex items-start gap-2 mb-4">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {isSearching && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                <span className="text-sm font-bold">Buscando imágenes...</span>
                            </div>
                        )}

                        {!isSearching && images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedUrl(img.url)}
                                        className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square group ${selectedUrl === img.url ? 'border-indigo-600 ring-2 ring-indigo-200 scale-[1.02]' : 'border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        <img
                                            src={img.thumbnail}
                                            alt={img.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={e => { e.target.style.display = 'none'; }}
                                        />
                                        {selectedUrl === img.url && (
                                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                                                <div className="bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] text-white font-bold truncate block">{img.source}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {!isSearching && images.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                <Image className="w-16 h-16 mb-3" />
                                <span className="text-sm font-bold">Busca una imagen o pega una URL</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={mode === 'search' ? !selectedUrl : !customUrl}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg disabled:opacity-50 transition-all active:scale-95 flex items-center text-sm"
                    >
                        <Check className="w-4 h-4 mr-2" /> Usar esta imagen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImagePickerModal;
