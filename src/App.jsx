import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FolderGit2, Database, Search, Plus, Trash2,
  ChevronRight, DollarSign, ArrowLeft,
  PackagePlus, X, BrainCircuit,
  Loader2, Sparkles, Activity, Tag,
  SlidersHorizontal, Edit3
} from 'lucide-react';

// --- FIREBASE ---
import { collection, onSnapshot, doc, setDoc, getDocs, deleteDoc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from './firebase';

// --- COMPONENTES EXTRAIDOS ---
import SearchableDropdown from './components/ui/SearchableDropdown';
import FilterPopover from './components/ui/FilterPopover';
import ListManagerModal from './components/ui/ListManagerModal';
import ConfirmDialog from './components/ui/ConfirmDialog';
import MasterRecordModal from './components/catalog/MasterRecordModal';
import CatalogPickerModal from './components/catalog/CatalogPickerModal';
import BomItemEditModal from './components/projects/BomItemEditModal';
import PdfReviewModal from './components/projects/PdfReviewModal';

// --- UTILIDADES ---
import { normalizePartNumber, findSimilarProviders } from './utils/normalizers';

// --- LIBRERÍAS EXTERNAS (CDN) ---
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

// --- API GEMINI CONFIG ---
const API_KEY = "AIzaSyAgG7jwwxHRqDW2IaPRImr6GK-SqjFKDsQ";
const MODEL_NAME = "gemini-2.5-flash";



// ========================================================
// APLICACIÓN PRINCIPAL
// ========================================================
const APP_VERSION = "3.4";

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
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [listManager, setListManager] = useState({ isOpen: false, type: null, title: '' });
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);

  // Estado para el modal de revisión de PDF
  const [isPdfReviewOpen, setIsPdfReviewOpen] = useState(false);
  const [pdfReviewData, setPdfReviewData] = useState(null);
  const [pdfSupplierAnalysis, setPdfSupplierAnalysis] = useState(null);

  // Nuevo estado para el modal de Master Record
  const [isMasterRecordModalOpen, setIsMasterRecordModalOpen] = useState(false);
  const [editingMasterRecord, setEditingMasterRecord] = useState(null); // null = nuevo, objeto = editar

  const [editingProjectId, setEditingProjectId] = useState(null); // Eliminar referencias a estados y manejadores locales antiguos (MasterRecordModal ahora maneja todo).
  const [editingBomItem, setEditingBomItem] = useState(null);

  // Estados de "Modo Edición" para las listas
  const [isBomEditMode, setIsBomEditMode] = useState(false);
  const [isCatalogEditMode, setIsCatalogEditMode] = useState(false);

  const [selectedCatalogItems, setSelectedCatalogItems] = useState([]);
  const [selectedBomItems, setSelectedBomItems] = useState([]);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Estados para filtros - Ahora son ARRAYS para permitir múltiple selección
  const [catalogFilters, setCatalogFilters] = useState({ search: '', brand: [], category: [], provider: [] });
  const [bomFilters, setBomFilters] = useState({ search: '', brand: [], category: [], provider: [], prcr: '' });

  const pdfInputRef = useRef(null);
  const excelInputRef = useRef(null);

  const activeBomItems = activeProject
    ? bomItems.filter(i => i.projectId === activeProject.id).sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt))
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

    onSnapshot(collection(db, 'proyectos_bom'), s => setProyectos(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));
    onSnapshot(collection(db, 'catalogo_maestro'), s => setCatalogo(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => safeLocaleCompare(a, b, 'name'))));
    onSnapshot(collection(db, 'items_bom'), s => setBomItems(s.docs.map(d => ({ ...d.data(), id: d.id }))));

    const unsubCategories = onSnapshot(collection(db, 'categorias'), s => setManagedLists(prev => ({ ...prev, categories: s.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.name).sort((a, b) => safeLocaleCompare(a, b, 'name')) })));
    const unsubProviders = onSnapshot(collection(db, 'proveedores'), s => setManagedLists(prev => ({ ...prev, providers: s.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.name).sort((a, b) => safeLocaleCompare(a, b, 'name')) })));
    const unsubBrands = onSnapshot(collection(db, 'marcas'), s => setManagedLists(prev => ({ ...prev, brands: s.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.name).sort((a, b) => safeLocaleCompare(a, b, 'name')) })));

    return () => { unsubCategories(); unsubProviders(); unsubBrands(); };
  }, []);

  // Reset selections when changing project or tab
  useEffect(() => {
    setSelectedBomItems([]);
    setBomFilters({ search: '', brand: [], category: [], provider: [], prcr: '' });
    setIsBomEditMode(false);
  }, [activeProject, activeTab]);

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
      const prompt = `Analiza el texto de una cotización. Extrae los datos y devuelve EXCLUSIVAMENTE un JSON estricto con la siguiente estructura: { "supplier": "Nombre Proveedor", "items": [ { "pn": "Número de parte", "description": "Descripción", "quantity": numero, "unitPrice": numero, "leadTimeWeeks": numero } ] }.\nReglas:\n1. Ignora texto irrelevante, encabezados o textos legales.\n2. Los pn (Part Number) deben estar en MAYÚSCULAS y resolverse sin espacios.\n3. description debe ser concisa, técnica y resumida.\n4. quantity y unitPrice deben ser numéricos (usa 0 si falta el dato).\n5. Si no hay proveedor, usa "".\n6. leadTimeWeeks es el tiempo de entrega en SEMANAS. Si dice días, convierte dividiendo entre 7 y redondeando hacia arriba (mínimo 1). Si no se menciona, usa null.\n7. Busca frases como "lead time", "tiempo de entrega", "delivery", "plazo", "semanas", "weeks", "días", "days".\nDevuelve SOLO el JSON sin delimitadores markdown.\n\nTexto:\n\n${text}`;
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
        setProcessingStatus("Analizando datos...");
        const catalogSnapshot = await getDocs(collection(db, 'catalogo_maestro'));
        const currentCatalog = catalogSnapshot.docs.map(d => ({ ...d.data(), id: d.id }));

        // Clasificar cada ítem como nuevo o existente
        const reviewItems = data.items.map(item => {
          const normalizedPn = normalizePartNumber(item.pn);
          const existing = currentCatalog.find(p =>
            p.partNumber && normalizePartNumber(p.partNumber) === normalizedPn
          );
          return {
            pn: normalizedPn,
            description: String(item.description || '').trim(),
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            leadTimeWeeks: item.leadTimeWeeks != null ? Number(item.leadTimeWeeks) : null,
            isNew: !existing,
            existingPartId: existing?.id || null,
          };
        });

        // Analizar proveedor
        const supplierAnalysis = findSimilarProviders(data.supplier, managedLists.providers);

        // Abrir modal de revisión (NO guardar aún)
        setPdfReviewData({ supplier: data.supplier || '', items: reviewItems });
        setPdfSupplierAnalysis(supplierAnalysis);
        setIsPdfReviewOpen(true);
        setProcessingStatus("✅ Datos listos para revisión");
        setTimeout(() => setIsProcessing(false), 1500);
      }
    } catch (err) {
      setLastError(err.message);
      setProcessingStatus("❌ ERROR");
      setIsProcessing(false);
    } finally {
      if (e?.target) e.target.value = null;
    }
  };

  // Función que se ejecuta cuando el usuario confirma la importación desde PdfReviewModal
  const handleConfirmImport = async (reviewedData) => {
    const { items, prcr, supplierDecision } = reviewedData;
    if (items.length === 0) return;

    const batch = writeBatch(db);

    // 1. Resolver proveedor
    let supplierId = null;
    if (supplierDecision.action === 'use_existing' && supplierDecision.selectedProviderId) {
      supplierId = supplierDecision.selectedProviderId;
    } else if (supplierDecision.name) {
      const newProviderRef = doc(collection(db, 'proveedores'));
      batch.set(newProviderRef, { name: supplierDecision.name });
      supplierId = newProviderRef.id;
    }

    // 2. Procesar cada ítem
    for (const item of items) {
      let partId;
      if (item.isNew) {
        const catRef = doc(collection(db, 'catalogo_maestro'));
        batch.set(catRef, {
          name: item.description,
          partNumber: item.pn,
          lastPrice: item.unitPrice,
          leadTimeWeeks: item.leadTimeWeeks,
          defaultProvider: supplierId ? doc(db, 'proveedores', supplierId) : null,
          brand: null, category: null
        });
        partId = catRef.id;
      } else {
        partId = item.existingPartId;
        const updateData = { lastPrice: item.unitPrice };
        if (item.leadTimeWeeks != null) updateData.leadTimeWeeks = item.leadTimeWeeks;
        if (supplierId) updateData.defaultProvider = doc(db, 'proveedores', supplierId);
        batch.update(doc(db, 'catalogo_maestro', partId), updateData);
      }

      const bomRef = doc(collection(db, 'items_bom'));
      batch.set(bomRef, {
        projectId: activeProject.id,
        masterPartRef: doc(db, 'catalogo_maestro', partId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        leadTimeWeeks: item.leadTimeWeeks,
        proveedor: supplierId ? doc(db, 'proveedores', supplierId) : null,
        prcr: prcr || '',
        status: 'En Cotización',
        addedAt: new Date().toISOString()
      });
    }

    await batch.commit();
    setIsPdfReviewOpen(false);
    setPdfReviewData(null);
    setPdfSupplierAnalysis(null);
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
        if (data.partNumber) {
          currentCatalogMap.set(String(data.partNumber).replace(/\s+/g, '').toUpperCase(), { id: doc.id, ...data });
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

        const rawPn = String(pn);
        const normalizedPn = rawPn.replace(/\s+/g, '').toUpperCase();
        const existingPart = currentCatalogMap.get(normalizedPn);

        const partData = {
          name: String(name).trim(),
          partNumber: normalizedPn,
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
      setCatalogo(updatedCatalogSnap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => safeLocaleCompare(a, b, 'name')));

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

  // Funciones obsoletas de formulario manual han sido delegadas al MasterRecordModal.
  const saveMasterRecord = async (formData) => {
    if (!formData.name || !formData.partNumber) return alert("Nombre y P/N obligatorios.");

    const data = {
      name: String(formData.name).trim(),
      partNumber: String(formData.partNumber).replace(/\s+/g, '').toUpperCase(),
      lastPrice: Number(formData.lastPrice) || 0,
      brand: formData.brand ? doc(db, 'marcas', formData.brand) : null,
      category: formData.category ? doc(db, 'categorias', formData.category) : null,
      defaultProvider: formData.defaultProvider ? doc(db, 'proveedores', formData.defaultProvider) : null,
      leadTimeWeeks: formData.leadTimeWeeks === '' ? null : Number(formData.leadTimeWeeks),
    };

    if (editingMasterRecord) {
      await updateDoc(doc(db, 'catalogo_maestro', editingMasterRecord.id), data);
    } else {
      await setDoc(doc(collection(db, 'catalogo_maestro')), data);
    }
    setEditingMasterRecord(null);
    setIsMasterRecordModalOpen(false);
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
  };

  const handleEditClick = (item) => {
    setEditingMasterRecord(item);
    setIsMasterRecordModalOpen(true);
  };

  //--- Handlers for BOM item selection ---
  const handleToggleSelectAllBomItems = (items) => {
    if (selectedBomItems.length === items.length) {
      setSelectedBomItems([]);
    } else {
      setSelectedBomItems(items.map(i => i.id));
    }
  };

  const handleToggleSelectBomItem = (id) => {
    setSelectedBomItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedBomItems = () => {
    setConfirmDelete({
      isOpen: true,
      title: `¿Quitar ${selectedBomItems.length} ítems?`,
      message: `Esto quitará permanentemente los ${selectedBomItems.length} ítems seleccionados de este proyecto. No se borrarán del catálogo maestro.`,
      onConfirm: async () => {
        const batch = writeBatch(db);
        selectedBomItems.forEach(id => {
          batch.delete(doc(db, 'items_bom', id));
        });
        await batch.commit();
        setSelectedBomItems([]);
      }
    });
  }

  const handleUpdateBomItem = async (itemId, updatedData, catalogLeadTimeUpdate) => {
    const itemRef = doc(db, 'items_bom', itemId);
    const newData = {
      ...updatedData,
      totalPrice: (updatedData.quantity || 0) * (updatedData.unitPrice || 0)
    };
    await updateDoc(itemRef, newData);

    // Si el usuario pidió actualizar el lead time del catálogo
    if (catalogLeadTimeUpdate !== undefined) {
      const bomItem = bomItems.find(i => i.id === itemId);
      if (bomItem?.masterPartRef) {
        await updateDoc(doc(db, 'catalogo_maestro', bomItem.masterPartRef.id), { leadTimeWeeks: catalogLeadTimeUpdate });
      }
    }
    setEditingBomItem(null);
  };

  const handleAddFromCatalog = async (itemsToAdd) => {
    const batch = writeBatch(db);

    itemsToAdd.forEach(({ item, quantity }) => {
      const bomRef = doc(collection(db, 'items_bom'));
      batch.set(bomRef, {
        projectId: activeProject.id,
        masterPartRef: doc(db, 'catalogo_maestro', item.id),
        quantity: Number(quantity),
        unitPrice: Number(item.lastPrice || 0),
        totalPrice: Number(quantity) * Number(item.lastPrice || 0),
        proveedor: item.defaultProvider ? doc(db, 'proveedores', item.defaultProvider.id) : null,
        status: 'Requerido',
        addedAt: new Date().toISOString()
      });
    });

    await batch.commit();
  };


  //--- Handlers for Catalog item selection ---
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
  }

  const brandOptions = [...managedLists.brands.map(b => ({ value: b.id, label: b.name }))];
  const categoryOptions = [...managedLists.categories.map(c => ({ value: c.id, label: c.name }))];
  const providerOptions = [...managedLists.providers.map(p => ({ value: p.id, label: p.name }))];

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

  const filteredActiveBomItems = useMemo(() => {
    return activeBomItems.filter(item => {
      let details = {};
      if (item.masterPartRef) {
        const masterPart = catalogo.find(p => p.id === item.masterPartRef.id);
        if (!masterPart) return false;
        details = {
          name: masterPart.name,
          partNumber: masterPart.partNumber,
          brandId: masterPart.brand?.id || '',
          categoryId: masterPart.category?.id || '',
          providerId: item.proveedor?.id || ''
        };
      } else {
        // For legacy or non-linked items (if any), limited filtering
        details = {
          name: item.name,
          partNumber: item.partNumber,
          brandId: '',
          categoryId: '',
          providerId: item.proveedor ? (typeof item.proveedor === 'string' ? '' : item.proveedor.id) : ''
        };
      }

      const s = bomFilters.search.toLowerCase();
      const matchesSearch = !s || String(details.name || '').toLowerCase().includes(s) || String(details.partNumber || '').toLowerCase().includes(s);

      const matchesBrand = bomFilters.brand.length === 0 || bomFilters.brand.includes(details.brandId);
      const matchesCategory = bomFilters.category.length === 0 || bomFilters.category.includes(details.categoryId);
      const matchesProvider = bomFilters.provider.length === 0 || bomFilters.provider.includes(details.providerId);
      const matchesPrcr = !bomFilters.prcr || (item.prcr || '') === bomFilters.prcr;

      return matchesSearch && matchesBrand && matchesCategory && matchesProvider && matchesPrcr;
    });
  }, [activeBomItems, catalogo, bomFilters]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 overflow-x-hidden">

      {(isDiagnosticOpen || isProcessing) && (
        <div className="fixed top-20 right-4 z-[500] w-full max-w-sm animate-in slide-in-from-right duration-300">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-5 border border-slate-700">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center text-xs font-black text-indigo-400 uppercase tracking-tighter"><Activity className="w-4 h-4 mr-2" /> Panel de Procesamiento</div>
              <button onClick={() => { setIsDiagnosticOpen(false); setIsProcessing(false); }} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded"><X className="w-4 h-4" /></button>
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

      {editingBomItem && <BomItemEditModal item={editingBomItem} onClose={() => setEditingBomItem(null)} onSave={handleUpdateBomItem} catalogLeadTime={editingBomItem?.masterPartRef ? catalogo.find(p => p.id === editingBomItem.masterPartRef.id)?.leadTimeWeeks : null} />}

      <MasterRecordModal
        isOpen={isMasterRecordModalOpen}
        onClose={() => setIsMasterRecordModalOpen(false)}
        onSave={saveMasterRecord}
        initialData={editingMasterRecord}
        managedLists={managedLists}
        onOpenManager={(type) => setListManager({ isOpen: true, type, title: `Gestionar ${type === 'brand' ? 'Marcas' : type === 'category' ? 'Categorías' : 'Proveedores'}` })}
      />

      {catalogPickerOpen && (
        <CatalogPickerModal
          catalogo={catalogo}
          managedLists={managedLists}
          onClose={() => setCatalogPickerOpen(false)}
          onAddItems={handleAddFromCatalog}
        />
      )}

      <PdfReviewModal
        isOpen={isPdfReviewOpen}
        onClose={() => { setIsPdfReviewOpen(false); setPdfReviewData(null); setPdfSupplierAnalysis(null); }}
        onConfirm={handleConfirmImport}
        extractedData={pdfReviewData}
        supplierAnalysis={pdfSupplierAnalysis}
      />

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.title}
        message={confirmDelete.message}
        onConfirm={confirmDelete.onConfirm}
        onClose={() => setConfirmDelete({ isOpen: false, onConfirm: null })}
      />

      <header className="bg-slate-900 text-white p-4 shadow-xl flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center space-x-3">
          <BrainCircuit className="text-indigo-400 w-8 h-8" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tighter leading-none">AutoBOM Pro</h1>
              <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">v{APP_VERSION}</span>
            </div>
            <button onClick={testConnection} className="text-[9px] font-bold text-yellow-400 flex items-center hover:text-white transition-colors mt-1 bg-yellow-400/10 px-2 py-0.5 rounded-full w-max"><Activity className="w-3 h-3 mr-1" /> Test API Gemini</button>
          </div>
        </div>
        <nav className="flex space-x-1 bg-slate-800 p-1 rounded-xl">
          <button onClick={() => { setActiveTab('proyectos'); setActiveProject(null); setSelectedCatalogItems([]); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab !== 'proyectos' && activeTab !== 'catalogo' ? 'text-slate-400' : (activeTab === 'proyectos' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400')}`}>Proyectos</button>
          <button onClick={() => { setActiveTab('catalogo'); setActiveProject(null); setSelectedCatalogItems([]); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'catalogo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Catálogo</button>
        </nav>
      </header>

      <main className="w-full p-4 md:p-8">

        {activeTab === 'proyectos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="font-black text-2xl text-slate-800 tracking-tight">Tus Proyectos</h2>
              <button onClick={() => { setEditingProjectId(null); setNewProjectName(''); setNewProjectDesc(''); setIsProjectModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg flex items-center justify-center active:scale-95 transition-transform"><Plus className="mr-2" /> Nuevo Proyecto</button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(proyectos || []).map(p => {
                const totalProyecto = bomItems.filter(item => item.projectId === p.id).reduce((sum, item) => sum + (item.totalPrice || 0), 0);
                return (
                  <div key={p.id} onClick={() => { setActiveProject(p); setActiveTab('bom'); }} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-400 cursor-pointer shadow-sm relative group transition-all h-52 flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full opacity-40"></div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 truncate pr-10">{p.name}</h3>
                      <p className="text-slate-500 text-xs line-clamp-3 mt-2">{p.description || 'Sin notas'}</p>
                    </div>
                    <div className="flex justify-between items-center border-t pt-4 border-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center font-bold text-green-600 text-sm"><DollarSign className="w-4 h-4 mr-1" />{totalProyecto.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <ChevronRight className="text-indigo-500 w-5 h-5" />
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingProjectId(p.id); setNewProjectName(p.name); setNewProjectDesc(p.description); setIsProjectModalOpen(true); }} className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, title: '¿Borrar proyecto?', message: `Se borrarán todos los datos de "${p.name}".`, onConfirm: () => deleteDoc(doc(db, 'proyectos_bom', p.id)) }); }} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'bom' && activeProject && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
              <div className="text-center md:text-left">
                <button onClick={() => { setActiveProject(null); setActiveTab('proyectos'); }} className="text-indigo-600 font-bold text-sm flex items-center mb-1 hover:underline"><ArrowLeft className="w-4 h-4 mr-1" /> Volver</button>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{activeProject.name}</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="flex flex-1 gap-3 min-w-[300px]">
                  <button onClick={() => setCatalogPickerOpen(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-2xl font-black flex items-center justify-center shadow-xl active:scale-95 transition-all">
                    <PackagePlus className="w-5 h-5 mr-2" /> Catálogo
                  </button>
                  <div className="relative flex-1">
                    <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
                    <button onClick={() => pdfInputRef.current.click()} disabled={isProcessing} className="w-full h-full bg-slate-900 text-white px-4 py-3 rounded-2xl font-black flex items-center justify-center shadow-xl active:scale-95 transition-all disabled:bg-slate-400">
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2 text-yellow-400 fill-yellow-400" />}
                      {isProcessing ? "Procesando" : 'Importar PDF'}
                    </button>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-100 px-6 py-3 rounded-2xl text-right flex-none min-w-[140px] flex flex-col justify-center">
                  <div className="text-[10px] font-black text-green-800 uppercase tracking-widest leading-none mb-1">Inversión</div>
                  <div className="text-2xl font-black text-green-700 tracking-tighter leading-none">${(activeBomItems || []).reduce((s, i) => s + (i.totalPrice || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="col-span-1 space-y-4">

                {/* FILTROS Y BÚSQUEDA BOM */}
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={bomFilters.search}
                      onChange={e => setBomFilters({ ...bomFilters, search: e.target.value })}
                      placeholder="Buscar en BOM..."
                      className="pl-12 pr-4 py-3 w-full border border-slate-200 rounded-2xl text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>
                  <FilterPopover
                    filters={bomFilters}
                    setFilters={setBomFilters}
                    options={{
                      brands: brandOptions,
                      categories: categoryOptions,
                      providers: providerOptions
                    }}
                  />
                  {(() => {
                    const pcrValues = [...new Set(activeBomItems.map(i => i.prcr).filter(Boolean))];
                    if (pcrValues.length > 0) return (
                      <SearchableDropdown compact options={[{ value: '', label: 'Todos los PRCR' }, ...pcrValues.map(p => ({ value: p, label: p }))]} value={bomFilters.prcr} onChange={val => setBomFilters({ ...bomFilters, prcr: val })} placeholder="#PRCR" />
                    );
                    return null;
                  })()}
                  <button
                    onClick={() => { setIsBomEditMode(!isBomEditMode); setSelectedBomItems([]); }}
                    className={`h-full px-4 rounded-xl border flex items-center gap-2 transition-all ${isBomEditMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="font-bold text-sm hidden sm:inline">Gestionar</span>
                  </button>
                </div>

                {selectedBomItems.length > 0 && isBomEditMode && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-300">
                    <span className="font-bold text-red-700 text-sm">{selectedBomItems.length} ítems seleccionados</span>
                    <button onClick={handleDeleteSelectedBomItems} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center text-sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Seleccionados
                    </button>
                  </div>
                )}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[400px] overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        {isBomEditMode && <th className="p-5 w-10 text-center"><input type="checkbox" className="w-4 h-4" onChange={() => handleToggleSelectAllBomItems(filteredActiveBomItems)} checked={filteredActiveBomItems.length > 0 && selectedBomItems.length === filteredActiveBomItems.length} /></th>}
                        <th className="p-5 w-20 text-center">Visual</th>
                        <th className="p-5 w-16">Cant</th>
                        <th className="p-5">Descripción del Ítem</th>
                        <th className="p-5 w-28">#PRCR</th>
                        <th className="p-5 w-24 text-center">⏱️ Lead</th>
                        <th className="p-5 text-right">Costo</th>
                        {isBomEditMode && <th className="p-5 text-center w-28">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(filteredActiveBomItems || []).map(item => {
                        let details = {}; let providerName = '';
                        const isSelected = selectedBomItems.includes(item.id);
                        if (item.masterPartRef) {
                          const masterPart = catalogo.find(p => p.id === item.masterPartRef.id);
                          if (!masterPart) return <tr key={item.id}><td colSpan="5" className="p-4 text-center text-slate-400">Ítem obsoleto o borrado del catálogo.</td></tr>;
                          details = { name: masterPart.name, partNumber: masterPart.partNumber, brandName: managedLists.brands.find(b => b.id === masterPart.brand?.id)?.name || '', categoryName: managedLists.categories.find(c => c.id === masterPart.category?.id)?.name || '' };
                          providerName = managedLists.providers.find(p => p.id === item.proveedor?.id)?.name || '';
                        } else {
                          details = { name: item.name, partNumber: item.partNumber };
                          providerName = item.proveedor ? (typeof item.proveedor === 'string' ? item.proveedor : managedLists.providers.find(p => p.id === item.proveedor.id)?.name) : '';
                        }
                        return (
                          <tr key={item.id} className={`group transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50/50'}`}>
                            {isBomEditMode && <td className="p-5 text-center"><input type="checkbox" className="w-4 h-4" checked={isSelected} onChange={() => handleToggleSelectBomItem(item.id)} /></td>}
                            <td className="p-5 text-center">
                              <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center">
                                <span className="text-slate-400 text-[10px] font-bold"> IMG </span>
                              </div>
                            </td>
                            <td className="p-5 font-black text-lg text-slate-700">{item.quantity}</td>
                            <td className="p-5">
                              <div className="font-bold text-slate-900 leading-tight">{details.name || 'Sin nombre'}</div>
                              <div className="text-[10px] font-mono text-slate-400 mt-1">{details.partNumber || 'S/N'}</div>
                              <div className="flex items-center flex-wrap gap-2 mt-2">
                                {details.brandName && <div className="flex items-center justify-center h-6 px-2 rounded-full border text-[9px] font-black uppercase tracking-tighter text-gray-600 bg-gray-100 border-gray-200"><Tag className="w-3 h-3 mr-1.5 flex-shrink-0" />{details.brandName}</div>}
                                {details.categoryName && <div className="flex items-center justify-center h-6 px-2 rounded-full border text-[9px] font-black uppercase tracking-tighter text-purple-600 bg-purple-50 border-purple-100"><Tag className="w-3 h-3 mr-1.5 flex-shrink-0" />{details.categoryName}</div>}
                                {providerName && <div className="flex items-center justify-center h-6 px-2 rounded-full border text-[9px] font-black uppercase tracking-tighter text-indigo-500 bg-indigo-50 border-indigo-100">Prov: {providerName}</div>}
                              </div>
                            </td>
                            <td className="p-5">
                              {item.prcr ? <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold font-mono">{item.prcr}</span> : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="p-5 text-center">
                              {(() => {
                                const masterPart = item.masterPartRef ? catalogo.find(p => p.id === item.masterPartRef.id) : null;
                                const catalogLT = masterPart?.leadTimeWeeks;
                                const bomLT = item.leadTimeWeeks;
                                const changed = bomLT != null && catalogLT != null && bomLT !== catalogLT;
                                if (bomLT != null) return <span className="text-sm font-bold text-teal-700">{bomLT} sem {changed && <span title={`Catálogo: ${catalogLT} sem`} className="text-amber-500 cursor-help">⚡</span>}</span>;
                                if (catalogLT != null) return <span className="text-sm text-slate-400">{catalogLT} sem</span>;
                                return <span className="text-slate-300 text-xs">—</span>;
                              })()}
                            </td>
                            <td className="p-5 text-right">
                              <div className="font-black text-slate-900 text-lg">${(item.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                              <div className="text-[10px] text-slate-400">${item.unitPrice}/u</div>
                            </td>
                            {isBomEditMode && (
                              <td className="p-5 text-center">
                                <div className='flex justify-center items-center gap-2'>
                                  <button onClick={() => setEditingBomItem(item)} className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all active:scale-90"><Edit3 className="w-4 h-4" /></button>
                                  <button onClick={() => setConfirmDelete({ isOpen: true, title: 'Quitar ítem', message: `¿Quitar "${details.name}" de la lista?`, onConfirm: () => deleteDoc(doc(db, 'items_bom', item.id)) })} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all active:scale-90"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'catalogo' && (
          <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={catalogFilters.search} onChange={e => setCatalogFilters({ ...catalogFilters, search: e.target.value })} placeholder="Filtrar por nombre, P/N, marca..." className="pl-12 pr-4 py-3 w-full border border-slate-200 rounded-2xl text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <FilterPopover
                  filters={catalogFilters}
                  setFilters={setCatalogFilters}
                  options={{
                    brands: brandOptions,
                    categories: categoryOptions,
                    providers: providerOptions
                  }}
                />
                <button onClick={() => { setEditingMasterRecord(null); setIsMasterRecordModalOpen(true); }} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black flex items-center justify-center shadow-lg active:scale-95 transition-all whitespace-nowrap h-full">
                  <Plus className="w-5 h-5 mr-2" />Nuevo Registro
                </button>
                <button
                  onClick={() => { setIsCatalogEditMode(!isCatalogEditMode); setSelectedCatalogItems([]); }}
                  className={`h-full px-4 rounded-xl border flex items-center gap-2 transition-all ${isCatalogEditMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="font-bold text-sm hidden sm:inline">Gestionar</span>
                </button>
                <input type="file" ref={excelInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                <button onClick={() => excelInputRef.current.click()} disabled={isProcessing} className="bg-green-600 text-white px-5 py-3 rounded-2xl font-black flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:bg-slate-400 whitespace-nowrap h-full">
                  <Database className="w-5 h-5 mr-2" />Importar Excel
                </button>
              </div>

              {selectedCatalogItems.length > 0 && isCatalogEditMode && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-300">
                  <span className="font-bold text-red-700 text-sm">{selectedCatalogItems.length} ítems seleccionados</span>
                  <button onClick={handleDeleteSelectedCatalog} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center text-sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Seleccionados
                  </button>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-auto min-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0">
                    <tr>
                      {isCatalogEditMode && <th className="p-5 w-10 text-center"><input type="checkbox" className="w-4 h-4" onChange={() => handleToggleSelectAllCatalog(filteredCatalogo)} checked={selectedCatalogItems.length === filteredCatalogo.length && filteredCatalogo.length > 0} /></th>}
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
                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all active:scale-90"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, title: 'Borrar Maestro', message: `¿Eliminar "${item.name}" del catálogo global?`, onConfirm: () => deleteDoc(doc(db, 'catalogo_maestro', item.id)) }); }} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all active:scale-90"><Trash2 className="w-4 h-4" /></button>
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
        )}

      </main>

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="font-black text-2xl flex items-center tracking-tighter"><FolderGit2 className="mr-2 text-indigo-600 w-6 h-6" /> {editingProjectId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
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
              <button type="submit" className={`w-full p-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-lg`}>
                {editingProjectId ? 'Actualizar Proyecto' : 'Crear Proyecto'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
