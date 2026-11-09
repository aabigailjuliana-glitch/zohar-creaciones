import jsPDF from 'jspdf';
import { Order, AppSettings, FinancialTransaction, Product } from '../types';
import { formatCurrency, ProductCostBreakdown } from './pricingCalculator';

/**
 * Genera y descarga el PDF de Factura / Comprobante de Venta para un Pedido
 */
export function generateOrderInvoicePdf(order: Order, settings: AppSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Brand & Title
  doc.setFillColor(253, 242, 248); // pink-50
  doc.rect(14, 12, pageWidth - 28, 28, 'F');
  doc.setDrawColor(244, 114, 182); // pink-400
  doc.setLineWidth(0.4);
  doc.rect(14, 12, pageWidth - 28, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(219, 39, 119); // pink-600
  const invoiceBusinessName = (settings.catalogTitle || settings.businessName || 'ZOHAR').toUpperCase();
  doc.text(`✨ ${invoiceBusinessName}`, 20, 24);

  if (settings.catalogTagline) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(settings.catalogTagline, 20, 31);
  }

  // Invoice Meta on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('FACTURA / COMPROBANTE', pageWidth - 22, 22, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(219, 39, 119);
  doc.text(order.invoiceNumber || `FAC-${order.orderNumber}`, pageWidth - 22, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${new Date(order.createdAt).toLocaleDateString('es-AR')}`, pageWidth - 22, 34, { align: 'right' });

  y = 48;

  // Customer & Delivery Information Block
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 26, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 26, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL CLIENTE', 18, y + 6);
  doc.text('MÉTODO DE ENTREGA', pageWidth / 2 + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nombre: ${order.clientName}`, 18, y + 12);
  doc.text(`Teléfono: ${order.clientPhone || 'No especificado'}`, 18, y + 17);
  doc.text(`Dirección: ${order.clientAddress || 'A convenir'}`, 18, y + 22);

  const deliveryLabels: Record<string, string> = {
    retiro_local: 'Retiro en taller ZOHAR',
    correo_argentino: 'Envío por Correo',
    envio_mensajeria: 'Envío por Mensajería / Cadete',
    otro: 'Otro medio',
  };
  doc.text(`Tipo: ${deliveryLabels[order.deliveryMethod] || order.deliveryMethod}`, pageWidth / 2 + 5, y + 12);
  if (order.trackingNumber) {
    doc.text(`Guía/Seguimiento: ${order.trackingNumber}`, pageWidth / 2 + 5, y + 17);
  }
  if (order.deliveryDate) {
    doc.text(`Fecha Entrega: ${new Date(order.deliveryDate).toLocaleDateString('es-AR')}`, pageWidth / 2 + 5, y + 22);
  }

  y += 34;

  // Items Table Header
  doc.setFillColor(236, 72, 153); // pink-500
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPCIÓN', 18, y + 5.5);
  doc.text('CANT', pageWidth - 70, y + 5.5, { align: 'center' });
  doc.text('PRECIO UNIT.', pageWidth - 42, y + 5.5, { align: 'right' });
  doc.text('SUBTOTAL', pageWidth - 20, y + 5.5, { align: 'right' });

  y += 9;

  // Items Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  let subtotalSum = 0;
  for (const item of order.items) {
    const itemTotal = item.unitPrice * item.quantity;
    subtotalSum += itemTotal;

    doc.setFillColor(255, 255, 255);
    doc.rect(14, y - 1, pageWidth - 28, 8, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 7, pageWidth - 14, y + 7);

    doc.text(item.productName.slice(0, 45) + (item.notes ? ` (${item.notes.slice(0, 20)})` : ''), 18, y + 4.5);
    doc.text(String(item.quantity), pageWidth - 70, y + 4.5, { align: 'center' });
    doc.text(formatCurrency(item.unitPrice, settings.currency), pageWidth - 42, y + 4.5, { align: 'right' });
    doc.text(formatCurrency(itemTotal, settings.currency), pageWidth - 20, y + 4.5, { align: 'right' });

    y += 8;
  }

  y += 4;

  // Payments & Summary
  const customerPayableTotal = order.customerTotal || order.total;
  const totalPaid = (order.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, customerPayableTotal - totalPaid);


  // Left: Payments history
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('HISTORIAL DE PAGOS / SEÑAS', 18, y + 4);

  let py = y + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  if (order.payments && order.payments.length > 0) {
    for (const p of order.payments) {
      const pDate = new Date(p.date).toLocaleDateString('es-AR');
      const pMethod = p.method.toUpperCase();
      doc.text(`• ${pDate} - ${pMethod}: ${formatCurrency(p.amount, settings.currency)} ${p.reference ? '(' + p.reference + ')' : ''}`, 18, py);
      py += 5;
    }
  } else {
    doc.text('• Sin pagos registrados hasta la fecha', 18, py);
    py += 5;
  }

  // Bank details notice on left
  py += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(219, 39, 119);
  doc.text('DATOS PARA TRANSFERENCIA BANCARIA:', 18, py);
  py += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Alias: ${settings.bankAlias}`, 18, py);
  py += 4;
  doc.text(`CBU / CVU: ${settings.bankCbu}`, 18, py);
  py += 4;
  doc.text(`Titular: ${settings.bankHolder} (${settings.bankName})`, 18, py);

  // Right: Totals Box (strictly reflects only customer-facing totals; never shows admin private deduction)
  const hasClientDiscount = Boolean(order.clientDiscountAmount && order.clientDiscountAmount > 0);


  const summaryBoxWidth = 76;
  const summaryBoxHeight = hasClientDiscount ? 46 : 38;
  const summaryBoxX = pageWidth - 14 - summaryBoxWidth;
  doc.setFillColor(253, 242, 248);
  doc.rect(summaryBoxX, y, summaryBoxWidth, summaryBoxHeight, 'F');
  doc.setDrawColor(244, 114, 182);
  doc.rect(summaryBoxX, y, summaryBoxWidth, summaryBoxHeight, 'S');

  let sy = y + 7;
  if (hasClientDiscount) {
    const rawSubtotal = order.subtotal || subtotalSum;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', summaryBoxX + 6, sy);
    doc.text(formatCurrency(rawSubtotal, settings.currency), summaryBoxX + summaryBoxWidth - 6, sy, { align: 'right' });

    sy += 6;
    doc.setTextColor(16, 185, 129); // green-600
    doc.text('Descuento Promoción:', summaryBoxX + 6, sy);
    doc.text(`-${formatCurrency(order.clientDiscountAmount || 0, settings.currency)}`, summaryBoxX + summaryBoxWidth - 6, sy, { align: 'right' });

    sy += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Total del Pedido:', summaryBoxX + 6, sy);
  doc.text(formatCurrency(customerPayableTotal, settings.currency), summaryBoxX + summaryBoxWidth - 6, sy, { align: 'right' });

  sy += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Abonado:', summaryBoxX + 6, sy);
  doc.setTextColor(16, 185, 129); // green-600
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalPaid, settings.currency), summaryBoxX + summaryBoxWidth - 6, sy, { align: 'right' });

  sy += 5;
  doc.setDrawColor(244, 114, 182);
  doc.line(summaryBoxX + 6, sy, summaryBoxX + summaryBoxWidth - 6, sy);

  sy += 6;
  doc.setTextColor(219, 39, 119); // pink-600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Saldo Restante:', summaryBoxX + 6, sy);
  doc.setFontSize(10.5);
  doc.text(formatCurrency(remainingBalance, settings.currency), summaryBoxX + summaryBoxWidth - 6, sy, { align: 'right' });

  // Footer Note
  const footerY = 275;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, pageWidth - 14, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`¡Gracias por confiar en ${settings.catalogTitle || settings.businessName || 'ZOHAR'}! Documento electrónico generado automáticamente.`, pageWidth / 2, footerY + 5, { align: 'center' });

  doc.save(`Factura_ZOHAR_${order.orderNumber}.pdf`);
}

/**
 * Genera el Reporte Financiero de Ingresos y Gastos en PDF
 */
export function generateFinancialReportPdf(
  period: 'diario' | 'mensual' | 'anual',
  periodLabel: string,
  transactions: FinancialTransaction[],
  settings: AppSettings,
  openingBalance?: number
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(253, 242, 248);
  doc.rect(14, 12, pageWidth - 28, 24, 'F');
  doc.setDrawColor(244, 114, 182);
  doc.rect(14, 12, pageWidth - 28, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(219, 39, 119);
  doc.text('✨ REPORTE FINANCIERO & FLUJO DE CAJA', 20, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Período: ${periodLabel} (${period.toUpperCase()})`, 20, 29);

  doc.text(`Generado el: ${new Date().toLocaleDateString('es-AR')}`, pageWidth - 22, 26, { align: 'right' });

  y = 44;

  const incomes = transactions.filter((t) => t.type === 'ingreso');
  const expenses = transactions.filter((t) => t.type === 'egreso');

  const totalIncomes = incomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const netBalance = totalIncomes - totalExpenses;

  // Summary Cards (4 cards if openingBalance is provided, else 3)
  const hasOpening = openingBalance !== undefined;
  const cardCount = hasOpening ? 4 : 3;
  const gap = 4;
  const cardWidth = (pageWidth - 28 - (gap * (cardCount - 1))) / cardCount;

  let currentCardX = 14;

  // Card 1: Saldo Inicial / Arrastre del mes anterior (si aplica)
  if (hasOpening) {
    const isPosOpening = openingBalance >= 0;
    doc.setFillColor(isPosOpening ? 239 : 254, isPosOpening ? 246 : 242, isPosOpening ? 255 : 242);
    doc.rect(currentCardX, y, cardWidth, 22, 'F');
    doc.setDrawColor(isPosOpening ? 191 : 254, isPosOpening ? 219 : 202, isPosOpening ? 254 : 202);
    doc.rect(currentCardX, y, cardWidth, 22, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(isPosOpening ? 30 : 153, isPosOpening ? 64 : 27, isPosOpening ? 175 : 27);
    doc.text('SALDO INICIAL', currentCardX + 3.5, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(formatCurrency(openingBalance, settings.currency), currentCardX + 3.5, y + 15);
    currentCardX += cardWidth + gap;
  }

  // Incomes Card
  doc.setFillColor(240, 253, 244);
  doc.rect(currentCardX, y, cardWidth, 22, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.rect(currentCardX, y, cardWidth, 22, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('INGRESOS', currentCardX + 3.5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(hasOpening ? 10.5 : 12);
  doc.text(formatCurrency(totalIncomes, settings.currency), currentCardX + 3.5, y + 15);
  currentCardX += cardWidth + gap;

  // Expenses Card
  doc.setFillColor(254, 242, 242);
  doc.rect(currentCardX, y, cardWidth, 22, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.rect(currentCardX, y, cardWidth, 22, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text('GASTOS', currentCardX + 3.5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(hasOpening ? 10.5 : 12);
  doc.text(formatCurrency(totalExpenses, settings.currency), currentCardX + 3.5, y + 15);
  currentCardX += cardWidth + gap;

  // Final Balance Card (or Net Margin)
  const finalBalanceVal = hasOpening ? (openingBalance + netBalance) : netBalance;
  const isPosFinal = finalBalanceVal >= 0;
  doc.setFillColor(253, 242, 248);
  doc.rect(currentCardX, y, cardWidth, 22, 'F');
  doc.setDrawColor(244, 114, 182);
  doc.rect(currentCardX, y, cardWidth, 22, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(157, 23, 77);
  doc.text(hasOpening ? 'SALDO FINAL CAJA' : 'GANANCIA NETA', currentCardX + 3.5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(hasOpening ? 10.5 : 12);
  doc.text(formatCurrency(finalBalanceVal, settings.currency), currentCardX + 3.5, y + 15);

  y += 30;

  // Transactions Table Header
  doc.setFillColor(71, 85, 105);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FECHA', 18, y + 4.8);
  doc.text('TIPO', 42, y + 4.8);
  doc.text('CATEGORÍA', 65, y + 4.8);
  doc.text('DESCRIPCIÓN', 110, y + 4.8);
  doc.text('MONTO', pageWidth - 20, y + 4.8, { align: 'right' });

  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  for (const tx of transactions.slice(0, 24)) {
    const isInc = tx.type === 'ingreso';
    doc.setFillColor(isInc ? 255 : 250, isInc ? 255 : 250, isInc ? 255 : 250);
    doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 5.5, pageWidth - 14, y + 5.5);

    const tDate = new Date(tx.date).toLocaleDateString('es-AR');
    doc.text(tDate, 18, y + 3.8);
    doc.setTextColor(isInc ? 22 : 185, isInc ? 101 : 28, isInc ? 52 : 28);
    doc.text(isInc ? '+ INGRESO' : '- EGRESO', 42, y + 3.8);
    doc.setTextColor(71, 85, 105);
    doc.text(tx.category.slice(0, 22), 65, y + 3.8);
    doc.text(tx.description.slice(0, 36), 110, y + 3.8);
    doc.setTextColor(isInc ? 22 : 185, isInc ? 101 : 28, isInc ? 52 : 28);
    doc.text(
      (isInc ? '+ ' : '- ') + formatCurrency(tx.amount, settings.currency),
      pageWidth - 20,
      y + 3.8,
      { align: 'right' }
    );

    y += 7;
    if (y > 270) break;
  }

  doc.save(`Reporte_Financiero_ZOHAR_${period}.pdf`);
}

/**
 * Convierte una URL de imagen (local, remota, blob o dataUrl) a base64 DataURL compatible con jsPDF
 */
async function getBase64Image(url?: string): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' } | null> {
  if (!url || typeof url !== 'string' || !url.trim()) return null;

  // 1. Si ya es un data URL de imagen
  if (url.startsWith('data:image/')) {
    const isPng = url.startsWith('data:image/png');
    return { dataUrl: url, format: isPng ? 'PNG' : 'JPEG' };
  }

  // 2. Intentar fetch directo (ideal para rutas relativas locales y URLs en el mismo origen)
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const mime = (blob.type || '').toLowerCase();
      const format: 'JPEG' | 'PNG' = mime.includes('png') ? 'PNG' : 'JPEG';
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { dataUrl, format };
    }
  } catch {
    // Si fetch falla por CORS externo, recurrir a Image + Canvas
  }

  // 3. Fallback con elemento Image y Canvas
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      resolve(null);
    }, 3000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let w = img.naturalWidth || img.width || 200;
        let h = img.naturalHeight || img.height || 200;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, format: 'JPEG' });
      } catch (err) {
        console.warn('Canvas toDataURL falló:', err);
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Genera el Catálogo Interactivo en PDF con la primer imagen del producto, precios detallados y links a WhatsApp
 */
export async function generateInteractiveCatalogPdf(
  products: Product[],
  settings: AppSettings,
  breakdownGetter: (p: Product) => ProductCostBreakdown
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let y = 16;

  // Header Cover Banner
  doc.setFillColor(253, 242, 248); // pink-50
  doc.roundedRect(marginX, y, contentWidth, 32, 3, 3, 'F');
  doc.setDrawColor(244, 114, 182); // pink-400
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, y, contentWidth, 32, 3, 3, 'S');

  // Title & Sparkle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(219, 39, 119); // pink-600
  const pdfTitle = `✨ ${(settings.catalogTitle || settings.businessName || 'Catálogo').toUpperCase()}`;
  doc.text(pdfTitle.slice(0, 48), marginX + 6, y + 10);

  // Tagline & Business Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  if (settings.catalogTagline) {
    doc.text(settings.catalogTagline, marginX + 6, y + 17);
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `WhatsApp: ${settings.ownerPhone} · Alias para transferencias: ${settings.bankAlias} (${settings.bankHolder})`,
    marginX + 6,
    y + 24
  );

  y += 38;

  const catalogProducts = products.filter((p) => p.activeInCatalog);

  for (let i = 0; i < catalogProducts.length; i++) {
    const prod = catalogProducts[i];
    const breakdown = breakdownGetter(prod);

    // Card dimensions
    const cardH = 40;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, y, contentWidth, cardH, 2.5, 2.5, 'F');
    doc.setDrawColor(251, 207, 232); // pink-200
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, y, contentWidth, cardH, 2.5, 2.5, 'S');

    // 1. First Product Image (Left Column)
    const imgX = marginX + 4;
    const imgY = y + 4;
    const imgSize = 32;

    doc.setFillColor(253, 242, 248);
    doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, 'F');
    doc.setDrawColor(244, 114, 182);
    doc.setLineWidth(0.2);
    doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, 'S');

    let imageRendered = false;
    if (prod.imageUrl) {
      const imgObj = await getBase64Image(prod.imageUrl);
      if (imgObj) {
        try {
          doc.addImage(imgObj.dataUrl, imgObj.format, imgX + 0.5, imgY + 0.5, imgSize - 1, imgSize - 1);
          imageRendered = true;
        } catch (e) {
          console.warn('Error al estampar imagen en PDF:', e);
        }
      }
    }

    if (!imageRendered) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(219, 39, 119);
      doc.text(`✨ ${(settings.catalogTitle || settings.businessName || 'ZOHAR').toUpperCase()}`, imgX + imgSize / 2, imgY + imgSize / 2 - 1, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text('Foto Artesanal', imgX + imgSize / 2, imgY + imgSize / 2 + 3.5, { align: 'center' });
    }

    // 2. Middle Section: Category, Name, Description, Stock
    const textX = imgX + imgSize + 5; // ~55mm
    const priceColumnW = 58;
    const availableTextW = contentWidth - (imgSize + 9) - priceColumnW;

    // Category & Subcategory Breadcrumb
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(190, 24, 93); // pink-700
    const catLabel = prod.subcategory
      ? `${prod.category.toUpperCase()} › ${prod.subcategory.toUpperCase()}`
      : prod.category.toUpperCase();
    doc.text(catLabel.slice(0, 45), textX, y + 8);

    // Product Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59); // slate-800
    const splitTitle = doc.splitTextToSize(prod.name, availableTextW);
    doc.text(splitTitle.slice(0, 1), textX, y + 14);

    // Description (cleanly wrapped up to 2 lines)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    const splitDesc = doc.splitTextToSize(prod.description || `Producto artesanal de papelería y diseño ${settings.catalogTitle || settings.businessName || 'ZOHAR'}.`, availableTextW);
    doc.text(splitDesc.slice(0, 2), textX, y + 20);

    // Stock Status
    doc.setFontSize(7);
    if (prod.stock > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text(`● En Stock (${prod.stock} un. disponibles)`, textX, y + 33);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(219, 39, 119); // pink-600
      doc.text('● Elaboración a Pedido Personalizado', textX, y + 33);
    }

    // 3. Right Column: Detailed Pricing & Clickable WhatsApp Button
    const rightColX = marginX + contentWidth - 4;

    // Price Label & Discount Badge
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(breakdown.hasDiscount ? 'PRECIO OFERTA:' : 'PRECIO DETALLADO:', rightColX, y + 8, { align: 'right' });

    if (breakdown.hasDiscount) {
      // Show original price
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      const discountTag = prod.discountType === 'percentage'
        ? `-${prod.discountValue}%`
        : `-${formatCurrency(prod.discountValue || 0, settings.currency)}`;
      doc.text(`Antes: ${formatCurrency(breakdown.effectivePrice, settings.currency)} (${discountTag})`, rightColX, y + 12, { align: 'right' });

      // Final Discounted Price
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(219, 39, 119); // pink-600
      doc.text(formatCurrency(breakdown.finalPrice, settings.currency), rightColX, y + 17.5, { align: 'right' });
    } else {
      // Effective Price
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(219, 39, 119); // pink-600
      doc.text(formatCurrency(breakdown.effectivePrice, settings.currency), rightColX, y + 16, { align: 'right' });
    }

    // Payment note
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Efectivo / Transferencia', rightColX, y + 21, { align: 'right' });

    // Clickable WhatsApp Link Button
    const btnW = 46;
    const btnH = 9;
    const btnX = rightColX - btnW;
    const btnY = y + 24;

    const cleanPhone = settings.ownerPhone.replace(/\D/g, '');
    const storeTitle = settings.catalogTitle?.trim() || settings.businessName || 'Zohar';
    const message = encodeURIComponent(
      `¡Hola ${storeTitle}! ✨ Quiero consultar / pedir: ${prod.name} (${formatCurrency(breakdown.finalPrice, settings.currency)})`
    );
    const waUrl = `https://wa.me/${cleanPhone}?text=${message}`;

    doc.setFillColor(219, 39, 119); // pink-600
    doc.roundedRect(btnX, btnY, btnW, btnH, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('💬 PEDIR POR WHATSAPP', btnX + btnW / 2, btnY + 5.8, { align: 'center' });

    // Make the entire button area interactive in PDF
    doc.link(btnX, btnY, btnW, btnH, { url: waUrl });

    y += cardH + 5;

    // Check page break (leave margin for footer)
    if (y > pageHeight - 35 && i < catalogProducts.length - 1) {
      doc.addPage();
      y = 16;
    }
  }

  // Footer on all pages with page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(244, 114, 182);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${p} de ${totalPages} · ${settings.catalogTitle || settings.businessName || 'ZOHAR'} · Haz clic en cualquier botón para chatear por WhatsApp`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  doc.save(`Catalogo_ZOHAR_${new Date().toISOString().slice(0, 10)}.pdf`);
}
