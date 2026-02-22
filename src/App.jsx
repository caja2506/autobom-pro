import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, Database, Search, Plus, Trash2, 
  ChevronRight, DollarSign, ArrowLeft, 
  PackagePlus, X, Pencil, BrainCircuit, 
  Loader2, Sparkles, Filter, Zap, Activity, Tag, AlertCircle
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
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

// --- API GEMINI CONFIG ---
const API_KEY = "AIzaSyAgG7jwwxHRqDW2IaPRImr6GK-SqjFKDsQ";
const MODEL_NAME = "gemini-2.5-flash";

// ========================================================
// COMPONENTE: DROPDOWN DE BÚSQUEDA
// ========================================================
const SearchableDropdown = ({ options, value, onChange, placeholder, dark = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const safeOptions = Array.isArray(options) ? options : [];

  const selectedOption = safeOptions.find(o => o.value === value);

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

  const filtered = safeOptions.filter(o => {
      if (!o) return false;
      const label = o.label ? String(o.label) : '';
      const subLabel = o.subLabel ? String(o.subLabel) : '';
      const lowerCaseSearch = search.toLowerCase();
      return label.toLowerCase().includes(lowerCaseSearch) || subLabel.toLowerCase().includes(lowerCaseSearch);
  });

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
// COMPONENTE: GESTOR DE LISTAS (MODAL)
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
const APP_VERSION = "2.5";

export default function App() {
  const [proyectos, setProyectos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [managedLists, setManagedLists] = useState({ categories: [], providers: [], brands: [] });

  const [activeTab, setActiveTab] = useState('proyectos');
  const [activeProject, setActiveProject] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(""); 
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [lastError, setLastError] = useState(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [autoFillTriggered, setAutoFillTriggered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [listManager, setListManager] = useState({ isOpen: false, type: null, title: ''});

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingCatalogId, setEditingCatalogId] = useState(null);

  const [selectedCatalogItems, setSelectedCatalogItems] = useState([]);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [partForm, setPartForm] = useState({ name: '', partNumber: '', lastPrice: '', defaultProvider: '', category: '', brand: '' });
  const [bomForm, setBomForm] = useState({ partId: '', quantity: 1, unitPrice: 0, proveedorId: ''});
  const [searchTerm, setSearchTerm] = useState('');
  const [bomSearchFilter, setBomSearchFilter] = useState('');

  const pdfInputRef = useRef(null);
  const excelInputRef = useRef(null);

  const activeBomItems = activeProject
    ? bomItems.filter(i => i.projectId === activeProject.id).sort((a,b) => new Date(a.addedAt) - new Date(b.addedAt))
    : [];

  const safeLocaleCompare = (a, b, field) => String(a[field] || '').localeCompare(String(b[field] || ''));

  useEffect(() => {
    const loadScript = (src) => {
        if (!document.querySelector(`script[src="${src}"]`)) {
            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            document.body.appendChild(s);
        }
    };
    loadScript(PDFJS_URL);
    loadScript(XLSX_URL);

    onSnapshot(collection(db, 'proyectos_bom'), s => setProyectos(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))));
    onSnapshot(collection(db, 'catalogo_maestro'), s => setCatalogo(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => safeLocaleCompare(a, b, 'name'))));
    onSnapshot(collection(db, 'items_bom'), s => setBomItems(s.docs.map(d => ({ ...d.data(), id: d.id }))));

    const unsubCategories = onSnapshot(collection(db, 'categorias'), s => setManagedLists(prev => ({...prev, categories: s.docs.map(d => ({id: d.id, ...d.data()})).filter(d => d.name).sort((a,b) => safeLocaleCompare(a, b, 'name'))})));
    const unsubProviders = onSnapshot(collection(db, 'proveedores'), s => setManagedLists(prev => ({...prev, providers: s.docs.map(d => ({id: d.id, ...d.data()})).filter(d => d.name).sort((a,b) => safeLocaleCompare(a, b, 'name'))})));
    const unsubBrands = onSnapshot(collection(db, 'marcas'), s => setManagedLists(prev => ({...prev, brands: s.docs.map(d => ({id: d.id, ...d.data()})).filter(d => d.name).sort((a,b) => safeLocaleCompare(a, b, 'name'))})));

    return () => { unsubCategories(); unsubProviders(); unsubBrands(); };
  }, []);

  const testConnection = async () => {
    setIsDiagnosticOpen(true);
    setProcessingStatus(`Enviando prueba a ${MODEL_NAME}...`);
    setLastError(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Responde únicamente con la palabra: CONECTADO" }] }] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Fallo HTTP " + response.status);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setProcessingStatus(`✅ IA RESPONDE: ${text}`);
    } catch (err) {
      setLastError(err.message);
      setProcessingStatus("❌ FALLO LA CONEXIÓN");
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeProject) return;
    if (!window.pdfjsLib) return alert("La herramienta PDF aún se está cargando. Intenta en 3 segundos.");

    setIsProcessing(true);
    setIsDiagnosticOpen(true);
    setProcessingStatus("Extrayendo texto del PDF...");
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

      setProcessingStatus(`Enviando texto a ${MODEL_NAME}...`);
      const prompt = `Analiza el texto de una cotización. Extrae los datos y devuelve EXCLUSIVAMENTE un JSON con esta estructura: { "supplier": "Nombre Proveedor", "items": [ { "pn": "Número de parte", "description": "Descripción", "quantity": numero, "unitPrice": numero } ] }. Texto:\n\n${text}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(`Error de IA: ${result.error?.message || 'Fallo desconocido'}`);
      const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) throw new Error("La IA no devolvió ningún texto.");
      const data = JSON.parse(rawJson.replace(/```json/g, '').replace(/```/g, '').trim());

      if (data.items) {
        setProcessingStatus("Guardando en Firebase...");
        const batch = writeBatch(db);
        const catalogSnapshot = await getDocs(collection(db, 'catalogo_maestro'));
        const currentCatalog = catalogSnapshot.docs.map(d => ({...d.data(), id: d.id}));
        let newSupplierId = null;
        if(data.supplier){
            const existingProvider = managedLists.providers.find(p => p.name.toLowerCase() === data.supplier.toLowerCase());
            if(existingProvider) newSupplierId = existingProvider.id;
            else {
                const newProviderRef = doc(collection(db, 'proveedores'));
                batch.set(newProviderRef, { name: data.supplier });
                newSupplierId = newProviderRef.id;
            }
        }

        for(const item of data.items) {
            let part = currentCatalog.find(p => p.partNumber && item.pn && (p.partNumber.toLowerCase() === item.pn.toLowerCase()));
            let partId = null;
            if (!part) {
                const catRef = doc(collection(db, 'catalogo_maestro'));
                const newPartData = { name: item.description||'', partNumber: (item.pn||'S/N').toUpperCase(), lastPrice: Number(item.unitPrice)||0, defaultProvider: newSupplierId ? doc(db, 'proveedores', newSupplierId) : null, brand: null, category: null }; 
                batch.set(catRef, newPartData);
                partId = catRef.id;
            } else {
                partId = part.id;
                const updateData = { lastPrice: Number(item.unitPrice) };
                if(newSupplierId) updateData.defaultProvider = doc(db, 'proveedores', newSupplierId);
                batch.update(doc(db, 'catalogo_maestro', part.id), updateData);
            }
            const bomRef = doc(collection(db, 'items_bom'));
            batch.set(bomRef, { projectId: activeProject.id, masterPartRef: doc(db, 'catalogo_maestro', partId), quantity: Number(item.quantity)||1, unitPrice: Number(item.unitPrice)||0, totalPrice: (Number(item.quantity)||1)*(Number(item.unitPrice)||0), proveedor: newSupplierId ? doc(db, 'proveedores', newSupplierId) : null, status: 'En Cotización', addedAt: new Date().toISOString() });
        }
        await batch.commit();
        setProcessingStatus("✨ ¡Cotización cargada con éxito!");
        setTimeout(() => setIsProcessing(false), 2500);
      }
    } catch (err) {
      setLastError(err.message);
      setProcessingStatus("❌ ERROR");
      setIsProcessing(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.XLSX) {
        alert("La herramienta Excel aún se está cargando. Intenta en 3 segundos.");
        return;
    }

    setIsProcessing(true);
    setIsDiagnosticOpen(true);
    setProcessingStatus("Leyendo archivo Excel...");
    setLastError(null);

    try {
        const data = await file.arrayBuffer();
        const workbook = window.XLSX.read(data);
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) throw new Error("El archivo Excel está vacío o tiene un formato no compatible.");

        setProcessingStatus(`Procesando ${json.length} filas...`);

        const batch = writeBatch(db);
        
        const catalogSnapshot = await getDocs(collection(db, 'catalogo_maestro'));
        const currentCatalogMap = new Map();
        catalogSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if(data.partNumber) {
                currentCatalogMap.set(data.partNumber.toLowerCase(), { id: doc.id, ...data });
            }
        });

        const [marcasSnap, categoriasSnap, proveedoresSnap] = await Promise.all([
            getDocs(collection(db, 'marcas')),
            getDocs(collection(db, 'categorias')),
            getDocs(collection(db, 'proveedores')),
        ]);

        const getListMap = (snap) => new Map(snap.docs.map(d => [d.data().name.toLowerCase(), d.ref]));

        const listRefs = {
            marcas: getListMap(marcasSnap),
            categorias: getListMap(categoriasSnap),
            proveedores: getListMap(proveedoresSnap),
        };

        const newRefs = { marcas: new Map(), categorias: new Map(), proveedores: new Map() };

        const findOrCreateRef = (collectionName, name) => {
            if (!name || typeof name !== 'string' || !name.trim()) return null;

            const trimmedName = name.trim();
            const lowerCaseName = trimmedName.toLowerCase();

            if (listRefs[collectionName].has(lowerCaseName)) {
                return listRefs[collectionName].get(lowerCaseName);
            }

            if (newRefs[collectionName].has(lowerCaseName)) {
                return newRefs[collectionName].get(lowerCaseName);
            }

            const newDocRef = doc(collection(db, collectionName));
            batch.set(newDocRef, { name: trimmedName });
            newRefs[collectionName].set(lowerCaseName, newDocRef);
            return newDocRef;
        };

        const getValue = (row, keys) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
                const foundRowKey = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase());
                if (foundRowKey && row[foundRowKey] !== null && row[foundRowKey] !== undefined) {
                    return row[foundRowKey];
                }
            }
            return undefined;
        };

        for (const row of json) {
            const pn = getValue(row, ['PN', 'P/N', 'Part Number']);
            const name = getValue(row, ['Description of component', 'Description', 'name']);
            const price = getValue(row, ['Precio', 'Price', 'lastPrice', 'unitPrice']);
            const brandName = getValue(row, ['Marcas', 'Brand']);
            const categoryName = getValue(row, ['Categorías', 'Category']);
            const providerName = getValue(row, ['Proveedores', 'Supplier', 'Provider']);

            if (!pn || !name) continue;

            const brandRef = findOrCreateRef('marcas', brandName);
            const categoryRef = findOrCreateRef('categorias', categoryName);
            const providerRef = findOrCreateRef('proveedores', providerName);

            const pnStr = pn.toString();
            const existingPart = currentCatalogMap.get(pnStr.toLowerCase());

            const partData = { 
                name: String(name), 
                partNumber: pnStr.toUpperCase(), 
                lastPrice: Number(price) || 0, 
                brand: brandRef, 
                category: categoryRef, 
                defaultProvider: providerRef 
            };

            if (existingPart) {
                batch.update(doc(db, 'catalogo_maestro', existingPart.id), partData);
            } else {
                const newPartRef = doc(collection(db, 'catalogo_maestro'));
                batch.set(newPartRef, partData);
            }
        }

        setProcessingStatus("Guardando en Firebase...");
        await batch.commit();
        setProcessingStatus(`✨ ¡Catálogo actualizado con ${json.length} registros!`);
        
        const updatedCatalogSnap = await getDocs(collection(db, 'catalogo_maestro'));
        setCatalogo(updatedCatalogSnap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => safeLocaleCompare(a, b, 'name')));

        setTimeout(() => setIsProcessing(false), 3000);

    } catch (err) {
        setLastError(err.message);
        setProcessingStatus("❌ ERROR");
        setIsProcessing(false);
    } finally {
        if (e?.target) {
            e.target.value = null;
        }
    }
};

  const handlePartSelection = (id) => {
    setBomSearchFilter('');
    if (!id) return setBomForm({partId: '', quantity: 1, unitPrice: 0, proveedorId: ''});
    const p = catalogo.find(x => x.id === id);
    if (!p) return;

    let providerId = '';
    if (p.defaultProvider) {
      providerId = p.defaultProvider.id;
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
    const brandId = item.brand?.id || '';
    const categoryId = item.category?.id || '';
    const providerId = item.defaultProvider?.id || '';

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

  const handleToggleSelectAll = (items) => {
    if (selectedCatalogItems.length === items.length) {
      setSelectedCatalogItems([]);
    } else {
      setSelectedCatalogItems(items.map(i => i.id));
    }
  };

  const handleToggleSelectItem = (id) => {
    setSelectedCatalogItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
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
  }

  const brandOptions = managedLists.brands.map(b => ({ value: b.id, label: b.name }));
  const categoryOptions = managedLists.categories.map(c => ({ value: c.id, label: c.name }));
  const providerOptions = managedLists.providers.map(p => ({ value: p.id, label: p.name }));

  const selectedPartForBom = bomForm.partId ? catalogo.find(p => p.id === bomForm.partId) : null;

  const filteredCatalogo = catalogo.filter(item => {
      const brandName = item.brand ? managedLists.brands.find(b => b.id === item.brand.id)?.name : '';
      const categoryName = item.category ? managedLists.categories.find(c => c.id === item.category.id)?.name : '';
      const s = searchTerm.toLowerCase();
      return String(item.name || '').toLowerCase().includes(s) || 
             String(item.partNumber || '').toLowerCase().includes(s) || 
             String(brandName || '').toLowerCase().includes(s) || 
             String(categoryName || '').toLowerCase().includes(s);
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 overflow-x-hidden">
      
      {(isDiagnosticOpen || isProcessing) && (
      <div className="fixed top-20 right-4 z-[500] w-full max-w-sm animate-in slide-in-from-right duration-300">
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-5 border border-slate-700">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center text-xs font-black text-indigo-400 uppercase tracking-tighter"><Activity className="w-4 h-4 mr-2"/> Panel de Procesamiento</div>
            <button onClick={() => {setIsDiagnosticOpen(false); setIsProcessing(false);}} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded"><X className="w-4 h-4"/></button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Estado:</span>
              <span className={`font-mono font-bold ${isProcessing && processingStatus !== '❌ ERROR' ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>{processingStatus || "Listo"}</span>
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

      {listManager.isOpen && <ListManagerModal title={listManager.title} items={managedLists[listManager.type === 'category' ? 'categories' : listManager.type + 's']?.map(i => i.name) || []} onClose={() => setListManager({ isOpen: false, type: null, title: '' })} onSave={(data) => handleSaveManagedList({ type: listManager.type, data })} />}

      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8" /></div>
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
            <button onClick={testConnection} className="text-[9px] font-bold text-yellow-400 flex items-center hover:text-white transition-colors mt-1 bg-yellow-400/10 px-2 py-0.5 rounded-full w-max"><Activity className="w-3 h-3 mr-1"/> Test API Gemini</button>
          </div>
        </div>
        <nav className="flex space-x-1 bg-slate-800 p-1 rounded-xl">
          <button onClick={() => {setActiveTab('proyectos'); setActiveProject(null); setSelectedCatalogItems([]);}} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab !== 'catalogo' && activeTab !== 'bom' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Proyectos</button>
          <button onClick={() => {setActiveTab('catalogo'); setActiveProject(null); setSelectedCatalogItems([]);}} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'catalogo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Catálogo</button>
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
                )})}
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
                <div className="relative flex-1">
                  <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
                  <button onClick={() => pdfInputRef.current.click()} disabled={isProcessing} className="w-full bg-slate-900 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center shadow-xl active:scale-95 transition-all disabled:bg-slate-400 min-w-[200px]">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Sparkles className="w-5 h-5 mr-2 text-yellow-400 fill-yellow-400"/>}
                    {isProcessing ? "Procesando..." : 'Importar PDF (IA)'}
                  </button>
                </div>
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
                    <SearchableDropdown dark options={(catalogo || []).filter(c => `${c.name || ''} ${c.partNumber || ''}`.toLowerCase().includes(bomSearchFilter.toLowerCase())).map(c => ({ value: c.id, label: c.name, subLabel: `${c.partNumber} • $${c.lastPrice||0}` }))} value={bomForm.partId} onChange={handlePartSelection} placeholder="📌 Selecciona pieza..." />
                    {selectedPartForBom && (
                      <div className="p-3 bg-indigo-950/40 rounded-xl mt-1 space-y-2 border border-indigo-800/50">
                        <div className="flex items-center flex-wrap gap-2">
                          { (() => {
                            const brandName = selectedPartForBom.brand ? managedLists.brands.find(b => b.id === selectedPartForBom.brand.id)?.name : '';
                            const categoryName = selectedPartForBom.category ? managedLists.categories.find(c => c.id === selectedPartForBom.category.id)?.name : '';
                            return (<>{brandName && <div className="flex items-center text-[10px] font-black text-gray-300 bg-gray-600/50 px-2 py-1 rounded-full w-max border border-gray-500/50 uppercase tracking-tight"><Tag className="w-3 h-3 mr-1"/>{brandName}</div>}{categoryName && <div className="flex items-center text-[10px] font-black text-purple-300 bg-purple-600/30 px-2 py-1 rounded-full w-max border border-purple-500/50 uppercase tracking-tight"><Tag className="w-3 h-3 mr-1"/>{categoryName}</div>}</>)
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
                      batch.set(bomRef, { projectId: activeProject.id, masterPartRef: doc(db, 'catalogo_maestro', part.id), quantity: Number(bomForm.quantity), unitPrice: Number(bomForm.unitPrice), totalPrice: Number(bomForm.quantity) * Number(bomForm.unitPrice), proveedor: bomForm.proveedorId ? doc(db, 'proveedores', bomForm.proveedorId) : null, status: 'Requerido', addedAt: new Date().toISOString() });
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
                        let details = {}; let providerName = '';
                        if (item.masterPartRef) {
                          const masterPart = catalogo.find(p => p.id === item.masterPartRef.id);
                          if (!masterPart) return <tr key={item.id}><td colSpan="4" className="p-4 text-center text-slate-400">Ítem obsoleto</td></tr>;
                          details = { name: masterPart.name, partNumber: masterPart.partNumber, brandName: managedLists.brands.find(b => b.id === masterPart.brand?.id)?.name || '', categoryName: managedLists.categories.find(c => c.id === masterPart.category?.id)?.name || '' };
                          providerName = managedLists.providers.find(p => p.id === item.proveedor?.id)?.name || '';
                        } else { 
                          details = { name: item.name, partNumber: item.partNumber }; 
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
                        )}
                      )}
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
                    <div className="flex-grow"><SearchableDropdown options={brandOptions} value={partForm.brand} onChange={val => setPartForm({...partForm, brand: val})} placeholder="🏭 Marca..."/></div>
                    <button type="button" onClick={() => setListManager({ isOpen: true, type: 'brand', title: 'Gestionar Marcas'})} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"><Plus className="w-5 h-5"/></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-grow"><SearchableDropdown options={categoryOptions} value={partForm.category} onChange={val => setPartForm({...partForm, category: val})} placeholder="🏷️ Categoría..."/></div>
                    <button type="button" onClick={() => setListManager({ isOpen: true, type: 'category', title: 'Gestionar Categorías'})} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"><Plus className="w-5 h-5"/></button>
                  </div>
                  <div className="border-t pt-4 border-slate-50 space-y-4">
                    <input type="number" step="0.01" value={partForm.lastPrice} onChange={e => setPartForm({...partForm, lastPrice: e.target.value})} placeholder="Precio Estimado $" className="w-full p-3.5 border border-green-100 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-green-500" />
                    <div className="flex items-center gap-2">
                      <div className="flex-grow"><SearchableDropdown options={providerOptions} value={partForm.defaultProvider} onChange={val => setPartForm({...partForm, defaultProvider: val})} placeholder="🚚 Proveedor..."/></div>
                      <button type="button" onClick={() => setListManager({ isOpen: true, type: 'provider', title: 'Gestionar Proveedores'})} className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"><Plus className="w-5 h-5"/></button>
                    </div>
                  </div>
                  <button type="submit" className={`w-full p-4 text-white rounded-2xl font-black shadow-lg transition-all ${editingCatalogId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-black'}`}>{editingCatalogId ? 'Actualizar Registro' : 'Guardar Registro'}</button>
                  {editingCatalogId && (<button type="button" onClick={() => {setEditingCatalogId(null); setPartForm({ name: '', partNumber: '', lastPrice: '', defaultProvider: '', category: '', brand: '' });}} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 pt-2">Cancelar Edición</button>)}
                </form>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-4 items-center">
                 <div className="relative flex-1">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar por nombre, P/N, marca..." className="pl-12 pr-4 py-3 w-full border border-slate-200 rounded-2xl text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
                 <input type="file" ref={excelInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                 <button onClick={() => excelInputRef.current.click()} disabled={isProcessing} className="bg-green-600 text-white px-5 py-3 rounded-2xl font-black flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:bg-slate-400 whitespace-nowrap">
                   <Database className="w-5 h-5 mr-2"/>Importar Excel
                 </button>
              </div>

              {selectedCatalogItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-300">
                  <span className="font-bold text-red-700 text-sm">{selectedCatalogItems.length} ítems seleccionados</span>
                  <button onClick={handleDeleteSelected} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center text-sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Seleccionados
                  </button>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-auto min-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="p-5 w-10 text-center"><input type="checkbox" className="w-4 h-4" onChange={() => handleToggleSelectAll(filteredCatalogo)} checked={selectedCatalogItems.length === filteredCatalogo.length && filteredCatalogo.length > 0} /></th>
                      <th className="p-5">Pieza</th>
                      <th className="p-5 text-right">Precio Base</th>
                      <th className="p-5 text-center">⚙️</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalogo.map(item => {
                      const isSelected = selectedCatalogItems.includes(item.id);
                      const brandName = item.brand ? managedLists.brands.find(b => b.id === item.brand.id)?.name : '';
                      const categoryName = item.category ? managedLists.categories.find(c => c.id === item.category.id)?.name : '';
                      return (
                        <tr key={item.id} className={`group transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                          <td className="p-5 text-center"><input type="checkbox" className="w-4 h-4" checked={isSelected} onChange={() => handleToggleSelectItem(item.id)} /></td>
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
