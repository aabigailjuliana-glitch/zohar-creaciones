import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DeliveryMethod } from '../types';
import { formatCurrency } from '../utils/pricingCalculator';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Copy,
  Check,
  Send,
  ShoppingBag,
  Building2,
  Banknote,
  MapPin,
  Truck,
  AlertCircle,
  Package,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    settings,
    addToast,
    addOrder,
  } = useApp();

  // Delivery Method state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('retiro_local');
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo'>('transferencia');

  // Customer detailed data required for checkout
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');

  // Address fields for Home Delivery
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [floorApt, setFloorApt] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [crossStreets, setCrossStreets] = useState('');

  // Postal fields for Correo Argentino
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [correoDeliveryType, setCorreoDeliveryType] = useState<'sucursal' | 'domicilio'>('domicilio');
  const [correoBranchInfo, setCorreoBranchInfo] = useState('');

  // Customization notes
  const [customizationNotes, setCustomizationNotes] = useState('');
  const [copiedAlias, setCopiedAlias] = useState(false);

  if (!isOpen) return null;

  const totalAmount = cart.reduce((sum, item) => sum + item.calculatedPrice * item.quantity, 0);

  const handleCopyAlias = () => {
    navigator.clipboard.writeText(settings.bankAlias);
    setCopiedAlias(true);
    addToast('Alias copiado', `Alias ${settings.bankAlias} copiado al portapapeles.`, 'success');
    setTimeout(() => setCopiedAlias(false), 2500);
  };

  const handleSendWhatsAppOrder = () => {
    if (cart.length === 0) return;

    // Validation
    if (!fullName.trim()) {
      addToast('Nombre requerido', 'Por favor ingresa tu nombre y apellido.', 'warning');
      return;
    }
    if (!phone.trim()) {
      addToast('Teléfono requerido', 'Por favor ingresa un teléfono o WhatsApp de contacto.', 'warning');
      return;
    }

    if (deliveryMethod === 'envio_mensajeria') {
      if (!street.trim() || !streetNumber.trim()) {
        addToast('Dirección requerida', 'Por favor completa calle y altura para el envío a domicilio.', 'warning');
        return;
      }
    }

    if (deliveryMethod === 'correo_argentino') {
      if (!postalCode.trim() || !province.trim() || !city.trim() || !dni.trim()) {
        addToast(
          'Datos de Correo Argentino requeridos',
          'Por favor completa DNI, Código Postal, Provincia y Localidad para la encomienda.',
          'warning'
        );
        return;
      }
    }

    const cleanPhone = settings.ownerPhone.replace(/\D/g, '');

    const storeTitle = settings.catalogTitle?.trim() || settings.businessName || 'ZOHAR';

    let deliveryLabel = '';
    let addressSummary = '';

    if (deliveryMethod === 'retiro_local') {
      deliveryLabel = `Retiro en Taller ${storeTitle} (Gratis)`;
      addressSummary = 'Retiro coordinado previamente por WhatsApp';
    } else if (deliveryMethod === 'envio_mensajeria') {
      deliveryLabel = 'Envío a Domicilio Personalizado / Mensajería';
      addressSummary = `${street} ${streetNumber}${floorApt ? ' Piso/Depto: ' + floorApt : ''}, ${neighborhood || ''} ${crossStreets ? '(Entre: ' + crossStreets + ')' : ''}`;
    } else {
      deliveryLabel = 'Envío por Correo Argentino a todo el país';
      addressSummary = `${correoDeliveryType === 'sucursal' ? 'Retiro en Sucursal Correo: ' + correoBranchInfo : 'Entrega a Domicilio: ' + street + ' ' + streetNumber}, CP: ${postalCode}, ${city}, ${province} (DNI Destinatario: ${dni})`;
    }

    let greetingHeader = settings.whatsappGreetingBuyer
      ? settings.whatsappGreetingBuyer.replace(/{NOMBRE_TIENDA}/g, storeTitle)
      : `¡Hola ${storeTitle}! Te paso mi pedido desde tu catálogo:`;

    let msg = `✨ *${greetingHeader}*\n\n`;
    msg += `👤 *DATOS DEL COMPRADOR:*\n`;
    msg += `• *Nombre:* ${fullName}\n`;
    msg += `• *Teléfono:* ${phone}\n`;
    if (email) msg += `• *Email:* ${email}\n`;
    if (dni) msg += `• *DNI:* ${dni}\n`;

    msg += `\n📦 *FORMA DE ENTREGA:*\n`;
    msg += `• *Tipo:* ${deliveryLabel}\n`;
    msg += `• *Destino:* ${addressSummary}\n`;
    if (deliveryMethod === 'envio_mensajeria') {
      msg += `⚠️ _Nota: El costo de envío a domicilio tiene un recargo adicional según la zona y se abona por WhatsApp._\n`;
    }
    if (deliveryMethod === 'correo_argentino') {
      msg += `🚚 _Nota: El costo de Correo Argentino se cotiza según tu código postal (${postalCode}) y se abona también por WhatsApp._\n`;
    }

    msg += `\n💳 *MÉTODO DE PAGO:* ${paymentMethod === 'transferencia' ? 'Transferencia Bancaria' : 'Efectivo al retirar'}\n`;

    msg += `\n🛒 *DETALLE DEL PEDIDO:*\n`;
    cart.forEach((item, index) => {
      const subtotal = item.calculatedPrice * item.quantity;
      const variantStr = item.selectedVariant ? ` _[Variante: ${item.selectedVariant.name}]_` : '';
      msg += `${index + 1}. *${item.product.name}*${variantStr} x${item.quantity} = ${formatCurrency(subtotal, settings.currency)}\n`;
      if (item.notes) msg += `   _Personalización: ${item.notes}_\n`;
    });

    msg += `\n💰 *SUBTOTAL PRODUCTOS:* ${formatCurrency(totalAmount, settings.currency)}\n`;

    if (paymentMethod === 'transferencia') {
      msg += `\n🏦 *DATOS PARA TRANSFERIR:*\n`;
      msg += `Alias: *${settings.bankAlias}*\n`;
      msg += `CBU/CVU: ${settings.bankCbu}\n`;
      msg += `Titular: ${settings.bankHolder}\n`;
      msg += `Banco: ${settings.bankName}\n`;
    }

    if (customizationNotes.trim()) {
      msg += `\n📝 *Notas adicionales del cliente:* ${customizationNotes}\n`;
    }

    // Save order in database
    const orderItems = cart.map((i) => ({
      productId: i.product.id,
      productName: i.product.name,
      variantId: i.selectedVariant?.id,
      variantName: i.selectedVariant?.name,
      unitPrice: i.calculatedPrice,
      quantity: i.quantity,
      notes: i.notes,
    }));

    addOrder({
      clientName: fullName,
      clientPhone: phone,
      clientEmail: email,
      clientDni: dni,
      clientAddress: addressSummary,
      postalCode: postalCode,
      province: province,
      items: orderItems,
      total: totalAmount,
      status: 'pendiente',
      deliveryMethod,
      deliveryDescription: deliveryLabel,
      notes: customizationNotes ? `Personalizaciones: ${customizationNotes}` : undefined,
    });

    clearCart();
    onClose();

    // Launch WhatsApp
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white dark:bg-[#18141D] h-full shadow-2xl flex flex-col border-l border-pink-100 dark:border-neutral-800 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-pink-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-pink-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Finalizar Compra
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 font-medium">
              {cart.reduce((s, i) => s + i.quantity, 0)} ítems
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-pink-50 dark:bg-neutral-800 flex items-center justify-center text-pink-400">
                <ShoppingBag className="w-8 h-8 opacity-60" />
              </div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Tu carrito está vacío
              </p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Elige productos en el catálogo y agrégalos para completar tu pedido.
              </p>
            </div>
          ) : (
            <>
              {/* Product Items Summary */}
              <div className="space-y-2">
                <p className="font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-[11px]">
                  Productos Seleccionados:
                </p>
                {cart.map((item) => {
                  const itemKey = `${item.product.id}-${item.selectedVariant?.id || 'base'}`;
                  return (
                    <div
                      key={itemKey}
                      className="p-2.5 rounded-xl border border-pink-100 dark:border-neutral-800 bg-pink-50/20 dark:bg-neutral-900/40 flex gap-3 items-center"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg border border-pink-200 dark:border-neutral-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {item.product.name}
                        </p>
                        {item.selectedVariant && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 border border-pink-200/60 dark:border-pink-900/40 truncate">
                              🏷️ {item.selectedVariant.name}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-pink-600 dark:text-pink-400 font-bold tabular-nums mt-0.5">
                          {formatCurrency(item.calculatedPrice, settings.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1, item.selectedVariant?.id)}
                          className="w-6 h-6 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, item.selectedVariant?.id)}
                          className="w-6 h-6 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedVariant?.id)}
                          className="p-1 text-neutral-400 hover:text-rose-500 ml-1 rounded hover:bg-rose-50 dark:hover:bg-neutral-800"
                          title="Eliminar del carrito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SECTION: CLIENT DATA REQUIRED */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-pink-100 dark:border-neutral-800 space-y-2.5">
                <p className="font-bold text-neutral-900 dark:text-neutral-100 text-xs flex items-center gap-1.5">
                  <span>👤</span> Datos del Comprador (Requeridos para la compra)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                      Nombre y Apellido Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Sofía Rossi"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                      Celular / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej. 11 2345-6789"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                      DNI (Para factura y despacho)
                    </label>
                    <input
                      type="text"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      placeholder="Número de documento"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Para recibir el comprobante"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: DELIVERY METHOD SELECTION & CLARIFICATIONS */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-pink-100 dark:border-neutral-800 space-y-3">
                <p className="font-bold text-neutral-900 dark:text-neutral-100 text-xs flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-pink-500" /> Opciones de Entrega & Envíos
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {/* Option 1: Retiro en taller */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('retiro_local')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deliveryMethod === 'retiro_local'
                        ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/40 text-pink-900 dark:text-pink-200 ring-1 ring-pink-500/30'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-pink-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-pink-500" />
                        Retiro en Taller ZOHAR
                      </span>
                      <span className="text-emerald-600 font-bold text-[11px]">GRATIS</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Retiras personalmente en nuestro taller en día y horario a coordinar por WhatsApp.
                    </p>
                  </button>

                  {/* Option 2: Envío a domicilio */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('envio_mensajeria')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deliveryMethod === 'envio_mensajeria'
                        ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/40 text-pink-900 dark:text-pink-200 ring-1 ring-pink-500/30'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-pink-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-pink-500" />
                        Envío a Domicilio Personalizado / Cadete
                      </span>
                      <span className="text-amber-600 font-bold text-[11px]">Costo adicional</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                      ⚠️ <strong>Aclaración importante:</strong> El envío a domicilio tiene un costo adicional según la zona de entrega, el cual se cotiza y se puede abonar también por vía WhatsApp.
                    </p>
                  </button>

                  {/* Option 3: Correo Argentino a todo el país */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('correo_argentino')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deliveryMethod === 'correo_argentino'
                        ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/40 text-pink-900 dark:text-pink-200 ring-1 ring-pink-500/30'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-pink-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-pink-500" />
                        Envíos por Correo Argentino a Todo el País
                      </span>
                      <span className="text-blue-600 font-bold text-[11px]">A todo el país</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 font-medium bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-900/40">
                      📦 <strong>Aclaración de Correo:</strong> Realizamos envíos a cualquier provincia por Correo Argentino. El costo de encomienda se cotiza según tu código postal y lo abonas cómodamente por vía WhatsApp.
                    </p>
                  </button>
                </div>

                {/* Sub-inputs if Home Delivery */}
                {deliveryMethod === 'envio_mensajeria' && (
                  <div className="space-y-2 pt-2 border-t border-pink-100 dark:border-neutral-800 animate-in fade-in duration-150">
                    <p className="font-semibold text-neutral-700 dark:text-neutral-300 text-[11px]">
                      Dirección para el cadete:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Calle *"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="col-span-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Altura *"
                        value={streetNumber}
                        onChange={(e) => setStreetNumber(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Piso / Depto"
                        value={floorApt}
                        onChange={(e) => setFloorApt(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Barrio / Localidad *"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Entre calles o referencias del domicilio"
                      value={crossStreets}
                      onChange={(e) => setCrossStreets(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                )}

                {/* Sub-inputs if Correo Argentino */}
                {deliveryMethod === 'correo_argentino' && (
                  <div className="space-y-2 pt-2 border-t border-pink-100 dark:border-neutral-800 animate-in fade-in duration-150">
                    <p className="font-semibold text-neutral-700 dark:text-neutral-300 text-[11px]">
                      Datos para la guía de Correo Argentino:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Código Postal *"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Provincia *"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Localidad *"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCorreoDeliveryType('domicilio')}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold ${
                          correoDeliveryType === 'domicilio' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-neutral-800'
                        }`}
                      >
                        A Domicilio
                      </button>
                      <button
                        type="button"
                        onClick={() => setCorreoDeliveryType('sucursal')}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold ${
                          correoDeliveryType === 'sucursal' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-neutral-800'
                        }`}
                      >
                        A Sucursal Correo
                      </button>
                    </div>

                    {correoDeliveryType === 'domicilio' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Calle *"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="col-span-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                        />
                        <input
                          type="text"
                          placeholder="Altura *"
                          value={streetNumber}
                          onChange={(e) => setStreetNumber(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Nombre o dirección de la sucursal de Correo Argentino deseada"
                        value={correoBranchInfo}
                        onChange={(e) => setCorreoBranchInfo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* SECTION: PAYMENT METHOD */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-pink-100 dark:border-neutral-800 space-y-2.5">
                <p className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                  Método de Pago:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMethod === 'transferencia'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Transferencia
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMethod === 'efectivo'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Efectivo
                  </button>
                </div>

                {/* Bank alias copy block */}
                {paymentMethod === 'transferencia' && (
                  <div className="p-3 rounded-xl bg-pink-50/70 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-pink-700 dark:text-pink-300 font-semibold uppercase tracking-wider">
                          Alias para Transferir
                        </p>
                        <p className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {settings.bankAlias}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAlias}
                        className="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-pink-100 text-pink-600 border border-pink-200 dark:border-neutral-700 rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                      >
                        {copiedAlias ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedAlias ? '¡Copiado!' : 'Copiar Alias'}
                      </button>
                    </div>
                    <div className="text-[10px] text-neutral-600 dark:text-neutral-300 space-y-0.5 pt-1 border-t border-pink-200/60">
                      <p>Titular: {settings.bankHolder} ({settings.bankName})</p>
                      <p className="font-mono truncate">CBU: {settings.bankCbu}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: CUSTOMIZATION NOTES */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Personalización o indicaciones del pedido:
                </label>
                <textarea
                  rows={2}
                  value={customizationNotes}
                  onChange={(e) => setCustomizationNotes(e.target.value)}
                  placeholder="Ej. Nombre a grabar: 'Martina', color rosa, dedicatoria..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer with Checkout Button */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-pink-100 dark:border-neutral-800 bg-pink-50/50 dark:bg-neutral-900/60 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">Total Productos:</span>
              <span className="text-lg font-bold text-pink-600 dark:text-pink-400 tabular-nums font-mono">
                {formatCurrency(totalAmount, settings.currency)}
              </span>
            </div>

            <button
              onClick={handleSendWhatsAppOrder}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Pedido & Datos por WhatsApp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
