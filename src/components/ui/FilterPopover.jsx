import React, { useState, useEffect, useRef } from 'react';
import { Filter } from 'lucide-react';
import SearchableDropdown from './SearchableDropdown';

// ========================================================
// COMPONENTE: POPUP DE FILTROS
// ========================================================
const FilterPopover = ({ filters, setFilters, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeFilterCount = (filters.brand?.length || 0) + (filters.category?.length || 0) + (filters.provider?.length || 0);

    return (
        <div className="relative" ref={popoverRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`h-full px-4 rounded-xl border flex items-center gap-2 transition-all ${activeFilterCount > 0 ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <Filter className="w-4 h-4" />
                <span className="font-bold text-sm hidden sm:inline">Filtros</span>
                {activeFilterCount > 0 && <span className="bg-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtrar por</h4>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Marca</label>
                        <SearchableDropdown multiple compact options={options.brands} value={filters.brand} onChange={val => setFilters({ ...filters, brand: val })} placeholder="Todas las Marcas" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Categoría</label>
                        <SearchableDropdown multiple compact options={options.categories} value={filters.category} onChange={val => setFilters({ ...filters, category: val })} placeholder="Todas las Categorías" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Proveedor</label>
                        <SearchableDropdown multiple compact options={options.providers} value={filters.provider} onChange={val => setFilters({ ...filters, provider: val })} placeholder="Todos los Proveedores" />
                    </div>
                    {activeFilterCount > 0 && (
                        <button onClick={() => setFilters({ ...filters, brand: [], category: [], provider: [] })} className="w-full text-xs font-bold text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                            Limpiar Filtros
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default FilterPopover;
