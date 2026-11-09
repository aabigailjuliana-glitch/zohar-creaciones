import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Material, InvisibleCost, Product, ProductVariant } from '../types';
import { formatCurrency, calculateRoundingDeduction } from '../utils/pricingCalculator';



import {
  Calculator,
  Plus,
  Clock,
  Sparkles,
  DollarSign,
  Package,
  Layers,
  Edit2,
  Copy,
  Trash2,
  TrendingUp,
  X,
  Check,
  Zap,
  Info,
  Sliders,
  Tag,
  FolderTree,
  ArrowUpDown,
  Search,
  Upload,
  Camera,
  Percent,
  BadgePercent,
  Image as ImageIcon,
  Grid,
  List,
  Lock,
  Eye,
  EyeOff,
  Star,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  ShieldCheck,
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export const CalculatorView: React.FC = () => {
  const {
    materials,
    invisibleCosts,
    products,
    categories: appCategories,
    addCategory,
    addSubcategory,
    deleteCategory,
    deleteSubcategory,
    settings,
    updateSettings,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addInvisibleCost,
    updateInvisibleCost,
    deleteInvisibleCost,
    addProduct,
    updateProduct,
    duplicateProduct,
    deleteProduct,
    getProductBreakdown,
    invisibleCostPerMinute,
    laborCostPerMinute,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'productos' | 'materiales' | 'invisibles'>('productos');

  // Modals state
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [isInvisibleModalOpen, setIsInvisibleModalOpen] = useState(false);
  const [editingInvisible, setEditingInvisible] = useState<InvisibleCost | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // File upload input ref for PC & Mobile
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Material form state
  const [matName, setMatName] = useState('');
  const [matCategory, setMatCategory] = useState('');
  const [matUnit, setMatUnit] = useState('unidad');
  const [matUnitPrice, setMatUnitPrice] = useState<number>(0);
  const [matWholesalePrice, setMatWholesalePrice] = useState<number>(0);
  const [matWholesaleMinQty, setMatWholesaleMinQty] = useState<number>(10);
  const [matStock, setMatStock] = useState<number>(0);
  const [matNotes, setMatNotes] = useState('');

  // Invisible cost form state
  const [invName, setInvName] = useState('');
  const [invMonthlyCost, setInvMonthlyCost] = useState<number>(0);
  const [invNotes, setInvNotes] = useState('');

  // Product form state
  const [prodSku, setProdSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Cuadernos & Planners');
  const [prodSubcategory, setProdSubcategory] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [directImageUrlInput, setDirectImageUrlInput] = useState('');
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState<number | ''>('');
  const [newVarSku, setNewVarSku] = useState('');
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [editingVarName, setEditingVarName] = useState('');
  const [editingVarPrice, setEditingVarPrice] = useState<number | ''>('');
  const [prodStock, setProdStock] = useState<number>(10);
  const [prodMinutes, setProdMinutes] = useState<number>(30);
  const [prodMargin, setProdMargin] = useState<number>(45);
  const [prodExtraCost, setProdExtraCost] = useState<number>(0);
  const [prodActiveCatalog, setProdActiveCatalog] = useState<boolean>(true);
  const [prodMaterialsList, setProdMaterialsList] = useState<
    Array<{ materialId: string; quantity: number; useWholesale?: boolean }>
  >([]);

  // Product Discounts state (% o $) - Visible para clientes
  const [prodDiscountType, setProdDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [prodDiscountValue, setProdDiscountValue] = useState<number>(0);
  const [prodHasDiscount, setProdHasDiscount] = useState<boolean>(false);

  // Resta privada al total que SOLO ve el admin y NO los clientes (puede ser 0 o vacía)
  const [prodAdminPrivateDeduction, setProdAdminPrivateDeduction] = useState<number>(0);

  // Confección por encargo / a pedido
  const [prodMadeToOrder, setProdMadeToOrder] = useState<boolean>(false);

  // Buscador de insumos/materiales dentro del modal de producto (A-Z)
  const [matSearchInModal, setMatSearchInModal] = useState<string>('');


  // Product sorting & filtering in Calculator view
  const [adminProdSearch, setAdminProdSearch] = useState('');
  const [adminProdCategory, setAdminProdCategory] = useState('todos');
  const [adminProdSort, setAdminProdSort] = useState<
    'recientes' | 'alfabetico_asc' | 'alfabetico_desc' | 'precio_menor' | 'precio_mayor'
  >('recientes');

  // Materials sorting, filtering & grouping state
  const [matSearch, setMatSearch] = useState('');
  const [matCategoryFilter, setMatCategoryFilter] = useState('todas');
  const [matSort, setMatSort] = useState<
    'alfabetico_asc' | 'alfabetico_desc' | 'categoria' | 'precio_menor' | 'precio_mayor'
  >('alfabetico_asc');
  const [matViewMode, setMatViewMode] = useState<'tabla' | 'agrupado'>('tabla');

  // Category Manager Modal state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newCatNameInput, setNewCatNameInput] = useState('');
  const [selectedCatForNewSub, setSelectedCatForNewSub] = useState('');
  const [newSubcatNameInput, setNewSubcatNameInput] = useState('');
  const [catToDeleteId, setCatToDeleteId] = useState<string | null>(null);

  // Hourly Rate direct edit
  const handleHourlyRateChange = (newRate: number) => {
    updateSettings({ hourlyLaborRate: Math.max(0, newRate) });
  };

  const handleMonthlyHoursChange = (newHours: number) => {
    updateSettings({ monthlyWorkingHours: Math.max(1, newHours) });
  };

  // Open Material Modal
  const openMaterialModal = (mat?: Material) => {
    if (mat) {
      setEditingMaterial(mat);
      setMatName(mat.name);
      setMatCategory(mat.category);
      setMatUnit(mat.unit);
      setMatUnitPrice(mat.unitPrice);
      setMatWholesalePrice(mat.wholesalePrice);
      setMatWholesaleMinQty(mat.wholesaleMinQty);
      setMatStock(mat.stock || 0);
      setMatNotes(mat.notes || '');
    } else {
      setEditingMaterial(null);
      setMatName('');
      setMatCategory('Papelería');
      setMatUnit('unidad');
      setMatUnitPrice(100);
      setMatWholesalePrice(80);
      setMatWholesaleMinQty(10);
      setMatStock(50);
      setMatNotes('');
    }
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, {
        name: matName,
        category: matCategory,
        unit: matUnit,
        unitPrice: Number(matUnitPrice),
        wholesalePrice: Number(matWholesalePrice),
        wholesaleMinQty: Number(matWholesaleMinQty),
        stock: Number(matStock),
        notes: matNotes,
      });
    } else {
      addMaterial({
        name: matName,
        category: matCategory || 'General',
        unit: matUnit || 'unidad',
        unitPrice: Number(matUnitPrice),
        wholesalePrice: Number(matWholesalePrice),
        wholesaleMinQty: Number(matWholesaleMinQty),
        stock: Number(matStock),
        notes: matNotes,
      });
    }
    setIsMaterialModalOpen(false);
  };

  // Open Invisible Cost Modal
  const openInvisibleModal = (inv?: InvisibleCost) => {
    if (inv) {
      setEditingInvisible(inv);
      setInvName(inv.name);
      setInvMonthlyCost(inv.monthlyCost);
      setInvNotes(inv.notes || '');
    } else {
      setEditingInvisible(null);
      setInvName('');
      setInvMonthlyCost(10000);
      setInvNotes('');
    }
    setIsInvisibleModalOpen(true);
  };

  const handleSaveInvisible = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim()) return;

    if (editingInvisible) {
      updateInvisibleCost(editingInvisible.id, {
        name: invName,
        monthlyCost: Number(invMonthlyCost),
        notes: invNotes,
      });
    } else {
      addInvisibleCost({
        name: invName,
        monthlyCost: Number(invMonthlyCost),
        notes: invNotes,
      });
    }
    setIsInvisibleModalOpen(false);
  };

  // Image upload handler supporting multiple files (1 to 10 images max) with cloud-optimized compression
  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 10 - prodImages.length);
    if (remainingSlots <= 0) {
      addToast('Límite alcanzado', 'Ya has alcanzado el máximo de 10 imágenes por producto.', 'warning');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    addToast('Optimizando fotos...', `Procesando ${filesToProcess.length} imagen(es) para sincronización en la nube...`, 'info');

    try {
      const compressedList: string[] = [];
      for (const file of filesToProcess) {
        try {
          const comp = await compressImage(file, {
            maxWidth: 640,
            maxHeight: 640,
            quality: 0.72,
            preferredMimeType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          });
          compressedList.push(comp);
        } catch (imgErr) {
          console.warn('Error compressing single product image, skipping:', imgErr);
        }
      }

      if (compressedList.length > 0) {
        setProdImages((prev) => {
          const combined = [...prev, ...compressedList].slice(0, 10);
          if (prev.length === 0 && combined.length > 0) {
            setProdImageUrl(combined[0]);
          }
          return combined;
        });
        addToast('Fotos optimizadas ✨', `${compressedList.length} imagen(es) agregadas con éxito.`, 'success');
      }
    } catch (err) {
      console.error('Error in handleMultipleImagesUpload:', err);
      addToast('Error', 'No se pudieron procesar algunas imágenes.', 'error');
    }

    e.target.value = '';
  };

  const handleAddDirectImageUrl = () => {
    const url = directImageUrlInput.trim();
    if (!url) return;
    if (prodImages.length >= 10) {
      addToast('Límite alcanzado', 'Ya has alcanzado el máximo de 10 imágenes por producto.', 'warning');
      return;
    }
    setProdImages((prev) => {
      const next = [...prev, url];
      if (next.length === 1) setProdImageUrl(url);
      return next;
    });
    setDirectImageUrlInput('');
    addToast('Foto agregada', 'La imagen se añadió a la galería del producto.', 'info');
  };

  const handleRemoveProdImage = (idxToRemove: number) => {
    setProdImages((prev) => {
      const filtered = prev.filter((_, i) => i !== idxToRemove);
      setProdImageUrl(filtered[0] || '');
      return filtered;
    });
  };

  const handleSetCoverImage = (idxToCover: number) => {
    if (idxToCover === 0) return;
    setProdImages((prev) => {
      const target = prev[idxToCover];
      const rest = prev.filter((_, i) => i !== idxToCover);
      const next = [target, ...rest];
      setProdImageUrl(target);
      return next;
    });
    addToast('Portada actualizada ⭐', 'Esta foto ahora es la portada principal del producto.', 'success');
  };

  const handleMoveImage = (idx: number, direction: 'left' | 'right') => {
    setProdImages((prev) => {
      const newIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[newIdx];
      copy[newIdx] = temp;
      setProdImageUrl(copy[0] || '');
      return copy;
    });
  };

  // Insumos y materiales ordenados alfabéticamente de la A a la Z para el buscador
  const sortedAlphabeticalMaterials = useMemo(() => {
    return [...materials].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
  }, [materials]);

  const filteredModalMaterials = useMemo(() => {
    const q = matSearchInModal.trim().toLowerCase();
    if (!q) return sortedAlphabeticalMaterials;
    return sortedAlphabeticalMaterials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q))
    );
  }, [sortedAlphabeticalMaterials, matSearchInModal]);

  // Sugerencias dinámicas de variantes con posibilidad de eliminar sugerencias predeterminadas
  const dynamicVariantSuggestions = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const dismissed = new Set(
      (settings.dismissedVariantSuggestions || []).map((s) => s.toLowerCase().trim())
    );

    const addSuggestion = (name?: string) => {
      if (!name) return;
      const clean = name.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (dismissed.has(lower)) return;
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    };

    // 1. Historial de variantes guardadas en la configuración del emprendimiento
    if (settings.savedVariantSuggestions && Array.isArray(settings.savedVariantSuggestions)) {
      settings.savedVariantSuggestions.forEach(addSuggestion);
    }

    // 2. Variantes de todos los productos creados en el catálogo/inventario
    products.forEach((p) => {
      if (p.variants && Array.isArray(p.variants)) {
        p.variants.forEach((v) => addSuggestion(v.name));
      }
    });

    // 3. Variantes del producto que se está editando en este momento
    prodVariants.forEach((v) => addSuggestion(v.name));

    // 4. Ejemplos de apoyo (si no han sido descartadas por el admin)
    const starterExamples = [
      'Tamaño A5',
      'Tamaño A4',
      'Color Rosa Pastel',
      'Color Lila',
      'Pack x 10 unid.',
      'Pack x 50 unid.',
      'Talle Único',
    ];
    starterExamples.forEach(addSuggestion);

    return list.slice(0, 25);
  }, [settings.savedVariantSuggestions, settings.dismissedVariantSuggestions, products, prodVariants]);

  const handleRemoveLearnedSuggestion = (sugToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const lower = sugToRemove.toLowerCase().trim();
    const currentSaved = settings.savedVariantSuggestions || [];
    const updatedSaved = currentSaved.filter((s) => s.toLowerCase().trim() !== lower);
    const currentDismissed = settings.dismissedVariantSuggestions || [];
    const updatedDismissed = currentDismissed.includes(lower)
      ? currentDismissed
      : [...currentDismissed, lower];

    updateSettings({
      savedVariantSuggestions: updatedSaved,
      dismissedVariantSuggestions: updatedDismissed,
    });
    addToast('Sugerencia eliminada', `Se quitó "${sugToRemove}" de las sugerencias.`, 'info');
  };

  const handleClearAllVariantSuggestions = () => {
    const allCurrent = dynamicVariantSuggestions.map((s) => s.toLowerCase().trim());
    const currentDismissed = settings.dismissedVariantSuggestions || [];
    const combined = Array.from(new Set([...currentDismissed, ...allCurrent]));
    updateSettings({
      savedVariantSuggestions: [],
      dismissedVariantSuggestions: combined,
    });
    addToast('Sugerencias eliminadas ✨', 'Se eliminaron todas las variantes de sugerencias predeterminadas.', 'info');
  };

  // Variant Handlers (Crear, Editar, Borrar)
  const handleAddVariant = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newVarName.trim();
    if (!trimmed) {
      addToast('Nombre requerido', 'Escribe el nombre de la variante (ej. Tamaño A5, Color Rosa, Pack x50).', 'warning');
      return;
    }
    const priceNum = typeof newVarPrice === 'number' ? newVarPrice : parseFloat(String(newVarPrice)) || 0;
    const newVariantItem: ProductVariant = {
      id: 'var-' + Date.now() + Math.random().toString().slice(2, 6),
      name: trimmed,
      price: priceNum,
      sku: newVarSku.trim() || undefined,
    };
    setProdVariants((prev) => [...prev, newVariantItem]);

    // Guardar automáticamente la variante creada en el historial de sugerencias dinámicas
    const currentSaved = settings.savedVariantSuggestions || [];
    const lower = trimmed.toLowerCase();
    if (!currentSaved.some((s) => s.toLowerCase() === lower)) {
      const updated = [trimmed, ...currentSaved].slice(0, 40);
      updateSettings({ savedVariantSuggestions: updated });
    }

    setNewVarName('');
    setNewVarPrice('');
    setNewVarSku('');
    addToast('Variante agregada ✨', `"${trimmed}" con precio ${formatCurrency(priceNum, settings.currency)}.`, 'success');
  };

  const handleStartEditVariant = (variant: ProductVariant) => {
    setEditingVarId(variant.id);
    setEditingVarName(variant.name);
    setEditingVarPrice(variant.price);
  };

  const handleSaveEditVariant = (id: string) => {
    const trimmed = editingVarName.trim();
    if (!trimmed) return;
    const priceNum = typeof editingVarPrice === 'number' ? editingVarPrice : parseFloat(String(editingVarPrice)) || 0;
    setProdVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, name: trimmed, price: priceNum } : v))
    );

    // Guardar automáticamente la variante editada en el historial de sugerencias dinámicas
    const currentSaved = settings.savedVariantSuggestions || [];
    const lower = trimmed.toLowerCase();
    if (!currentSaved.some((s) => s.toLowerCase() === lower)) {
      const updated = [trimmed, ...currentSaved].slice(0, 40);
      updateSettings({ savedVariantSuggestions: updated });
    }

    setEditingVarId(null);
    setEditingVarName('');
    setEditingVarPrice('');
    addToast('Variante actualizada', `Cambios guardados para "${trimmed}".`, 'info');
  };

  const handleDeleteVariant = (id: string) => {
    setProdVariants((prev) => prev.filter((v) => v.id !== id));
    if (editingVarId === id) {
      setEditingVarId(null);
    }
    addToast('Variante eliminada', 'Se quitó la variante del producto.', 'info');
  };

  // Open Product Modal
  const openProductModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setProdSku(prod.sku);
      setProdName(prod.name);
      setProdCategory(prod.category || 'Cuadernos & Planners');
      setProdSubcategory(prod.subcategory || '');
      setProdDescription(prod.description);
      const initialImgs =
        prod.images && prod.images.length > 0
          ? [...prod.images]
          : prod.imageUrl
          ? [prod.imageUrl]
          : [];
      setProdImages(initialImgs);
      setProdImageUrl(initialImgs[0] || prod.imageUrl || '');
      setDirectImageUrlInput('');
      setProdVariants(prod.variants ? [...prod.variants] : []);
      setNewVarName('');
      setNewVarPrice('');
      setNewVarSku('');
      setEditingVarId(null);
      setProdStock(prod.stock);
      setProdMadeToOrder(Boolean(prod.isMadeToOrder));
      setProdMinutes(prod.productionMinutes);
      setProdMargin(prod.profitMarginPercent);
      setProdExtraCost(prod.extraDirectCost || 0);
      setProdActiveCatalog(prod.activeInCatalog);
      setProdMaterialsList(prod.materials || []);
      setProdDiscountType(prod.discountType || 'percentage');
      setProdDiscountValue(prod.discountValue || 0);
      setProdHasDiscount(prod.customerPromoEnabled ?? Boolean(prod.discountValue && prod.discountValue > 0));
      setProdAdminPrivateDeduction(prod.adminPrivateDeduction || 0);
      setMatSearchInModal('');
    } else {
      setEditingProduct(null);
      setProdSku('SPK-' + Math.floor(100 + Math.random() * 900));
      setProdName('');
      setProdCategory(appCategories[0]?.name || 'Cuadernos & Planners');
      setProdSubcategory('');
      setProdDescription('');
      setProdImages([]);
      setProdImageUrl('/src/assets/images/sparkle_planner_notebook_1793246280204.jpg');
      setDirectImageUrlInput('');
      setProdVariants([]);
      setNewVarName('');
      setNewVarPrice('');
      setNewVarSku('');
      setEditingVarId(null);
      setProdStock(10);
      setProdMadeToOrder(false);
      setProdMinutes(30);
      setProdMargin(45);
      setProdExtraCost(0);
      setProdActiveCatalog(true);
      setProdMaterialsList([]);
      setProdDiscountType('percentage');
      setProdDiscountValue(0);
      setProdHasDiscount(false);
      setProdAdminPrivateDeduction(0);
      setMatSearchInModal('');
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    const trimmedSub = prodSubcategory.trim() || undefined;

    const pricingModifiers = {
      customerPromoEnabled: prodHasDiscount,
      discountType: prodHasDiscount && prodDiscountValue > 0 ? prodDiscountType : undefined,
      discountValue: prodHasDiscount && prodDiscountValue > 0 ? Number(prodDiscountValue) : undefined,
      adminPrivateDeduction: prodAdminPrivateDeduction > 0 ? Number(prodAdminPrivateDeduction) : 0,
      isMadeToOrder: prodMadeToOrder,
    };

    const finalImgs = prodImages.filter((img) => typeof img === 'string' && img.trim().length > 0);
    const primaryImg =
      finalImgs[0] || prodImageUrl.trim() || '/src/assets/images/sparkle_planner_notebook_1793246280204.jpg';
    const imagesArray = finalImgs.length > 0 ? finalImgs : [primaryImg];

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        sku: prodSku,
        name: prodName,
        category: prodCategory,
        subcategory: trimmedSub,
        description: prodDescription,
        imageUrl: primaryImg,
        images: imagesArray,
        variants: prodVariants.length > 0 ? prodVariants : undefined,
        stock: Number(prodStock),
        productionMinutes: Number(prodMinutes),
        profitMarginPercent: Number(prodMargin),
        extraDirectCost: Number(prodExtraCost),
        activeInCatalog: prodActiveCatalog,
        materials: prodMaterialsList,
        ...pricingModifiers,
      });
    } else {
      addProduct({
        sku: prodSku || 'SPK-' + Date.now().toString().slice(-4),
        name: prodName,
        category: prodCategory,
        subcategory: trimmedSub,
        description: prodDescription,
        imageUrl: primaryImg,
        images: imagesArray,
        variants: prodVariants.length > 0 ? prodVariants : undefined,
        stock: Number(prodStock),
        minStock: 2,
        productionMinutes: Number(prodMinutes),
        profitMarginPercent: Number(prodMargin),
        extraDirectCost: Number(prodExtraCost),
        activeInCatalog: prodActiveCatalog,
        materials: prodMaterialsList,
        ...pricingModifiers,
      });
    }

    if (prodCategory.trim()) {
      addCategory(prodCategory.trim());
      if (trimmedSub) {
        addSubcategory(prodCategory.trim(), trimmedSub);
      }
    }

    setIsProductModalOpen(false);
  };

  // Live preview calculation inside modal
  const simulatedProductForModal: Product = {
    id: editingProduct ? editingProduct.id : 'temp',
    sku: prodSku,
    name: prodName || 'Vista Previa',
    category: prodCategory,
    subcategory: prodSubcategory.trim() || undefined,
    description: prodDescription,
    imageUrl: prodImages[0] || prodImageUrl,
    images: prodImages,
    variants: prodVariants,
    stock: prodStock,
    minStock: 2,
    productionMinutes: prodMinutes,
    materials: prodMaterialsList,
    extraDirectCost: prodExtraCost,
    profitMarginPercent: prodMargin,
    activeInCatalog: prodActiveCatalog,
    customerPromoEnabled: prodHasDiscount,
    discountType: prodHasDiscount && prodDiscountValue > 0 ? prodDiscountType : undefined,
    discountValue: prodHasDiscount && prodDiscountValue > 0 ? Number(prodDiscountValue) : undefined,
    adminPrivateDeduction: prodAdminPrivateDeduction > 0 ? Number(prodAdminPrivateDeduction) : 0,
    createdAt: '',
    updatedAt: '',
  };
  const modalBreakdown = getProductBreakdown(simulatedProductForModal);


  const filteredAndSortedAdminProducts: Product[] = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchCat = adminProdCategory === 'todos' || p.category === adminProdCategory;
      const matchSearch =
        p.name.toLowerCase().includes(adminProdSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(adminProdSearch.toLowerCase()) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(adminProdSearch.toLowerCase())) ||
        p.sku.toLowerCase().includes(adminProdSearch.toLowerCase());
      return matchCat && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      if (adminProdSort === 'alfabetico_asc') {
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      }
      if (adminProdSort === 'alfabetico_desc') {
        return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
      }
      if (adminProdSort === 'precio_menor') {
        return getProductBreakdown(a).finalPrice - getProductBreakdown(b).finalPrice;
      }
      if (adminProdSort === 'precio_mayor') {
        return getProductBreakdown(b).finalPrice - getProductBreakdown(a).finalPrice;
      }
      // 'recientes'
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [products, adminProdCategory, adminProdSearch, adminProdSort, getProductBreakdown]);

  // Filtered and sorted materials
  const filteredAndSortedMaterials: Material[] = useMemo(() => {
    const query = matSearch.toLowerCase().trim();
    const filtered = materials.filter((m) => {
      const matchCat = matCategoryFilter === 'todas' || m.category.toLowerCase() === matCategoryFilter.toLowerCase();
      const matchSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        (m.notes && m.notes.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      if (matSort === 'alfabetico_asc') {
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      }
      if (matSort === 'alfabetico_desc') {
        return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
      }
      if (matSort === 'categoria') {
        const catCompare = a.category.localeCompare(b.category, 'es', { sensitivity: 'base' });
        return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      }
      if (matSort === 'precio_menor') {
        return a.unitPrice - b.unitPrice;
      }
      if (matSort === 'precio_mayor') {
        return b.unitPrice - a.unitPrice;
      }
      return 0;
    });
  }, [materials, matCategoryFilter, matSearch, matSort]);

  // Materials grouped by category
  const materialsGroupedByCategory = useMemo(() => {
    const groups = new Map<string, Material[]>();
    filteredAndSortedMaterials.forEach((m) => {
      const cat = m.category || 'General';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(m);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [filteredAndSortedMaterials]);

  // Unique categories from materials
  const materialCategories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [materials]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span>Fórmulas Dinámicas & Vinculación en Tiempo Real</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Calculadora de Costos & Precios de Venta
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Si aumentas un insumo, la hora de trabajo o el alquiler, todos los precios se actualizan al instante en un solo movimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="px-3.5 py-2 bg-pink-50 dark:bg-neutral-800 hover:bg-pink-100 dark:hover:bg-neutral-700 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Administrar categorías y subcategorías"
          >
            <FolderTree className="w-4 h-4 text-pink-500" />
            <span>Categorías & Subcategorías</span>
          </button>

          <button
            onClick={() => openProductModal()}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* GLOBAL REACTIVE VARIABLES BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-pink-500" />
            Parámetros Globales de Costo (Afectan a todo el catálogo)
          </span>
          <span className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Vinculado en tiempo real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Hourly Labor Rate */}
          <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-neutral-900/60 border border-pink-100 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                Tu Hora de Trabajo
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {formatCurrency(laborCostPerMinute, settings.currency)}/min
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-neutral-400">{settings.currency}</span>
              <input
                type="number"
                min="0"
                step="50"
                placeholder="0"
                value={settings.hourlyLaborRate === 0 ? '' : settings.hourlyLaborRate}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/^0+(?=\d)/, '');
                  handleHourlyRateChange(parseFloat(cleaned) || 0);
                }}
                className="w-full px-2.5 py-1.5 text-sm font-bold font-mono rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-pink-600 dark:text-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <span className="text-xs text-neutral-500 font-medium">/hora</span>
            </div>
          </div>

          {/* Monthly Working Hours */}
          <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-neutral-900/60 border border-pink-100 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                Horas Laborales al Mes
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {(settings.monthlyWorkingHours || 160) * 60} minutos
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                placeholder="160"
                value={settings.monthlyWorkingHours === 0 ? '' : settings.monthlyWorkingHours}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/^0+(?=\d)/, '');
                  handleMonthlyHoursChange(parseInt(cleaned) || 0);
                }}
                className="w-full px-2.5 py-1.5 text-sm font-bold font-mono rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <span className="text-xs text-neutral-500 font-medium">hs/mes</span>
            </div>
          </div>

          {/* Invisible Costs Summary */}
          <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-neutral-900/60 border border-pink-100 dark:border-neutral-800 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                Gastos Invisibles Fijos
              </label>
              <button
                onClick={() => setActiveTab('invisibles')}
                className="text-[10px] text-pink-600 hover:underline font-semibold"
              >
                Ver {invisibleCosts.length} fijos
              </button>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                {formatCurrency(
                  invisibleCosts.reduce((s, c) => s + c.monthlyCost, 0),
                  settings.currency
                )}
                /mes
              </span>
              <span className="text-[11px] font-bold text-pink-600 font-mono">
                {formatCurrency(invisibleCostPerMinute, settings.currency)}/min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-pink-100 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('productos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'productos'
              ? 'bg-pink-600 text-white shadow-2xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Productos Calculados ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('materiales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'materiales'
              ? 'bg-pink-600 text-white shadow-2xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Banco de Insumos & Materiales ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invisibles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'invisibles'
              ? 'bg-pink-600 text-white shadow-2xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Gastos Invisibles Fijos ({invisibleCosts.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTOS CALCULADOS */}
      {activeTab === 'productos' && (
        <div className="space-y-4">
          {/* Admin Toolbar: Search, Category Filter, and Sort */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={adminProdSearch}
                onChange={(e) => setAdminProdSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU, subcategoría..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-pink-100 dark:border-neutral-700 bg-pink-50/20 dark:bg-neutral-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
                <Tag className="w-3.5 h-3.5 text-pink-500" />
                <select
                  value={adminProdCategory}
                  onChange={(e) => setAdminProdCategory(e.target.value)}
                  className="bg-transparent font-medium text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
                >
                  <option value="todos">Todas las Categorías</option>
                  {Array.from(new Set(products.map((p) => p.category))).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-pink-500" />
                <select
                  value={adminProdSort}
                  onChange={(e) => setAdminProdSort(e.target.value as any)}
                  className="bg-transparent font-medium text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
                >
                  <option value="recientes">🕒 Recientes primero</option>
                  <option value="alfabetico_asc">🔤 De la A a la Z</option>
                  <option value="alfabetico_desc">🔠 De la Z a la A</option>
                  <option value="precio_menor">🏷️ Menor precio</option>
                  <option value="precio_mayor">💎 Mayor precio</option>
                </select>
              </div>
            </div>
          </div>

          {filteredAndSortedAdminProducts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#18141D] rounded-2xl border border-pink-100 dark:border-neutral-800 p-6">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                No se encontraron productos con ese filtro.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAndSortedAdminProducts.map((prod: Product) => {
                const breakdown = getProductBreakdown(prod);

                return (
                  <div
                    key={prod.id}
                    className="bg-white dark:bg-[#18141D] rounded-2xl border border-pink-100 dark:border-neutral-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-pink-200 transition-colors"
                  >
                    <div className="flex gap-4 items-start">
                      <div className="relative shrink-0">
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-xl object-cover border border-pink-100 dark:border-neutral-700 shadow-2xs"
                        />
                        {prod.images && prod.images.length > 1 && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold shadow-xs flex items-center gap-0.5">
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>{prod.images.length}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1">
                            <span>{prod.category}</span>
                            {prod.subcategory && (
                              <span className="px-1.5 py-0.2 rounded bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-normal border border-pink-100 dark:border-pink-900/40">
                                › {prod.subcategory}
                              </span>
                            )}
                            <span>· {prod.sku}</span>
                          </span>
                        <div className="flex items-center gap-1 bg-pink-50/70 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-pink-100 dark:border-neutral-700/60 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => openProductModal(prod)}
                            className="p-1 text-neutral-500 hover:text-pink-600 dark:text-neutral-400 dark:hover:text-pink-400 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors"
                            title="Editar producto"
                            aria-label="Editar producto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateProduct(prod.id)}
                            className="p-1 text-neutral-500 hover:text-purple-600 dark:text-neutral-400 dark:hover:text-purple-400 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors"
                            title="Duplicar producto (Copia exacta)"
                            aria-label="Duplicar producto"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(prod.id)}
                            className="p-1 text-neutral-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors"
                            title="Borrar producto"
                            aria-label="Borrar producto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate mt-0.5">
                        {prod.name}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-pink-500" /> {prod.productionMinutes} min
                        </span>
                        <span>·</span>
                        <span>{prod.materials?.length || 0} insumos</span>
                        <span>·</span>
                        <span className="text-emerald-600 font-semibold">Stock: {prod.stock}</span>
                        {prod.variants && prod.variants.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {prod.variants.length} {prod.variants.length === 1 ? 'variante' : 'variantes'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reactive Cost Breakdown Grid */}
                  <div className="p-3 rounded-xl bg-pink-50/40 dark:bg-neutral-900/50 border border-pink-100 dark:border-neutral-800 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Costo Insumos:</span>
                      <span>{formatCurrency(breakdown.materialsCost, settings.currency)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Mano de Obra ({prod.productionMinutes} min):</span>
                      <span>{formatCurrency(breakdown.laborCostTotal, settings.currency)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Gastos Invisibles ({prod.productionMinutes} min):</span>
                      <span>{formatCurrency(breakdown.invisibleCostTotal, settings.currency)}</span>
                    </div>
                    {breakdown.extraDirectCost > 0 && (
                      <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                        <span>Extras Packaging:</span>
                        <span>{formatCurrency(breakdown.extraDirectCost, settings.currency)}</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-pink-200 dark:border-neutral-700 flex justify-between font-bold text-neutral-800 dark:text-neutral-200">
                      <span>Costo Base Total:</span>
                      <span>{formatCurrency(breakdown.totalProductionCost, settings.currency)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Ganancia ({prod.profitMarginPercent}%):</span>
                      <span>+{formatCurrency(breakdown.profitAmount, settings.currency)}</span>
                    </div>
                  </div>

                  {/* Final Price Highlight with Discount & Private Deduction Support */}
                  <div className="space-y-1 pt-1 border-t border-pink-50 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-pink-500" />
                        <span>{breakdown.hasDiscount ? 'Precio Cliente (En Oferta):' : 'Precio al Cliente:'}</span>
                      </span>
                      <div className="text-right">
                        {breakdown.hasDiscount && (
                          <div className="flex items-center gap-1.5 justify-end mb-0.5">
                            <span className="text-xs text-neutral-400 line-through">
                              {formatCurrency(breakdown.effectivePrice, settings.currency)}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              {prod.discountType === 'percentage'
                                ? `-${prod.discountValue}%`
                                : `-${formatCurrency(prod.discountValue || 0, settings.currency)}`}
                            </span>
                          </div>
                        )}
                        <span className="text-lg font-black text-pink-600 dark:text-pink-400 tabular-nums">
                          {formatCurrency(breakdown.customerFinalPrice, settings.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Variantes Preview if configured */}
                    {prod.variants && prod.variants.length > 0 && (
                      <div className="pt-2 border-t border-purple-100 dark:border-neutral-800/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>Variantes con precio propio ({prod.variants.length}):</span>
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Desde {formatCurrency(Math.min(...prod.variants.map((v) => v.price)), settings.currency)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prod.variants.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[10.5px] text-purple-800 dark:text-purple-200 font-medium"
                            >
                              <span>{v.name}</span>
                              <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(v.price, settings.currency)}
                              </strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {breakdown.hasAdminDeduction && (
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-pink-200 dark:border-neutral-700 text-[11px] bg-purple-50/50 dark:bg-purple-950/20 px-2 py-1 rounded-lg">
                        <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1" title="Resta que solo ve el admin y no los clientes">
                          <Lock className="w-3 h-3 text-purple-600" />
                          <span>Resta Privada (Solo tú):</span>
                        </span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                          -{formatCurrency(breakdown.adminPrivateDeduction, settings.currency)} · Neto: {formatCurrency(breakdown.adminNetPrice, settings.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB 2: BANCO DE MATERIALES (ORDENADOS DE A A LA Z Y POR CATEGORÍAS) */}
      {activeTab === 'materiales' && (
        <div className="space-y-4">
          {/* Header & Main Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Lista de Insumos & Materias Primas ({filteredAndSortedMaterials.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Organizados alfabéticamente y por categorías. Al actualizar costos, todo el catálogo se recalcula en tiempo real.
              </p>
            </div>
            <button
              onClick={() => openMaterialModal()}
              className="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Insumo</span>
            </button>
          </div>

          {/* Materials Toolbar: Search, Category Filter, Sort, and View Mode */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={matSearch}
                onChange={(e) => setMatSearch(e.target.value)}
                placeholder="Buscar insumo, nota..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-pink-100 dark:border-neutral-700 bg-pink-50/20 dark:bg-neutral-900 focus:outline-pink-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
                <Tag className="w-3.5 h-3.5 text-pink-500" />
                <select
                  value={matCategoryFilter}
                  onChange={(e) => setMatCategoryFilter(e.target.value)}
                  className="bg-transparent font-medium text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
                >
                  <option value="todas">Todas las Categorías</option>
                  {materialCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Alphabetical & Category Sorting */}
              <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-pink-500" />
                <select
                  value={matSort}
                  onChange={(e) => setMatSort(e.target.value as any)}
                  className="bg-transparent font-medium text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
                >
                  <option value="alfabetico_asc">🔤 De la A a la Z (Alfabético)</option>
                  <option value="alfabetico_desc">🔠 De la Z a la A</option>
                  <option value="categoria">📁 Por Categorías (A-Z)</option>
                  <option value="precio_menor">🏷️ Menor Precio</option>
                  <option value="precio_mayor">💎 Mayor Precio</option>
                </select>
              </div>

              {/* View Mode Toggle: Table vs Grouped by Category */}
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setMatViewMode('tabla')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    matViewMode === 'tabla'
                      ? 'bg-white dark:bg-neutral-700 text-pink-600 dark:text-pink-400 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                  title="Vista en tabla continua"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tabla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatViewMode('agrupado')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    matViewMode === 'agrupado'
                      ? 'bg-white dark:bg-neutral-700 text-pink-600 dark:text-pink-400 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                  title="Vista agrupada por categorías"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Por Categorías</span>
                </button>
              </div>
            </div>
          </div>

          {filteredAndSortedMaterials.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#18141D] rounded-2xl border border-pink-100 dark:border-neutral-800 p-6">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                No se encontraron insumos con ese criterio.
              </p>
            </div>
          ) : matViewMode === 'agrupado' ? (
            /* Vista Agrupada por Categorías */
            <div className="space-y-4">
              {materialsGroupedByCategory.map(([categoryName, catMaterials]) => (
                <div
                  key={categoryName}
                  className="rounded-2xl border border-pink-100 dark:border-neutral-800 bg-white dark:bg-[#18141D] overflow-hidden shadow-2xs"
                >
                  <div className="px-4 py-3 bg-pink-50/70 dark:bg-neutral-900/80 border-b border-pink-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-pink-500" />
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                        {categoryName}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 font-bold">
                        {catMaterials.length} {catMaterials.length === 1 ? 'insumo' : 'insumos'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMaterial(null);
                        setMatName('');
                        setMatCategory(categoryName);
                        setMatUnit('unidad');
                        setMatUnitPrice(0);
                        setMatWholesalePrice(0);
                        setMatWholesaleMinQty(10);
                        setMatStock(0);
                        setMatNotes('');
                        setIsMaterialModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Agregar a {categoryName}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50/50 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-800 text-[10.5px] font-semibold text-neutral-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Material / Insumo</th>
                          <th className="p-3">Unidad</th>
                          <th className="p-3 text-right">Precio Unitario</th>
                          <th className="p-3 text-right">Precio x Mayor</th>
                          <th className="p-3 text-right">Stock</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pink-50/60 dark:divide-neutral-800 font-mono">
                        {catMaterials.map((m) => (
                          <tr key={m.id} className="hover:bg-pink-50/30 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="p-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                              {m.name}
                              {m.notes && <p className="text-[10px] text-neutral-400 font-normal">{m.notes}</p>}
                            </td>
                            <td className="p-3 font-sans text-neutral-500">{m.unit}</td>
                            <td className="p-3 text-right font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                              {formatCurrency(m.unitPrice, settings.currency)}
                            </td>
                            <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {m.wholesalePrice > 0 ? (
                                <span>
                                  {formatCurrency(m.wholesalePrice, settings.currency)}{' '}
                                  <span className="text-[10px] text-neutral-400 font-sans">(min {m.wholesaleMinQty})</span>
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">
                              {m.stock !== undefined ? m.stock : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openMaterialModal(m)}
                                  className="p-1 text-neutral-400 hover:text-pink-600"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteMaterial(m.id)}
                                  className="p-1 text-neutral-400 hover:text-rose-500"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista en Tabla Continua Ordenada */
            <div className="overflow-x-auto rounded-2xl border border-pink-100 dark:border-neutral-800 bg-white dark:bg-[#18141D] shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-pink-50/70 dark:bg-neutral-900/80 border-b border-pink-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Material / Insumo</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Unidad</th>
                    <th className="p-3 text-right">Precio Unitario</th>
                    <th className="p-3 text-right">Precio x Mayor</th>
                    <th className="p-3 text-right">Stock</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50 dark:divide-neutral-800 font-mono">
                  {filteredAndSortedMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-pink-50/30 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="p-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                        {m.name}
                        {m.notes && <p className="text-[10px] text-neutral-400 font-normal">{m.notes}</p>}
                      </td>
                      <td className="p-3 font-sans text-neutral-500">{m.category}</td>
                      <td className="p-3 font-sans text-neutral-500">{m.unit}</td>
                      <td className="p-3 text-right font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {formatCurrency(m.unitPrice, settings.currency)}
                      </td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {m.wholesalePrice > 0 ? (
                          <span>
                            {formatCurrency(m.wholesalePrice, settings.currency)}{' '}
                            <span className="text-[10px] text-neutral-400 font-sans">(min {m.wholesaleMinQty})</span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">
                        {m.stock !== undefined ? m.stock : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openMaterialModal(m)}
                            className="p-1 text-neutral-400 hover:text-pink-600"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMaterial(m.id)}
                            className="p-1 text-neutral-400 hover:text-rose-500"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GASTOS INVISIBLES */}
      {activeTab === 'invisibles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Gastos Invisibles Mensuales del Taller
              </h3>
              <p className="text-xs text-neutral-500">
                Se dividen por los minutos trabajados al mes para asignar el costo exacto a cada producto.
              </p>
            </div>
            <button
              onClick={() => openInvisibleModal()}
              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Gasto Fijo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {invisibleCosts.map((inv) => {
              const totalMins = (settings.monthlyWorkingHours || 160) * 60;
              const perMin = inv.monthlyCost / totalMins;

              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 space-y-2 shadow-2xs"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {inv.name}
                    </h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openInvisibleModal(inv)}
                        className="p-1 text-neutral-400 hover:text-pink-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteInvisibleCost(inv.id)}
                        className="p-1 text-neutral-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-lg font-black text-pink-600 dark:text-pink-400 font-mono">
                    {formatCurrency(inv.monthlyCost, settings.currency)}{' '}
                    <span className="text-xs font-normal text-neutral-400">/mes</span>
                  </p>

                  <div className="flex justify-between text-[11px] text-neutral-500 pt-1 border-t border-pink-50 dark:border-neutral-800">
                    <span>Incidencia:</span>
                    <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                      {formatCurrency(perMin, settings.currency)}/min
                    </span>
                  </div>

                  {inv.notes && (
                    <p className="text-[10px] text-neutral-400 italic">{inv.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: MATERIAL */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-md w-full border border-pink-100 dark:border-neutral-800 shadow-2xl p-4 sm:p-5 my-2 sm:my-auto max-h-[94vh] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3 shrink-0">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingMaterial ? 'Editar Insumo' : 'Nuevo Insumo / Material'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Nombre del Material *</label>
                <input
                  type="text"
                  required
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="Ej. Cartón gris 2mm, Taza blanca AAA..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Categoría</label>
                  <input
                    type="text"
                    value={matCategory}
                    onChange={(e) => setMatCategory(e.target.value)}
                    placeholder="Papeles, Sublimación..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Unidad de Medida</label>
                  <input
                    type="text"
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    placeholder="pliego, hoja, metro, un..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Precio Unitario ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0"
                    value={matUnitPrice === 0 ? '' : matUnitPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setMatUnitPrice(parseFloat(clean) || 0);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Precio x Mayor ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={matWholesalePrice === 0 ? '' : matWholesalePrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setMatWholesalePrice(parseFloat(clean) || 0);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Mínimo x Mayor</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={matWholesaleMinQty === 0 ? '' : matWholesaleMinQty}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setMatWholesaleMinQty(parseInt(clean) || 10);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={matStock === 0 ? '' : matStock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setMatStock(parseInt(clean) || 0);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Notas / Rendimiento</label>
                <input
                  type="text"
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  placeholder="Ej. Rinde 6 tapas A5 por pliego"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-pink-600 text-white rounded-xl shadow-sm"
                >
                  Guardar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GASTO INVISIBLE */}
      {isInvisibleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-sm w-full border border-pink-100 dark:border-neutral-800 shadow-2xl p-4 sm:p-5 my-2 sm:my-auto max-h-[94vh] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3 shrink-0">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingInvisible ? 'Editar Gasto Invisible' : 'Nuevo Gasto Invisible'}
              </h3>
              <button
                type="button"
                onClick={() => setIsInvisibleModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvisible} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Concepto / Nombre *</label>
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="Ej. Alquiler taller, Electricidad, Internet..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Costo Mensual Total ({settings.currency}) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0"
                  value={invMonthlyCost === 0 ? '' : invMonthlyCost}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/^0+(?=\d)/, '');
                    setInvMonthlyCost(parseFloat(clean) || 0);
                  }}
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Detalles / Notas</label>
                <input
                  type="text"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="Observaciones de pago"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInvisibleModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-pink-600 text-white rounded-xl shadow-sm"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTO CALCULADO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-2xl w-full border border-pink-100 dark:border-neutral-800 shadow-2xl p-4 sm:p-6 my-2 sm:my-6 flex flex-col max-h-[95vh] sm:max-h-[92vh] space-y-3 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3 shrink-0">
              <div className="pr-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {editingProduct ? 'Editar Producto & Costos' : 'Crear Producto & Calcular Precio'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Selecciona los insumos vinculados, tiempo en minutos y margen de ganancia deseado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto pr-1 sm:pr-1.5 space-y-4 overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold block mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Ej. Planner Anillado Rosa Pastel"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold flex items-center justify-between mb-1">
                    <span>Categoría *</span>
                  </label>
                  <input
                    type="text"
                    list="calc-categories-list"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="Ej. Papelería, Souvenirs..."
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                  <datalist id="calc-categories-list">
                    {appCategories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-semibold flex items-center justify-between mb-1">
                    <span>Subcategoría</span>
                  </label>
                  <input
                    type="text"
                    list="calc-subcategories-list"
                    value={prodSubcategory}
                    onChange={(e) => setProdSubcategory(e.target.value)}
                    placeholder="Ej. Planners, Cuadernos..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                  <datalist id="calc-subcategories-list">
                    {appCategories
                      .find((c) => c.name.toLowerCase() === prodCategory.trim().toLowerCase())
                      ?.subcategories.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                  </datalist>
                </div>
              </div>

              {/* SECCIÓN: GALERÍA DE FOTOS DEL PRODUCTO (1 A 10 FOTOS) */}
              <div className="p-3.5 rounded-2xl bg-pink-50/50 dark:bg-neutral-900/50 border border-pink-200/80 dark:border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-pink-100 dark:border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-pink-600" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Galería de Fotos del Producto (1 a 10 imágenes)
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full self-start sm:self-auto ${
                      prodImages.length >= 10
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300'
                    }`}
                  >
                    {prodImages.length} / 10 fotos {prodImages.length >= 10 ? '(Límite alcanzado)' : ''}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Agrega de <strong>1 a 10 fotos</strong> por producto. La primera foto será la <strong>portada principal</strong> en el catálogo. Tus clientes podrán cliquear en el producto para ver todas las fotos ampliadas en alta calidad.
                </p>

                {/* Hidden multiple file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesUpload}
                  className="hidden"
                />

                {/* Upload Buttons & Direct URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={prodImages.length >= 10}
                    className="py-2.5 px-3.5 rounded-xl bg-white dark:bg-neutral-800 border-2 border-dashed border-pink-300 dark:border-pink-800 hover:border-pink-500 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs hover:scale-101 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4 text-pink-600" />
                    <span>+ Subir Fotos (Celular o PC)</span>
                  </button>

                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      value={directImageUrlInput}
                      onChange={(e) => setDirectImageUrlInput(e.target.value)}
                      placeholder="O pega una URL de imagen..."
                      disabled={prodImages.length >= 10}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-pink-400 disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={handleAddDirectImageUrl}
                      disabled={!directImageUrlInput.trim() || prodImages.length >= 10}
                      className="px-3 py-2 text-xs font-bold bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white rounded-xl shadow-2xs transition-colors shrink-0"
                    >
                      + Añadir
                    </button>
                  </div>
                </div>

                {/* Visual Thumbnails Grid (1 to 10 photos) */}
                {prodImages.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-pink-200 dark:border-neutral-800 rounded-xl bg-white/70 dark:bg-neutral-900/40">
                    <ImageIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                      Aún no has agregado fotos para este producto.
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Sube hasta 10 fotos desde tu dispositivo o enlaces web.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
                    {prodImages.map((img, idx) => {
                      const isCover = idx === 0;
                      return (
                        <div
                          key={idx}
                          className={`relative group rounded-xl overflow-hidden border-2 bg-white dark:bg-neutral-800 flex flex-col justify-between transition-all shadow-2xs ${
                            isCover
                              ? 'border-pink-500 ring-2 ring-pink-400/40'
                              : 'border-pink-100 dark:border-neutral-700 hover:border-pink-300'
                          }`}
                        >
                          {/* Image preview */}
                          <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                            <img
                              src={img}
                              alt={`Foto ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80';
                              }}
                            />

                            {/* Cover Badge */}
                            {isCover ? (
                              <div className="absolute top-1 left-1 bg-pink-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-white" />
                                <span>PORTADA</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetCoverImage(idx)}
                                className="absolute top-1 left-1 bg-black/60 hover:bg-pink-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs transition-colors shadow-xs"
                                title="Fijar como foto principal de portada"
                              >
                                Hacer portada
                              </button>
                            )}

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveProdImage(idx)}
                              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-md backdrop-blur-xs transition-colors shadow-xs"
                              title="Eliminar foto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Reorder and position footer */}
                          <div className="p-1 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                            <span>#{idx + 1}</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveImage(idx, 'left')}
                                className="p-0.5 hover:text-pink-600 disabled:opacity-20 rounded"
                                title="Mover hacia la izquierda"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === prodImages.length - 1}
                                onClick={() => handleMoveImage(idx, 'right')}
                                className="p-0.5 hover:text-pink-600 disabled:opacity-20 rounded"
                                title="Mover hacia la derecha"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Stock Disponible</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={prodStock === 0 ? '' : prodStock}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/^0+(?=\d)/, '');
                    setProdStock(parseInt(clean) || 0);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Unidades físicas listas para entrega inmediata
                </span>

                {/* Opción Producto Por Encargo / A Pedido */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200/80 dark:border-purple-900/40 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="prodMadeToOrder"
                    checked={prodMadeToOrder}
                    onChange={(e) => setProdMadeToOrder(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-purple-600 rounded border-neutral-300 focus:ring-purple-400 cursor-pointer"
                  />
                  <label htmlFor="prodMadeToOrder" className="cursor-pointer select-none">
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <span>Producto realizado por encargo / a pedido</span>
                    </span>
                    <span className="text-[11px] text-neutral-600 dark:text-neutral-400 block mt-0.5 leading-snug">
                      Permite que los clientes puedan solicitarlo o comprarlo por encargo aunque no haya stock físico inmediato (en el catálogo mostrará la insignia <strong>&quot;Realizado por encargo&quot;</strong>).
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Descripción para el Catálogo</label>
                <textarea
                  rows={2}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Detalles de elaboración, medidas, personalización..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              {/* SECCIÓN: VARIANTES DEL PRODUCTO CON PRECIO PROPIO */}
              <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-neutral-900/60 border border-purple-200/70 dark:border-purple-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-purple-100 dark:border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                        Variantes del Pedido (con precio distinto)
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Tamaños, unidades, packs, colores, modelos, talles, etc.
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 self-start sm:self-auto">
                    {prodVariants.length} {prodVariants.length === 1 ? 'variante' : 'variantes creadas'}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Crea cualquier variación que necesites. Cada variante tiene su <strong>precio propio</strong>. El cliente podrá elegir su opción en el catálogo y el precio se actualizará automáticamente.
                </p>

                {/* Formulario para Crear / Agregar Nueva Variante */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-purple-100 dark:border-neutral-700 space-y-2">
                  <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">
                    + Anotar Nueva Variante:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        placeholder="Nombre de variante (ej. Tamaño A5, Color Rosa, Pack x50)..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-purple-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddVariant();
                          }
                        }}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                          {settings.currency}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={newVarPrice === '' ? '' : newVarPrice}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewVarPrice(val === '' ? '' : parseFloat(val) || 0);
                          }}
                          placeholder="Precio ($)"
                          className="w-full pl-7 pr-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-purple-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddVariant();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-3 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddVariant()}
                        disabled={!newVarName.trim() || newVarPrice === ''}
                        className="flex-1 py-1.5 px-3 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>

                  {/* Sugerencias Rápidas con opción de eliminar sugerencias predeterminadas */}
                  {dynamicVariantSuggestions.length > 0 && (
                    <div className="space-y-1.5 pt-1.5 border-t border-purple-100/60 dark:border-neutral-700/60">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10.5px]">
                        <span className="text-neutral-500 dark:text-neutral-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span>Sugerencias rápidas (toca para usar, × para eliminar):</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleClearAllVariantSuggestions}
                          className="text-[10px] text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-semibold underline transition-colors"
                          title="Eliminar todas las sugerencias predeterminadas"
                        >
                          Eliminar sugerencias predeterminadas
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                        {dynamicVariantSuggestions.map((sug) => {
                          return (
                            <div
                              key={sug}
                              className="inline-flex items-center rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 transition-all hover:bg-purple-100 dark:hover:bg-purple-900/60"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setNewVarName(sug);
                                  if (newVarPrice === '' && modalBreakdown.finalPrice > 0) {
                                    setNewVarPrice(modalBreakdown.finalPrice);
                                  }
                                }}
                                className="px-2 py-0.5 font-medium hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                title={`Usar "${sug}" como nombre`}
                              >
                                + {sug}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveLearnedSuggestion(sug, e)}
                                className="pr-1.5 pl-0.5 text-neutral-400 hover:text-rose-600 font-black text-[12px] leading-none"
                                title={`Eliminar "${sug}" de sugerencias`}
                                aria-label="Eliminar sugerencia"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de Variantes Creadas con Edición y Borrado */}
                {prodVariants.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic text-center py-2.5">
                    No has creado variantes aún. Si no creas variantes, el producto se venderá al precio estándar calculado arriba.
                  </p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">
                      Variantes registradas ({prodVariants.length}):
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {prodVariants.map((v, idx) => {
                        const isEditingThis = editingVarId === v.id;
                        return (
                          <div
                            key={v.id}
                            className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-purple-100 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                          >
                            {isEditingThis ? (
                              <div className="flex flex-1 items-center gap-2">
                                <input
                                  type="text"
                                  value={editingVarName}
                                  onChange={(e) => setEditingVarName(e.target.value)}
                                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-purple-400 bg-white dark:bg-neutral-900 font-bold"
                                  placeholder="Nombre..."
                                />
                                <div className="relative w-28">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                                    {settings.currency}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={editingVarPrice === '' ? '' : editingVarPrice}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) =>
                                      setEditingVarPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold rounded-lg border border-purple-400 bg-white dark:bg-neutral-900"
                                    placeholder="Precio"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditVariant(v.id)}
                                  className="px-2.5 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingVarId(null)}
                                  className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-600"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                    {v.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs">
                                    {formatCurrency(v.price, settings.currency)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditVariant(v)}
                                    className="p-1 text-neutral-400 hover:text-purple-600 rounded hover:bg-purple-50 dark:hover:bg-neutral-700 transition-colors"
                                    title="Editar variante"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVariant(v.id)}
                                    className="p-1 text-neutral-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-neutral-700 transition-colors"
                                    title="Borrar variante"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* VINCULACIÓN DE MATERIALES */}
              <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-neutral-900/60 border border-pink-100 dark:border-neutral-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                      Insumos & Materiales Utilizados (A-Z)
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Ordenados alfabéticamente de la A a la Z con buscador rápido
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                    {/* Buscador de insumos y materiales */}
                    <div className="relative">
                      <Search className="w-3 h-3 text-neutral-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={matSearchInModal}
                        onChange={(e) => setMatSearchInModal(e.target.value)}
                        placeholder="Buscar material (A-Z)..."
                        className="pl-6 pr-2 py-1 text-[11px] rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-pink-400"
                      />
                      {matSearchInModal && (
                        <button
                          type="button"
                          onClick={() => setMatSearchInModal('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-neutral-600 font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Selector de insumos ordenado de la A a la Z */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          const mat = materials.find((m) => m.id === e.target.value);
                          if (mat) {
                            setProdMaterialsList((prev) => [
                              ...prev,
                              { materialId: mat.id, quantity: 1, useWholesale: false },
                            ]);
                          }
                          e.target.value = '';
                        }
                      }}
                      className="text-[11px] text-pink-700 bg-white dark:bg-neutral-800 px-2 py-1 rounded-lg border border-pink-200 dark:border-neutral-700 font-semibold cursor-pointer max-w-full truncate"
                    >
                      <option value="">
                        + Agregar Insumo ({filteredModalMaterials.length} en orden A-Z)...
                      </option>
                      {filteredModalMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatCurrency(m.unitPrice, settings.currency)}/{m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {prodMaterialsList.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic text-center py-2">
                    Sin materiales vinculados todavía.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {prodMaterialsList.map((usage, idx) => {
                      const mat = materials.find((m) => m.id === usage.materialId);
                      if (!mat) return null;
                      const price = usage.useWholesale && mat.wholesalePrice > 0 ? mat.wholesalePrice : mat.unitPrice;
                      const subtotal = price * usage.quantity;

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-1.5 bg-white dark:bg-neutral-800 rounded-lg border text-xs"
                        >
                          <span className="flex-1 truncate font-medium">{mat.name}</span>
                          <span className="text-[10px] text-neutral-400">{mat.unit}</span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            placeholder="1"
                            value={usage.quantity === 0 ? '' : usage.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/^0+(?=\d)/, '');
                              const updated = [...prodMaterialsList];
                              updated[idx].quantity = parseFloat(clean) || 0;
                              setProdMaterialsList(updated);
                            }}
                            className="w-16 px-1.5 py-0.5 border rounded text-center font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...prodMaterialsList];
                              updated[idx].useWholesale = !updated[idx].useWholesale;
                              setProdMaterialsList(updated);
                            }}
                            className={`px-1.5 py-0.5 text-[10px] rounded border ${
                              usage.useWholesale ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-neutral-100 text-neutral-500'
                            }`}
                            title="Alternar precio x mayor"
                          >
                            Mayorista
                          </button>
                          <span className="font-mono font-bold text-pink-600 tabular-nums w-18 text-right">
                            {formatCurrency(subtotal, settings.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setProdMaterialsList(prodMaterialsList.filter((_, i) => i !== idx))}
                            className="text-neutral-400 hover:text-rose-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PRODUCTION TIME & MARGIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">
                    Tiempo de Elaboración (minutos) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={prodMinutes === 0 ? '' : prodMinutes}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setProdMinutes(parseInt(clean) || 0);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Calcula mano de obra + gastos invisibles
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    Margen de Ganancia Deseado (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    placeholder="0"
                    value={prodMargin === 0 ? '' : prodMargin}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setProdMargin(parseFloat(clean) || 0);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-emerald-600"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Ej. 30%, 40%, 50%, etc.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    Costo Extra Packaging ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={prodExtraCost === 0 ? '' : prodExtraCost}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setProdExtraCost(parseFloat(clean) || 0);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Cajas, etiquetas adicionales
                  </span>
                </div>
              </div>

              {/* 1. SECCIÓN DE DESCUENTOS Y PROMOCIONES HACIA EL CLIENTE (VISIBLE EN CATÁLOGO) */}
              <div className="p-3.5 rounded-xl bg-pink-50/70 dark:bg-neutral-900/70 border border-pink-200 dark:border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodHasDiscount}
                      onChange={(e) => {
                        setProdHasDiscount(e.target.checked);
                        if (e.target.checked && prodDiscountValue === 0) {
                          setProdDiscountValue(10);
                        }
                      }}
                      className="rounded text-pink-600 focus:ring-pink-400"
                    />
                    <BadgePercent className="w-4 h-4 text-pink-500" />
                    <span>¿Activar Promoción / Descuento para el Cliente?</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    prodHasDiscount
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                  }`}>
                    {prodHasDiscount ? (
                      <>
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>Promoción Activa (Pública)</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-neutral-400" />
                        <span>Desactivada / Sin descuento</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Visible para los clientes en el catálogo con insignia de oferta. Puedes activarlo, desactivarlo o dejarlo sin rellenar cuando quieras.
                </p>

                {prodHasDiscount && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-pink-100 dark:border-neutral-800 animate-in fade-in">
                    <div>
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                        Tipo de Descuento
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-neutral-800 p-1 rounded-lg border border-pink-200 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() => setProdDiscountType('percentage')}
                          className={`py-1 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-colors ${
                            prodDiscountType === 'percentage'
                              ? 'bg-pink-600 text-white shadow-2xs'
                              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          }`}
                        >
                          <Percent className="w-3.5 h-3.5" />
                          <span>Porcentaje (%)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdDiscountType('fixed')}
                          className={`py-1 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-colors ${
                            prodDiscountType === 'fixed'
                              ? 'bg-pink-600 text-white shadow-2xs'
                              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          }`}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Pesos ($)</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                          {prodDiscountType === 'percentage' ? 'Porcentaje a descontar (%)' : `Monto a descontar (${settings.currency})`}
                        </label>
                        <button
                          type="button"
                          onClick={() => setProdDiscountValue(0)}
                          className="text-[10px] text-pink-600 hover:underline font-semibold"
                        >
                          Dejar en 0
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={prodDiscountType === 'percentage' ? 100 : undefined}
                          step="any"
                          placeholder="0 (o dejar vacío)"
                          value={prodDiscountValue === 0 ? '' : prodDiscountValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                            setProdDiscountValue(clean === '' ? 0 : parseFloat(clean) || 0);
                          }}
                          className="w-full pl-8 pr-3 py-2 text-xs font-bold font-mono rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-emerald-600"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                          {prodDiscountType === 'percentage' ? '%' : settings.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SECCIÓN DE RESTA PARA NÚMEROS CERRADOS (SOLO ADMINISTRADOR - CONFIDENCIAL) */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span>Resta para Números Cerrados (Ajuste Administrador)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {prodAdminPrivateDeduction > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        Resta activa: -{formatCurrency(prodAdminPrivateDeduction, settings.currency)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setProdAdminPrivateDeduction(0)}
                      className="text-[10px] text-purple-700 dark:text-purple-300 font-bold hover:underline bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-md"
                    >
                      Dejar en $0
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-purple-700 dark:text-purple-300/80 leading-relaxed">
                  🎯 <strong>Para que los números queden cerrados:</strong> Esta resta se descuenta del total del producto para evitar centavos o terminaciones incómodas (como $75) y dejar el total en un número redondo y limpio. Los clientes en el catálogo verán el total cerrado directamente sin ver esta resta.
                </p>

                {/* Quick 1-Click Rounding Suggestions */}
                {(() => {
                  const baseToRound = Math.max(0, modalBreakdown.effectivePrice - (modalBreakdown.hasDiscount ? modalBreakdown.discountAmount : 0));
                  const r100 = calculateRoundingDeduction(baseToRound, 100);
                  const r50 = calculateRoundingDeduction(baseToRound, 50);
                  const cents = Math.round((baseToRound - Math.floor(baseToRound)) * 100) / 100;

                  return (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1 py-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>Sugerencias para cerrar número:</span>
                      </span>

                      {r100 > 0 && (
                        <button
                          type="button"
                          onClick={() => setProdAdminPrivateDeduction(r100)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
                        >
                          ⚡ Restar {formatCurrency(r100, settings.currency)} ➔ Queda en {formatCurrency(baseToRound - r100, settings.currency)} cerrado
                        </button>
                      )}

                      {r50 > 0 && r50 !== r100 && (
                        <button
                          type="button"
                          onClick={() => setProdAdminPrivateDeduction(r50)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 transition-colors"
                        >
                          Redondear a $50 (-{formatCurrency(r50, settings.currency)})
                        </button>
                      )}

                      {cents > 0 && (
                        <button
                          type="button"
                          onClick={() => setProdAdminPrivateDeduction(cents)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 transition-colors"
                        >
                          Quitar centavos (-{formatCurrency(cents, settings.currency)})
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div className="pt-1">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0 (o escribe el monto a restar, ej. 75)"
                      value={prodAdminPrivateDeduction === 0 ? '' : prodAdminPrivateDeduction}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        setProdAdminPrivateDeduction(clean === '' ? 0 : parseFloat(clean) || 0);
                      }}
                      className="w-full pl-8 pr-24 py-2 text-xs font-bold font-mono rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      {settings.currency}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProdAdminPrivateDeduction(0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-neutral-400 hover:text-purple-600 px-1.5 py-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      Dejar en $0
                    </button>
                  </div>
                </div>
              </div>

              {/* LIVE SIMULATED BREAKDOWN PREVIEW */}
              <div className="p-3.5 rounded-xl bg-pink-100/60 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600 dark:text-neutral-300">Costo Base de Producción:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(modalBreakdown.totalProductionCost, settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300">Ganancia calculada ({prodMargin}%):</span>
                  <span className="font-mono font-bold text-emerald-600">
                    +{formatCurrency(modalBreakdown.profitAmount, settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600 dark:text-neutral-300">Precio Base Sugerido:</span>
                  <span className={`font-mono font-bold ${modalBreakdown.hasDiscount || modalBreakdown.hasAdminDeduction ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                    {formatCurrency(modalBreakdown.suggestedRetailPrice, settings.currency)}
                  </span>
                </div>

                {modalBreakdown.hasDiscount && (
                  <div className="flex justify-between items-center text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Descuento al Cliente ({prodDiscountType === 'percentage' ? `${prodDiscountValue}%` : 'Monto fijo'}):</span>
                    </span>
                    <span className="font-mono">
                      -{formatCurrency(modalBreakdown.discountAmount, settings.currency)}
                    </span>
                  </div>
                )}

                {modalBreakdown.hasAdminDeduction && (
                  <div className="flex justify-between items-center text-xs text-purple-700 dark:text-purple-300 font-bold bg-purple-100/40 dark:bg-purple-950/40 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-800/60">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-purple-600" />
                      <span>Resta aplicada para número cerrado:</span>
                    </span>
                    <span className="font-mono font-extrabold">
                      -{formatCurrency(modalBreakdown.adminPrivateDeduction, settings.currency)}
                    </span>
                  </div>
                )}

                {/* Precio Total Final del Producto (Número Cerrado) */}
                <div className="pt-2 border-t border-pink-200 dark:border-pink-800 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                      <span>Total Final del Producto:</span>
                      {modalBreakdown.hasAdminDeduction && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Número Cerrado
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      {modalBreakdown.hasAdminDeduction
                        ? 'La resta impactó el total. Este es el precio que se cobra y figura en el catálogo.'
                        : 'Precio final publicado en el catálogo público'}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-pink-600 dark:text-pink-400 font-mono tabular-nums">
                    {formatCurrency(modalBreakdown.finalPrice, settings.currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeInCatalog"
                  checked={prodActiveCatalog}
                  onChange={(e) => setProdActiveCatalog(e.target.checked)}
                  className="rounded text-pink-600 focus:ring-pink-400"
                />
                <label htmlFor="activeInCatalog" className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Mostrar este producto visible en el Catálogo Público
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 sm:px-4 py-2 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-300"
                >
                  Cancelar
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      const duplicated = duplicateProduct(editingProduct.id);
                      setIsProductModalOpen(false);
                      if (duplicated) {
                        setTimeout(() => openProductModal(duplicated), 150);
                      }
                    }}
                    className="px-3 sm:px-4 py-2 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    title="Crear una copia exacta de este producto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicar</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-pink-600 text-white rounded-xl shadow-sm hover:bg-pink-700 transition-colors"
                >
                  Guardar Producto & Precio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GESTOR DE CATEGORÍAS Y SUBCATEGORÍAS */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-xl w-full border border-pink-200 dark:border-neutral-800 shadow-2xl p-4 sm:p-5 my-2 sm:my-6 max-h-[94vh] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/40 text-pink-600 rounded-xl">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Gestor de Categorías & Subcategorías
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Crea y organiza las categorías y subcategorías para el catálogo y la calculadora.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setSelectedCatForNewSub('');
                  setNewCatNameInput('');
                  setNewSubcatNameInput('');
                }}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Crear nueva categoría */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCatNameInput.trim()) return;
                addCategory(newCatNameInput.trim());
                setNewCatNameInput('');
              }}
              className="p-3 bg-pink-50/70 dark:bg-pink-950/20 rounded-xl border border-pink-100 dark:border-pink-900/40 space-y-2"
            >
              <label className="text-xs font-bold text-pink-900 dark:text-pink-300 block">
                + Crear Nueva Categoría Principal
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatNameInput}
                  onChange={(e) => setNewCatNameInput(e.target.value)}
                  placeholder="Nombre de la nueva categoría (ej. Papelería, Souvenirs)..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-pink-500"
                />
                <button
                  type="submit"
                  disabled={!newCatNameInput.trim()}
                  className="px-4 py-2 text-xs font-bold bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-40 transition-colors shadow-sm"
                >
                  Crear Categoría
                </button>
              </div>
            </form>

            {/* Lista de categorías */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {appCategories.length === 0 ? (
                <p className="text-xs text-neutral-400 italic text-center py-6">
                  No hay categorías configuradas aún.
                </p>
              ) : (
                appCategories.map((cat) => {
                  const prodsCount = products.filter(
                    (p) => p.category.toLowerCase() === cat.name.toLowerCase()
                  ).length;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-pink-600" />
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {cat.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 font-medium">
                            {prodsCount} {prodsCount === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                        {catToDeleteId === cat.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in">
                            <span className="text-[11px] text-rose-600 font-semibold">¿Eliminar?</span>
                            <button
                              type="button"
                              onClick={() => {
                                deleteCategory(cat.id);
                                setCatToDeleteId(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-2xs"
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              onClick={() => setCatToDeleteId(null)}
                              className="px-2 py-0.5 text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCatToDeleteId(cat.id)}
                            className="text-xs text-neutral-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium hidden sm:inline">Eliminar</span>
                          </button>
                        )}
                      </div>

                      {/* Subcategorías */}
                      <div className="pl-6 border-l-2 border-pink-200 dark:border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                            Subcategorías ({cat.subcategories.length})
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          {cat.subcategories.length === 0 ? (
                            <span className="text-[11px] text-neutral-400 italic">
                              Sin subcategorías aún
                            </span>
                          ) : (
                            cat.subcategories.map((sub) => (
                              <span
                                key={sub}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 shadow-xs"
                              >
                                {sub}
                                <button
                                  type="button"
                                  onClick={() => deleteSubcategory(cat.id, sub)}
                                  className="text-neutral-400 hover:text-red-500 rounded p-0.5"
                                  title="Eliminar subcategoría"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Agregar subcategoría a esta categoría */}
                        {selectedCatForNewSub === cat.id ? (
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={newSubcatNameInput}
                              onChange={(e) => setNewSubcatNameInput(e.target.value)}
                              placeholder={`Nueva subcategoría en ${cat.name}...`}
                              autoFocus
                              className="px-2.5 py-1 text-xs rounded-lg border border-pink-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex-1 focus:outline-pink-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newSubcatNameInput.trim()) {
                                    addSubcategory(cat.id, newSubcatNameInput.trim());
                                    setNewSubcatNameInput('');
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newSubcatNameInput.trim()) {
                                  addSubcategory(cat.id, newSubcatNameInput.trim());
                                  setNewSubcatNameInput('');
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 shadow-xs"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCatForNewSub('');
                                setNewSubcatNameInput('');
                              }}
                              className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCatForNewSub(cat.id);
                              setNewSubcatNameInput('');
                            }}
                            className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 pt-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            Agregar subcategoría
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setSelectedCatForNewSub('');
                  setNewCatNameInput('');
                  setNewSubcatNameInput('');
                }}
                className="px-4 py-2 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
