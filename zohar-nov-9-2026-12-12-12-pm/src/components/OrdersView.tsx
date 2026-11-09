import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus, DeliveryMethod, PaymentMethodType } from '../types';
import { formatCurrency, calculateRoundingDeduction } from '../utils/pricingCalculator';
import { generateOrderInvoicePdf } from '../utils/pdfGenerator';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Send,
  FileText,
  DollarSign,
  Copy,
  Check,
  Building2,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  BadgePercent,
  Percent,
  Lock,
  Sparkles,
  ClipboardList,
  Pencil,
  LayoutList,
  Calendar,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const {
    orders,
    products,
    clients,
    settings,
    updateOrderStatus,
    addPartialPayment,
    addOrder,
    updateOrder,
    updatePaymentRecord,
    deletePaymentRecord,
    deleteOrder,
    getOrderTotalPaid,
    getOrderPendingBalance,
    getProductBreakdown,
    addToast,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetOrderForPayment, setTargetOrderForPayment] = useState<Order | null>(null);
  const [copiedBankAlias, setCopiedBankAlias] = useState(false);

  // New Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('transferencia');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // New Order Form state
  const [newOrderClientName, setNewOrderClientName] = useState('');
  const [newOrderClientPhone, setNewOrderClientPhone] = useState('');
  const [newOrderClientEmail, setNewOrderClientEmail] = useState('');
  const [newOrderClientAddress, setNewOrderClientAddress] = useState('');
  const [newOrderDeliveryMethod, setNewOrderDeliveryMethod] = useState<DeliveryMethod>('retiro_local');
  const [newOrderTracking, setNewOrderTracking] = useState('');
  const [newOrderDeliveryDate, setNewOrderDeliveryDate] = useState('');
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [newOrderItems, setNewOrderItems] = useState<
    Array<{ productId: string; productName: string; unitPrice: number; quantity: number; notes: string }>
  >([]);
  const [initialDeposit, setInitialDeposit] = useState<number>(0);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<'efectivo' | 'transferencia'>('transferencia');

  // Customer discount state for new order (visible al cliente)
  const [orderClientDiscountEnabled, setOrderClientDiscountEnabled] = useState(false);
  const [orderClientDiscountType, setOrderClientDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [orderClientDiscountValue, setOrderClientDiscountValue] = useState<number>(0);

  // Admin private deduction state for new order (Confidencial: solo para el admin, oculta al cliente)
  const [orderAdminPrivateDeduction, setOrderAdminPrivateDeduction] = useState<number>(0);

  // Vista reducida (compacta) de pedidos para el admin
  const [isCompactView, setIsCompactView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sparkle_orders_compact') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCompactView = (val: boolean) => {
    setIsCompactView(val);
    try {
      localStorage.setItem('sparkle_orders_compact', String(val));
    } catch {
      // ignore
    }
  };

  // Edit Payment State (para editar fecha, monto y método de pago recibido)
  const [editingPaymentInfo, setEditingPaymentInfo] = useState<{
    orderId: string;
    payment: {
      id: string;
      orderId: string;
      amount: number;
      date: string;
      method: PaymentMethodType;
      reference?: string;
      notes?: string;
    };
  } | null>(null);
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethodType>('transferencia');
  const [editPaymentReference, setEditPaymentReference] = useState<string>('');
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>('');

  // Edit Order State (para modificar pedidos existentes cuando el cliente agrega o cambia algo)
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editOrderClientName, setEditOrderClientName] = useState('');
  const [editOrderClientPhone, setEditOrderClientPhone] = useState('');
  const [editOrderClientEmail, setEditOrderClientEmail] = useState('');
  const [editOrderClientAddress, setEditOrderClientAddress] = useState('');
  const [editOrderDeliveryMethod, setEditOrderDeliveryMethod] = useState<DeliveryMethod>('retiro_local');
  const [editOrderTracking, setEditOrderTracking] = useState('');
  const [editOrderDeliveryDate, setEditOrderDeliveryDate] = useState('');
  const [editOrderNotes, setEditOrderNotes] = useState('');
  const [editOrderItems, setEditOrderItems] = useState<
    Array<{ productId: string; productName: string; variantId?: string; variantName?: string; unitPrice: number; quantity: number; notes: string }>
  >([]);
  const [editOrderDiscountEnabled, setEditOrderDiscountEnabled] = useState(false);
  const [editOrderDiscountType, setEditOrderDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [editOrderDiscountValue, setEditOrderDiscountValue] = useState<number>(0);
  const [editOrderAdminPrivateDeduction, setEditOrderAdminPrivateDeduction] = useState<number>(0);


  // Stats
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalPaidSum = 0;
    let pendingSum = 0;
    let inProductionCount = 0;

    orders.forEach((o) => {
      if (o.status !== 'cancelado') {
        totalSales += o.total;
        const paid = getOrderTotalPaid(o);
        totalPaidSum += paid;
        pendingSum += Math.max(0, o.total - paid);
        if (o.status === 'en_produccion' || o.status === 'pendiente') {
          inProductionCount++;
        }
      }
    });

    return { totalSales, totalPaidSum, pendingSum, inProductionCount };
  }, [orders, getOrderTotalPaid]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = statusFilter === 'todos' || order.status === statusFilter;
      const query = searchQuery.toLowerCase();
      const matchQuery =
        order.orderNumber.toLowerCase().includes(query) ||
        order.clientName.toLowerCase().includes(query) ||
        (order.clientPhone && order.clientPhone.toLowerCase().includes(query)) ||
        order.items.some((i) => i.productName.toLowerCase().includes(query));
      return matchStatus && matchQuery;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleCopyAlias = () => {
    navigator.clipboard.writeText(settings.bankAlias);
    setCopiedBankAlias(true);
    addToast('Alias copiado', `${settings.bankAlias} copiado al portapapeles.`, 'success');
    setTimeout(() => setCopiedBankAlias(false), 2000);
  };

  const handleOpenPaymentModal = (order: Order) => {
    const pending = getOrderPendingBalance(order);
    setTargetOrderForPayment(order);
    setPaymentAmount(pending > 0 ? pending : 0);
    setPaymentMethod('transferencia');
    setPaymentReference('');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPartialPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderForPayment) return;
    if (paymentAmount <= 0) {
      addToast('Monto inválido', 'Ingresa un monto mayor a 0.', 'warning');
      return;
    }

    addPartialPayment(targetOrderForPayment.id, {
      amount: Number(paymentAmount),
      method: paymentMethod,
      reference: paymentReference || (paymentMethod === 'transferencia' ? 'Comprobante transfer' : 'Cobro en mano'),
      notes: paymentNotes,
      date: new Date().toISOString(),
    });

    setIsPaymentModalOpen(false);
    setTargetOrderForPayment(null);
  };

  const handleSendWhatsAppOrderDetails = (order: Order) => {
    const customerPayableTotal = order.customerTotal || order.total;
    const paid = getOrderTotalPaid(order);
    const balance = Math.max(0, customerPayableTotal - paid);
    const cleanPhone = (order.clientPhone || '').replace(/\D/g, '');
    const storeTitle = (settings.catalogTitle || settings.businessName || 'Sparkle').trim();

    const deliveryMap: Record<string, string> = {
      retiro_local: `Retiro en Taller (${storeTitle}) (Gratis)`,
      correo_argentino: `Envío por Correo Argentino a todo el país ${order.trackingNumber ? '(Guía: ' + order.trackingNumber + ')' : '(A cotizar por CP vía WhatsApp)'}`,
      envio_mensajeria: 'Envío a Domicilio Personalizado (Costo adicional según zona a abonar vía WhatsApp)',
      otro: 'Otro medio de entrega',
    };

    const greetingTemplate = settings.whatsappGreetingSeller && settings.whatsappGreetingSeller.trim() !== ''
      ? settings.whatsappGreetingSeller
      : `¡Hola {NOMBRE_CLIENTE}! Te comparto el detalle de tu pedido en {NOMBRE_TIENDA}:`;

    const formattedGreeting = greetingTemplate
      .replace(/{NOMBRE_CLIENTE}/g, order.clientName || 'Cliente')
      .replace(/{NOMBRE_TIENDA}/g, storeTitle);

    let msg = `✨ *${storeTitle.toUpperCase()} - DETALLE DE TU PEDIDO*\n`;
    msg += `${formattedGreeting}\n\n`;
    msg += `Pedido: *#${order.orderNumber}*\n`;
    msg += `Cliente: ${order.clientName}\n`;
    msg += `Estado: *${order.status.replace('_', ' ').toUpperCase()}*\n`;
    msg += `Entrega: ${deliveryMap[order.deliveryMethod] || order.deliveryMethod}\n\n`;

    msg += `📋 *Productos:*\n`;
    order.items.forEach((item, index) => {
      msg += `${index + 1}. ${item.productName} (x${item.quantity}) - ${formatCurrency(item.unitPrice * item.quantity, settings.currency)}\n`;
      if (item.notes) msg += `   _Detalle: ${item.notes}_\n`;
    });

    const rawSubtotal = order.subtotal || order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    if (order.clientDiscountAmount && order.clientDiscountAmount > 0) {
      msg += `\n📦 *Subtotal:* ${formatCurrency(rawSubtotal, settings.currency)}\n`;
      msg += `🎁 *Descuento / Promoción:* -${formatCurrency(order.clientDiscountAmount, settings.currency)}\n`;
    }

    msg += `\n💰 *Total a Abonar:* *${formatCurrency(customerPayableTotal, settings.currency)}*\n`;
    msg += `💵 *Abonado (Seña):* ${formatCurrency(paid, settings.currency)}\n`;
    if (balance > 0) {
      msg += `⚠️ *Saldo restante a pagar:* *${formatCurrency(balance, settings.currency)}*\n\n`;
      msg += `🏦 *Datos para transferir el saldo:*\n`;
      msg += `Alias: ${settings.bankAlias}\n`;
      msg += `CBU/CVU: ${settings.bankCbu}\n`;
      msg += `Titular: ${settings.bankHolder}\n`;
      msg += `Banco: ${settings.bankName}\n`;
    } else {
      msg += `✅ *¡Pedido totalmente abonado!*\n`;
    }

    if (order.notes) {
      msg += `\nNotas: ${order.notes}\n`;
    }

    msg += `\n¡Muchas gracias por confiar en ${storeTitle}! 💕✨`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleDownloadInvoice = (order: Order) => {
    generateOrderInvoicePdf(order, settings);
    addToast('Factura generada', `Comprobante de #${order.orderNumber} descargado en PDF.`, 'success');
  };

  // Helper for adding items to new order form with final price and variant support
  const handleAddItemToNewOrder = (selectionKey: string) => {
    const [prodId, varId] = selectionKey.split('::');
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const breakdown = getProductBreakdown(prod);

    let chosenPrice = breakdown.finalPrice; // Resta ya aplicada en el precio final
    let chosenName = prod.name;
    let chosenVarName: string | undefined = undefined;

    if (varId && prod.variants) {
      const v = prod.variants.find((variant) => variant.id === varId);
      if (v) {
        chosenPrice = v.price;
        chosenName = `${prod.name} (${v.name})`;
        chosenVarName = v.name;
      }
    }

    setNewOrderItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: chosenName,
        variantId: varId || undefined,
        variantName: chosenVarName,
        unitPrice: chosenPrice,
        quantity: 1,
        notes: '',
      },
    ]);
  };

  // Helper para abrir y guardar edición de pagos recibidos (fecha, monto, método)
  const handleOpenEditPayment = (orderId: string, payment: Order['payments'][0]) => {
    setEditingPaymentInfo({ orderId, payment });
    setEditPaymentDate(payment.date ? payment.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditPaymentAmount(payment.amount);
    setEditPaymentMethod(payment.method);
    setEditPaymentReference(payment.reference || '');
    setEditPaymentNotes(payment.notes || '');
  };

  const handleSaveEditedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentInfo) return;
    if (editPaymentAmount <= 0) {
      addToast('Monto inválido', 'El monto debe ser mayor a 0.', 'warning');
      return;
    }
    const isoDate = editPaymentDate ? new Date(editPaymentDate).toISOString() : new Date().toISOString();
    updatePaymentRecord(editingPaymentInfo.orderId, editingPaymentInfo.payment.id, {
      date: isoDate,
      amount: Number(editPaymentAmount),
      method: editPaymentMethod,
      reference: editPaymentReference,
      notes: editPaymentNotes,
    });
    setEditingPaymentInfo(null);
  };

  // Helper para abrir y guardar edición de pedidos existentes (agregar/cambiar items, notas, etc.)
  const handleOpenEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditOrderClientName(order.clientName);
    setEditOrderClientPhone(order.clientPhone || '');
    setEditOrderClientEmail(order.clientEmail || '');
    setEditOrderClientAddress(order.clientAddress || '');
    setEditOrderDeliveryMethod(order.deliveryMethod || 'retiro_local');
    setEditOrderTracking(order.trackingNumber || '');
    setEditOrderDeliveryDate(order.deliveryDate || '');
    setEditOrderNotes(order.notes || '');
    setEditOrderItems(order.items ? order.items.map((it) => ({ ...it, notes: it.notes || '' })) : []);
    setEditOrderDiscountEnabled(order.clientDiscountEnabled || false);
    setEditOrderDiscountType(order.clientDiscountType || 'percentage');
    setEditOrderDiscountValue(order.clientDiscountValue || 0);
    setEditOrderAdminPrivateDeduction(order.adminPrivateDeduction || 0);
    setIsEditOrderModalOpen(true);
  };

  const handleAddItemToEditOrder = (selectionKey: string) => {
    const [prodId, varId] = selectionKey.split('::');
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const breakdown = getProductBreakdown(prod);

    let chosenPrice = breakdown.finalPrice; // Resta ya aplicada en el precio final
    let chosenName = prod.name;
    let chosenVarName: string | undefined = undefined;

    if (varId && prod.variants) {
      const v = prod.variants.find((variant) => variant.id === varId);
      if (v) {
        chosenPrice = v.price;
        chosenName = `${prod.name} (${v.name})`;
        chosenVarName = v.name;
      }
    }

    setEditOrderItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: chosenName,
        variantId: varId || undefined,
        variantName: chosenVarName,
        unitPrice: chosenPrice,
        quantity: 1,
        notes: '',
      },
    ]);
  };

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editOrderClientName.trim()) {
      addToast('Nombre requerido', 'Ingresa el nombre del cliente.', 'warning');
      return;
    }
    if (editOrderItems.length === 0) {
      addToast('Productos requeridos', 'El pedido debe contener al menos un producto.', 'warning');
      return;
    }

    const calculatedSubtotal = editOrderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    let clientDiscountAmount = 0;
    if (editOrderDiscountEnabled && editOrderDiscountValue > 0) {
      if (editOrderDiscountType === 'percentage') {
        clientDiscountAmount = Math.round((calculatedSubtotal * (editOrderDiscountValue / 100)) * 100) / 100;
      } else {
        clientDiscountAmount = Math.min(calculatedSubtotal, editOrderDiscountValue);
      }
    }
    const customerPayableTotal = Math.max(0, Math.round((calculatedSubtotal - clientDiscountAmount) * 100) / 100);
    const adminDeduction = Math.max(0, Number(editOrderAdminPrivateDeduction) || 0);
    const netTotal = Math.max(0, Math.round((customerPayableTotal - adminDeduction) * 100) / 100);

    updateOrder(editingOrder.id, {
      clientName: editOrderClientName.trim(),
      clientPhone: editOrderClientPhone.trim(),
      clientEmail: editOrderClientEmail.trim() || undefined,
      clientAddress: editOrderClientAddress.trim() || undefined,
      items: editOrderItems,
      subtotal: calculatedSubtotal,
      clientDiscountEnabled: editOrderDiscountEnabled,
      clientDiscountType: editOrderDiscountType,
      clientDiscountValue: editOrderDiscountValue,
      clientDiscountAmount: clientDiscountAmount,
      adminPrivateDeduction: adminDeduction,
      customerTotal: adminDeduction > 0 ? netTotal : customerPayableTotal,
      total: adminDeduction > 0 ? netTotal : customerPayableTotal,
      deliveryMethod: editOrderDeliveryMethod,
      trackingNumber: editOrderTracking.trim() || undefined,
      deliveryDate: editOrderDeliveryDate.trim() || undefined,
      notes: editOrderNotes.trim() || undefined,
    });

    setIsEditOrderModalOpen(false);
    setEditingOrder(null);
  };

  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderClientName.trim()) {
      addToast('Nombre requerido', 'Ingresa el nombre del cliente.', 'warning');
      return;
    }
    if (newOrderItems.length === 0) {
      addToast('Productos requeridos', 'Agrega al menos un producto al pedido.', 'warning');
      return;
    }

    const calculatedSubtotal = newOrderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    let clientDiscountAmount = 0;
    if (orderClientDiscountEnabled && orderClientDiscountValue > 0) {
      if (orderClientDiscountType === 'percentage') {
        clientDiscountAmount = Math.round((calculatedSubtotal * (orderClientDiscountValue / 100)) * 100) / 100;
      } else {
        clientDiscountAmount = Math.min(calculatedSubtotal, orderClientDiscountValue);
      }
    }
    const customerPayableTotal = Math.max(0, Math.round((calculatedSubtotal - clientDiscountAmount) * 100) / 100);
    const adminDeduction = Math.max(0, Number(orderAdminPrivateDeduction) || 0);
    const netTotal = Math.max(0, Math.round((customerPayableTotal - adminDeduction) * 100) / 100);

    const created = addOrder(
      {
        clientName: newOrderClientName,
        clientPhone: newOrderClientPhone,
        clientEmail: newOrderClientEmail,
        clientAddress: newOrderClientAddress,
        items: newOrderItems,
        subtotal: calculatedSubtotal,
        clientDiscountEnabled: orderClientDiscountEnabled,
        clientDiscountType: orderClientDiscountType,
        clientDiscountValue: orderClientDiscountValue,
        clientDiscountAmount: clientDiscountAmount,
        adminPrivateDeduction: adminDeduction,
        customerTotal: adminDeduction > 0 ? netTotal : customerPayableTotal,
        total: adminDeduction > 0 ? netTotal : customerPayableTotal,
        status: 'pendiente',
        deliveryMethod: newOrderDeliveryMethod,
        trackingNumber: newOrderTracking,
        deliveryDate: newOrderDeliveryDate,
        notes: newOrderNotes,
      },
      initialDeposit,
      initialPaymentMethod
    );

    // Reset form
    setIsNewOrderModalOpen(false);
    setNewOrderClientName('');
    setNewOrderClientPhone('');
    setNewOrderClientEmail('');
    setNewOrderClientAddress('');
    setNewOrderTracking('');
    setNewOrderDeliveryDate('');
    setNewOrderNotes('');
    setNewOrderItems([]);
    setInitialDeposit(0);
    setOrderClientDiscountEnabled(false);
    setOrderClientDiscountType('percentage');
    setOrderClientDiscountValue(0);
    setOrderAdminPrivateDeduction(0);

    // Automatically prompt to download invoice
    handleDownloadInvoice(created);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Gestión de Pedidos & Pagos Parciales
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Control de señas, saldo pendiente de cobro, envíos y facturación electrónica instantánea.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Bank Copy */}
          <button
            onClick={handleCopyAlias}
            className="px-3 py-2 bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-pink-100 transition-colors"
            title="Copiar alias para compartir al cliente"
          >
            {copiedBankAlias ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copiar Alias:</span> {settings.bankAlias}
          </button>

          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Pedido</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Facturado
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
            {formatCurrency(stats.totalSales, settings.currency)}
          </p>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">{orders.length} pedidos registrados</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Cobrado / Señas
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(stats.totalPaidSum, settings.currency)}
          </p>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Ingresado a caja</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 shadow-2xs">
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Saldo por Cobrar
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {formatCurrency(stats.pendingSum, settings.currency)}
          </p>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-300 mt-0.5 block">Pendiente de liquidación</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            En Taller / Producción
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {stats.inProductionCount}
          </p>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Órdenes activas en curso</span>
        </div>
      </div>

      {/* Filter, Search Bar, and View Mode Toggle */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por #pedido, cliente, producto..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendiente', label: 'Pendientes' },
              { id: 'en_produccion', label: 'En Producción' },
              { id: 'listo', label: 'Listos' },
              { id: 'enviado', label: 'Enviados' },
              { id: 'entregado', label: 'Entregados' },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-pink-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Toggle Vista: Detallada vs Reducida */}
          <div className="flex items-center bg-white dark:bg-neutral-900 rounded-xl border border-pink-100 dark:border-neutral-800 p-0.5 shadow-2xs">
            <button
              onClick={() => setIsCompactView(false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                !isCompactView
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              title="Vista con detalles completos de cliente, desglose y comprobante"
            >
              Detallada
            </button>
            <button
              onClick={() => setIsCompactView(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                isCompactView
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              title="Vista reducida con menos información y más compacta para visualizar muchos pedidos"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Reducida</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900/60 rounded-2xl border border-pink-100 dark:border-neutral-800 p-8">
          <Clock className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            No se encontraron pedidos con ese filtro
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Crea tu primer pedido presionando el botón "Nuevo Pedido" arriba.
          </p>
        </div>
      ) : isCompactView ? (
        /* VISTA REDUCIDA (Visualmente más óptima, menos información, rápida) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredOrders.map((order) => {
            const totalPaid = getOrderTotalPaid(order);
            const pendingBalance = getOrderPendingBalance(order);
            const isFullyPaid = pendingBalance <= 0;

            const statusColors: Record<OrderStatus, { bg: string; text: string; label: string }> = {
              pendiente: { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', label: 'Pendiente' },
              en_produccion: { bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-800 dark:text-indigo-300', label: 'En Producción' },
              listo: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', label: 'Listo' },
              enviado: { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-800 dark:text-blue-300', label: 'Enviado' },
              retirado: { bg: 'bg-teal-100 dark:bg-teal-950/60', text: 'text-teal-800 dark:text-teal-300', label: 'Retirado' },
              entregado: { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-800 dark:text-neutral-200', label: 'Entregado' },
              cancelado: { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-800 dark:text-rose-300', label: 'Cancelado' },
            };

            const itemsSummary = order.items && order.items.length > 0
              ? order.items.map(it => `${it.productName} x${it.quantity}`).join(', ')
              : 'Sin productos';

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#18141D] rounded-xl border border-pink-100 dark:border-neutral-800 p-3 shadow-2xs hover:border-pink-300 transition-all flex flex-col justify-between gap-2 text-xs"
              >
                {/* Header: Código, Fecha y Estado */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-extrabold text-neutral-900 dark:text-neutral-100">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate">
                      {new Date(order.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg border border-transparent cursor-pointer focus:outline-none shrink-0 ${
                      statusColors[order.status]?.bg || 'bg-neutral-100'
                    } ${statusColors[order.status]?.text || 'text-neutral-800'}`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_produccion">En Producción</option>
                    <option value="listo">Listo</option>
                    <option value="enviado">Enviado</option>
                    <option value="retirado">Retirado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Cliente & Resumen productos */}
                <div className="space-y-0.5">
                  <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate text-[13px]">
                    {order.clientName}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1" title={itemsSummary}>
                    {itemsSummary}
                  </p>
                </div>

                {/* Total & Saldo */}
                <div className="flex items-center justify-between pt-1 border-t border-pink-50 dark:border-neutral-800/80">
                  <span className="font-extrabold text-pink-600 dark:text-pink-400">
                    {formatCurrency(order.customerTotal || order.total, settings.currency)}
                  </span>

                  {isFullyPaid ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Pagado ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      Saldo: {formatCurrency(pendingBalance, settings.currency)}
                    </span>
                  )}
                </div>

                {/* Botones de acción rápida reducida */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditOrder(order)}
                      className="p-1.5 text-neutral-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Editar pedido (agregar/modificar productos, datos)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {!isFullyPaid && (
                      <button
                        onClick={() => handleOpenPaymentModal(order)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                        title="Anotar pago parcial"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleSendWhatsAppOrderDetails(order)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                      title="Enviar detalle a WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setSelectedOrderForInvoice(order)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Ver Comprobante / Factura"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Eliminar pedido"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DETALLADA */
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const totalPaid = getOrderTotalPaid(order);
            const pendingBalance = getOrderPendingBalance(order);
            const isFullyPaid = pendingBalance <= 0;

            const statusColors: Record<OrderStatus, { bg: string; text: string; label: string }> = {
              pendiente: { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', label: 'Pendiente' },
              en_produccion: { bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-800 dark:text-indigo-300', label: 'En Producción' },
              listo: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', label: 'Listo para Entrega' },
              enviado: { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-800 dark:text-blue-300', label: 'Enviado por Correo' },
              retirado: { bg: 'bg-teal-100 dark:bg-teal-950/60', text: 'text-teal-800 dark:text-teal-300', label: 'Retirado por Cliente' },
              entregado: { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-800 dark:text-neutral-200', label: 'Entregado' },
              cancelado: { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-800 dark:text-rose-300', label: 'Cancelado' },
            };

            const deliveryLabels: Record<DeliveryMethod, string> = {
              retiro_local: 'Retiro en Taller',
              correo_argentino: 'Correo Argentino',
              envio_mensajeria: 'Mensajería / Moto',
              otro: 'Otro medio',
            };

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#18141D] rounded-2xl border border-pink-100 dark:border-neutral-800 p-4 sm:p-5 shadow-xs transition-all space-y-4"
              >
                {/* Top Order Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-50 dark:border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(order.createdAt).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {/* Delivery Method Tag */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/50 px-2.5 py-0.5 rounded-full border border-pink-200 dark:border-pink-800">
                      <Truck className="w-3 h-3 text-pink-500" />
                      {deliveryLabels[order.deliveryMethod]}
                      {order.trackingNumber ? ` (${order.trackingNumber})` : ''}
                    </span>
                  </div>

                  {/* Status Dropdown & Edit Order */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditOrder(order)}
                      className="px-2.5 py-1.5 bg-neutral-100 hover:bg-pink-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      title="Editar productos o datos del pedido"
                    >
                      <Pencil className="w-3.5 h-3.5 text-pink-600" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border border-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                        statusColors[order.status]?.bg || 'bg-neutral-100'
                      } ${statusColors[order.status]?.text || 'text-neutral-800'}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_produccion">En Producción</option>
                      <option value="listo">Listo para Entrega</option>
                      <option value="enviado">Enviado por Correo</option>
                      <option value="retirado">Retirado por Cliente</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>

                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Eliminar pedido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Order Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: Client Info */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Cliente
                    </p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {order.clientName}
                    </p>
                    {order.clientPhone && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                        <span>📱</span> {order.clientPhone}
                      </p>
                    )}
                    {order.clientAddress && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                        📍 {order.clientAddress}
                      </p>
                    )}
                  </div>

                  {/* Column 2: Items Summary */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Productos del Pedido ({order.items.length})
                    </p>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-neutral-700 dark:text-neutral-300 flex justify-between">
                          <span className="truncate max-w-[200px]">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="font-mono font-medium text-neutral-500 tabular-nums">
                            {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Payment & Balance Breakdown */}
                  <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-neutral-900/60 border border-pink-100 dark:border-neutral-800 space-y-1.5">
                    {order.clientDiscountAmount && order.clientDiscountAmount > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatCurrency(order.subtotal || (order.customerTotal || order.total), settings.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-emerald-600 font-semibold">
                          <span className="flex items-center gap-1">
                            <BadgePercent className="w-3 h-3 text-emerald-600" />
                            <span>Descuento al Cliente:</span>
                          </span>
                          <span className="font-mono">-{formatCurrency(order.clientDiscountAmount, settings.currency)}</span>
                        </div>
                      </>
                    ) : null}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-700 dark:text-neutral-300 font-bold flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-pink-500" />
                        <span>Total del Cliente:</span>
                      </span>
                      <span className="font-black text-pink-600 dark:text-pink-400 tabular-nums">
                        {formatCurrency(order.customerTotal || order.total, settings.currency)}
                      </span>
                    </div>

                    {order.adminPrivateDeduction && order.adminPrivateDeduction > 0 ? (
                      <div className="flex items-center justify-between text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800" title="Resta que solo ve el admin y no los clientes">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-purple-600" />
                          <span>Resta Privada:</span>
                        </span>
                        <span className="font-mono">-{formatCurrency(order.adminPrivateDeduction, settings.currency)} · Neto: {formatCurrency(order.total, settings.currency)}</span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-medium">Abonado (Seña):</span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(totalPaid, settings.currency)}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-pink-200/60 dark:border-neutral-700/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Saldo Restante:
                      </span>
                      {isFullyPaid ? (
                        <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ¡PAGADO!
                        </span>
                      ) : (
                        <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatCurrency(pendingBalance, settings.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payments History Strip with Edit Payment Date/Amount */}
                {order.payments && order.payments.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-pink-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-neutral-600 dark:text-neutral-300 mr-1">
                      Historial de Pagos:
                    </span>
                    {order.payments.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-50/70 dark:bg-neutral-800 border border-pink-200/60 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                      >
                        <Calendar className="w-3 h-3 text-pink-500" />
                        <span>{new Date(p.date).toLocaleDateString('es-AR')}</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono">{p.method}</span>
                        <strong className="text-emerald-600 font-bold">{formatCurrency(p.amount, settings.currency)}</strong>
                        {p.reference && <span className="text-neutral-400 text-[10px]">ref: {p.reference}</span>}
                        <button
                          type="button"
                          onClick={() => handleOpenEditPayment(order.id, p)}
                          className="ml-0.5 text-pink-600 hover:text-pink-800 p-0.5 rounded hover:bg-pink-100 dark:hover:bg-neutral-700 transition-colors"
                          title="Editar fecha, monto o detalles de este pago"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('¿Eliminar este registro de pago?')) {
                              deletePaymentRecord(order.id, p.id);
                            }
                          }}
                          className="text-neutral-400 hover:text-rose-500 p-0.5 rounded hover:bg-rose-50 dark:hover:bg-neutral-700 transition-colors"
                          title="Eliminar registro de pago"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-pink-50 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    {/* Add Partial Payment Button */}
                    {!isFullyPaid && (
                      <button
                        onClick={() => handleOpenPaymentModal(order)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Anotar Pago Parcial</span>
                      </button>
                    )}

                    {/* Generate PDF Invoice */}
                    <button
                      onClick={() => handleDownloadInvoice(order)}
                      className="px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-pink-50 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Descargar factura electrónica en PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-pink-500" />
                      <span>Factura PDF</span>
                    </button>

                    <button
                      onClick={() => setSelectedOrderForInvoice(order)}
                      className="px-2.5 py-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-xs font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Comprobante</span>
                    </button>
                  </div>

                  {/* Send WhatsApp Detail Button */}
                  <button
                    onClick={() => handleSendWhatsAppOrderDetails(order)}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enviar Detalle & Alias a WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Anotar Pago Parcial */}
      {isPaymentModalOpen && targetOrderForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18141D] rounded-t-3xl sm:rounded-2xl max-w-md w-full border border-pink-100 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-pink-100 dark:border-neutral-800 px-4 sm:px-6 py-3.5 bg-white dark:bg-[#18141D] shrink-0">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Registrar Pago Parcial
                </h3>
                <p className="text-xs text-neutral-500">
                  Pedido #{targetOrderForPayment.orderNumber} ({targetOrderForPayment.clientName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <form id="partial-payment-form" onSubmit={handleSubmitPartialPayment} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-pink-50/60 dark:bg-neutral-900 border border-pink-100 dark:border-neutral-800 flex justify-between items-center text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400">Saldo pendiente actual:</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {formatCurrency(getOrderPendingBalance(targetOrderForPayment), settings.currency)}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Monto a Ingresar ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={paymentAmount === 0 ? '' : paymentAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setPaymentAmount(raw === '' ? 0 : parseFloat(raw) || 0);
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Método de Pago *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        paymentMethod === 'transferencia'
                          ? 'bg-pink-600 text-white border-pink-600'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Transferencia
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        paymentMethod === 'efectivo'
                          ? 'bg-pink-600 text-white border-pink-600'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Efectivo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Comprobante / Referencia (Opcional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ej. Mercado Pago #889912 o Efectivo en taller"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Notas adicionales
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ej. Seña 50% para compra de materiales"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3 border-t border-pink-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#16121b] shrink-0">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="partial-payment-form"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                Guardar Pago en Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Pedido */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18141D] rounded-t-3xl sm:rounded-2xl max-w-2xl w-full border border-pink-100 dark:border-neutral-800 shadow-2xl flex flex-col h-[94dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-pink-100 dark:border-neutral-800 px-4 sm:px-6 py-3.5 bg-white dark:bg-[#18141D] shrink-0">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-pink-600" />
                  <span>Registrar Nuevo Pedido</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Crea una orden con ítems, cálculo automático y comprobante electrónico.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <form id="new-order-form" onSubmit={handleCreateNewOrder} className="space-y-4">
                {/* Client Selection / Input */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Datos del Cliente *
                    </label>
                    {clients.length > 0 && (
                      <select
                        onChange={(e) => {
                          const c = clients.find((cli) => cli.id === e.target.value);
                          if (c) {
                            setNewOrderClientName(c.name);
                            setNewOrderClientPhone(c.phone);
                            setNewOrderClientEmail(c.email || '');
                            setNewOrderClientAddress(c.address || '');
                          }
                        }}
                        className="text-[11px] text-pink-600 bg-pink-50 dark:bg-pink-950 px-2 py-1 rounded-lg border border-pink-200 dark:border-pink-800"
                      >
                        <option value="">O elegir de Clientes guardados...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={newOrderClientName}
                      onChange={(e) => setNewOrderClientName(e.target.value)}
                      placeholder="Nombre y Apellido *"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                    <input
                      type="tel"
                      value={newOrderClientPhone}
                      onChange={(e) => setNewOrderClientPhone(e.target.value)}
                      placeholder="Teléfono / WhatsApp"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                  <input
                    type="text"
                    value={newOrderClientAddress}
                    onChange={(e) => setNewOrderClientAddress(e.target.value)}
                    placeholder="Dirección de entrega (o 'Retira en taller')"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>

                {/* Delivery and Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                      Forma de Entrega
                    </label>
                    <select
                      value={newOrderDeliveryMethod}
                      onChange={(e) => setNewOrderDeliveryMethod(e.target.value as DeliveryMethod)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    >
                      <option value="retiro_local">Retiro en Taller</option>
                      <option value="correo_argentino">Correo Argentino</option>
                      <option value="envio_mensajeria">Mensajería / Moto</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                      Guía / Seguimiento
                    </label>
                    <input
                      type="text"
                      value={newOrderTracking}
                      onChange={(e) => setNewOrderTracking(e.target.value)}
                      placeholder="N° de envío (opcional)"
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                      Fecha Prometida
                    </label>
                    <input
                      type="date"
                      value={newOrderDeliveryDate}
                      onChange={(e) => setNewOrderDeliveryDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>

                {/* Products to Add */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Productos del Pedido *
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItemToNewOrder(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-[11px] text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950 px-2.5 py-1.5 rounded-xl border border-pink-200 dark:border-pink-800 font-semibold max-w-full"
                    >
                      <option value="">+ Seleccionar Producto o Variante...</option>
                      {products.map((p) => {
                        const breakdown = getProductBreakdown(p);
                        const hasVariants = p.variants && p.variants.length > 0;
                        if (!hasVariants) {
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(breakdown.finalPrice, settings.currency)})
                            </option>
                          );
                        }
                        return (
                          <optgroup key={p.id} label={p.name}>
                            <option value={p.id}>
                              {p.name} (Base: {formatCurrency(breakdown.finalPrice, settings.currency)})
                            </option>
                            {p.variants!.map((v) => (
                              <option key={v.id} value={`${p.id}::${v.id}`}>
                                └ {v.name} ({formatCurrency(v.price, settings.currency)})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>

                  {newOrderItems.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic p-3 text-center bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                      Agrega productos desde el menú desplegable arriba.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 overscroll-contain">
                      {newOrderItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-pink-50/50 dark:bg-neutral-900 border border-pink-100 dark:border-neutral-800 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                              {item.productName}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNewOrderItems(newOrderItems.filter((_, i) => i !== idx))}
                              className="text-neutral-400 hover:text-rose-500 p-1 shrink-0"
                              title="Eliminar ítem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="Personalización / notas (ej. nombre grabado, diseño)"
                            value={item.notes}
                            onChange={(e) => {
                              const updated = [...newOrderItems];
                              updated[idx].notes = e.target.value;
                              setNewOrderItems(updated);
                            }}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-pink-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
                          />

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-pink-100/60 dark:border-neutral-800">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-neutral-500">Cantidad:</span>
                              <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...newOrderItems];
                                    updated[idx].quantity = Math.max(1, (updated[idx].quantity || 1) - 1);
                                    setNewOrderItems(updated);
                                  }}
                                  className="px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                                    const val = raw === '' ? 1 : Math.max(1, parseInt(raw) || 1);
                                    const updated = [...newOrderItems];
                                    updated[idx].quantity = val;
                                    setNewOrderItems(updated);
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-10 px-1 py-0.5 text-center font-bold font-mono text-xs bg-transparent border-0 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...newOrderItems];
                                    updated[idx].quantity = (updated[idx].quantity || 1) + 1;
                                    setNewOrderItems(updated);
                                  }}
                                  className="px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[11px] text-neutral-400 mr-1">Subtotal:</span>
                              <span className="font-mono font-bold text-pink-600 dark:text-pink-400 tabular-nums">
                                {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 1. DESCUENTO O PROMOCIÓN PARA EL CLIENTE (VISIBLE) */}
                <div className="p-3.5 rounded-xl bg-pink-50/70 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orderClientDiscountEnabled}
                        onChange={(e) => {
                          setOrderClientDiscountEnabled(e.target.checked);
                          if (e.target.checked && orderClientDiscountValue === 0) {
                            setOrderClientDiscountValue(10);
                          }
                        }}
                        className="rounded text-pink-600 focus:ring-pink-400"
                      />
                      <BadgePercent className="w-4 h-4 text-pink-500" />
                      <span>¿Aplicar Descuento / Promoción para el Cliente?</span>
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      orderClientDiscountEnabled
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      {orderClientDiscountEnabled ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>Visible al Cliente</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-neutral-400" />
                          <span>Sin descuento</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Aparece en la factura y mensaje del cliente. Puedes activarlo, desactivarlo o dejarlo sin rellenar cuando quieras.
                  </p>

                  {orderClientDiscountEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-pink-100 dark:border-pink-900/40">
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                          Tipo de Descuento
                        </label>
                        <div className="grid grid-cols-2 gap-1 bg-white dark:bg-neutral-900 p-0.5 rounded-lg border border-pink-200 dark:border-neutral-700">
                          <button
                            type="button"
                            onClick={() => setOrderClientDiscountType('percentage')}
                            className={`py-1 text-xs font-bold rounded flex items-center justify-center gap-1 ${
                              orderClientDiscountType === 'percentage'
                                ? 'bg-pink-600 text-white'
                                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'
                            }`}
                          >
                            <Percent className="w-3 h-3" />
                            <span>Porcentaje (%)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderClientDiscountType('fixed')}
                            className={`py-1 text-xs font-bold rounded flex items-center justify-center gap-1 ${
                              orderClientDiscountType === 'fixed'
                                ? 'bg-pink-600 text-white'
                                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'
                            }`}
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Pesos ($)</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                            {orderClientDiscountType === 'percentage' ? 'Porcentaje (%)' : `Monto (${settings.currency})`}
                          </label>
                          <button
                            type="button"
                            onClick={() => setOrderClientDiscountValue(0)}
                            className="text-[10px] text-pink-600 hover:underline font-semibold"
                          >
                            Dejar en 0
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={orderClientDiscountType === 'percentage' ? 100 : undefined}
                            step="any"
                            placeholder="0 (o dejar vacío)"
                            value={orderClientDiscountValue === 0 ? '' : orderClientDiscountValue}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/^0+(?=\d)/, '');
                              setOrderClientDiscountValue(clean === '' ? 0 : parseFloat(clean) || 0);
                            }}
                            className="w-full pl-8 pr-3 py-1.5 text-xs font-bold font-mono rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-emerald-600"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                            {orderClientDiscountType === 'percentage' ? '%' : settings.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. RESTA PRIVADA AL PRECIO TOTAL (SOLO ADMINISTRADOR - PARA NÚMEROS CERRADOS) */}
                <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-600" />
                      <span>Resta para Números Cerrados (Solo Administrador)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {orderAdminPrivateDeduction > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                          Resta activa: -{formatCurrency(orderAdminPrivateDeduction, settings.currency)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setOrderAdminPrivateDeduction(0)}
                        className="text-[10px] text-purple-700 dark:text-purple-300 font-bold hover:underline bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-md"
                      >
                        Dejar en $0
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-purple-700 dark:text-purple-300/80 leading-relaxed">
                    🎯 <strong>Para que los números queden cerrados:</strong> Esta resta se descuenta del total para evitar centavos o terminaciones incómodas (como $75) y dejar el total en un número cerrado. Los clientes en el PDF de factura y WhatsApp solo verán el total cerrado, sin la deducción interna.
                  </p>

                  {/* Quick 1-Click Rounding Suggestions for Orders */}
                  {(() => {
                    const sub = newOrderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                    let disc = 0;
                    if (orderClientDiscountEnabled && orderClientDiscountValue > 0) {
                      if (orderClientDiscountType === 'percentage') {
                        disc = Math.round((sub * (orderClientDiscountValue / 100)) * 100) / 100;
                      } else {
                        disc = Math.min(sub, orderClientDiscountValue);
                      }
                    }
                    const baseToRound = Math.max(0, Math.round((sub - disc) * 100) / 100);
                    if (baseToRound <= 0) return null;

                    const r100 = calculateRoundingDeduction(baseToRound, 100);
                    const r50 = calculateRoundingDeduction(baseToRound, 50);
                    const cents = Math.round((baseToRound - Math.floor(baseToRound)) * 100) / 100;

                    if (r100 === 0 && r50 === 0 && cents === 0) return null;

                    return (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1 py-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>Sugerencias para cerrar número:</span>
                        </span>

                        {r100 > 0 && (
                          <button
                            type="button"
                            onClick={() => setOrderAdminPrivateDeduction(r100)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shadow-2xs"
                          >
                            ⚡ Restar {formatCurrency(r100, settings.currency)} ➔ Queda en {formatCurrency(baseToRound - r100, settings.currency)} cerrado
                          </button>
                        )}

                        {r50 > 0 && r50 !== r100 && (
                          <button
                            type="button"
                            onClick={() => setOrderAdminPrivateDeduction(r50)}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                          >
                            Redondear a $50 (-{formatCurrency(r50, settings.currency)})
                          </button>
                        )}

                        {cents > 0 && (
                          <button
                            type="button"
                            onClick={() => setOrderAdminPrivateDeduction(cents)}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                          >
                            Quitar centavos (-{formatCurrency(cents, settings.currency)})
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <div className="relative pt-0.5">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0 (o escribe el monto a restar, ej. 75)"
                      value={orderAdminPrivateDeduction === 0 ? '' : orderAdminPrivateDeduction}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        setOrderAdminPrivateDeduction(clean === '' ? 0 : parseFloat(clean) || 0);
                      }}
                      className="w-full pl-8 pr-20 py-2 text-xs font-bold font-mono rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-neutral-900 text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      {settings.currency}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrderAdminPrivateDeduction(0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-neutral-400 hover:text-purple-600 px-1.5 py-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      Poner en 0
                    </button>
                  </div>
                </div>

                {/* Deposit / Partial payment at creation */}
                <div className="p-3.5 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Seña o Pago Inicial:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInitialPaymentMethod('transferencia')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          initialPaymentMethod === 'transferencia' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        Transferencia
                      </button>
                      <button
                        type="button"
                        onClick={() => setInitialPaymentMethod('efectivo')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          initialPaymentMethod === 'efectivo' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        Efectivo
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-500">{settings.currency}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={initialDeposit === 0 ? '' : initialDeposit}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/^0+(?=\d)/, '');
                        setInitialDeposit(raw === '' ? 0 : parseFloat(raw) || 0);
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="0 (Si deja seña, se registra automáticamente en caja)"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Dynamic Live Totals Summary */}
                {(() => {
                  const sub = newOrderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                  let disc = 0;
                  if (orderClientDiscountEnabled && orderClientDiscountValue > 0) {
                    if (orderClientDiscountType === 'percentage') {
                      disc = Math.round((sub * (orderClientDiscountValue / 100)) * 100) / 100;
                    } else {
                      disc = Math.min(sub, orderClientDiscountValue);
                    }
                  }
                  const custTot = Math.max(0, Math.round((sub - disc) * 100) / 100);
                  const privDed = Math.max(0, Number(orderAdminPrivateDeduction) || 0);
                  const netTot = Math.max(0, Math.round((custTot - privDed) * 100) / 100);

                  return (
                    <div className="p-3.5 rounded-xl bg-pink-100/60 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                        <span>Subtotal de Productos:</span>
                        <span className="font-mono font-semibold">{formatCurrency(sub, settings.currency)}</span>
                      </div>

                      {disc > 0 && (
                        <div className="flex justify-between items-center text-emerald-600 font-bold">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Descuento al Cliente ({orderClientDiscountType === 'percentage' ? `${orderClientDiscountValue}%` : 'Monto fijo'}):</span>
                          </span>
                          <span className="font-mono">-{formatCurrency(disc, settings.currency)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-baseline pt-1.5 border-t border-pink-200 dark:border-pink-800/80">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-pink-600" />
                          <span>Total que PAGA el Cliente:</span>
                        </span>
                        <span className="text-base font-black text-pink-600 dark:text-pink-400 font-mono tabular-nums">
                          {formatCurrency(custTot, settings.currency)}
                        </span>
                      </div>

                      {privDed > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-dashed border-purple-300 dark:border-purple-800/60 bg-purple-100/50 dark:bg-purple-950/40 p-2.5 rounded-lg space-y-1">
                          <div className="flex justify-between items-center text-purple-700 dark:text-purple-300 font-bold">
                            <span className="flex items-center gap-1">
                              <Lock className="w-3 h-3 text-purple-600" />
                              <span>Resta Privada Admin (Oculta al cliente):</span>
                            </span>
                            <span className="font-mono">-{formatCurrency(privDed, settings.currency)}</span>
                          </div>
                          <div className="flex justify-between items-baseline text-purple-900 dark:text-purple-100 font-extrabold">
                            <span>Total Neto Registrado (Admin):</span>
                            <span className="font-mono font-black">{formatCurrency(netTot, settings.currency)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </form>
            </div>

            {/* Sticky Actions Footer */}
            <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3 border-t border-pink-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#16121b] shrink-0">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="new-order-form"
                className="flex-2 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Crear Pedido & Factura</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vista Previa de Comprobante / Factura */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18141D] rounded-t-3xl sm:rounded-2xl max-w-lg w-full border border-pink-100 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-pink-100 dark:border-neutral-800 px-4 sm:px-6 py-3.5 bg-white dark:bg-[#18141D] shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-500" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Comprobante #{selectedOrderForInvoice.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForInvoice(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              {/* Simulated Receipt Preview */}
              <div className="p-4 rounded-xl border border-pink-200 dark:border-neutral-700 bg-pink-50/20 dark:bg-neutral-900/60 font-mono text-xs space-y-3">
                <div className="text-center border-b border-dashed border-pink-200 dark:border-neutral-700 pb-2">
                  <p className="font-bold text-sm text-pink-600">✨ {(settings.catalogTitle || settings.businessName || 'ZOHAR').toUpperCase()} ✨</p>
                  {settings.catalogTagline ? (
                    <p className="text-[10px] text-neutral-500">{settings.catalogTagline}</p>
                  ) : null}
                  <p className="text-[10px] text-neutral-500">Factura {selectedOrderForInvoice.invoiceNumber}</p>
                </div>

                <div className="space-y-0.5">
                  <p>Cliente: {selectedOrderForInvoice.clientName}</p>
                  <p>Tel: {selectedOrderForInvoice.clientPhone}</p>
                  <p>Fecha: {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString('es-AR')}</p>
                </div>

                <div className="border-t border-b border-dashed border-pink-200 dark:border-neutral-700 py-2 space-y-1">
                  {selectedOrderForInvoice.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-baseline gap-2">
                      <span className="truncate">{it.quantity}x {it.productName}</span>
                      <span className="shrink-0">{formatCurrency(it.unitPrice * it.quantity, settings.currency)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-right">
                  {selectedOrderForInvoice.clientDiscountAmount && selectedOrderForInvoice.clientDiscountAmount > 0 && (
                    <>
                      <p className="text-neutral-500">
                        Subtotal: {formatCurrency(selectedOrderForInvoice.subtotal || (selectedOrderForInvoice.customerTotal || selectedOrderForInvoice.total), settings.currency)}
                      </p>
                      <p className="text-emerald-600 font-bold">
                        Descuento al Cliente: -{formatCurrency(selectedOrderForInvoice.clientDiscountAmount, settings.currency)}
                      </p>
                    </>
                  )}
                  <p className="font-bold text-sm">
                    Total del Pedido: {formatCurrency(selectedOrderForInvoice.customerTotal || selectedOrderForInvoice.total, settings.currency)}
                  </p>
                  <p className="text-emerald-600">
                    Abonado: {formatCurrency(getOrderTotalPaid(selectedOrderForInvoice), settings.currency)}
                  </p>
                  <p className="font-bold text-pink-600">
                    Saldo Restante: {formatCurrency(Math.max(0, (selectedOrderForInvoice.customerTotal || selectedOrderForInvoice.total) - getOrderTotalPaid(selectedOrderForInvoice)), settings.currency)}
                  </p>
                </div>

                <div className="border-t border-dashed border-pink-200 dark:border-neutral-700 pt-2 text-[10px] text-neutral-500 space-y-0.5">
                  <p className="font-semibold text-neutral-700 dark:text-neutral-300">Datos para transferencia:</p>
                  <p>Alias: {settings.bankAlias}</p>
                  <p>CBU: {settings.bankCbu}</p>
                  <p>Titular: {settings.bankHolder}</p>
                </div>
              </div>

              {/* Admin Private Note (strictly internal, never exported to client PDF) */}
              {selectedOrderForInvoice.adminPrivateDeduction && selectedOrderForInvoice.adminPrivateDeduction > 0 ? (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-600" />
                      <span>Nota Confidencial del Administrador</span>
                    </span>
                    <span className="font-mono text-purple-700 dark:text-purple-300">
                      Resta privada: -{formatCurrency(selectedOrderForInvoice.adminPrivateDeduction, settings.currency)}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                    🔒 Esta resta es 100% interna: NO aparece en la Factura PDF del cliente ni en el WhatsApp. Total neto interno: {formatCurrency(selectedOrderForInvoice.total, settings.currency)}.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Sticky Actions Footer */}
            <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3 border-t border-pink-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#16121b] shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadInvoice(selectedOrderForInvoice)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsAppOrderDetails(selectedOrderForInvoice)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Pedido Existente */}
      {isEditOrderModalOpen && editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18141D] rounded-t-3xl sm:rounded-2xl max-w-2xl w-full border border-pink-100 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-pink-100 dark:border-neutral-800 px-4 sm:px-6 py-3.5 bg-white dark:bg-[#18141D] shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-50 dark:bg-pink-950/50 rounded-xl text-pink-600">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Modificar Pedido #{editingOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Añade o cambia productos, variantes, cantidades o datos del cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditOrderModalOpen(false);
                  setEditingOrder(null);
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEditOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
              {/* Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={editOrderClientName}
                    onChange={(e) => setEditOrderClientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editOrderClientPhone}
                    onChange={(e) => setEditOrderClientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={editOrderClientEmail}
                    onChange={(e) => setEditOrderClientEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Dirección de Entrega
                  </label>
                  <input
                    type="text"
                    value={editOrderClientAddress}
                    onChange={(e) => setEditOrderClientAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              {/* Entrega y fecha prometida */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Método de Entrega
                  </label>
                  <select
                    value={editOrderDeliveryMethod}
                    onChange={(e) => setEditOrderDeliveryMethod(e.target.value as DeliveryMethod)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="retiro_local">Retiro en Taller</option>
                    <option value="correo_argentino">Correo Argentino</option>
                    <option value="envio_mensajeria">Mensajería / Moto</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Código de Envío
                  </label>
                  <input
                    type="text"
                    value={editOrderTracking}
                    onChange={(e) => setEditOrderTracking(e.target.value)}
                    placeholder="Ej. CP123456789AR"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Fecha Prometida
                  </label>
                  <input
                    type="date"
                    value={editOrderDeliveryDate}
                    onChange={(e) => setEditOrderDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              {/* Productos en el Pedido */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Productos & Variantes del Pedido ({editOrderItems.length})
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Añade productos o variantes (el precio final con resta se mantendrá intacto)
                    </p>
                  </div>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToEditOrder(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-[11px] text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950 px-2.5 py-1.5 rounded-xl border border-pink-200 dark:border-pink-800 font-semibold"
                  >
                    <option value="">+ Añadir Producto / Variante...</option>
                    {products.map((p) => {
                      const breakdown = getProductBreakdown(p);
                      const hasVariants = p.variants && p.variants.length > 0;
                      if (!hasVariants) {
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(breakdown.finalPrice, settings.currency)})
                          </option>
                        );
                      }
                      return (
                        <optgroup key={p.id} label={p.name}>
                          <option value={p.id}>
                            {p.name} (Base: {formatCurrency(breakdown.finalPrice, settings.currency)})
                          </option>
                          {p.variants!.map((v) => (
                            <option key={v.id} value={`${p.id}::${v.id}`}>
                              └ {v.name} ({formatCurrency(v.price, settings.currency)})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {editOrderItems.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic p-4 text-center bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                    No hay productos en este pedido. Añade al menos uno con el menú de arriba.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {editOrderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-pink-50/40 dark:bg-neutral-900 border border-pink-100 dark:border-neutral-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {item.productName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditOrderItems(editOrderItems.filter((_, i) => i !== idx))}
                            className="text-neutral-400 hover:text-rose-500 p-1 shrink-0"
                            title="Eliminar este ítem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Notas / personalización (ej. color, grabado, talle)"
                          value={item.notes}
                          onChange={(e) => {
                            const updated = [...editOrderItems];
                            updated[idx].notes = e.target.value;
                            setEditOrderItems(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                        />

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-neutral-500">Cantidad:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editOrderItems];
                                updated[idx].quantity = Math.max(1, updated[idx].quantity - 1);
                                setEditOrderItems(updated);
                              }}
                              className="w-6 h-6 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editOrderItems];
                                updated[idx].quantity = updated[idx].quantity + 1;
                                setEditOrderItems(updated);
                              }}
                              className="w-6 h-6 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-neutral-400">c/u: {formatCurrency(item.unitPrice, settings.currency)}</span>
                            <span className="font-bold text-pink-600 dark:text-pink-400 font-mono">
                              Total: {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Descuentos y resta confidencial */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl space-y-2 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={editOrderDiscountEnabled}
                      onChange={(e) => setEditOrderDiscountEnabled(e.target.checked)}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                    <span>Aplicar Descuento al Cliente</span>
                  </label>
                  {editOrderDiscountEnabled && (
                    <div className="flex items-center gap-2">
                      <select
                        value={editOrderDiscountType}
                        onChange={(e) => setEditOrderDiscountType(e.target.value as 'percentage' | 'fixed')}
                        className="text-xs px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      >
                        <option value="percentage">% Porcentaje</option>
                        <option value="fixed">$ Monto Fijo</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={editOrderDiscountValue}
                        onChange={(e) => setEditOrderDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-20 px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Resta Confidencial del Administrador ($)</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={editOrderAdminPrivateDeduction}
                    onChange={(e) => setEditOrderAdminPrivateDeduction(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 px-2 py-1 text-xs rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-mono"
                  />
                </div>
              </div>

              {/* Notas internas */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Notas / Observaciones del Pedido
                </label>
                <textarea
                  rows={2}
                  value={editOrderNotes}
                  onChange={(e) => setEditOrderNotes(e.target.value)}
                  placeholder="Detalles particulares del encargo o entrega..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOrderModalOpen(false);
                    setEditingOrder(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Cambios del Pedido</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Fecha y Monto de Pago Recibido */}
      {editingPaymentInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-md w-full border border-pink-100 dark:border-neutral-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-pink-100 dark:border-neutral-800 px-5 py-4 bg-white dark:bg-[#18141D]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Modificar Fecha & Pago Recibido
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Actualiza la fecha en que se recibió el pago o la seña
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaymentInfo(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Fecha del Pago *
                </label>
                <input
                  type="date"
                  required
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Monto Cobrado ({settings.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-bold text-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Método de Pago
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="tarjeta">Tarjeta de Débito / Crédito</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  N° de Comprobante / Referencia
                </label>
                <input
                  type="text"
                  value={editPaymentReference}
                  onChange={(e) => setEditPaymentReference(e.target.value)}
                  placeholder="Ej. Transf 884920"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  placeholder="Ej. Seña del 50% abonada en taller"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingPaymentInfo(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Fecha y Pago</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
