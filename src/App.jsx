import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, Database, Search, Plus, Trash2, 
  ChevronRight, DollarSign, ArrowLeft, 
  PackagePlus, X, Pencil, BrainCircuit, 
  Loader2, Sparkles, Filter, Zap, Activity, Tag
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, getDocs, deleteDoc, updateDoc, writeBatch, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDGUTnCBWhPpyOrjAf5eQbQaQz0Dm18NXc",
  authDomain: "bom-ame-cr.firebaseapp.com",
  projectId: "bom-ame-cr",
  storageBucket: "bom-ame-cr.firebasestorage.app",
  messagingSenderId: "865326401984",
  appId: "1:865326401984:web:ebad6ca9ee666eaec3a025",
  measurementId: "G-XNN4RBPK2Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- LIBRERÍAS EXTERNAS (CDN) ---
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// --- API GEMINI CONFIG (FIJADO EN 2.5 FLASH) ---
const API_KEY = "AIzaSyBuezcZz-QrxVBDBDBrWUKzrbbhFa4RVjM";
const MODEL_NAME = "gemini-2.5-flash";

// ========================================================
// COMPONENTE: DROPDOWN DE BÚSQUEDA (CORREGIDO)
// ========================================================
const SearchableDropdown = ({ options = [], value, onChange, placeholder, dark = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => 
    (o.label || '').toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        className={`p-3 rounded-xl text-sm flex items-center justify-between cursor-pointer border transition-all ${dark ? 'bg-indigo-800 border-indigo-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate font-bold">
          {isOpen ? (
            <input 
              autoFocus
              className="bg-transparent border-none outline-none w-full text-inherit placeholder-current opacity-60"
              placeholder={placeholder || "Buscar..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            selectedOption ? selectedOption.label : placeholder
          )}
        </div>
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      {isOpen && (
        <div className={`absolute z-[100] w-full mt-2 border rounded-2xl shadow-2xl max-h-64 overflow-y-auto ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <ul className={`divide-y ${dark ? 'divide-slate-800' : 'divide-slate-50'}`}>
            {filtered.slice(0, 50).map((item) => (
              <li
                key={item.value}
                onClick={() => { onChange(item.value); setSearch(''); setIsOpen(false); }}
                className={`p-3.5 cursor-pointer flex flex-col ${value === item.value ? (dark ? 'bg-indigo-800' : 'bg-indigo-50 border-l-4 border-indigo-500') : (dark ? 'hover:bg-indigo-900' : 'hover:bg-indigo-50')}`}
              >
                <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{item.label}</span>
                {item.subLabel && <span className={`text-[10px] mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-400 font-mono'}`}>{item.subLabel}</span>}
              </li>
            ))}
            {filtered.length === 0 && (
                <li className={`p-4 text-xs text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ========================================================
// COMPONENTE: GESTOR DE LISTAS (MODAL) - FINAL VERSION
// ========================================================
const ListManagerModal = ({ title, items: initialItems, onSave, onClose }) => {
    const [managedItems, setManagedItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      setManagedItems(
        initialItems.map((name, index) => ({ id: `initial-${index}`, name, originalName: name }))
      )
    }, [initialItems]);

    const handleItemChange = (id, newName) => {
        setManagedItems(managedItems.map(item => item.id === id ? { ...item, name: newName } : item));
    };

    const handleAddItem = () => {
        setManagedItems([...managedItems, { id: `new-${Date.now()}`, name: '', originalName: null }]);
    };

    const handleRemoveItem = (id) => {
        setManagedItems(managedItems.filter(item => item.id !== id));
    };

    const handleSave = async () => {
        setIsSaving(true);
        
        const renames = managedItems
            .filter(item => item.originalName && item.name.trim() && item.originalName !== item.name.trim())
            .map(item => ({ oldName: item.originalName, newName: item.name.trim() }));

        const added = managedItems
            .filter(item => !item.originalName && item.name.trim())
            .map(item => item.name.trim());

        const remainingOriginalNames = managedItems.map(i => i.originalName).filter(Boolean);
        const deleted = initialItems.filter(originalName => !remainingOriginalNames.includes(originalName));

        await onSave({ renames, deleted, added });
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                <h2 className="font-black text-xl mb-6 flex items-center"><Tag className="mr-2"/> {title}</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {managedItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <input 
                                value={item.name} 
                                onChange={e => handleItemChange(item.id, e.target.value)} 
                                placeholder="Nuevo valor..." 
                                className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            />
                            <button onClick={() => handleRemoveItem(item.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-5 h-5"/>
                            </button>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddItem} className="w-full mt-4 p-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 mr-1"/> Agregar otro
                </button>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 p-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 p-3.5 bg-indigo-600 text-white rounded-xl font-black disabled:bg-slate-400">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ========================================================
// APLICACIÓN PRINCIPAL
// ========================================================
const APP_VERSION = "1.9";

export default function App() {
  const [proyectos, setProyectos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [managedLists, setManagedLists] = useState({ categories: [], providers: [], brands: [] });

  const [activeTab, setActiveTab] = useState('proyectos');
  const [activeProject, setActiveProject] = useState(null);

  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [autoFillTriggered, setAutoFillTriggered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [listManager, setListManager] = useState({ isOpen: false, type: null, title: ''});

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingCatalogId, setEditingCatalogId] = useState(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [partForm, setPartForm] = useState({ name: '', partNumber: '', lastPrice: '', defaultProvider: '', category: '', brand: '' });
  const [bomForm, setBomForm] = useState({ partId: '', quantity: 1, unitPrice: 0, proveedorId: ''});
  const [searchTerm, setSearchTerm] = useState('');
  const [bomSearchFilter, setBomSearchFilter] = useState('');

  const pdfInputRef = useRef(null);

  const activeBomItems = activeProject
    ? bomItems.filter(i => i.projectId === activeProject.id).sort((a,b) => new Date(a.addedAt) - new Date(b.addedAt))
    : [];

  useEffect(() => {
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.async = true;
    document.body.appendChild(s);

    onSnapshot(collection(db, 'proyectos_bom'), s => setProyectos(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))));
    onSnapshot(collection(db, 'catalogo_maestro'), s => setCatalogo(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => (a.name || '').localeCompare(b.name || ''))));
    onSnapshot(collection(db, 'items_bom'), s => setBomItems(s.docs.map(d => ({ ...d.data(), id: d.id }))));

    const unsubCategories = onSnapshot(collection(db, 'categorias'), s => setManagedLists(prev => ({...prev, categories: s.docs.map(d => ({id: d.id, name: d.data()?.name})).filter(d => d.name).sort((a,b) => a.name.localeCompare(b.name))})));
    const unsubProviders = onSnapshot(collection(db, 'proveedores'), s => setManagedLists(prev => ({...prev, providers: s.docs.map(d => ({id: d.id, name: d.data()?.name})).filter(d => d.name).sort((a,b) => a.name.localeCompare(b.name))})));
    const unsubBrands = onSnapshot(collection(db, 'marcas'), s => setManagedLists(prev => ({...prev, brands: s.docs.map(d => ({id: d.id, name: d.data()?.name})).filter(d => d.name).sort((a,b) => a.name.localeCompare(b.name))})));

    return () => { unsubCategories(); unsubProviders(); unsubBrands(); };
  }, []);

  const handlePdfUpload = (e) => { /* Placeholder */ };

  const handlePartSelection = (id) => {
    setBomSearchFilter('');
    if (!id) return setBomForm({partId: '', quantity: 1, unitPrice: 0, proveedorId: ''});
    const p = catalogo.find(x => x.id === id);
    if (!p) return;

    let providerId = '';
    if (p.defaultProvider) {
      providerId = typeof p.defaultProvider === 'string' ? managedLists.providers.find(i => i.name === p.defaultProvider)?.id || '' : p.defaultProvider.id;
    }

    setBomForm({...bomForm, partId: id, unitPrice: p.lastPrice || 0, proveedorId: providerId });
    setAutoFillTriggered(true);
    setTimeout(() => setAutoFillTriggered(false), 600);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const data = { name: newProjectName, description: newProjectDesc, createdAt: new Date().toISOString() };
    if (editingProjectId) {
        await updateDoc(doc(db, 'proyectos_bom', editingProjectId), data);
    } else {
        await setDoc(doc(collection(db, 'proyectos_bom')), data);
    }
    setIsProjectModalOpen(false); setNewProjectName(''); setNewProjectDesc(''); setEditingProjectId(null);
  };

  const handleSavePart = async (e) => {
    e.preventDefault();
    if (!partForm.name || !partForm.partNumber) return alert("Nombre y P/N obligatorios.");
    
    const data = {
        name: partForm.name,
        partNumber: partForm.partNumber,
        lastPrice: Number(partForm.lastPrice) || 0,
        brand: partForm.brand ? doc(db, 'marcas', partForm.brand) : null,
        category: partForm.category ? doc(db, 'categorias', partForm.category) : null,
        defaultProvider: partForm.defaultProvider ? doc(db, 'proveedores', partForm.defaultProvider) : null,
    };

    if (editingCatalogId) {
        await updateDoc(doc(db, 'catalogo_maestro', editingCatalogId), data);
    } else {
        await setDoc(doc(collection(db, 'catalogo_maestro')), data);
    }
    setEditingCatalogId(null);
    setPartForm({ name: '', partNumber: '', lastPrice: '', defaultProvider: '', category: '', brand: '' });
  };
  
  const handleSaveManagedList = async ({ type, data }) => {
    const { renames, deleted, added } = data;
    const batch = writeBatch(db);
    const masterCatalogRef = collection(db, 'catalogo_maestro');
    
    let collectionName = '', fieldName = '';
    if (type === 'category') { collectionName = 'categorias'; fieldName = 'category'; }
    else if (type === 'provider') { collectionName = 'proveedores'; fieldName = 'defaultProvider'; }
    else if (type === 'brand') { collectionName = 'marcas'; fieldName = 'brand'; }
    else return;

    const collectionRef = collection(db, collectionName);
    const listQuerySnapshot = await getDocs(collectionRef);
    const existingDocs = listQuerySnapshot.docs.map(d => ({ id: d.id, name: d.data()?.name })).filter(d => d.name);

    for (const name of deleted) {
        const docToDelete = existingDocs.find(d => d.name === name);
        if (docToDelete) {
            const refToDelete = doc(db, collectionName, docToDelete.id);
            batch.delete(refToDelete);
            const q = query(masterCatalogRef, where(fieldName, "==", refToDelete));
            const snapshot = await getDocs(q);
            snapshot.forEach(docToUpdate => batch.update(docToUpdate.ref, { [fieldName]: null }));
        }
    }

    renames.forEach(({ oldName, newName }) => {
        const docToUpdate = existingDocs.find(d => d.name === oldName);
        if (docToUpdate) batch.update(doc(collectionRef, docToUpdate.id), { name: newName });
    });

    added.forEach(name => {
      if (!existingDocs.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        batch.set(doc(collectionRef), { name });
      }
    });
    
    await batch.commit();

    const list = managedLists[type === 'category' ? 'categories' : type + 's'] || [];
    const currentFormValueId = partForm[fieldName];
    const currentFormValueName = list.find(item => item.id === currentFormValueId)?.name;
    if ([...renames.map(r => r.oldName), ...deleted].includes(currentFormValueName)) {
        setPartForm(prev => ({...prev, [fieldName]: ''}));
    }
  };

  const handleEditClick = (item) => {
    const findIdByName = (list, name) => list.find(i => i.name === name)?.id || '';

    const brandId = item.brand ? (typeof item.brand === 'string' ? findIdByName(managedLists.brands, item.brand) : item.brand.id) : '';
    const categoryId = item.category ? (typeof item.category === 'string' ? findIdByName(managedLists.categories, item.category) : item.category.id) : '';
    const providerId = item.defaultProvider ? (typeof item.defaultProvider === 'string' ? findIdByName(managedLists.providers, item.defaultProvider) : item.defaultProvider.id) : '';

    setEditingCatalogId(item.id);
    setPartForm({
        name: item.name || '',
        partNumber: item.partNumber || '',
        lastPrice: item.lastPrice || 0,
        brand: brandId,
        category: categoryId,
        defaultProvider: providerId
    });
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const brandOptions = managedLists.brands.map(b => ({ value: b.id, label: b.name }));
  const categoryOptions = managedLists.categories.map(c => ({ value: c.id, label: c.name }));
  const providerOptions = managedLists.providers.map(p => ({ value: p.id, label: p.name }));

  const selectedPartForBom = bomForm.partId ? catalogo.find(p => p.id === bomForm.partId) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 overflow-x-hidden">
      
      {listManager.isOpen && (
        <ListManagerModal 
            title={listManager.title}
            items={managedLists[listManager.type === 'category' ? 'categories' : listManager.type + 's']?.map(i => i.name) || []}
            onClose={() => setListManager({ isOpen: false, type: null, title: '' })}
            onSave={(data) => handleSaveManagedList({ type: listManager.type, data })}
        />
      )}

      {confirmDelete.isOpen && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in duration-200">
                <h2 className="font-black text-xl mb-2">{confirmDelete.title}</h2>
                <p className="text-slate-500 mb-6">{confirmDelete.message}</p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmDelete({isOpen: false, onConfirm: null})} className="flex-1 p-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                    <button onClick={() => { confirmDelete.onConfirm(); setConfirmDelete({isOpen: false, onConfirm: null}); }} className="flex-1 p-3.5 bg-red-500 text-white rounded-xl font-black">Confirmar</button>
                </div>
            </div>
        </div>
      )}

      <header className="bg-slate-900 text-white p-4 shadow-xl flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center space-x-3">
          <BrainCircuit className="text-indigo-400 w-8 h-8" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tighter leading-none">AutoBOM Pro</h1>
                <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">v{APP_VERSION}</span>
            </div>
          </div>
        </div>
        <nav className="flex space-x-1 bg-slate-800 p-1 rounded-xl">
          <button onClick={() => {setActiveTab('proyectos'); setActiveProject(null);}} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab !== 'catalogo' && activeTab !== 'bom' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Proyectos</button>
          <button onClick={() => {setActiveTab('catalogo'); setActiveProject(null);}} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'catalogo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Catálogo</button>
        </nav>
      </header>

      <main className="w-full p-4 md:p-8">
        
        {activeTab === 'proyectos' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h2 className="font-black text-2xl text-slate-800 tracking-tight">Tus Proyectos</h2>
                <button onClick={() => {setEditingProjectId(null); setNewProjectName(''); setNewProjectDesc(''); setIsProjectModalOpen(true);}} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg flex items-center justify-center active:scale-95 transition-transform"><Plus className="mr-2"/> Nuevo Proyecto</button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {(proyectos || []).map(p => {
                    const totalProyecto = bomItems.filter(item => item.projectId === p.id).reduce((sum, item) => sum + (item.totalPrice || 0), 0);
                    return (
                    <div key={p.id} onClick={() => {setActiveProject(p); setActiveTab('bom');}} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-400 cursor-pointer shadow-sm relative group transition-all h-52 flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full opacity-40"></div>
                        <div>
                        <h3 className="font-black text-xl text-slate-800 truncate pr-10">{p.name}</h3>
                        <p className="text-slate-500 text-xs line-clamp-3 mt-2">{p.description || 'Sin notas'}</p>
                        </div>
                        <div className="flex justify-between items-center border-t pt-4 border-slate-50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center font-bold text-green-600 text-sm"><DollarSign className="w-4 h-4 mr-1"/>{totalProyecto.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                            <ChevronRight className="text-indigo-500 w-5 h-5" />
                        </div>
                        </div>
                        <div className="absolute top-4 right-4 flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => {e.stopPropagation(); setEditingProjectId(p.id); setNewProjectName(p.name); setNewProjectDesc(p.description); setIsProjectModalOpen(true);}} className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100"><Pencil className="w-4 h-4"/></button>
                        <button onClick={(e) => {e.stopPropagation(); setConfirmDelete({ isOpen: true, title: '¿Borrar proyecto?', message: `Se borrarán todos los datos de "${p.name}".`, onConfirm: () => deleteDoc(doc(db, 'proyectos_bom', p.id)) });}} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                    )})
                }
                </div>
            </div>
        )}

        {activeTab === 'bom' && activeProject && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="text-center md:text-left">
                    <button onClick={() => {setActiveProject(null); setActiveTab('proyectos');}} className="text-indigo-600 font-bold text-sm flex items-center mb-1 hover:underline"><ArrowLeft className="w-4 h-4 mr-1"/> Volver</button>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{activeProject.name}</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="bg-green-50 border border-green-100 px-8 py-3 rounded-2xl text-right flex-1 md:flex-none">
                        <div className="text-[10px] font-black text-green-800 uppercase tracking-widest">Inversión Estimada</div>
                        <div className="text-3xl font-black text-green-700 tracking-tighter">${(activeBomItems || []).reduce((s,i) => s+(i.totalPrice||0),0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl sticky top-24">
                        <h3 className="font-bold mb-5 flex items-center text-lg uppercase tracking-tighter"><PackagePlus className="mr-2 text-indigo-300"/> Carga Manual</h3>
                        <div className="space-y-4">
                            <div className="bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-800/50 mb-2">
                            <div className="flex items-center text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2"><Filter className="w-3 h-3 mr-1"/> Filtrar Catálogo</div>
                            <input type="text" value={bomSearchFilter} onChange={e => {setBomSearchFilter(e.target.value); setBomForm({...bomForm, partId: ''});}} placeholder="P/N o nombre..." className="w-full p-2.5 bg-indigo-800 border-none text-white rounded-xl text-xs outline-none shadow-inner" />
                            </div>

                            <SearchableDropdown dark options={(catalogo || []).filter(c => {
                                const searchStr = `${c.name || ''} ${c.partNumber || ''}`.toLowerCase();
                                return searchStr.includes(bomSearchFilter.toLowerCase());
                            }).map(c => ({ value: c.id, label: c.name, subLabel: `${c.partNumber} • $${c.lastPrice||0}` }))} value={bomForm.partId} onChange={handlePartSelection} placeholder="📌 Selecciona pieza..." />
                            
                            {selectedPartForBom && (
                                <div className="p-3 bg-indigo-950/40 rounded-xl mt-1 space-y-2 border border-indigo-800/50">
                                    <div className="flex items-center flex-wrap gap-2">
                                        { (() => {
                                            const brandName = selectedPartForBom.brand ? (typeof selectedPartForBom.brand === 'string' ? selectedPartForBom.brand : managedLists.brands.find(b => b.id === selectedPartForBom.brand.id)?.name) : '';
                                            const categoryName = selectedPartForBom.category ? (typeof selectedPartForBom.category === 'string' ? selectedPartForBom.category : managedLists.categories.find(c => c.id === selectedPartForBom.category.id)?.name) : '';
                                            return (
                                                <>
                                                    {brandName && <div className="flex items-center text-[10px] font-black text-gray-300 bg-gray-600/50 px-2 py-1 rounded-full w-max border border-gray-500/50 uppercase tracking-tight"><Tag className="w-3 h-3 mr-1"/>{brandName}</div>}
                                                    {categoryName && <div className="flex items-center text-[10px] font-black text-purple-300 bg-purple-600/30 px-2 py-1 rounded-full w-max border border-purple-500/50 uppercase tracking-tight"><Tag className="w-3 h-3 mr-1"/>{categoryName}</div>}
                                                </>
                                            )
                                        })() }
                                    </div>
                                </div>
                            )}

                            <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ${autoFillTriggered ? 'ring-2 ring-green-400 rounded-xl p-1 bg-green-900/20' : ''}`}>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase ml-1 mb-1">Cant.</span>
                                    <input type="number" min="1" value={bomForm.quantity} onChange={e => setBomForm({...bomForm, quantity: e.target.value})} className="p-3 bg-indigo-800 border-none text-white rounded-xl focus:ring-2 focus:ring-white outline-none font-bold" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase ml-1 mb-1">Precio $</span>
                                    <div className="relative">
                                        <input type="number" step="0.01" value={bomForm.unitPrice} onChange={e => setBomForm({...bomForm, unitPrice: e.target.value})} className={`w-full p-3 border-none text-white rounded-xl focus:ring-2 focus:ring-white outline-none font-bold ${autoFillTriggered ? 'bg-green-700' : 'bg-indigo-800'}`} />
                                        {autoFillTriggered && <Zap className="absolute right-2 top-3 w-4 h-4 text-yellow-300 animate-bounce" />}
                                    </div>
                                </div>
                            </div>

                            <SearchableDropdown dark options={providerOptions} value={bomForm.proveedorId} onChange={val => setBomForm({...bomForm, proveedorId: val})} placeholder="🚚 Distribuidor..." />

                            <button onClick={async () => {
                                if (!bomForm.partId) return alert("Selecciona una pieza");
                                const part = catalogo.find(p => p.id === bomForm.partId);
                                const batch = writeBatch(db);
                                const bomRef = doc(collection(db, 'items_bom'));
                                batch.set(bomRef, { 
                                    projectId: activeProject.id, 
                                    masterPartRef: doc(db, 'catalogo_maestro', part.id),
                                    quantity: Number(bomForm.quantity), 
                                    unitPrice: Number(bomForm.unitPrice), 
                                    totalPrice: Number(bomForm.quantity) * Number(bomForm.unitPrice), 
                                    proveedor: bomForm.proveedorId ? doc(db, 'proveedores', bomForm.proveedorId) : null,
                                    status: 'Requerido', 
                                    addedAt: new Date().toISOString() 
                                });
                                batch.update(doc(db, 'catalogo_maestro', part.id), { lastPrice: Number(bomForm.unitPrice), defaultProvider: bomForm.proveedorId ? doc(db, 'proveedores', bomForm.proveedorId) : null });
                                await batch.commit();
                                setBomForm({ partId: '', quantity: 1, unitPrice: 0, proveedorId: '' });
                            }} className="w-full bg-white text-indigo-900 p-4 rounded-2xl font-black mt-4 shadow-lg active:scale-95 transition-all flex items-center justify-center">
                            <Plus className="w-5 h-5 mr-2"/> Agregar al BOM
                            </button>
                        </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[400px] overflow-hidden">
                            <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr><th className="p-5">Cant</th><th className="p-5">Descripción del Ítem</th><th className="p-5 text-right">Costo</th><th className="p-5 text-center">⚙️</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(activeBomItems || []).map(item => {
                                    let details = {};
                                    let providerName = '';

                                    if (item.masterPartRef) {
                                        const masterPart = catalogo.find(p => p.id === item.masterPartRef.id);
                                        if (!masterPart) return <tr key={item.id}><td colSpan="4" className="p-4 text-center text-slate-400">Ítem obsoleto (eliminado del catálogo)</td></tr>;
                                        
                                        details = {
                                            name: masterPart.name,
                                            partNumber: masterPart.partNumber,
                                            brandName: managedLists.brands.find(b => b.id === masterPart.brand?.id)?.name || '',
                                            categoryName: managedLists.categories.find(c => c.id === masterPart.category?.id)?.name || ''
                                        };
                                        providerName = managedLists.providers.find(p => p.id === item.proveedor?.id)?.name || '';
                                    } else {
                                        // Fallback for old data structure
                                        details = {
                                            name: item.name,
                                            partNumber: item.partNumber,
                                            brandName: item.brand ? (typeof item.brand === 'string' ? item.brand : managedLists.brands.find(b => b.id === item.brand.id)?.name) : '',
                                            categoryName: item.category ? (typeof item.category === 'string' ? item.category : managedLists.categories.find(c => c.id === item.category.id)?.name) : ''
                                        };
                                        providerName = item.proveedor ? (typeof item.proveedor === 'string' ? item.proveedor : managedLists.providers.find(p => p.id === item.proveedor.id)?.name) : '';
                                    }

                                  return (
                                <tr key={item.id} className="hover:bg-indigo-50/20 group transition-colors">
                                    <td className="p-5 font-black text-lg text-slate-700">{item.quantity}</td>
                                    <td className="p-5">
                                      <div className="font-bold text-slate-900 leading-tight">{details.name || 'Sin nombre'}</div>
                                      <div className="text-[10px] font-mono text-slate-400 mt-1">{details.partNumber || 'S/N'}</div>
                                      <div className="flex items-center flex-wrap gap-2 mt-2">
                                        {details.brandName && <div className="flex items-center text-[9px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full w-max border border-gray-200 uppercase tracking-tighter"><Tag className="w-3 h-3 mr-1"/>{details.brandName}</div>}
                                        {details.categoryName && <div className="flex items-center text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-max border border-purple-100 uppercase tracking-tighter"><Tag className="w-3 h-3 mr-1"/>{details.categoryName}</div>}
                                        {providerName && <div className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded w-max mt-2 border border-indigo-100 uppercase tracking-tighter">Prov: {providerName}</div>}
                                      </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="font-black text-slate-900 text-lg">${(item.totalPrice||0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                                        <div className="text-[10px] text-slate-400">${item.unitPrice}/u</div>
                                    </td>
                                    <td className="p-5 text-center">
                                    <button onClick={() => setConfirmDelete({ isOpen: true, title: 'Quitar ítem', message: `¿Quitar "${details.name}" de la lista?`, onConfirm: () => deleteDoc(doc(db, 'items_bom', item.id)) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                                )})}
                            </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'catalogo' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-1">
              <div className={`bg-white p-6 rounded-3xl border shadow-sm sticky top-24 ${editingCatalogId ? 'ring-4 ring-amber-100 border-amber-300' : ''}`}>
                <h2 className="font-black text-lg mb-5 flex items-center text-slate-800 uppercase tracking-tighter"><Database className="mr-2 text-indigo-600" /> Registro Maestro</h2>
                <form onSubmit={handleSavePart} className="space-y-4">
                  <input value={partForm.name} onChange={e => setPartForm({...partForm, name: e.target.value})} placeholder="Descripción del repuesto..." className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 font-bold" required/>
                  <input value={partForm.partNumber} onChange={e => setPartForm({...partForm, partNumber: e.target.value})} placeholder="P/N Referencia..." className="w-full p-4 border rounded-2xl font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 font-bold" required/>
                  
                  <div className="flex items-center gap-2">
                      <div className="flex-grow">
                           <SearchableDropdown options={brandOptions} value={partForm.brand} onChange={val => setPartForm({...partForm, brand: val})} placeholder="🏭 Marca..."/>
                      </div>
                      <button type="button" onClick={() => setListManager({ isOpen: true, type: 'brand', title: 'Gestionar Marcas'})} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"><Plus className="w-5 h-5"/></button>
                  </div>

                   <div className="flex items-center gap-2">
                      <div className="flex-grow">
                          <SearchableDropdown options={categoryOptions} value={partForm.category} onChange={val => setPartForm({...partForm, category: val})} placeholder="🏷️ Categoría..."/>
                      </div>
                      <button type="button" onClick={() => setListManager({ isOpen: true, type: 'category', title: 'Gestionar Categorías'})} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"><Plus className="w-5 h-5"/></button>
                  </div>

                  <div className="border-t pt-4 border-slate-50 space-y-4">
                    <input type="number" step="0.01" value={partForm.lastPrice} onChange={e => setPartForm({...partForm, lastPrice: e.target.value})} placeholder="Precio Estimado $" className="w-full p-3.5 border border-green-100 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-green-500" />
                    <div className="flex items-center gap-2">
                        <div className="flex-grow">
                            <SearchableDropdown options={providerOptions} value={partForm.defaultProvider} onChange={val => setPartForm({...partForm, defaultProvider: val})} placeholder="🚚 Proveedor..."/>
                        </div>
                        <button type="button" onClick={() => setListManager({ isOpen: true, type: 'provider', title: 'Gestionar Proveedores'})} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"><Plus className="w-5 h-5"/></button>
                    </div>
                  </div>
                  <button type="submit" className={`w-full p-4 text-white rounded-2xl font-black shadow-lg transition-all ${editingCatalogId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-black'}`}>
                    {editingCatalogId ? 'Actualizar Registro' : 'Guardar Registro'}
                  </button>
                  {editingCatalogId && (
                    <button type="button" onClick={() => {setEditingCatalogId(null); setPartForm({ name: '', partNumber: '', lastPrice: '', defaultProvider: '', category: '', brand: '' });}} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 pt-2">Cancelar Edición</button>
                  )}
                </form>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar por nombre, P/N, marca..." className="pl-12 pr-4 py-3 w-full border border-slate-200 rounded-2xl text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="p-5">Pieza</th><th className="p-5 text-right">Precio Base</th><th className="p-5 text-center">⚙️</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {catalogo.map(item => {
                             const brandName = item.brand ? (typeof item.brand === 'string' ? item.brand : managedLists.brands.find(b => b.id === item.brand.id)?.name) : '';
                             const categoryName = item.category ? (typeof item.category === 'string' ? item.category : managedLists.categories.find(c => c.id === item.category.id)?.name) : '';

                             const searchMatch = () => {
                                if (!searchTerm) return true;
                                const s = searchTerm.toLowerCase();
                                return (item.name || '').toLowerCase().includes(s) || 
                                       (item.partNumber || '').toLowerCase().includes(s) || 
                                       (brandName || '').toLowerCase().includes(s) || 
                                       (categoryName || '').toLowerCase().includes(s);
                             }
                             if (!searchMatch()) return null;

                             return (
                                <tr key={item.id} className="hover:bg-indigo-50/40 group transition-colors">
                                    <td className="p-5">
                                    <div className="font-bold text-slate-800 text-base leading-tight">{item.name || 'Sin nombre'}</div>
                                    <div className="text-[10px] font-mono text-slate-500 mt-1">{item.partNumber}</div>
                                    <div className="flex items-center flex-wrap gap-2 mt-2">
                                        {brandName && <div className="flex items-center text-[9px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full w-max border border-gray-200 uppercase tracking-tighter"><Tag className="w-3 h-3 mr-1"/>{brandName}</div>}
                                        {categoryName && <div className="flex items-center text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-max border border-purple-100 uppercase tracking-tighter"><Tag className="w-3 h-3 mr-1"/>{categoryName}</div>}
                                    </div>
                                    </td>
                                    <td className="p-5 text-right font-black text-green-700 text-lg">${(item.lastPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="p-5 text-center flex justify-center space-x-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, title: 'Borrar Maestro', message: `¿Eliminar "${item.name}" del catálogo global?`, onConfirm: () => deleteDoc(doc(db, 'catalogo_maestro', item.id)) });}} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                             );
                        })}
                    </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

      </main>

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="font-black text-2xl flex items-center tracking-tighter"><FolderGit2 className="mr-2 text-indigo-600 w-6 h-6"/> {editingProjectId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
                <button onClick={() => { setIsProjectModalOpen(false); setEditingProjectId(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X /></button>
                </div>
                <form onSubmit={handleSaveProject} className="space-y-4">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Nombre</span>
                    <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Ej: Celda Robotizada..." className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" required />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Notas</span>
                    <textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Centro de costos o justificación..." className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" rows="3" />
                </div>
                <button type="submit" className="w-full p-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-lg">
                    {editingProjectId ? 'Actualizar Proyecto' : 'Crear Proyecto'}
                </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}
