import React, { useState, useMemo } from 'react';
import { useRole } from '../contexts/RoleContext';
import { useAppData } from '../contexts/AppDataContext';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import FilterPopover from '../components/ui/FilterPopover';
import {
    Search, Plus, Trash2, Database,
    SlidersHorizontal, Edit3, Tag, Camera
} from 'lucide-react';

export default function Catalog() {
    const { canEdit, canDelete } = useRole();
    const {
        catalogo, managedLists,
        brandOptions, categoryOptions, providerOptions,
        isProcessing, handleExcelUpload, handleEditClick,
        setIsMasterRecordModalOpen, setEditingMasterRecord,
        setConfirmDelete, setImagePickerItem, setZoomedImageUrl,
        excelInputRef,
    } = useAppData();

    const [isCatalogEditMode, setIsCatalogEditMode] = useState(false);
    const [selectedCatalogItems, setSelectedCatalogItems] = useState([]);
    const [catalogFilters, setCatalogFilters] = useState({ search: '', brand: [], category: [], provider: [] });

    const filteredCatalogo = useMemo(() => {
        return catalogo.filter(item => {
            const brandId = item.brand?.id || '';
            const categoryId = item.category?.id || '';
            const providerId = item.defaultProvider?.id || '';
            const s = catalogFilters.search.toLowerCase();

            const matchesSearch = !s || String(item.name || '').toLowerCase().includes(s) || String(item.partNumber || '').toLowerCase().includes(s);
            const matchesBrand = catalogFilters.brand.length === 0 || catalogFilters.brand.includes(brandId);
            const matchesCategory = catalogFilters.category.length === 0 || catalogFilters.category.includes(categoryId);
            const matchesProvider = catalogFilters.provider.length === 0 || catalogFilters.provider.includes(providerId);

            return matchesSearch && matchesBrand && matchesCategory && matchesProvider;
        });
    }, [catalogo, catalogFilters]);

    const handleToggleSelectAllCatalog = (items) => {
        if (selectedCatalogItems.length === items.length) {
            setSelectedCatalogItems([]);
        } else {
            setSelectedCatalogItems(items.map(i => i.id));
        }
    };

    const handleToggleSelectCatalogItem = (id) => {
        setSelectedCatalogItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelectedCatalog = () => {
        setConfirmDelete({
            isOpen: true,
            title: `¿Borrar ${selectedCatalogItems.length} ítems?`,
            message: `Esto eliminará permanentemente los ${selectedCatalogItems.length} registros seleccionados del catálogo.`,
            onConfirm: async () => {
                const batch = writeBatch(db);
                selectedCatalogItems.forEach(id => {
                    batch.delete(doc(db, 'catalogo_maestro', id));
                });
                await batch.commit();
                setSelectedCatalogItems([]);
            }
        });
    };

    return (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-300">
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={catalogFilters.search} onChange={e => setCatalogFilters({ ...catalogFilters, search: e.target.value })} placeholder="Filtrar por nombre, P/N..." className="pl-12 pr-4 py-3 w-full border border-slate-200 rounded-2xl text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <FilterPopover
                        filters={catalogFilters}
                        setFilters={setCatalogFilters}
                        options={{ brands: brandOptions, categories: categoryOptions, providers: providerOptions }}
                    />
                    {canEdit && (
                        <button
                            onClick={() => { setEditingMasterRecord(null); setIsMasterRecordModalOpen(true); }}
                            className="bg-indigo-600 text-white px-4 py-3 rounded-2xl font-black flex items-center justify-center shadow-lg active:scale-95 transition-all text-sm"
                        >
                            <Plus className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Nuevo </span>Registro
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => { setIsCatalogEditMode(!isCatalogEditMode); setSelectedCatalogItems([]); }}
                            className={`px-4 py-3 rounded-xl border flex items-center gap-2 transition-all ${isCatalogEditMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="font-bold text-sm hidden sm:inline">Gestionar</span>
                        </button>
                    )}
                    <input type="file" ref={excelInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                    {canEdit && (
                        <button
                            onClick={() => excelInputRef.current.click()}
                            disabled={isProcessing}
                            className="bg-green-600 text-white px-4 py-3 rounded-2xl font-black flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:bg-slate-400 text-sm"
                        >
                            <Database className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Importar </span>Excel
                        </button>
                    )}
                </div>

                {selectedCatalogItems.length > 0 && isCatalogEditMode && canDelete && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-300">
                        <span className="font-bold text-red-700 text-sm">{selectedCatalogItems.length} ítems seleccionados</span>
                        <button onClick={handleDeleteSelectedCatalog} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center text-sm">
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar Seleccionados
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0">
                            <tr>
                                {isCatalogEditMode && <th className="p-5 w-10 text-center"><input type="checkbox" className="w-4 h-4" onChange={() => handleToggleSelectAllCatalog(filteredCatalogo)} checked={selectedCatalogItems.length === filteredCatalogo.length && filteredCatalogo.length > 0} /></th>}
                                <th className="p-5 w-32"></th>
                                <th className="p-5">Pieza</th>
                                <th className="p-5 w-24 text-center">⏱️ Lead</th>
                                <th className="p-5 text-right">Precio Base</th>
                                {isCatalogEditMode && <th className="p-5 text-center">⚙️</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCatalogo.map(item => {
                                const isSelected = selectedCatalogItems.includes(item.id);
                                const brandName = item.brand ? managedLists.brands.find(b => b.id === item.brand.id)?.name : '';
                                const categoryName = item.category ? managedLists.categories.find(c => c.id === item.category.id)?.name : '';
                                return (
                                    <tr key={item.id} className={`group transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                        {isCatalogEditMode && <td className="p-5 text-center"><input type="checkbox" className="w-4 h-4" checked={isSelected} onChange={() => handleToggleSelectCatalogItem(item.id)} /></td>}
                                        <td className="p-3">
                                            <div className="w-[120px] h-[120px] relative" onDoubleClick={() => setImagePickerItem({ id: item.id, name: item.name, partNumber: item.partNumber })} title="Doble clic para cambiar">
                                                {item.imageUrl ? (
                                                    <>
                                                        <img
                                                            src={item.imageUrl}
                                                            alt=""
                                                            onClick={() => setZoomedImageUrl(item.imageUrl)}
                                                            className="w-full h-full object-contain rounded-xl border-2 border-slate-200 bg-white transition-all duration-300 cursor-zoom-in hover:border-indigo-400 hover:shadow-lg p-1"
                                                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                        />
                                                        <div style={{ display: 'none' }} className="absolute inset-0 items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl"><Camera className="w-6 h-6 text-slate-300" /></div>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setImagePickerItem({ id: item.id, name: item.name, partNumber: item.partNumber })}
                                                        className="w-full h-full rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 transition-all flex items-center justify-center text-slate-300 hover:text-indigo-500"
                                                        title="Agregar imagen"
                                                    >
                                                        <Camera className="w-6 h-6" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-slate-800 text-base leading-tight">{item.name || 'Sin nombre'}</div>
                                            <div className="text-[10px] font-mono text-slate-500 mt-1">{item.partNumber}</div>
                                            <div className="flex items-center flex-wrap gap-2 mt-2">
                                                {brandName && <div className="flex items-center justify-center h-6 px-2 rounded-full border text-[9px] font-black uppercase tracking-tighter text-gray-600 bg-gray-100 border-gray-200"><Tag className="w-3 h-3 mr-1.5 flex-shrink-0" />{brandName}</div>}
                                                {categoryName && <div className="flex items-center justify-center h-6 px-2 rounded-full border text-[9px] font-black uppercase tracking-tighter text-purple-600 bg-purple-50 border-purple-100"><Tag className="w-3 h-3 mr-1.5 flex-shrink-0" />{categoryName}</div>}
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            {item.leadTimeWeeks != null ? <span className="text-sm font-bold text-teal-700">{item.leadTimeWeeks} sem</span> : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                        <td className="p-5 text-right font-black text-green-700 text-lg">${(item.lastPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        {isCatalogEditMode && (
                                            <td className="p-5 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    {canEdit && <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all active:scale-90"><Edit3 className="w-4 h-4" /></button>}
                                                    {canDelete && <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, title: 'Borrar Maestro', message: `¿Eliminar "${item.name}" del catálogo global?`, onConfirm: () => deleteDoc(doc(db, 'catalogo_maestro', item.id)) }); }} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all active:scale-90"><Trash2 className="w-4 h-4" /></button>}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
