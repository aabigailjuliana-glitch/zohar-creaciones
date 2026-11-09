import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductVariant, CatalogSortOption } from '../types';
import { formatCurrency } from '../utils/pricingCalculator';
import { generateInteractiveCatalogPdf } from '../utils/pdfGenerator';
import {
  Search,
  ShoppingBag,
  Sparkles,
  FileDown,
  Check,
  Send,
  Building2,
  Copy,
  Pencil,
  X,
  RotateCcw,
  Loader2,
  ArrowUpDown,
  LayoutGrid,
  FolderTree,
  Plus,
  Pin,
  Tag,
  BadgePercent,
  Trash2,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
  Palette,
  Maximize2,
  Square,
  Sliders,
  Wand2,
} from 'lucide-react';
import { BrandingImageModal } from './BrandingImageModal';
import { ProductDetailModal } from './ProductDetailModal';
import { compressImage } from '../utils/imageCompressor';
import { ZoharLogo } from './ZoharLogo';

interface CatalogCustomerViewProps {
  onOpenCart: () => void;
}

export const CatalogCustomerView: React.FC<CatalogCustomerViewProps> = ({ onOpenCart }) => {
  const {
    products,
    categories: appCategories,
    addCategory,
    updateCategory,
    addSubcategory,
    updateSubcategory,
    deleteCategory,
    deleteSubcategory,
    settings,
    updateSettings,
    isAdminUnlocked,
    addToCart,
    cart,
    getProductBreakdown,
    addToast,
    duplicateProduct,
    deleteProduct,
    setActiveView,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('todas');
  const [copiedBankAlias, setCopiedBankAlias] = useState(false);

  // Sorting and Grouping
  const [sortBy, setSortBy] = useState<CatalogSortOption>(settings.catalogDefaultSort || 'recientes');
  const [isGroupedView, setIsGroupedView] = useState<boolean>(settings.catalogGroupByCategory || false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // UNIFIED CATEGORY & SUBCATEGORY MANAGEMENT STATE (1 solo botón, 1 solo modal)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [catToDeleteId, setCatToDeleteId] = useState<string | null>(null);

  // Subcategory management state
  const [activeCatForNewSub, setActiveCatForNewSub] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [editingSubcat, setEditingSubcat] = useState<{ catId: string; oldName: string } | null>(null);
  const [editingSubcatName, setEditingSubcatName] = useState('');

  // Quick edit modal state for Catalog Banner & Brand Logo
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [draftTitle, setDraftTitle] = useState(settings.catalogTitle || 'Descubre nuestra colección de papelería artesanal');
  const [draftTagline, setDraftTagline] = useState(settings.catalogTagline || 'Catálogo Online');
  const [draftDescription, setDraftDescription] = useState(
    settings.catalogDescription ||
      'Planners, tazas personalizadas, stickers y kits de regalo hechos a mano con detalles brillantes. Arma tu pedido con retiro en taller, envío a domicilio (con costo adicional) o envíos por Correo Argentino a todo el país que también puedes abonar vía WhatsApp.'
  );
  const [draftLogoUrl, setDraftLogoUrl] = useState(settings.businessLogoUrl || '');
  const [draftLogoFit, setDraftLogoFit] = useState<'contain' | 'cover'>(settings.businessLogoFit || 'contain');
  const [draftLogoBg, setDraftLogoBg] = useState<'transparent' | 'white' | 'dark' | 'glass'>(
    settings.businessLogoBg || 'glass'
  );

  // Branding & Image Generator Modal State
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [draftCoverUrl, setDraftCoverUrl] = useState(settings.catalogCoverUrl || settings.businessLogoUrl || '');
  const [draftCoverFit, setDraftCoverFit] = useState<'cover' | 'contain'>(settings.catalogCoverFit || 'cover');
  const [draftHeaderLayout, setDraftHeaderLayout] = useState<'square_logo' | 'horizontal_cover'>(
    settings.catalogHeaderLayout || 'square_logo'
  );

  const handleOpenEditBanner = () => {
    setDraftTitle(settings.catalogTitle || settings.businessName || 'Descubre nuestra colección de papelería artesanal');
    setDraftTagline(settings.catalogTagline || 'Catálogo Online');
    setDraftDescription(
      settings.catalogDescription ||
        'Planners, tazas personalizadas, stickers y kits de regalo hechos a mano con detalles brillantes. Arma tu pedido con retiro en taller, envío a domicilio (con costo adicional) o envíos por Correo Argentino a todo el país que también puedes abonar vía WhatsApp.'
    );
    setDraftLogoUrl(settings.businessLogoUrl || '');
    setDraftLogoFit(settings.businessLogoFit || 'contain');
    setDraftLogoBg(settings.businessLogoBg || 'glass');
    setDraftCoverUrl(settings.catalogCoverUrl || settings.businessLogoUrl || '');
    setDraftCoverFit(settings.catalogCoverFit || 'cover');
    setDraftHeaderLayout(settings.catalogHeaderLayout || 'square_logo');
    setIsEditingBanner(true);
  };

  const handleLogoFileUploadInBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Archivo no compatible', 'Por favor selecciona un archivo de imagen (PNG, JPG, SVG, WEBP).', 'warning');
      return;
    }

    try {
      addToast('Optimizando logo...', 'Comprimiendo imagen para sincronizar en todos los dispositivos...', 'info');
      const compressed = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.78,
        preferredMimeType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      });
      setDraftLogoUrl(compressed);
      addToast('Logo optimizado ✨', 'Vista previa actualizada. Guarda los cambios para aplicarlo a todos los dispositivos.', 'success');
    } catch (err) {
      console.error('Error compressing logo:', err);
      addToast('Error', 'No se pudo optimizar la imagen seleccionada.', 'error');
    }
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const newTitle = draftTitle.trim() || 'Descubre nuestra colección de papelería artesanal';
    updateSettings({
      catalogTitle: newTitle,
      businessName: newTitle,
      catalogTagline: draftTagline.trim() || 'Catálogo Online',
      catalogDescription: draftDescription.trim(),
      businessLogoUrl: draftLogoUrl,
      businessLogoFit: draftLogoFit,
      businessLogoBg: draftLogoBg,
      catalogCoverUrl: draftCoverUrl,
      catalogCoverFit: draftCoverFit,
      catalogHeaderLayout: draftHeaderLayout,
    });
    setIsEditingBanner(false);
  };

  const handleResetBannerDefault = () => {
    const defaultTitle = 'Descubre nuestra colección de papelería artesanal';
    const defaultTagline = 'Catálogo Online';
    const defaultDesc =
      'Planners, tazas personalizadas, stickers y kits de regalo hechos a mano con detalles brillantes. Arma tu pedido con retiro en taller, envío a domicilio (con costo adicional) o envíos por Correo Argentino a todo el país que también puedes abonar vía WhatsApp.';
    setDraftTitle(defaultTitle);
    setDraftTagline(defaultTagline);
    setDraftDescription(defaultDesc);
    setDraftLogoUrl('');
    updateSettings({
      catalogTitle: defaultTitle,
      businessName: defaultTitle,
      catalogTagline: defaultTagline,
      catalogDescription: defaultDesc,
    });
    setIsEditingBanner(false);
  };

  // Filter only active catalog products
  const catalogProducts = useMemo(() => {
    return products.filter((p) => p.activeInCatalog);
  }, [products]);

  // Combined categories list (from registered categories + product categories)
  const categoryNames = useMemo(() => {
    const set = new Set<string>();
    appCategories.forEach((c) => {
      if (c.name && c.name.trim()) set.add(c.name.trim());
    });
    catalogProducts.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return ['todos', ...Array.from(set)];
  }, [appCategories, catalogProducts]);

  // Available subcategories depending on the selected category
  const availableSubcategories = useMemo(() => {
    const set = new Set<string>();
    if (selectedCategory === 'todos') {
      catalogProducts.forEach((p) => {
        if (p.subcategory) set.add(p.subcategory);
      });
      appCategories.forEach((c) => {
        c.subcategories.forEach((s) => set.add(s));
      });
    } else {
      const matchCatDef = appCategories.find(
        (c) => c.name.toLowerCase() === selectedCategory.toLowerCase()
      );
      if (matchCatDef) {
        matchCatDef.subcategories.forEach((s) => set.add(s));
      }
      catalogProducts
        .filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase())
        .forEach((p) => {
          if (p.subcategory) set.add(p.subcategory);
        });
    }
    return Array.from(set);
  }, [selectedCategory, catalogProducts, appCategories]);

  // Sorting function
  const sortProducts = (list: Product[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'alfabetico_asc') {
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      }
      if (sortBy === 'alfabetico_desc') {
        return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
      }
      if (sortBy === 'precio_menor') {
        return getProductBreakdown(a).effectivePrice - getProductBreakdown(b).effectivePrice;
      }
      if (sortBy === 'precio_mayor') {
        return getProductBreakdown(b).effectivePrice - getProductBreakdown(a).effectivePrice;
      }
      // 'recientes': agregado recientemente
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  };

  // Filtered and Sorted products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = catalogProducts.filter((p) => {
      const matchCat = selectedCategory === 'todos' || p.category === selectedCategory;
      const matchSubcat = selectedSubcategory === 'todas' || p.subcategory === selectedSubcategory;
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSubcat && matchQuery;
    });
    return sortProducts(filtered);
  }, [catalogProducts, selectedCategory, selectedSubcategory, searchQuery, sortBy]);

  // Grouped products by Category for the Grouped View
  const groupedCategorySections = useMemo(() => {
    const map = new Map<string, Product[]>();
    filteredAndSortedProducts.forEach((p) => {
      const cat = p.category || 'Otros Productos';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });

    return Array.from(map.entries()).map(([catName, prods]) => {
      const subs = Array.from(new Set(prods.map((p) => p.subcategory).filter(Boolean) as string[]));
      return {
        categoryName: catName,
        products: prods,
        subcategories: subs,
      };
    });
  }, [filteredAndSortedProducts]);

  const handleCopyAlias = () => {
    navigator.clipboard.writeText(settings.bankAlias);
    setCopiedBankAlias(true);
    addToast('Alias copiado ✨', `${settings.bankAlias} copiado para transferir.`, 'success');
    setTimeout(() => setCopiedBankAlias(false), 2500);
  };

  const handleDirectWhatsAppBuy = (product: Product, quantity: number = 1, selectedVariant?: ProductVariant) => {
    const breakdown = getProductBreakdown(product);
    const cleanPhone = settings.ownerPhone.replace(/\D/g, '');
    const storeTitle = settings.catalogTitle?.trim() || settings.businessName || 'Sparkle';
    const effectiveUnitPrice = selectedVariant ? selectedVariant.price : breakdown.finalPrice;
    const subtotal = effectiveUnitPrice * quantity;
    const variantLine = selectedVariant ? `\nVariación elegida: *${selectedVariant.name}*` : '';
    const message = encodeURIComponent(
      `¡Hola ${storeTitle}! ✨ Quiero comprar el producto: *${product.name}*${
        product.subcategory ? ` (${product.subcategory})` : ''
      }${variantLine}\nCantidad: ${quantity}\nPrecio unitario: ${formatCurrency(
        effectiveUnitPrice,
        settings.currency
      )}\nTotal: ${formatCurrency(
        subtotal,
        settings.currency
      )}\n¿Tienen disponibilidad?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdfCatalog = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    addToast('Preparando catálogo...', 'Cargando fotos de productos y armando el PDF...', 'info');
    try {
      await generateInteractiveCatalogPdf(filteredAndSortedProducts, settings, getProductBreakdown);
      addToast('Catálogo descargado ✨', 'Se descargó el catálogo en PDF con fotos y enlaces a WhatsApp.', 'success');
    } catch (err) {
      console.error('Error al generar PDF de catálogo:', err);
      addToast('Error al descargar', 'No se pudo generar el archivo PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveDefaultSort = () => {
    updateSettings({ catalogDefaultSort: sortBy });
  };

  const handleToggleGroupedView = (grouped: boolean) => {
    setIsGroupedView(grouped);
    if (isAdminUnlocked) {
      updateSettings({ catalogGroupByCategory: grouped });
    }
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setSelectedCategory(newCatName.trim());
    setNewCatName('');
  };

  const handleSaveEditCategory = (catId: string) => {
    if (!editingCatName.trim()) return;
    updateCategory(catId, editingCatName.trim());
    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleConfirmDeleteCategory = (catId: string) => {
    const cat = appCategories.find((c) => c.id === catId);
    deleteCategory(catId);
    if (cat && selectedCategory === cat.name) {
      setSelectedCategory('todos');
    }
    setCatToDeleteId(null);
  };

  const handleAddSubcategorySubmit = (catId: string) => {
    if (!newSubcatName.trim()) return;
    addSubcategory(catId, newSubcatName.trim());
    setSelectedSubcategory(newSubcatName.trim());
    setNewSubcatName('');
    setActiveCatForNewSub(null);
  };

  const handleSaveEditSubcategory = (catId: string, oldName: string) => {
    if (!editingSubcatName.trim()) return;
    updateSubcategory(catId, oldName, editingSubcatName.trim());
    if (selectedSubcategory === oldName) {
      setSelectedSubcategory(editingSubcatName.trim());
    }
    setEditingSubcat(null);
    setEditingSubcatName('');
  };

  const handleDeleteSubcategory = (catId: string, subName: string) => {
    deleteSubcategory(catId, subName);
    if (selectedSubcategory === subName) {
      setSelectedSubcategory('todas');
    }
  };

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      {/* SECCIÓN DE BRANDING EN LA PARTE SUPERIOR (EXCLUSIVA MODO ADMINISTRADOR) */}
      {isAdminUnlocked && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-200 dark:border-pink-900/60 shadow-2xs space-y-2.5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-100 dark:bg-pink-950/80 text-pink-600 flex items-center justify-center shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#c9206c] dark:text-[#f472b6]">
                  Panel de Imagen & Portada del Catálogo (Solo Administrador):
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Elige si prefieres imagen cuadrada (logo) o portada horizontal ubicada arriba de los textos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Selector de formato: Cuadrada vs Portada Horizontal */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => updateSettings({ catalogHeaderLayout: 'square_logo' })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    (settings.catalogHeaderLayout || 'square_logo') === 'square_logo'
                      ? 'bg-white dark:bg-neutral-800 text-pink-600 dark:text-pink-400 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                  title="Mostrar imagen cuadrada (logo o isotipo)"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Imagen Cuadrada</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateSettings({ catalogHeaderLayout: 'horizontal_cover' })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    settings.catalogHeaderLayout === 'horizontal_cover'
                      ? 'bg-white dark:bg-neutral-800 text-pink-600 dark:text-pink-400 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                  title="Mostrar portada horizontal arriba de todo el texto"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Portada Horizontal</span>
                </button>
              </div>

              {/* Botón para abrir la herramienta de branding */}
              <button
                type="button"
                onClick={() => setIsBrandingModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 hover:scale-102"
                title="Cargar imagen desde tu dispositivo o usar el generador de imágenes (Admin)"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Configurar Imagen / Generador</span>
              </button>
            </div>
          </div>

          {/* Notificación amigable solo para el administrador si todavía no hay imagen */}
          {!settings.businessLogoUrl && !settings.catalogCoverUrl && (
            <div className="p-3 rounded-xl bg-pink-50/70 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-600 shrink-0" />
                <span className="text-pink-800 dark:text-pink-300">
                  <strong>Configura la imagen de tu emprendimiento:</strong> Puedes subir una desde tu dispositivo o diseñarla
                  fácilmente con nuestra herramienta integrada de diseño e IA.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandingModalOpen(true)}
                className="px-3 py-1 text-[11px] font-bold bg-pink-600 text-white rounded-lg shadow-2xs hover:bg-pink-700 shrink-0"
              >
                Abrir Herramienta
              </button>
            </div>
          )}
        </div>
      )}

      {/* RENDERIZADO DEL ENCABEZADO DE BIENVENIDA SEGÚN FORMATO ELEGIDO */}
      {settings.catalogHeaderLayout === 'horizontal_cover' ? (
        /* FORMATO 1: PORTADA HORIZONTAL ARRIBA + TODO EL TEXTO ABAJO */
        <div className="rounded-3xl border border-pink-200/80 dark:border-pink-900/40 bg-white dark:bg-[#18141D] shadow-sm overflow-hidden space-y-0">
          {/* IMAGEN DE PORTADA HORIZONTAL (ARRIBA DE TODO LO QUE SEA TEXTO) */}
          {(settings.catalogCoverUrl || settings.businessLogoUrl) ? (
            <div className="relative w-full h-44 sm:h-56 md:h-64 lg:h-72 overflow-hidden bg-neutral-100 dark:bg-neutral-900 group">
              <img
                src={settings.catalogCoverUrl || settings.businessLogoUrl}
                alt={settings.businessName || 'Portada del Catálogo'}
                className={`w-full h-full ${
                  settings.catalogCoverFit === 'contain' ? 'object-contain' : 'object-cover'
                } transition-transform duration-700 group-hover:scale-102`}
              />
              {/* Botones de edición exclusivos del administrador sobre la portada */}
              {isAdminUnlocked && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBrandingModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold border border-white/20 shadow-md flex items-center gap-1.5 transition-all hover:scale-102"
                    title="Cambiar la imagen de portada o el formato (Modo Administrador)"
                  >
                    <Palette className="w-3.5 h-3.5 text-pink-300" />
                    <span>Cambiar Portada (Admin)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenEditBanner}
                    className="px-3 py-1.5 rounded-xl bg-pink-600/90 hover:bg-pink-600 backdrop-blur-xs text-white text-[11px] font-bold border border-pink-400/40 shadow-md flex items-center gap-1.5 transition-all hover:scale-102"
                    title="Editar textos del catálogo"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar Textos (Admin)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Solo si es Administrador y no tiene portada aún, mostrar el botón para cargarla */
            isAdminUnlocked && (
              <div className="w-full h-36 sm:h-44 bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 dark:from-pink-950/40 dark:via-neutral-900 dark:to-neutral-900 border-b border-dashed border-pink-300 dark:border-pink-800 flex items-center justify-center p-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsBrandingModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-white dark:bg-neutral-800 border border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xs"
                >
                  <Camera className="w-4 h-4 text-pink-600" />
                  <span>+ Cargar o Diseñar Portada Horizontal (Modo Administrador)</span>
                </button>
              </div>
            )
          )}

          {/* SECCIÓN DE TEXTOS Y DATOS (ABAJO DE LA PORTADA, 100% LIMPIA Y LEGIBLE) */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-pink-50/70 via-rose-50/30 to-white dark:from-pink-950/20 dark:via-neutral-900 dark:to-neutral-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t border-pink-100/60 dark:border-neutral-800/80">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-neutral-800 border border-pink-200 dark:border-pink-800 text-xs font-semibold text-pink-700 dark:text-pink-300 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>{settings.catalogTagline || 'Catálogo Online'}</span>
                </div>

                {isAdminUnlocked && (
                  <button
                    onClick={handleOpenEditBanner}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-semibold text-[11px] shadow-2xs transition-all hover:scale-102"
                    title="Modificar nombre y textos de la portada (Admin)"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Editar Textos (Admin)</span>
                  </button>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight text-balance">
                {settings.catalogTitle || settings.businessName || 'Descubre nuestra colección de papelería artesanal'}
              </h1>

              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
                {settings.catalogDescription ||
                  'Planners, tazas personalizadas, stickers y kits de regalo hechos a mano con detalles brillantes. Arma tu pedido con retiro en taller, envío a domicilio (con costo adicional) o envíos por Correo Argentino a todo el país que también puedes abonar vía WhatsApp.'}
              </p>

              {/* Quick Bank Details Banner for Buyers */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Transferencias:</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 border border-pink-200 dark:border-neutral-700 font-mono font-medium text-pink-700 dark:text-pink-300">
                  <Building2 className="w-3.5 h-3.5 text-pink-500" />
                  <span>Alias: {settings.bankAlias}</span>
                  <button
                    onClick={handleCopyAlias}
                    className="ml-1 p-0.5 hover:text-pink-900 dark:hover:text-white"
                    title="Copiar alias"
                  >
                    {copiedBankAlias ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={handleDownloadPdfCatalog}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-pink-600 hover:bg-pink-700 disabled:opacity-75 text-white font-medium text-xs shadow-2xs transition-colors"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar Catálogo en PDF'}</span>
                </button>
              </div>
            </div>

            {/* Floating Cart Pill on Bottom-Right */}
            <div className="mt-2 md:mt-0 shrink-0">
              <button
                onClick={onOpenCart}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Ver Mi Carrito ({totalCartCount})</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* FORMATO 2: IMAGEN CUADRADA (LOGO AL LADO DEL TEXTO) */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-100 via-rose-50 to-pink-50 dark:from-pink-950/40 dark:via-neutral-900 dark:to-neutral-900 border border-pink-200/80 dark:border-pink-900/40 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 max-w-3xl">
              {/* Logo del Emprendimiento (Con o Sin Fondo) */}
              {settings.businessLogoUrl ? (
                <div
                  className={`shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl shadow-sm border border-pink-200/80 dark:border-pink-800/60 p-2 flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-103 group ${
                    settings.businessLogoBg === 'white'
                      ? 'bg-white'
                      : settings.businessLogoBg === 'dark'
                      ? 'bg-neutral-900'
                      : settings.businessLogoBg === 'transparent'
                      ? 'bg-transparent'
                      : 'bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xs'
                  }`}
                  title={settings.businessName || 'Logo del Emprendimiento'}
                >
                  <img
                    src={settings.businessLogoUrl}
                    alt={settings.businessName || 'Logo Emprendimiento'}
                    className={`w-full h-full ${
                      settings.businessLogoFit === 'cover' ? 'object-cover' : 'object-contain'
                    } drop-shadow-xs transition-transform duration-300 group-hover:scale-105`}
                  />
                </div>
              ) : (
                <div
                  onClick={() => isAdminUnlocked && setIsBrandingModalOpen(true)}
                  className={`shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl shadow-sm border border-pink-200/80 dark:border-pink-800/60 p-2 flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-103 group bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs ${
                    isAdminUnlocked ? 'cursor-pointer' : ''
                  }`}
                  title={settings.businessName || 'ZOHAR'}
                >
                  <ZoharLogo className="w-full h-full" showBadge={false} />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-neutral-800/80 border border-pink-200 dark:border-pink-800 text-xs font-semibold text-pink-700 dark:text-pink-300 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>{settings.catalogTagline || 'Catálogo Online'}</span>
                  </div>

                  {/* Acciones de modificación exclusivas del Administrador */}
                  {isAdminUnlocked && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsBrandingModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-100 hover:bg-pink-200 dark:bg-pink-950 dark:hover:bg-pink-900 text-pink-700 dark:text-pink-300 font-semibold text-[11px] shadow-2xs transition-all hover:scale-102"
                        title="Configurar logo o portada (Modo Administrador)"
                      >
                        <Palette className="w-3 h-3 text-pink-600" />
                        <span>Branding & Logo (Admin)</span>
                      </button>

                      <button
                        onClick={handleOpenEditBanner}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-semibold text-[11px] shadow-2xs transition-all hover:scale-102"
                        title="Modificar nombre y textos de la portada (Admin)"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar Textos (Admin)</span>
                      </button>
                    </>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight text-balance">
                  {settings.catalogTitle || 'Descubre nuestra colección de papelería artesanal'}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl">
                  {settings.catalogDescription ||
                    'Planners, tazas personalizadas, stickers y kits de regalo hechos a mano con detalles brillantes. Arma tu pedido con retiro en taller, envío a domicilio (con costo adicional) o envíos por Correo Argentino a todo el país que también puedes abonar vía WhatsApp.'}
                </p>

                {/* Quick Bank Details Banner for Buyers */}
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">Transferencias:</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 border border-pink-200 dark:border-neutral-700 font-mono font-medium text-pink-700 dark:text-pink-300">
                    <Building2 className="w-3.5 h-3.5 text-pink-500" />
                    <span>Alias: {settings.bankAlias}</span>
                    <button
                      onClick={handleCopyAlias}
                      className="ml-1 p-0.5 hover:text-pink-900 dark:hover:text-white"
                      title="Copiar alias"
                    >
                      {copiedBankAlias ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleDownloadPdfCatalog}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-pink-600 hover:bg-pink-700 disabled:opacity-75 text-white font-medium text-xs shadow-2xs transition-colors"
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar Catálogo en PDF'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Cart Pill on Bottom-Right */}
            <div className="mt-2 md:mt-0 shrink-0">
              <button
                onClick={onOpenCart}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Ver Mi Carrito ({totalCartCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal to Edit Catalog Header Text & Brand Logo */}
      {isEditingBanner && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-hidden">
          <div className="bg-white dark:bg-[#18141D] rounded-t-3xl sm:rounded-2xl max-w-xl w-full border border-pink-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-pink-100 dark:border-neutral-800 flex items-center justify-between bg-pink-50/60 dark:bg-pink-950/20 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  Modificar Portada, Textos y Logo del Emprendimiento
                </h3>
              </div>
              <button
                onClick={() => setIsEditingBanner(false)}
                className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Generator link */}
            <div className="px-5 py-2.5 bg-gradient-to-r from-pink-100/70 via-rose-100/50 to-pink-50 dark:from-pink-950/40 dark:via-neutral-900 dark:to-neutral-900 border-b border-pink-200 dark:border-pink-900/40 flex items-center justify-between shrink-0">
              <span className="text-xs text-pink-900 dark:text-pink-300 font-semibold flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-pink-600" />
                <span>¿Deseas generar o crear una imagen con IA o el diseñador?</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditingBanner(false);
                  setIsBrandingModalOpen(true);
                }}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-pink-600 hover:bg-pink-700 text-white shadow-2xs transition-all hover:scale-102"
              >
                Abrir Herramienta
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
              <form id="edit-banner-form" onSubmit={handleSaveBanner} className="space-y-4">
              {/* Formato de Imagen: Cuadrada o Portada Horizontal */}
              <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-neutral-900/50 border border-pink-200 dark:border-neutral-800 space-y-2">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-pink-500" />
                  <span>Formato de imagen en el catálogo:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftHeaderLayout('square_logo')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      draftHeaderLayout === 'square_logo'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Imagen Cuadrada (Logo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftHeaderLayout('horizontal_cover')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      draftHeaderLayout === 'horizontal_cover'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Portada Horizontal</span>
                  </button>
                </div>
              </div>

              {/* Sección Logo en Portada */}
              <div className="p-4 rounded-xl bg-pink-50/50 dark:bg-neutral-900/50 border border-pink-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-pink-600" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {draftHeaderLayout === 'horizontal_cover'
                        ? 'Imagen de Portada o Logo'
                        : 'Logo del Emprendimiento (Con o Sin Fondo)'}
                    </span>
                  </div>
                  {draftLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setDraftLogoUrl('')}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Quitar logo
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <div
                    className={`shrink-0 w-24 h-24 rounded-2xl border border-pink-200 dark:border-neutral-700 p-1.5 flex items-center justify-center overflow-hidden ${
                      draftLogoBg === 'white'
                        ? 'bg-white'
                        : draftLogoBg === 'dark'
                        ? 'bg-neutral-900'
                        : draftLogoBg === 'transparent'
                        ? 'bg-transparent'
                        : 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xs'
                    }`}
                  >
                    {draftLogoUrl ? (
                      <img
                        src={draftLogoUrl}
                        alt="Vista previa logo"
                        className={`w-full h-full ${
                          draftLogoFit === 'cover' ? 'object-cover' : 'object-contain'
                        }`}
                      />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mx-auto" />
                        <span className="text-[9px] text-neutral-400 block mt-1">Sin logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-2xs transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Subir Imagen (PNG/JPG/SVG)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleLogoFileUploadInBanner}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="url"
                      value={draftLogoUrl}
                      onChange={(e) => setDraftLogoUrl(e.target.value)}
                      placeholder="O pegar URL directa de la imagen..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    />

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="font-semibold text-neutral-600 dark:text-neutral-400 block mb-0.5">
                          Ajuste:
                        </span>
                        <div className="grid grid-cols-2 gap-1 bg-white dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                          <button
                            type="button"
                            onClick={() => setDraftLogoFit('contain')}
                            className={`py-1 rounded font-semibold text-[10px] ${
                              draftLogoFit === 'contain'
                                ? 'bg-pink-600 text-white'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            Completo
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftLogoFit('cover')}
                            className={`py-1 rounded font-semibold text-[10px] ${
                              draftLogoFit === 'cover'
                                ? 'bg-pink-600 text-white'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            Cubrir
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="font-semibold text-neutral-600 dark:text-neutral-400 block mb-0.5">
                          Fondo:
                        </span>
                        <div className="grid grid-cols-3 gap-0.5 bg-white dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                          <button
                            type="button"
                            onClick={() => setDraftLogoBg('glass')}
                            className={`py-1 rounded font-semibold text-[9px] ${
                              draftLogoBg === 'glass'
                                ? 'bg-pink-600 text-white'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            Cristal
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftLogoBg('white')}
                            className={`py-1 rounded font-semibold text-[9px] ${
                              draftLogoBg === 'white'
                                ? 'bg-pink-600 text-white'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            Blanco
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftLogoBg('transparent')}
                            className={`py-1 rounded font-semibold text-[9px] ${
                              draftLogoBg === 'transparent'
                                ? 'bg-pink-600 text-white'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            Transp.
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Etiqueta / Subtítulo pequeño
                </label>
                <input
                  type="text"
                  value={draftTagline}
                  onChange={(e) => setDraftTagline(e.target.value)}
                  placeholder="ej. Catálogo Online"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Nombre / Título Principal del Catálogo *
                </label>
                <input
                  type="text"
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="ej. Descubre nuestra colección de papelería artesanal"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Descripción del Catálogo, Productos y Envíos *
                </label>
                <textarea
                  rows={4}
                  required
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="Describe tus productos, condiciones de envío, pedidos personalizados..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed"
                />
              </div>

              </form>
            </div>

            <div className="px-5 py-3.5 border-t border-pink-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#16121b] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetBannerDefault}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar original</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBanner(false)}
                  className="px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="edit-banner-form"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-xs transition-all active:scale-98"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GESTOR UNIFICADO DE CATEGORÍAS & SUBCATEGORÍAS (1 SOLO MODAL, 1 SOLO LUGAR) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-hidden">
          <div className="bg-white dark:bg-[#18141D] rounded-t-3xl sm:rounded-2xl max-w-xl w-full border border-pink-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-pink-100 dark:border-neutral-800 flex items-center justify-between bg-pink-50/60 dark:bg-pink-950/20 shrink-0">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-pink-600" />
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Gestor de Categorías & Subcategorías
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Crea, renombra/edita y elimina categorías y subcategorías en un solo lugar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                  setEditingSubcat(null);
                  setActiveCatForNewSub(null);
                  setCatToDeleteId(null);
                }}
                className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain">
              {/* Formulario 1: Crear Nueva Categoría Principal */}
              <form
                onSubmit={handleAddCategorySubmit}
                className="p-3.5 bg-pink-50/70 dark:bg-pink-950/20 rounded-xl border border-pink-200 dark:border-pink-900/40 space-y-2"
              >
                <label className="text-xs font-bold text-pink-900 dark:text-pink-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-pink-600" />
                  <span>Crear Nueva Categoría Principal</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nombre de la nueva categoría (ej. Álbumes, Stickers, Cuadernos)..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  <button
                    type="submit"
                    disabled={!newCatName.trim()}
                    className="px-4 py-2 text-xs font-bold bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white rounded-lg shadow-2xs transition-colors shrink-0"
                  >
                    + Agregar
                  </button>
                </div>
              </form>

              {/* Lista de Categorías Existentes con Edición y Subcategorías */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Categorías Registradas ({appCategories.length})
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    💡 Edita el nombre o agrega subcategorías directamente
                  </span>
                </div>

                {appCategories.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic text-center py-6 border border-dashed border-pink-200 dark:border-neutral-800 rounded-xl">
                    No hay categorías registradas aún. Crea la primera arriba.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {appCategories.map((cat) => {
                      const count = products.filter(
                        (p) => p.category && p.category.toLowerCase() === cat.name.toLowerCase()
                      ).length;
                      const isEditingThisCat = editingCatId === cat.id;
                      const isDeletingThisCat = catToDeleteId === cat.id;
                      const isAddingSubToThis = activeCatForNewSub === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3"
                        >
                          {/* Fila Principal de la Categoría */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            {isEditingThisCat ? (
                              <div className="flex items-center gap-2 flex-1 animate-in fade-in">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingCatName}
                                  onChange={(e) => setEditingCatName(e.target.value)}
                                  className="flex-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-pink-400 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditCategory(cat.id);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCategory(cat.id)}
                                  className="px-2.5 py-1 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-2xs"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCatId(null);
                                    setEditingCatName('');
                                  }}
                                  className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-pink-600" />
                                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                  {cat.name}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 font-medium">
                                  {count} {count === 1 ? 'producto' : 'productos'}
                                </span>
                              </div>
                            )}

                            {/* Botones de acción de la Categoría */}
                            {!isEditingThisCat && (
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCatForNewSub(isAddingSubToThis ? null : cat.id);
                                    setNewSubcatName('');
                                  }}
                                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
                                    isAddingSubToThis
                                      ? 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950 dark:border-pink-800'
                                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-pink-50'
                                  }`}
                                  title="Agregar subcategoría a esta categoría"
                                >
                                  <Plus className="w-3 h-3 text-pink-500" />
                                  <span>+ Subcategoría</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setEditingCatName(cat.name);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-pink-600 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors flex items-center gap-1"
                                  title="Editar nombre de la categoría"
                                >
                                  <Pencil className="w-3 h-3 text-pink-500" />
                                  <span>Editar</span>
                                </button>

                                {isDeletingThisCat ? (
                                  <div className="flex items-center gap-1 animate-in fade-in">
                                    <span className="text-[10px] text-rose-600 font-semibold">¿Eliminar?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmDeleteCategory(cat.id)}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded shadow-2xs"
                                    >
                                      Sí
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCatToDeleteId(null)}
                                      className="px-1.5 py-0.5 text-[10px] text-neutral-500 hover:text-neutral-700"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setCatToDeleteId(cat.id)}
                                    className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                    title="Eliminar categoría"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Sección de Subcategorías de esta Categoría */}
                          <div className="pl-4 sm:pl-5 border-l-2 border-pink-200 dark:border-neutral-800 space-y-2">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {cat.subcategories.length === 0 ? (
                                <span className="text-[11px] text-neutral-400 italic">
                                  Sin subcategorías registradas
                                </span>
                              ) : (
                                cat.subcategories.map((sub) => {
                                  const isEditingThisSub =
                                    editingSubcat?.catId === cat.id && editingSubcat?.oldName === sub;

                                  if (isEditingThisSub) {
                                    return (
                                      <div key={sub} className="inline-flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-lg border border-pink-400">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={editingSubcatName}
                                          onChange={(e) => setEditingSubcatName(e.target.value)}
                                          className="px-1.5 py-0.5 text-xs font-medium bg-transparent text-neutral-900 dark:text-white w-28 focus:outline-none"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleSaveEditSubcategory(cat.id, sub);
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEditSubcategory(cat.id, sub)}
                                          className="p-1 bg-pink-600 text-white rounded hover:bg-pink-700"
                                          title="Guardar cambio"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingSubcat(null)}
                                          className="p-1 text-neutral-400 hover:text-neutral-600"
                                          title="Cancelar"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  }

                                  return (
                                    <span
                                      key={sub}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 shadow-2xs group"
                                    >
                                      <span>{sub}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubcat({ catId: cat.id, oldName: sub });
                                          setEditingSubcatName(sub);
                                        }}
                                        className="p-0.5 text-neutral-400 hover:text-pink-600 transition-colors"
                                        title="Renombrar subcategoría"
                                      >
                                        <Pencil className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSubcategory(cat.id, sub)}
                                        className="p-0.5 text-neutral-400 hover:text-rose-500 transition-colors"
                                        title="Eliminar subcategoría"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  );
                                })
                              )}
                            </div>

                            {/* Formulario Inline para agregar Subcategoría */}
                            {isAddingSubToThis && (
                              <div className="flex items-center gap-1.5 pt-1.5 animate-in fade-in">
                                <input
                                  type="text"
                                  autoFocus
                                  value={newSubcatName}
                                  onChange={(e) => setNewSubcatName(e.target.value)}
                                  placeholder={`Nueva subcategoría en "${cat.name}"...`}
                                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-pink-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddSubcategorySubmit(cat.id);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSubcategorySubmit(cat.id)}
                                  disabled={!newSubcatName.trim()}
                                  className="px-3 py-1 text-xs font-bold bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white rounded-lg shadow-2xs"
                                >
                                  Añadir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCatForNewSub(null);
                                    setNewSubcatName('');
                                  }}
                                  className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-pink-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                  setEditingSubcat(null);
                  setActiveCatForNewSub(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white shadow-xs"
              >
                Cerrar Gestor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Toolbar: Search, Sort Dropdown & Grouping Toggle */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, descripción o subcategoría..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-100 dark:border-neutral-700 bg-pink-50/20 dark:bg-neutral-900/90 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* Sort Selector & Grouping Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <span className="text-neutral-500 hidden sm:inline">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as CatalogSortOption)}
                className="bg-transparent font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="recientes">🕒 Recientes primero</option>
                <option value="alfabetico_asc">🔤 De la A a la Z</option>
                <option value="alfabetico_desc">🔠 De la Z a la A</option>
                <option value="precio_menor">🏷️ Menor precio</option>
                <option value="precio_mayor">💎 Mayor precio</option>
              </select>

              {isAdminUnlocked && (
                <button
                  type="button"
                  onClick={handleSaveDefaultSort}
                  title="Fijar este orden como predeterminado para todos los clientes"
                  className="ml-1 p-1 hover:bg-pink-100 dark:hover:bg-neutral-800 text-pink-600 rounded-md transition-colors"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle: Grouped vs Continuous Grid */}
            <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => handleToggleGroupedView(false)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  !isGroupedView
                    ? 'bg-white dark:bg-neutral-800 text-pink-600 dark:text-pink-400 shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                title="Vista de cuadrícula continua"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleGroupedView(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  isGroupedView
                    ? 'bg-white dark:bg-neutral-800 text-pink-600 dark:text-pink-400 shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                title="Vista agrupada por categorías"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Agrupados</span>
              </button>
            </div>

            {/* Admin Unified Category & Subcategory Manager Button */}
            {isAdminUnlocked && (
              <button
                type="button"
                onClick={() => {
                  setCatToDeleteId(null);
                  setEditingCatId(null);
                  setEditingSubcat(null);
                  setActiveCatForNewSub(null);
                  setIsCategoryModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 dark:bg-pink-950/60 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:scale-102"
                title="Administrar categorías y subcategorías (crear, editar nombres y eliminar en un solo lugar)"
              >
                <FolderTree className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                <span>Categorías & Subcategorías ({appCategories.length})</span>
              </button>
            )}

            {/* Quick PDF download button in toolbar */}
            <button
              type="button"
              onClick={handleDownloadPdfCatalog}
              disabled={isGeneratingPdf}
              className="px-2.5 py-1.5 rounded-xl border border-pink-200 dark:border-pink-800 bg-pink-50/60 dark:bg-pink-950/40 hover:bg-pink-100 text-pink-700 dark:text-pink-300 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Descargar catálogo completo en PDF con fotos y WhatsApp"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-600" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-pink-600" />
              )}
              <span className="hidden sm:inline">{isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</span>
            </button>
          </div>
        </div>

        {/* Primary Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-pink-50 dark:border-neutral-800">
          {categoryNames.map((cat) => {
            const isSelected = selectedCategory === cat;
            const catObj = appCategories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
            return (
              <div key={cat} className="inline-flex items-center shrink-0">
                <button
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubcategory('todas');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-pink-600 text-white shadow-xs scale-102'
                      : 'bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {cat === 'todos' ? '✨ Todos los Productos' : cat}
                </button>
              </div>
            );
          })}
        </div>

        {/* Subcategories Secondary Chips Bar (when available) */}
        {availableSubcategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none border-t border-pink-50 dark:border-neutral-800/60 text-xs">
            <span className="text-[11px] font-bold text-neutral-400 shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3 text-pink-500" />
              <span>Subcategorías:</span>
            </span>

            <button
              onClick={() => setSelectedSubcategory('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedSubcategory === 'todas'
                  ? 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-800'
                  : 'bg-white dark:bg-neutral-900 text-neutral-500 hover:bg-pink-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800'
              }`}
            >
              Todas
            </button>

            {availableSubcategories.map((sub) => {
              const isSelected = selectedSubcategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-800'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  {sub}
                </button>
              );
            })}

            {isAdminUnlocked && (
              <button
                type="button"
                onClick={() => {
                  const catObj = appCategories.find(
                    (c) => c.name.toLowerCase() === selectedCategory.toLowerCase()
                  );
                  setActiveCatForNewSub(catObj ? catObj.id : null);
                  setIsCategoryModalOpen(true);
                }}
                className="px-2 py-0.5 text-[11px] text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-0.5 whitespace-nowrap ml-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Añadir subcategoría</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Product Card Renderer Component */}
      {(() => {
        const renderCard = (product: Product) => {
          const breakdown = getProductBreakdown(product);
          const inCart = cart.find((i) => i.product.id === product.id);
          const hasVariants = Boolean(product.variants && product.variants.length > 0);
          const minVariantPrice = hasVariants ? Math.min(...product.variants!.map((v) => v.price)) : 0;

          return (
            <div
              key={product.id}
              onClick={() => setSelectedProductForDetail(product)}
              className="group flex flex-col bg-white dark:bg-[#18141D] rounded-2xl border border-pink-100 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer relative"
              title="Haz clic para ver las fotos y detalles del producto"
            >
              {/* Image Container with Fallback */}
              <div className="relative aspect-4/3 w-full bg-pink-50 dark:bg-neutral-800 overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />

                {/* Category Pill Tag */}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 max-w-[70%]">
                  <span className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs text-[10px] font-semibold text-pink-700 dark:text-pink-300 border border-pink-100 dark:border-neutral-700 shadow-2xs">
                    {product.category}
                  </span>
                </div>

                {/* Promotional Discount Badge */}
                {breakdown.hasDiscount && (
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs tracking-wider flex items-center gap-0.5">
                      <BadgePercent className="w-3 h-3" />
                      {product.discountType === 'percentage'
                        ? `-${product.discountValue}% OFF`
                        : `-${formatCurrency(product.discountValue || 0, settings.currency)} OFF`}
                    </span>
                  </div>
                )}

                {/* Admin Quick Action Pill (Editar, Duplicar, Borrar) when admin is unlocked */}
                {isAdminUnlocked ? (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-pink-200 dark:border-neutral-700 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveView('calculadora');
                      }}
                      className="p-1 text-neutral-500 hover:text-pink-600 dark:text-neutral-400 dark:hover:text-pink-400 rounded hover:bg-pink-50 dark:hover:bg-neutral-800 transition-colors"
                      title="Editar producto en Calculadora"
                      aria-label="Editar producto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateProduct(product.id);
                      }}
                      className="p-1 text-neutral-500 hover:text-purple-600 dark:text-neutral-400 dark:hover:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-neutral-800 transition-colors"
                      title="Duplicar producto (Copia exacta)"
                      aria-label="Duplicar producto"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProduct(product.id);
                      }}
                      className="p-1 text-neutral-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-neutral-800 transition-colors"
                      title="Borrar producto"
                      aria-label="Borrar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Stock status indicator for customers */
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs text-[10px] font-bold shadow-2xs">
                    {product.isMadeToOrder ? (
                      <span className="text-purple-600 dark:text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        Por encargo
                      </span>
                    ) : product.stock > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {product.stock} disp.
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        Sin Stock
                      </span>
                    )}
                  </div>
                )}

                {/* Multi-image indicator badge if 2 or more photos */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                    <Camera className="w-3 h-3 text-pink-300" />
                    <span>{product.images.length} fotos</span>
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  {/* Tags: Subcategory & Variants */}
                  <div className="flex flex-wrap items-center gap-1">
                    {product.isMadeToOrder && (
                      <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        ✨ Realizado por encargo
                      </span>
                    )}
                    {product.subcategory && (
                      <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 border border-pink-100 dark:border-pink-900/40">
                        🏷️ {product.subcategory}
                      </span>
                    )}
                    {hasVariants && (
                      <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                        ✨ {product.variants!.length} variantes
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-pink-50 dark:border-neutral-800/80 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {hasVariants ? 'Desde:' : breakdown.hasDiscount ? 'Precio oferta:' : 'Precio final:'}
                    </span>
                    <div className="text-right">
                      {!hasVariants && breakdown.hasDiscount && (
                        <span className="text-xs text-neutral-400 line-through mr-1.5 tabular-nums">
                          {formatCurrency(breakdown.effectivePrice, settings.currency)}
                        </span>
                      )}
                      <span className="text-base font-extrabold text-pink-600 dark:text-pink-400 tabular-nums">
                        {formatCurrency(hasVariants ? minVariantPrice : breakdown.finalPrice, settings.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: If Out of Stock (and NOT made to order), show NO option to purchase */}
                  {!product.isMadeToOrder && product.stock <= 0 ? (
                    <div className="w-full py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 font-bold text-xs text-center border border-neutral-200 dark:border-neutral-700 select-none">
                      Agotado • Sin stock disponible
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {hasVariants ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForDetail(product);
                          }}
                          className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Elegir Opción</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                          }}
                          className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            inCart
                              ? 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800'
                              : 'bg-pink-50 dark:bg-neutral-800 hover:bg-pink-100 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-neutral-700'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>
                            {inCart
                              ? `En Carrito (${inCart.quantity})`
                              : product.isMadeToOrder
                              ? 'Pedir Encargo'
                              : 'Al Carrito'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasVariants) {
                            setSelectedProductForDetail(product);
                          } else {
                            handleDirectWhatsAppBuy(product, 1);
                          }
                        }}
                        className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                        title={product.isMadeToOrder ? 'Encargar por WhatsApp' : 'Comprar directo por WhatsApp'}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{product.isMadeToOrder ? 'Encargar' : 'WhatsApp'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        };

        if (filteredAndSortedProducts.length === 0) {
          return (
            <div className="text-center py-16 bg-white dark:bg-neutral-900/60 rounded-2xl border border-pink-100 dark:border-neutral-800 p-8">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No se encontraron productos con ese filtro
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Intenta con otra búsqueda, selecciona otra categoría o restablece los filtros.
              </p>
            </div>
          );
        }

        // VIEW 1: GROUPED BY CATEGORY
        if (isGroupedView) {
          return (
            <div className="space-y-8">
              {groupedCategorySections.map(({ categoryName, products, subcategories }) => (
                <div
                  key={categoryName}
                  className="p-5 rounded-2xl bg-white/70 dark:bg-[#18141D]/70 border border-pink-100 dark:border-neutral-800/80 shadow-xs space-y-4"
                >
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-pink-100 dark:border-neutral-800 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                      <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{categoryName}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300">
                          {products.length} {products.length === 1 ? 'producto' : 'productos'}
                        </span>
                      </h2>
                    </div>

                    {subcategories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-neutral-500">
                        <span className="text-neutral-400">Subcategorías:</span>
                        {subcategories.map((sub) => (
                          <span
                            key={sub}
                            className="px-2 py-0.5 rounded-md bg-pink-50/50 dark:bg-neutral-800 border border-pink-100 dark:border-neutral-700 text-pink-700 dark:text-pink-300 font-medium"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grid inside this category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {products.map((product) => renderCard(product))}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // VIEW 2: CONTINUOUS GRID
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredAndSortedProducts.map((product) => renderCard(product))}
          </div>
        );
      })()}

      {/* Modal de Configuración de Branding, Generador con IA y Diseñador (Solo Administrador) */}
      <BrandingImageModal
        isOpen={isBrandingModalOpen && isAdminUnlocked}
        onClose={() => setIsBrandingModalOpen(false)}
        settings={settings}
        onSave={(updated) => updateSettings(updated)}
        onAddToast={addToast}
      />

      {/* Modal de Detalle de Producto con Galería de 1 a 10 fotos, Variantes y Especificaciones */}
      <ProductDetailModal
        product={selectedProductForDetail}
        isOpen={Boolean(selectedProductForDetail)}
        onClose={() => setSelectedProductForDetail(null)}
        onAddToCart={(prod, qty, variant) => addToCart(prod, qty, variant)}
        onBuyWhatsApp={(prod, qty, variant) => handleDirectWhatsAppBuy(prod, qty, variant)}
        currency={settings.currency}
        getProductBreakdown={getProductBreakdown}
      />
    </div>
  );
};
