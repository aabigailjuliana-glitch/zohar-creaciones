import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Palette,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Sliders,
  Layers,
  Wand2,
  Maximize2,
  Square,
  FileImage,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { AppSettings } from '../types';
import { compressImage } from '../utils/imageCompressor';

interface BrandingImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: Partial<AppSettings>) => void;
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type TabType = 'upload' | 'ai' | 'designer' | 'gallery';

// Pre-designed aesthetic templates for stationery & creative shops
const PRESET_GALLERY = {
  covers: [
    {
      id: 'cover-stationery-pastel',
      title: 'Papelería Pastel & Flores',
      desc: 'Planners, flores secas y tonos rosas suaves',
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&q=80',
    },
    {
      id: 'cover-craft-desk',
      title: 'Mesa de Taller Artesanal',
      desc: 'Cuaderno, lápiz y café sobre madera natural',
      url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1600&q=80',
    },
    {
      id: 'cover-cute-planner',
      title: 'Planners & Destellos',
      desc: 'Composición limpia y femenina de papelería',
      url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&q=80',
    },
    {
      id: 'cover-watercolor-blush',
      title: 'Acuarela Rosa & Texturas',
      desc: 'Textura suave ideal para destacar textos',
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80',
    },
    {
      id: 'cover-vintage-botanical',
      title: 'Botánico Suave & Hojas',
      desc: 'Ambiente orgánico, delicado y cálido',
      url: 'https://images.unsplash.com/photo-1470058869958-2a77ade41c02?auto=format&fit=crop&w=1600&q=80',
    },
    {
      id: 'cover-gold-marble',
      title: 'Mármol & Vetas Doradas',
      desc: 'Lujo sutil y moderno para regalos y detalles',
      url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  logos: [
    {
      id: 'logo-floral-pink',
      title: 'Emblema Floral Rosa',
      desc: 'Corona botánica con tonos rosados y crema',
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'logo-brush-creative',
      title: 'Pincelada & Arte',
      desc: 'Trazo de pintura artística pastel',
      url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'logo-botanical-clean',
      title: 'Hoja Minimalista',
      desc: 'Contorno limpio sobre fondo claro',
      url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
    },
  ],
};

const SUGGESTED_PROMPTS = [
  'Portada horizontal panorámica de papelería artesanal, cuadernos con detalles dorados, flores secas en tonos rosa pastel y luz natural suave',
  'Logotipo cuadrado circular de papelería creativa con una pluma caligráfica, flores silvestres acuarela y destellos brillantes sobre fondo blanco',
  'Portada horizontal aesthetic para tienda de planners y tazas personalizadas, fondo de mesa de madera blanca con cinta washi y lápices',
  'Logotipo minimalista moderno para emprendimiento de papelería artesanal, sello botánico elegante en tono oro rosado con fondo transparente',
];

export const BrandingImageModal: React.FC<BrandingImageModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onAddToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  // Working state
  const [layoutMode, setLayoutMode] = useState<'square_logo' | 'horizontal_cover'>(
    settings.catalogHeaderLayout || 'square_logo'
  );
  const [draftLogoUrl, setDraftLogoUrl] = useState<string>(settings.businessLogoUrl || '');
  const [draftLogoFit, setDraftLogoFit] = useState<'contain' | 'cover'>(settings.businessLogoFit || 'contain');
  const [draftLogoBg, setDraftLogoBg] = useState<'transparent' | 'white' | 'dark' | 'glass'>(
    settings.businessLogoBg || 'glass'
  );

  const [draftCoverUrl, setDraftCoverUrl] = useState<string>(
    settings.catalogCoverUrl || settings.businessLogoUrl || ''
  );
  const [draftCoverFit, setDraftCoverFit] = useState<'cover' | 'contain'>(settings.catalogCoverFit || 'cover');
  const [draftCoverOverlay, setDraftCoverOverlay] = useState<boolean>(
    settings.catalogCoverOverlay !== undefined ? settings.catalogCoverOverlay : true
  );

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState<string>(SUGGESTED_PROMPTS[0]);
  const [aiFormat, setAiFormat] = useState<'square' | 'horizontal'>('horizontal');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Designer Canvas State
  const [designerFormat, setDesignerFormat] = useState<'square' | 'horizontal'>('horizontal');
  const [designerTitle, setDesignerTitle] = useState<string>(
    settings.catalogTitle || settings.businessName || 'Mi Emprendimiento'
  );
  const [designerSubtitle, setDesignerSubtitle] = useState<string>(
    settings.catalogTagline || 'Catálogo Online'
  );
  const [designerIcon, setDesignerIcon] = useState<string>('🌸');
  const [designerPalette, setDesignerPalette] = useState<string>('shaddai_pink');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize values when opened
  useEffect(() => {
    if (isOpen) {
      setLayoutMode(settings.catalogHeaderLayout || 'square_logo');
      setDraftLogoUrl(settings.businessLogoUrl || '');
      setDraftLogoFit(settings.businessLogoFit || 'contain');
      setDraftLogoBg(settings.businessLogoBg || 'glass');
      setDraftCoverUrl(settings.catalogCoverUrl || settings.businessLogoUrl || '');
      setDraftCoverFit(settings.catalogCoverFit || 'cover');
      setDraftCoverOverlay(settings.catalogCoverOverlay !== undefined ? settings.catalogCoverOverlay : true);
      setAiFormat(settings.catalogHeaderLayout === 'horizontal_cover' ? 'horizontal' : 'square');
      setDesignerFormat(settings.catalogHeaderLayout === 'horizontal_cover' ? 'horizontal' : 'square');
      setDesignerTitle(settings.catalogTitle || settings.businessName || 'Mi Emprendimiento');
    }
  }, [isOpen, settings]);

  // Handle local file upload with cloud-optimized compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onAddToast('Archivo no válido', 'Por favor selecciona un archivo de imagen (PNG, JPG, SVG, WEBP).', 'warning');
      return;
    }

    try {
      onAddToast('Optimizando imagen...', 'Comprimiendo imagen para que se sincronice en todos los dispositivos...', 'info');
      const isCover = layoutMode === 'horizontal_cover';
      const compressed = await compressImage(file, {
        maxWidth: isCover ? 1200 : 500,
        maxHeight: isCover ? 600 : 500,
        quality: 0.76,
        preferredMimeType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      });

      if (isCover) {
        setDraftCoverUrl(compressed);
        if (!draftLogoUrl) setDraftLogoUrl(compressed);
      } else {
        setDraftLogoUrl(compressed);
      }
      onAddToast('Imagen optimizada ✨', 'Vista previa actualizada. Guarda los cambios para aplicarla al catálogo.', 'success');
    } catch (err) {
      console.error('Error compressing branding image:', err);
      onAddToast('Error', 'No se pudo optimizar la imagen seleccionada.', 'error');
    }
  };

  // Handle AI generation call
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      onAddToast('Escribe una descripción', 'Describe cómo te gustaría que sea la imagen de tu emprendimiento.', 'warning');
      return;
    }

    setIsAiGenerating(true);
    setAiError(null);
    setAiGeneratedImage(null);

    try {
      const res = await fetch('/api/generate-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          format: aiFormat,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'No se pudo generar la imagen con el servicio de IA.');
      }

      setAiGeneratedImage(data.imageUrl);
      onAddToast('¡Imagen generada con éxito! ✨', 'Puedes aplicarla directamente a tu catálogo.', 'success');
    } catch (err: any) {
      console.error('Error generating image:', err);
      setAiError(err.message || 'Error al conectar con el generador de imágenes.');
      onAddToast(
        'Aviso de Generación IA',
        'Puedes usar también nuestro Diseñador Vectorial o la Galería de Diseños Listos mientras se procesa la cuota de IA.',
        'info'
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Apply AI image
  const handleApplyAiImage = () => {
    if (!aiGeneratedImage) return;
    if (aiFormat === 'horizontal') {
      setDraftCoverUrl(aiGeneratedImage);
      setLayoutMode('horizontal_cover');
    } else {
      setDraftLogoUrl(aiGeneratedImage);
      setLayoutMode('square_logo');
    }
    onAddToast('Imagen seleccionada', 'Se configuró para tu catálogo. Recuerda presionar "Guardar y Aplicar".', 'success');
    setActiveTab('upload');
  };

  // Render and apply instant canvas design
  useEffect(() => {
    if (activeTab !== 'designer' && !isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHorizontal = designerFormat === 'horizontal';
    const width = isHorizontal ? 1200 : 800;
    const height = isHorizontal ? 480 : 800;
    canvas.width = width;
    canvas.height = height;

    // Palette background
    let bgGradient = ctx.createLinearGradient(0, 0, width, height);
    if (designerPalette === 'shaddai_pink') {
      bgGradient.addColorStop(0, '#fdf2f8');
      bgGradient.addColorStop(0.5, '#fce7f3');
      bgGradient.addColorStop(1, '#fbcfe8');
    } else if (designerPalette === 'lavender') {
      bgGradient.addColorStop(0, '#faf5ff');
      bgGradient.addColorStop(0.5, '#f3e8ff');
      bgGradient.addColorStop(1, '#e9d5ff');
    } else if (designerPalette === 'mint') {
      bgGradient.addColorStop(0, '#f0fdf4');
      bgGradient.addColorStop(0.5, '#dcfce7');
      bgGradient.addColorStop(1, '#bbf7d0');
    } else if (designerPalette === 'kraft') {
      bgGradient.addColorStop(0, '#fef3c7');
      bgGradient.addColorStop(0.5, '#fde68a');
      bgGradient.addColorStop(1, '#fcd34d');
    } else if (designerPalette === 'dark_gold') {
      bgGradient.addColorStop(0, '#1c1917');
      bgGradient.addColorStop(0.5, '#292524');
      bgGradient.addColorStop(1, '#18141d');
    } else {
      bgGradient.addColorStop(0, '#ffffff');
      bgGradient.addColorStop(1, '#f5f5f5');
    }

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative circles
    ctx.fillStyle = designerPalette === 'dark_gold' ? 'rgba(217, 119, 6, 0.08)' : 'rgba(244, 114, 182, 0.12)';
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.2, height * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.8, height * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Inner frame border
    ctx.lineWidth = 6;
    ctx.strokeStyle =
      designerPalette === 'dark_gold'
        ? '#fbbf24'
        : designerPalette === 'kraft'
        ? '#d97706'
        : '#ec4899';
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Draw Icon
    ctx.font = isHorizontal ? '72px sans-serif' : '110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(designerIcon, width / 2, isHorizontal ? height * 0.32 : height * 0.34);

    // Draw Main Title
    ctx.font = isHorizontal ? 'bold 54px system-ui, -apple-system, sans-serif' : 'bold 58px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = designerPalette === 'dark_gold' ? '#f5f5f4' : '#1c1917';
    ctx.fillText(designerTitle || 'Mi Emprendimiento', width / 2, isHorizontal ? height * 0.58 : height * 0.56);

    // Draw Subtitle
    ctx.font = isHorizontal ? '500 24px system-ui, -apple-system, sans-serif' : '500 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = designerPalette === 'dark_gold' ? '#d6d3d1' : '#78716c';
    ctx.fillText(designerSubtitle || 'Papelería Creativa', width / 2, isHorizontal ? height * 0.76 : height * 0.70);

    // Subtle sparkles
    ctx.font = '24px sans-serif';
    ctx.fillText('✨', width / 2 - 180, isHorizontal ? height * 0.58 : height * 0.56);
    ctx.fillText('✨', width / 2 + 180, isHorizontal ? height * 0.58 : height * 0.56);
  }, [designerFormat, designerTitle, designerSubtitle, designerIcon, designerPalette, activeTab, isOpen]);

  // Export from canvas and apply
  const handleApplyCanvasDesign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isHorizontal = designerFormat === 'horizontal';
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (isHorizontal) {
      setDraftCoverUrl(dataUrl);
      setLayoutMode('horizontal_cover');
    } else {
      setDraftLogoUrl(dataUrl);
      setLayoutMode('square_logo');
    }
    onAddToast('Diseño creado ✨', 'Se aplicó el diseño a tu catálogo. Guarda los cambios para fijarlo.', 'success');
    setActiveTab('upload');
  };

  // Final Save to AppSettings & Firestore
  const handleFinalSave = () => {
    onSave({
      catalogHeaderLayout: layoutMode,
      businessLogoUrl: draftLogoUrl.trim(),
      businessLogoFit: draftLogoFit,
      businessLogoBg: draftLogoBg,
      catalogCoverUrl: draftCoverUrl.trim(),
      catalogCoverFit: draftCoverFit,
      catalogCoverOverlay: draftCoverOverlay,
    });
    onAddToast('Branding actualizado ✨', 'La imagen y el formato de tu catálogo se guardaron con éxito.', 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in overflow-y-auto overscroll-contain">
      <div className="bg-white dark:bg-[#18141D] rounded-3xl max-w-3xl w-full border border-pink-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-2 sm:my-6 flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-pink-100 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-pink-50 via-rose-50/50 to-white dark:from-pink-950/30 dark:via-neutral-900 dark:to-neutral-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                Branding & Imagen del Catálogo
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Elige entre imagen cuadrada (logo) o portada horizontal panorámica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Format Selector Switch: Cuadrada vs Portada Horizontal */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-900/60 border-b border-pink-100/80 dark:border-neutral-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-pink-500" />
                <span>¿Cómo deseas mostrar la imagen en el comienzo del catálogo?</span>
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Puedes alternar en cualquier momento según el diseño de tu marca
              </p>
            </div>

            <div className="flex items-center p-1 bg-white dark:bg-neutral-800 rounded-2xl border border-pink-200 dark:border-neutral-700 shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setLayoutMode('square_logo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  layoutMode === 'square_logo'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-pink-600'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Imagen Cuadrada (Logo)</span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('horizontal_cover')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  layoutMode === 'horizontal_cover'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-pink-600'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Portada Horizontal (Banner ancho)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-2 border-b border-pink-100 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 bg-white dark:bg-[#18141D]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-pink-600 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Cargar desde mi Dispositivo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('designer')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'designer'
                ? 'border-pink-600 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>2. Diseñador Instantáneo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'border-pink-600 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Galería de Diseños Listos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-pink-600 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4. Generar con IA</span>
          </button>
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: UPLOAD FROM DEVICE */}
          {activeTab === 'upload' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 rounded-2xl border-2 border-dashed border-pink-200 dark:border-neutral-700 bg-pink-50/20 dark:bg-neutral-900/40 text-center relative hover:bg-pink-50/40 transition-colors">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Haz clic para seleccionar una foto de tu celular o computadora"
                />
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-100 dark:bg-pink-950/80 text-pink-600 flex items-center justify-center mb-2 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Arrastra aquí o haz clic para subir tu imagen desde tu dispositivo
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Soporta imágenes con fondo o transparentes sin fondo (PNG, JPG, SVG, WEBP hasta 8MB)
                  </p>
                </div>
              </div>

              {/* URL Direct Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  O pega una URL directa de imagen:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={layoutMode === 'horizontal_cover' ? draftCoverUrl : draftLogoUrl}
                    onChange={(e) => {
                      if (layoutMode === 'horizontal_cover') {
                        setDraftCoverUrl(e.target.value);
                      } else {
                        setDraftLogoUrl(e.target.value);
                      }
                    }}
                    placeholder="https://ejemplo.com/mi-logo-o-portada.png"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  {(layoutMode === 'horizontal_cover' ? draftCoverUrl : draftLogoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (layoutMode === 'horizontal_cover') setDraftCoverUrl('');
                        else setDraftLogoUrl('');
                      }}
                      className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl hover:bg-rose-100"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {/* Preview and Adjustments according to Layout Mode */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                    <span>
                      Vista previa:{' '}
                      {layoutMode === 'horizontal_cover' ? 'Portada Horizontal Panorámica' : 'Imagen Cuadrada (Logo)'}
                    </span>
                  </span>
                  <span className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                    {layoutMode === 'horizontal_cover' ? '16:9 Panorámica' : '1:1 Cuadrada'}
                  </span>
                </div>

                {layoutMode === 'horizontal_cover' ? (
                  /* Horizontal Cover Preview */
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-pink-200 dark:border-neutral-700 h-44 sm:h-52 w-full bg-gradient-to-r from-pink-100 to-rose-100 dark:from-neutral-800 dark:to-neutral-900 shadow-sm flex items-end p-4 sm:p-6">
                      {draftCoverUrl ? (
                        <img
                          src={draftCoverUrl}
                          alt="Portada Horizontal"
                          className={`absolute inset-0 w-full h-full ${
                            draftCoverFit === 'cover' ? 'object-cover' : 'object-contain'
                          }`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-1.5">
                          <ImageIcon className="w-8 h-8 opacity-40" />
                          <span className="text-xs font-medium">Aún no hay imagen de portada asignada</span>
                        </div>
                      )}

                      {/* Optional Overlay */}
                      {draftCoverOverlay && draftCoverUrl && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />
                      )}

                      {/* Sample overlay content to visualize real catalog appearance */}
                      <div className="relative z-10 text-white drop-shadow-md">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider mb-1">
                          {settings.catalogTagline || 'Catálogo Online'}
                        </span>
                        <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
                          {settings.catalogTitle || settings.businessName || 'Descubre nuestra papelería'}
                        </h3>
                        <p className="text-[11px] opacity-90 line-clamp-1 max-w-md">
                          {settings.catalogDescription || 'Planners, tazas personalizadas y regalos únicos.'}
                        </p>
                      </div>
                    </div>

                    {/* Cover Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                          Ajuste de la portada:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDraftCoverFit('cover')}
                            className={`px-2.5 py-1.5 text-xs rounded-xl font-semibold border ${
                              draftCoverFit === 'cover'
                                ? 'bg-pink-600 text-white border-pink-600'
                                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            Cubrir (Llenar)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftCoverFit('contain')}
                            className={`px-2.5 py-1.5 text-xs rounded-xl font-semibold border ${
                              draftCoverFit === 'contain'
                                ? 'bg-pink-600 text-white border-pink-600'
                                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            Contener (Completa)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                          Sombra de legibilidad (Overlay):
                        </label>
                        <button
                          type="button"
                          onClick={() => setDraftCoverOverlay(!draftCoverOverlay)}
                          className={`w-full px-2.5 py-1.5 text-xs rounded-xl font-semibold border flex items-center justify-center gap-1.5 ${
                            draftCoverOverlay
                              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-pink-900/40 dark:border-pink-800'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${draftCoverOverlay ? 'opacity-100' : 'opacity-0'}`} />
                          <span>{draftCoverOverlay ? 'Sombra suave activada' : 'Sin sombra'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Square Logo Preview */
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div
                      className={`w-32 h-32 sm:w-36 sm:h-36 rounded-2xl border-2 border-pink-200 dark:border-neutral-700 shadow-sm flex items-center justify-center p-3 overflow-hidden shrink-0 transition-all ${
                        draftLogoBg === 'white'
                          ? 'bg-white'
                          : draftLogoBg === 'dark'
                          ? 'bg-neutral-900'
                          : draftLogoBg === 'transparent'
                          ? 'bg-transparent'
                          : 'bg-white/85 dark:bg-neutral-800/85 backdrop-blur-xs'
                      }`}
                    >
                      {draftLogoUrl ? (
                        <img
                          src={draftLogoUrl}
                          alt="Logo Preview"
                          className={`w-full h-full ${
                            draftLogoFit === 'cover' ? 'object-cover' : 'object-contain'
                          } drop-shadow-xs`}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-400 text-center gap-1">
                          <Square className="w-8 h-8 opacity-40" />
                          <span className="text-[10px] font-medium leading-tight">Sin logo aún</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                          Fondo para resaltar logo (con o sin fondo):
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { id: 'glass', label: 'Cristal' },
                            { id: 'white', label: 'Blanco' },
                            { id: 'dark', label: 'Oscuro' },
                            { id: 'transparent', label: 'Transparente' },
                          ].map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setDraftLogoBg(b.id as any)}
                              className={`px-2 py-1 text-xs rounded-xl font-medium border text-center ${
                                draftLogoBg === b.id
                                  ? 'bg-pink-600 text-white border-pink-600 font-bold'
                                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                          Ajuste del logo:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDraftLogoFit('contain')}
                            className={`px-2.5 py-1 text-xs rounded-xl font-medium border ${
                              draftLogoFit === 'contain'
                                ? 'bg-pink-600 text-white border-pink-600 font-bold'
                                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            Contener (Proporción exacta)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftLogoFit('cover')}
                            className={`px-2.5 py-1 text-xs rounded-xl font-medium border ${
                              draftLogoFit === 'cover'
                                ? 'bg-pink-600 text-white border-pink-600 font-bold'
                                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            Cubrir (Llenar marco)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INSTANT VECTOR DESIGNER (No external API required, 100% reliable) */}
          {activeTab === 'designer' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-pink-50/60 dark:bg-pink-950/20 p-3.5 rounded-2xl border border-pink-100 dark:border-pink-900/40 text-xs text-pink-800 dark:text-pink-300 flex items-start gap-2">
                <Wand2 className="w-4 h-4 shrink-0 text-pink-600 mt-0.5" />
                <span>
                  <strong>Diseñador de Marca Express:</strong> ¿No tienes un logo o diseñador? Personaliza los textos,
                  icono y colores. Se generará una imagen en alta definición lista para aplicar a tu catálogo.
                </span>
              </div>

              {/* Format selector inside designer */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Formato a crear:</span>
                <button
                  type="button"
                  onClick={() => setDesignerFormat('horizontal')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    designerFormat === 'horizontal'
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  Portada Horizontal (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => setDesignerFormat('square')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    designerFormat === 'square'
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  Logo Cuadrado (1:1)
                </button>
              </div>

              {/* Designer Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                    Nombre del Emprendimiento:
                  </label>
                  <input
                    type="text"
                    value={designerTitle}
                    onChange={(e) => setDesignerTitle(e.target.value)}
                    placeholder="Ej: Nombre de tu Catálogo"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                    Subtítulo / Especialidad:
                  </label>
                  <input
                    type="text"
                    value={designerSubtitle}
                    onChange={(e) => setDesignerSubtitle(e.target.value)}
                    placeholder="Ej: Papelería Creativa & Planners"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              </div>

              {/* Icon selector */}
              <div>
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Elige un icono temático:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['🌸', '✒️', '📖', '☕', '✨', '✂️', '🎀', '👑', '💖', '🌿', '🎨'].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setDesignerIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                        designerIcon === icon
                          ? 'bg-pink-100 border-pink-500 scale-110 shadow-2xs'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-pink-50'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Paleta de color & estilo:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'shaddai_pink', label: 'Rosa Pastel', sample: 'bg-pink-200' },
                    { id: 'lavender', label: 'Lila Creativo', sample: 'bg-purple-200' },
                    { id: 'mint', label: 'Menta Botánico', sample: 'bg-emerald-200' },
                    { id: 'kraft', label: 'Kraft & Miel', sample: 'bg-amber-200' },
                    { id: 'dark_gold', label: 'Noche & Oro', sample: 'bg-neutral-900' },
                    { id: 'clean_white', label: 'Blanco Puro', sample: 'bg-white border' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDesignerPalette(p.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                        designerPalette === p.id
                          ? 'border-pink-600 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-bold'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${p.sample} shadow-2xs shrink-0`} />
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Canvas Preview */}
              <div className="pt-2 text-center">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-2">
                  Vista previa en vivo del diseño:
                </label>
                <div className="inline-block rounded-2xl overflow-hidden border-2 border-pink-200 dark:border-neutral-700 shadow-md bg-white max-w-full">
                  <canvas
                    ref={canvasRef}
                    className="max-h-56 w-auto object-contain mx-auto"
                  />
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleApplyCanvasDesign}
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 inline-flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {designerFormat === 'horizontal'
                        ? 'Aplicar como Portada Horizontal'
                        : 'Aplicar como Logo Cuadrado'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GALLERY OF READY DESIGNS */}
          {activeTab === 'gallery' && (
            <div className="space-y-6 animate-in fade-in">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Selecciona una imagen profesional prediseñada para tu emprendimiento. Al hacer clic se aplicará
                automáticamente.
              </p>

              {/* Horizontal Covers Section */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-pink-500" />
                  <span>Portadas Horizontales Panorámicas (16:9)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_GALLERY.covers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setDraftCoverUrl(c.url);
                        setLayoutMode('horizontal_cover');
                        onAddToast('Portada seleccionada', `Se aplicó "${c.title}". Recuerda guardar los cambios.`, 'success');
                        setActiveTab('upload');
                      }}
                      className="group cursor-pointer rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:border-pink-500 transition-all shadow-xs hover:shadow-md relative"
                    >
                      <div className="h-28 w-full overflow-hidden bg-neutral-100">
                        <img
                          src={c.url}
                          alt={c.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5 bg-white dark:bg-neutral-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{c.title}</p>
                          <p className="text-[10px] text-neutral-500 line-clamp-1">{c.desc}</p>
                        </div>
                        <span className="text-[11px] font-bold text-pink-600 group-hover:underline">Elegir</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Square Logos Section */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5 text-pink-500" />
                  <span>Logos e Iconos Cuadrados (1:1)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESET_GALLERY.logos.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => {
                        setDraftLogoUrl(l.url);
                        setLayoutMode('square_logo');
                        onAddToast('Logo seleccionado', `Se aplicó "${l.title}". Recuerda guardar los cambios.`, 'success');
                        setActiveTab('upload');
                      }}
                      className="group cursor-pointer rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:border-pink-500 transition-all shadow-xs hover:shadow-md"
                    >
                      <div className="h-28 w-full overflow-hidden bg-neutral-100 flex items-center justify-center p-2">
                        <img
                          src={l.url}
                          alt={l.title}
                          className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5 bg-white dark:bg-neutral-800 flex items-center justify-between">
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{l.title}</p>
                        <span className="text-[11px] font-bold text-pink-600 group-hover:underline">Elegir</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI GENERATION */}
          {activeTab === 'ai' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-neutral-900 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40 space-y-2">
                <div className="flex items-center gap-2 text-pink-700 dark:text-pink-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-pink-600" />
                  <span>Generador Inteligente de Imágenes de Marca</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Describe cómo imaginas la imagen de tu emprendimiento o pulsa sobre una de las sugerencias. Nuestro
                  modelo creará una imagen personalizada en alta calidad.
                </p>
              </div>

              {/* Format to generate */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Formato a generar:</span>
                <button
                  type="button"
                  onClick={() => setAiFormat('horizontal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                    aiFormat === 'horizontal'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Portada Horizontal (16:9)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAiFormat('square')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                    aiFormat === 'square'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Logo Cuadrado (1:1)</span>
                </button>
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Descripción de la imagen deseada (Prompt):
                </label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe los colores, temática, elementos (flores, papelería, acuarelas, etc.)..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              {/* Suggested Ideas */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                  O prueba una idea recomendada con 1 clic:
                </span>
                <div className="space-y-1.5">
                  {SUGGESTED_PROMPTS.map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAiPrompt(promptText);
                        setAiFormat(promptText.toLowerCase().includes('portada') ? 'horizontal' : 'square');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-neutral-50 hover:bg-pink-50/70 dark:bg-neutral-900/60 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{promptText}</span>
                      <Sparkles className="w-3.5 h-3.5 text-pink-500 opacity-60 group-hover:opacity-100 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all hover:scale-102 flex items-center gap-2 disabled:opacity-50"
                >
                  {isAiGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generando imagen con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generar Imagen Ahora</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error feedback if any */}
              {aiError && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Información de Generación:</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{aiError}</p>
                    <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                      💡 <em>Tip:</em> Puedes utilizar las pestañas <strong>"Diseñador Instantáneo"</strong> o{' '}
                      <strong>"Galería de Diseños Listos"</strong> para aplicar tu portada o logo de inmediato sin costo.
                    </p>
                  </div>
                </div>
              )}

              {/* Generated Image Result */}
              {aiGeneratedImage && (
                <div className="p-4 rounded-2xl bg-pink-50/40 dark:bg-neutral-900 border border-pink-200 dark:border-neutral-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>¡Imagen generada con éxito!</span>
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 max-h-64 flex items-center justify-center bg-black/5">
                    <img
                      src={aiGeneratedImage}
                      alt="Generado por IA"
                      className="max-h-64 w-auto object-contain mx-auto"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyAiImage}
                      className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {aiFormat === 'horizontal'
                          ? 'Aplicar como Portada Horizontal'
                          : 'Aplicar como Logo Cuadrado'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAi}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-50"
                    >
                      Regenerar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-pink-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
            Formato activo:{' '}
            <strong className="text-pink-600 dark:text-pink-400">
              {layoutMode === 'horizontal_cover' ? 'Portada Horizontal (16:9)' : 'Imagen Cuadrada (1:1)'}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleFinalSave}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-xs transition-all hover:scale-102 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar y Aplicar al Catálogo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
