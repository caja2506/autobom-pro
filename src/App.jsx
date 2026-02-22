import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, Database, Search, Plus, Trash2, 
  AlertCircle, ChevronRight, DollarSign, ArrowLeft, 
  PackagePlus, X, Pencil, Save, BrainCircuit, 
  Loader2, Sparkles, Filter, Zap, Activity
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';

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
// COMPONENTE: DROPDOWN DE BÚSQUEDA
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
              placeholder="Buscar..."
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
        <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">
          <ul className="divide-y divide-slate-50">
            {filtered.slice(0, 50).map((item) => (
              <li
                key={item.value}
                onClick={() => { onChange(item.value); setSearch(''); setIsOpen(false); }}
                className={`p-3.5 hover:bg-indigo-50 cursor-pointer flex flex-col ${value === item.value ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
              >
                <span className="font-bold text-slate-800 text-sm">{item.label}</span>
                {item.subLabel && <span className="text-[10px] text-slate-400 font-mono mt-0.5">{item.subLabel}</span>}
              </li>
            ))}
            {filtered.length === 0 && <li className="p-4 text-xs text-slate-400 text-center">Sin resultados</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

// ========================================================
// APLICACIÓN PRINCIPAL
// ========================================================
export default function App() {
  const [proyectos, setProyectos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [bomItems, setBomItems] = useState([]); 

  const [activeTab, setActiveTab] = useState('proyectos'); 
  const [activeProject, setActiveProject] = useState(null);
  
  // ESTADOS DE IA Y DIAGNÓSTICO
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState(""); 
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [lastError, setLastError] = useState(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [autoFillTriggered, setAutoFillTriggered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // ESTADOS DE EDICIÓN
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingCatalogId, setEditingCatalogId] = useState(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [partForm, setPartForm] = useState({ name: '', partNumber: '', lastPrice: '', defaultProvider: '' });
  const [bomForm, setBomForm] = useState({ partId: '', quantity: 1, unitPrice: 0, proveedor: ''});
  const [searchTerm, setSearchTerm] = useState('');
  const [bomSearchFilter, setBomSearchFilter] = useState('');

  const pdfInputRef = useRef(null);

  // Carga inicial de librerías y Firebase
  useEffect(() => {
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.async = true;
    document.body.appendChild(s);

    onSnapshot(collection(db, 'proyectos_bom'), s => setProyectos(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))));
    onSnapshot(collection(db, 'catalogo_maestro'), s => setCatalogo(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => (a.name || '').localeCompare(b.name || ''))));
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    return onSnapshot(collection(db, 'items_bom'), s => setBomItems(s.docs.map(d => ({ ...d.data(), id: d.id })).filter(i => i.projectId === activeProject.id).sort((a,b) => new Date(a.addedAt) - new Date(b.addedAt))));
  }, [activeProject]);

  // --- FUNCIÓN DE TEST BÁSICA Y DIRECTA ---
  const testConnection = async () => {
    setIsDiagnosticOpen(true);
    setAiStatus(`Enviando prueba a ${MODEL_NAME}...`);
    setLastError(null);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: "Responde únicamente con la palabra: CONECTADO" }] }] 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Fallo HTTP " + response.status);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        setAiStatus(`✅ IA RESPONDE: ${text}`);

    } catch (err) {
        setLastError(err.message);
        setAiStatus("❌ FALLO LA CONEXIÓN");
    }
  };

  // --- PROCESAR PDF ---
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.pdfjsLib) {
      alert("La herramienta PDF aún se está cargando. Intenta en 3 segundos.");
      return;
    }

    setIsProcessingAI(true);
    setIsDiagnosticOpen(true);
    setAiStatus("Extrayendo texto del PDF localmente...");
    setLastError(null);

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }

      if (!text.trim()) throw new Error("No pudimos extraer texto de este PDF.");

      setAiStatus(`Enviando texto a ${MODEL_NAME}...`);

      const prompt = `Analiza el siguiente texto de una cotización. Extrae los datos y devuelve EXCLUSIVAMENTE un JSON con esta estructura: { "supplier": "Nombre Proveedor", "items": [ { "pn": "Número de parte", "description": "Descripción", "quantity": numero, "unitPrice": numero } ] }. Texto:\n\n${text}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Error de IA: ${result.error?.message || 'Fallo desconocido'}`);
      }

      const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawJson) throw new Error("La IA no devolvió ningún texto.");
      
      const data = JSON.parse(rawJson.replace(/```json/g, '').replace(/```/g, '').trim());

      if (data.items) {
        setAiStatus("Guardando en Firebase...");
        const batch = writeBatch(db);
        data.items.forEach(item => {
          let part = catalogo.find(p => (p.partNumber || '').toLowerCase() === (item.pn || '').toLowerCase());
          if (!part) {
            const catRef = doc(collection(db, 'catalogo_maestro'));
            const newPart = { name: item.description, partNumber: (item.pn || 'S/N').toUpperCase(), lastPrice: Number(item.unitPrice) || 0, defaultProvider: data.supplier || '' };
            batch.set(catRef, newPart);
            part = { id: catRef.id, ...newPart };
          } else {
            batch.update(doc(db, 'catalogo_maestro', part.id), { lastPrice: Number(item.unitPrice), defaultProvider: data.supplier || part.defaultProvider });
          }
          const bomRef = doc(collection(db, 'items_bom'));
          batch.set(bomRef, { ...part, projectId: activeProject.id, partId: part.id, proveedor: data.supplier || '', quantity: Number(item.quantity) || 1, unitPrice: Number(item.unitPrice) || 0, totalPrice: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0), status: 'En Cotización', addedAt: new Date().toISOString() });
        });
        await batch.commit();
        setAiStatus("✨ ¡Cotización cargada con éxito!");
        setTimeout(() => setIsProcessingAI(false), 2500);
      }
    } catch (err) {
      setLastError(err.message);
      setAiStatus("❌ ERROR");
    } finally {
      e.target.value = "";
    }
  };

  const handlePartSelection = (id) => {
    if (!id) return setBomForm({...bomForm, partId: '', unitPrice: 0, proveedor: ''});
    const p = catalogo.find(x => x.id === id);
    setBomForm({...bomForm, partId: id, unitPrice: p?.lastPrice || 0, proveedor: p?.defaultProvider || ''});
    setAutoFillTriggered(true);
    setTimeout(() => setAutoFillTriggered(false), 600);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const data = { name: newProjectName, description: newProjectDesc, createdAt: new Date().toISOString() };
    if (editingProjectId) {
        await updateDoc(doc(db, 'proyectos_bom', editingProjectId), { name: newProjectName, description: newProjectDesc });
    } else {
        await setDoc(doc(collection(db, 'proyectos_bom')), data);
    }
    setIsProjectModalOpen(false); setNewProjectName(''); setNewProjectDesc(''); setEditingProjectId(null);
  };

  const handleSavePart = async (e) => {
    e.preventDefault();
    if (!partForm.name || !partForm.partNumber) return alert("Nombre y P/N obligatorios.");
    const data = { ...partForm, lastPrice: Number(partForm.lastPrice) || 0 };
    if (editingCatalogId) {
        await updateDoc(doc(db, 'catalogo_maestro', editingCatalogId), data);
    } else {
        await setDoc(doc(collection(db, 'catalogo_maestro')), data);
    }
    setEditingCatalogId(null);
    setPartForm({ name: '', partNumber: '', lastPrice: '', defaultProvider: '' });
  };

  // Listas únicas de proveedores (para dropdowns manuales)
  const uniqueProviders = [...new Set(catalogo.map(c => c.defaultProvider).filter(Boolean))].map(p => ({ value: p, label: p }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 overflow-x-hidden">
      
      {/* PANEL DE DIAGNÓSTICO */}
      {(isDiagnosticOpen || isProcessingAI) && (
        <div className="fixed top-20 right-4 z-[500] w-full max-w-sm animate-in slide-in-from-right duration-300">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-5 border border-slate-700">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center text-xs font-black text-indigo-400 uppercase tracking-tighter"><Activity className="w-4 h-4 mr-2"/> Diagnóstico Gemini</div>
                    <button onClick={() => {setIsDiagnosticOpen(false); setIsProcessingAI(false);}} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded"><X className="w-4 h-4"/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">Estado:</span>
                        <span className={`font-mono font-bold ${isProcessingAI ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>{aiStatus || "Listo"}</span>
                    </div>

                    {lastError && (
                        <div className="bg-red-950/50 border border-red-500/50 p-3 rounded-xl text-xs text-red-200 font-mono break-words">
                            <span className="text-red-400 font-black block mb-1 uppercase">Error Exacto:</span>
                            {lastError}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8" /></div>
            <h3 className="font-black text-xl text-slate-800 mb-2">{confirmDelete.title}</h3>
            <p className="text-slate-500 text-sm mb-6">{confirmDelete.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete({ isOpen: false })} className="flex-1 p-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
              <button onClick={async () => { await confirmDelete.onConfirm(); setConfirmDelete({ isOpen: false }); }} className="flex-1 p-3.5 bg-red-500 text-white rounded-xl font-black">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 shadow-xl flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center space-x-3">
          <BrainCircuit className="text-indigo-400 w-8 h-8" />
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter leading-none">AutoBOM Pro</h1>
            <button onClick={testConnection} className="text-[9px] font-bold text-yellow-400 flex items-center hover:text-white transition-colors mt-1 bg-yellow-400/10 px-2 py-0.5 rounded-full"><Activity className="w-3 h-3 mr-1"/> Test API Gemini</button>
          </div>
        </div>
        <nav className="flex space-x-1 bg-slate-800 p-1 rounded-xl">
          <button onClick={() => {setActiveTab('proyectos'); setActiveProject(null);}} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab !== 'catalogo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Proyectos</button>
          <button onClick={() => {setActiveTab('catalogo'); setActiveProject(null);}} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'catalogo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Catálogo</button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* VISTA 1: PROYECTOS */}
        {activeTab === 'proyectos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="font-black text-2xl text-slate-800 tracking-tight">Tus Proyectos</h2>
              <button onClick={() => {setEditingProjectId(null); setNewProjectName(''); setNewProjectDesc(''); setIsProjectModalOpen(true);}} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg flex items-center justify-center active:scale-95 transition-transform"><Plus className="mr-2"/> Nuevo Proyecto</button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(proyectos || []).map(p => (
                <div key={p.id} onClick={() => {setActiveProject(p); setActiveTab('bom');}} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-400 cursor-pointer shadow-sm relative group transition-all h-52 flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full opacity-40"></div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800 truncate pr-10">{p.name}</h3>
                    <p className="text-slate-500 text-xs line-clamp-3 mt-2">{p.description || 'Sin notas'}</p>
                  </div>
                  <div className="flex justify-between items-center border-t pt-4 border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className="text-indigo-500 w-5 h-5" />
                  </div>
                  <div className="absolute top-4 right-4 flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => {e.stopPropagation(); setEditingProjectId(p.id); setNewProjectName(p.name); setNewProjectDesc(p.description); setIsProjectModalOpen(true);}} className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100"><Pencil className="w-4 h-4"/></button>
                    <button onClick={(e) => {e.stopPropagation(); setConfirmDelete({ isOpen: true, title: '¿Borrar proyecto?', message: `Se borrarán todos los datos de "${p.name}".`, onConfirm: () => deleteDoc(doc(db, 'proyectos_bom', p.id)) });}} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA 2: BOM */}
        {activeTab === 'bom' && activeProject && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
               <div className="text-center md:text-left">
                 <button onClick={() => {setActiveProject(null); setActiveTab('proyectos');}} className="text-indigo-600 font-bold text-sm flex items-center mb-1 hover:underline"><ArrowLeft className="w-4 h-4 mr-1"/> Volver</button>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">{activeProject.name}</h2>
               </div>
               <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1">
                    <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
                    <button onClick={() => pdfInputRef.current.click()} disabled={isProcessingAI} className="w-full bg-slate-900 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center shadow-xl active:scale-95 transition-all disabled:bg-slate-400 min-w-[200px]">
                      {isProcessingAI ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Sparkles className="w-5 h-5 mr-2 text-yellow-400 fill-yellow-400"/>}
                      {isProcessingAI ? "Procesando..." : 'Importar PDF (IA)'}
                    </button>
                  </div>
                  <div className="bg-green-50 border border-green-100 px-8 py-3 rounded-2xl text-right flex-1 md:flex-none">
                    <div className="text-[10px] font-black text-green-800 uppercase tracking-widest">Inversión Estimada</div>
                    <div className="text-3xl font-black text-green-700 tracking-tighter">${(bomItems || []).reduce((s,i) => s+(i.totalPrice||0),0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
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

                    <SearchableDropdown dark options={uniqueProviders} value={bomForm.proveedor} onChange={val => setBomForm({...bomForm, proveedor: val})} placeholder="🚚 Distribuidor..." />

                    <button onClick={async () => {
                        if (!bomForm.partId) return alert("Selecciona una pieza");
                        const part = catalogo.find(p => p.id === bomForm.partId);
                        const batch = writeBatch(db);
                        const bomRef = doc(collection(db, 'items_bom'));
                        batch.set(bomRef, { ...part, ...bomForm, projectId: activeProject.id, partId: part.id, quantity: Number(bomForm.quantity), unitPrice: Number(bomForm.unitPrice), totalPrice: Number(bomForm.quantity) * Number(bomForm.unitPrice), status: 'Requerido', addedAt: new Date().toISOString() });
                        batch.update(doc(db, 'catalogo_maestro', part.id), { lastPrice: Number(bomForm.unitPrice), defaultProvider: bomForm.proveedor });
                        await batch.commit();
                        setBomForm({ partId: '', quantity: 1, unitPrice: 0, proveedor: '' });
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
                        {(bomItems || []).map(item => (
                          <tr key={item.id} className="hover:bg-indigo-50/20 group transition-colors">
                            <td className="p-5 font-black text-lg text-slate-700">{item.quantity}</td>
                            <td className="p-5">
                              <div className="font-bold text-slate-900 leading-tight">{item.name || 'Sin nombre'}</div>
                              <div className="text-[10px] font-mono text-slate-400 mt-1">{item.partNumber || 'S/N'}</div>
                              {item.proveedor && <div className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded w-max mt-2 border border-indigo-100 uppercase tracking-tighter">Prov: {item.proveedor}</div>}
                            </td>
                            <td className="p-5 text-right">
                                <div className="font-black text-slate-900 text-lg">${(item.totalPrice||0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                                <div className="text-[10px] text-slate-400">${item.unitPrice}/u</div>
                            </td>
                            <td className="p-5 text-center">
                              <button onClick={() => setConfirmDelete({ isOpen: true, title: 'Quitar ítem', message: `¿Quitar "${item.name}" de la lista?`, onConfirm: () => deleteDoc(doc(db, 'items_bom', item.id)) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"><Trash2 className="w-4 h-4"/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 3: CATÁLOGO */}
        {activeTab === 'catalogo' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-1">
              <div className={`bg-white p-6 rounded-3xl border shadow-sm sticky top-24 ${editingCatalogId ? 'ring-4 ring-amber-100 border-amber-300' : ''}`}>
                <h2 className="font-black text-lg mb-5 flex items-center text-slate-800 uppercase tracking-tighter"><Database className="mr-2 text-indigo-600" /> Registro Maestro</h2>
                <div className="space-y-4">
                  <input value={partForm.name} onChange={e => setPartForm({...partForm, name: e.target.value})} placeholder="Descripción del repuesto..." className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 font-bold" />
                  <input value={partForm.partNumber} onChange={e => setPartForm({...partForm, partNumber: e.target.value})} placeholder="P/N Referencia..." className="w-full p-4 border rounded-2xl font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 font-bold" />
                  <div className="grid grid-cols-2 gap-3 border-t pt-4 border-slate-50">
                    <input type="number" step="0.01" value={partForm.lastPrice} onChange={e => setPartForm({...partForm, lastPrice: e.target.value})} placeholder="Precio Estimado $" className="w-full p-3.5 border border-green-100 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-green-500" />
                    <input value={partForm.defaultProvider} onChange={e => setPartForm({...partForm, defaultProvider: e.target.value})} placeholder="Proveedor..." className="w-full p-3.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50" />
                  </div>
                  <button onClick={handleSavePart} className={`w-full p-4 text-white rounded-2xl font-black shadow-lg transition-all ${editingCatalogId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-black'}`}>
                    {editingCatalogId ? 'Actualizar Registro' : 'Guardar Registro'}
                  </button>
                  {editingCatalogId && (
                    <button onClick={() => {setEditingCatalogId(null); setPartForm({ name: '', partNumber: '', lastPrice: '', defaultProvider: '' });}} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 pt-2">Cancelar Edición</button>
                  )}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar catálogo maestro..." className="pl-12 pr-4 py-3 w-full border border-slate-200 rounded-2xl text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr><th className="p-5">Pieza</th><th className="p-5 text-right">Precio Base</th><th className="p-5 text-center">⚙️</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(catalogo || []).filter(p => {
                        const s = searchTerm.toLowerCase();
                        return (p.name || '').toLowerCase().includes(s) || (p.partNumber || '').toLowerCase().includes(s) || (p.defaultProvider || '').toLowerCase().includes(s);
                    }).map(item => (
                      <tr key={item.id} className="hover:bg-indigo-50/40 group transition-colors">
                        <td className="p-5">
                           <div className="font-black text-slate-800 text-base leading-tight">{item.name || 'Sin nombre'}</div>
                           <div className="text-[10px] font-mono text-slate-500 mt-1">{item.partNumber}</div>
                        </td>
                        <td className="p-5 text-right font-black text-green-700 text-lg">${(item.lastPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td className="p-5 text-center flex justify-center space-x-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingCatalogId(item.id); setPartForm({name: item.name || '', partNumber: item.partNumber || '', lastPrice: item.lastPrice || 0, defaultProvider: item.defaultProvider || ''}); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, title: 'Borrar Maestro', message: `¿Eliminar "${item.name}" del catálogo global?`, onConfirm: () => deleteDoc(doc(db, 'catalogo_maestro', item.id)) });}} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL PROYECTO */}
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