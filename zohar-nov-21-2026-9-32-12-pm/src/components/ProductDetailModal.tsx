import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Send,
  Sparkles,
  BadgePercent,
  Clock,
  Package,
  Check,
  ShieldCheck,
  Maximize2,
  ZoomIn,
  Truck,
  Heart,
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { formatCurrency, ProductCostBreakdown } from '../utils/pricingCalculator';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedVariant?: ProductVariant) => void;
  onBuyWhatsApp: (product: Product, quantity: number, selectedVariant?: ProductVariant) => void;
  currency: string;
  getProductBreakdown: (product: Product) => ProductCostBreakdown;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyWhatsApp,
  currency,
  getProductBreakdown,
}) => {
  const [activeImgIdx, setActiveImgIdx] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isFullscreenZoom, setIsFullscreenZoom] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Extract gallery of 1 to 10 images
  const images: string[] = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) {
      return product.images.filter((img) => typeof img === 'string' && img.trim().length > 0);
    }
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  // Reset state on open or product change
  useEffect(() => {
    if (isOpen) {
      setActiveImgIdx(0);
      setQuantity(1);
      setIsFullscreenZoom(false);
      if (product?.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(null);
      }
    }
  }, [isOpen, product]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreenZoom) {
          setIsFullscreenZoom(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setActiveImgIdx((prev) => (prev + 1) % images.length);
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, isFullscreenZoom, onClose]);

  if (!isOpen || !product) return null;

  const breakdown = getProductBreakdown(product);
  const currentImg = images[activeImgIdx] || product.imageUrl || '';
  const maxStock = product.stock > 0 ? product.stock : 99;

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImgIdx((prev) => (prev + 1) % images.length);
  };

  // Touch swipe support for mobile image gallery
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40 && images.length > 1) {
      if (diff > 0) {
        // Swiped left -> next
        handleNextImage();
      } else {
        // Swiped right -> prev
        handlePrevImage();
      }
    }
    touchStartX.current = null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-[#18141D] rounded-3xl max-w-4xl w-full border border-pink-100 dark:border-neutral-800 shadow-2xl my-2 sm:my-6 flex flex-col max-h-[95vh] sm:max-h-[92vh] overflow-hidden relative">
          
          {/* Sticky Header with Title and Close */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-pink-100 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-pink-50/60 via-rose-50/30 to-white dark:from-pink-950/20 dark:via-neutral-900 dark:to-neutral-900 shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-[11px] font-bold tracking-wide uppercase">
                {product.category}
              </span>
              {product.subcategory && (
                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium truncate">
                  › {product.subcategory}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Cerrar vista detallada"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
              
              {/* LEFT COLUMN: INTERACTIVE IMAGE GALLERY (1 to 10 photos) */}
              <div className="space-y-3">
                {/* Main Large Image Container */}
                <div
                  className="relative aspect-square sm:aspect-4/3 md:aspect-square w-full rounded-2xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden border border-pink-100 dark:border-neutral-800 group shadow-xs cursor-pointer"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => setIsFullscreenZoom(true)}
                  title="Haz clic para ver la imagen en tamaño completo"
                >
                  <img
                    src={currentImg}
                    alt={`${product.name} - Foto ${activeImgIdx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
                    }}
                  />

                  {/* Discount Badge on Image */}
                  {breakdown.hasDiscount && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-md tracking-wider flex items-center gap-1">
                        <BadgePercent className="w-3.5 h-3.5" />
                        {product.discountType === 'percentage'
                          ? `-${product.discountValue}% OFF`
                          : `-${formatCurrency(product.discountValue || 0, currency)} OFF`}
                      </span>
                    </div>
                  )}

                  {/* Image Counter Pill */}
                  {images.length > 1 && (
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold tracking-wide shadow-xs">
                      {activeImgIdx + 1} / {images.length}
                    </div>
                  )}

                  {/* Zoom indicator on hover */}
                  <div className="absolute bottom-3 right-3 z-10 p-2 rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs text-neutral-700 dark:text-neutral-200 shadow-md opacity-80 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-4 h-4" />
                  </div>

                  {/* Navigation Arrows for Multi-image */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevImage();
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs text-neutral-800 dark:text-neutral-100 shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-neutral-800 transition-all opacity-80 hover:opacity-100 hover:scale-105"
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextImage();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs text-neutral-800 dark:text-neutral-100 shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-neutral-800 transition-all opacity-80 hover:opacity-100 hover:scale-105"
                        aria-label="Siguiente foto"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails Carousel (1 to 10 images) */}
                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                    {images.map((imgUrl, idx) => {
                      const isActive = idx === activeImgIdx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImgIdx(idx)}
                          className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all ${
                            isActive
                              ? 'border-pink-600 dark:border-pink-500 ring-2 ring-pink-400/40 scale-102 shadow-xs'
                              : 'border-transparent hover:border-pink-300 dark:hover:border-neutral-700 opacity-70 hover:opacity-100'
                          }`}
                          aria-label={`Ver foto ${idx + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Miniatura ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-pink-600/90 text-white text-[9px] font-bold text-center py-0.2">
                              Portada
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] text-neutral-400 text-center flex items-center justify-center gap-1">
                  <span>💡 Toca la foto para ampliar</span>
                  {images.length > 1 && <span>• Desliza o usa las flechas</span>}
                </p>
              </div>

              {/* RIGHT COLUMN: PRODUCT DETAILS & BUYING CONTROLS */}
              <div className="flex flex-col space-y-4">
                
                {/* Title and SKU */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                    <span>Cód. {product.sku || 'ART-PROD'}</span>
                    {product.isMadeToOrder ? (
                      <span className="text-purple-600 dark:text-purple-400 font-sans font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span>Confección por encargo</span>
                      </span>
                    ) : product.stock > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>{product.stock} unidades disponibles</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-sans font-bold">
                        Sin stock disponible
                      </span>
                    )}
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight text-balance leading-snug">
                    {product.name}
                  </h1>
                </div>

                {/* Price Display */}
                {(() => {
                  const hasVariants = Boolean(product.variants && product.variants.length > 0);
                  const currentUnitPrice = selectedVariant ? selectedVariant.price : breakdown.finalPrice;
                  const currentSubtotal = currentUnitPrice * quantity;

                  return (
                    <>
                      <div className="p-4 rounded-2xl bg-pink-50/70 dark:bg-neutral-900/70 border border-pink-200/80 dark:border-neutral-800 space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            {selectedVariant
                              ? `Precio variante (${selectedVariant.name}):`
                              : breakdown.hasDiscount
                              ? 'Precio promocional:'
                              : 'Precio final al público:'}
                          </span>

                          <div className="text-right">
                            {!selectedVariant && breakdown.hasDiscount && (
                              <div className="flex items-center justify-end gap-2 mb-0.5">
                                <span className="text-xs text-neutral-400 line-through tabular-nums">
                                  {formatCurrency(breakdown.effectivePrice, currency)}
                                </span>
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  AHORRAS {formatCurrency(breakdown.discountAmount, currency)}
                                </span>
                              </div>
                            )}

                            <span className="text-2xl sm:text-3xl font-black text-pink-600 dark:text-pink-400 font-mono tabular-nums">
                              {formatCurrency(currentUnitPrice, currency)}
                            </span>
                          </div>
                        </div>

                        {product.extraDirectCost > 0 && (
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                            ✓ Incluye packaging y detalles decorativos de protección.
                          </p>
                        )}
                      </div>

                      {/* Variant Selection Component */}
                      {hasVariants && (
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-pink-200/80 dark:border-pink-900/50 space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-pink-700 dark:text-pink-300 uppercase tracking-wider flex items-center gap-1">
                              🏷️ Opciones / Variaciones del pedido:
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {product.variants!.length} opciones
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {product.variants!.map((variant) => {
                              const isSelected = selectedVariant?.id === variant.id;
                              return (
                                <button
                                  key={variant.id}
                                  type="button"
                                  onClick={() => setSelectedVariant(variant)}
                                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                                    isSelected
                                      ? 'bg-pink-600 text-white border-pink-600 shadow-xs ring-2 ring-pink-400/30'
                                      : 'bg-neutral-50/70 dark:bg-neutral-800/60 hover:bg-pink-50/50 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? 'border-white bg-white text-pink-600'
                                          : 'border-neutral-400 dark:border-neutral-500 bg-white dark:bg-neutral-900'
                                      }`}
                                    >
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />}
                                    </div>
                                    <span className="text-xs font-bold truncate">
                                      {variant.name}
                                    </span>
                                  </div>

                                  <span
                                    className={`text-xs font-mono font-black shrink-0 ${
                                      isSelected ? 'text-white' : 'text-pink-600 dark:text-pink-400'
                                    }`}
                                  >
                                    {formatCurrency(variant.price, currency)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <div className="space-y-1.5">
                        <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                          Detalles & Descripción
                        </h3>
                        <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line bg-neutral-50/50 dark:bg-neutral-900/30 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80">
                          {product.description ||
                            'Producto elaborado artesanalmente con materiales seleccionados de primera calidad, cuidando cada detalle para una terminación impecable.'}
                        </div>
                      </div>

                      {/* Production and Craftsmanship highlights */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-pink-100 dark:border-neutral-800 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
                          <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                            Hecho a mano en taller
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-pink-100 dark:border-neutral-800 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-pink-500 shrink-0" />
                          <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                            Envíos o retiro en taller
                          </span>
                        </div>
                      </div>

                      {/* Quantity and Subtotal Selector */}
                      <div className="pt-2 border-t border-pink-100 dark:border-neutral-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                              Cantidad:
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              Subtotal:{' '}
                              <span className="font-mono font-bold text-pink-600 dark:text-pink-400">
                                {formatCurrency(currentSubtotal, currency)}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center border border-pink-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              disabled={quantity <= 1}
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                              aria-label="Disminuir cantidad"
                            >
                              -
                            </button>
                            <span className="w-10 text-center font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                              disabled={quantity >= maxStock}
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                              aria-label="Aumentar cantidad"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Actions: Add to Cart and Buy with WhatsApp or Out of Stock banner */}
                        {!product.isMadeToOrder && product.stock <= 0 ? (
                          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-center space-y-1">
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                              ❌ Agotado • Sin stock disponible
                            </span>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Este producto no cuenta con unidades disponibles para compra inmediata en este momento.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                onAddToCart(product, quantity, selectedVariant || undefined);
                                onClose();
                              }}
                              className="py-3 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-102 active:scale-98"
                            >
                              <ShoppingBag className="w-4 h-4" />
                              <span>
                                {product.isMadeToOrder
                                  ? `Pedir por Encargo (${quantity})`
                                  : `Agregar al Carrito (${quantity})`}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onBuyWhatsApp(product, quantity, selectedVariant || undefined);
                              }}
                              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-102 active:scale-98"
                            >
                              <Send className="w-4 h-4" />
                              <span>{product.isMadeToOrder ? 'Encargar por WhatsApp' : 'Comprar por WhatsApp'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN IMAGE ZOOM MODAL */}
      {isFullscreenZoom && (
        <div
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsFullscreenZoom(false)}
        >
          {/* Top Bar with counter & close */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white p-3 shrink-0">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
              Foto {activeImgIdx + 1} de {images.length}
            </span>

            <button
              type="button"
              onClick={() => setIsFullscreenZoom(false)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              aria-label="Cerrar vista completa"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Full image viewer */}
          <div
            className="flex-1 max-w-4xl w-full flex items-center justify-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={currentImg}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center shadow-lg transition-all"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center shadow-lg transition-all"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails in Fullscreen */}
          {images.length > 1 && (
            <div
              className="w-full max-w-2xl flex items-center justify-center gap-2 py-3 overflow-x-auto shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImgIdx(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === activeImgIdx
                      ? 'border-pink-500 scale-105 ring-2 ring-pink-400'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
