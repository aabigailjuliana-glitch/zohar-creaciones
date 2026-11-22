import { Material, InvisibleCost, Product, AppSettings } from '../types';

export interface ProductCostBreakdown {
  materialsCost: number;
  materialsDetails: Array<{
    materialName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  productionMinutes: number;
  invisibleCostPerMinute: number;
  invisibleCostTotal: number;
  laborCostPerMinute: number;
  laborCostTotal: number;
  extraDirectCost: number;
  totalProductionCost: number; // Costo base total (materiales + invisibles + mano de obra + extras)
  profitMarginPercent: number;
  profitAmount: number;
  suggestedRetailPrice: number; // Costo base + ganancia
  effectivePrice: number; // suggestedRetailPrice o manualPriceOverride si está activo
  customerPromoEnabled: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number; // Monto descontado al cliente en moneda
  finalPrice: number; // Precio final al cliente (effectivePrice - discountAmount)
  customerFinalPrice: number; // Precio público final que paga el cliente
  hasDiscount: boolean; // Si el descuento al cliente está activo y > 0
  adminPrivateDeduction: number; // Resta privada al total que SOLO ve el admin
  hasAdminDeduction: boolean; // Si el admin configuró una resta privada (> 0)
  adminNetPrice: number; // Precio neto final que le queda al admin tras su resta privada (customerFinalPrice - adminPrivateDeduction)
}

/**
 * Calcula el costo por minuto de los gastos invisibles fijos
 */
export function getInvisibleCostPerMinute(
  invisibleCosts: InvisibleCost[],
  monthlyWorkingHours: number
): number {
  const totalMonthlyCost = invisibleCosts.reduce((sum, item) => sum + (Number(item.monthlyCost) || 0), 0);
  const totalMinutes = Math.max(1, (Number(monthlyWorkingHours) || 160) * 60);
  return totalMonthlyCost / totalMinutes;
}

/**
 * Calcula el desglose completo y precio en tiempo real de un producto
 */
export function calculateProductCost(
  product: Product,
  materialsList: Material[],
  invisibleCosts: InvisibleCost[],
  settings: AppSettings
): ProductCostBreakdown {
  const materialsMap = new Map<string, Material>(materialsList.map((m) => [m.id, m]));

  const materialsDetails: ProductCostBreakdown['materialsDetails'] = [];
  let materialsCost = 0;

  if (Array.isArray(product.materials)) {
    for (const usage of product.materials) {
      const mat = materialsMap.get(usage.materialId);
      if (mat) {
        const isWholesale = usage.useWholesale || (mat.wholesaleMinQty > 0 && usage.quantity >= mat.wholesaleMinQty);
        const price = isWholesale && mat.wholesalePrice > 0 ? mat.wholesalePrice : mat.unitPrice;
        const total = price * usage.quantity;
        materialsCost += total;
        materialsDetails.push({
          materialName: mat.name,
          unit: mat.unit,
          quantity: usage.quantity,
          unitPrice: price,
          total,
        });
      }
    }
  }

  const invisibleCostPerMinute = getInvisibleCostPerMinute(invisibleCosts, settings.monthlyWorkingHours);
  const minutes = Math.max(0, Number(product.productionMinutes) || 0);
  const invisibleCostTotal = minutes * invisibleCostPerMinute;

  const laborCostPerMinute = (Number(settings.hourlyLaborRate) || 0) / 60;
  const laborCostTotal = minutes * laborCostPerMinute;

  const extraDirectCost = Number(product.extraDirectCost) || 0;
  const totalProductionCost = materialsCost + invisibleCostTotal + laborCostTotal + extraDirectCost;

  const profitMarginPercent = Number(product.profitMarginPercent) || 0;
  const profitAmount = totalProductionCost * (profitMarginPercent / 100);

  const suggestedRetailPrice = Math.round((totalProductionCost + profitAmount) * 100) / 100;

  const effectivePrice =
    product.manualPriceOverride && product.manualPriceOverride > 0
      ? product.manualPriceOverride
      : suggestedRetailPrice;

  // 1. Descuento / Promoción visible para el cliente
  // Se puede activar o desactivar, o dejar sin rellenar (0 o vacío)
  const customerPromoEnabled = product.customerPromoEnabled ?? (product.discountValue !== undefined && product.discountValue > 0);
  const discountType = product.discountType || 'percentage';
  const discountValue = Math.max(0, Number(product.discountValue) || 0);
  let discountAmount = 0;

  if (customerPromoEnabled && discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = Math.round((effectivePrice * (discountValue / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(effectivePrice, discountValue);
    }
  }

  const hasDiscount = customerPromoEnabled && discountAmount > 0;

  // 2. Resta para que los números queden en números cerrados (sin centavos ni 75)
  // Esta resta impacta directamente en el total del producto para cerrarlo a un valor limpio
  const adminPrivateDeduction = Math.max(0, Number(product.adminPrivateDeduction) || 0);
  const hasAdminDeduction = adminPrivateDeduction > 0;

  // El precio final del producto se calcula restando el descuento y la resta de ajuste
  const finalPrice = Math.max(
    0,
    Math.round((effectivePrice - discountAmount - adminPrivateDeduction) * 100) / 100
  );

  const customerFinalPrice = finalPrice;
  const adminNetPrice = finalPrice;

  return {
    materialsCost,
    materialsDetails,
    productionMinutes: minutes,
    invisibleCostPerMinute,
    invisibleCostTotal,
    laborCostPerMinute,
    laborCostTotal,
    extraDirectCost,
    totalProductionCost,
    profitMarginPercent,
    profitAmount,
    suggestedRetailPrice,
    effectivePrice,
    customerPromoEnabled,
    discountType,
    discountValue,
    discountAmount,
    finalPrice, // Precio total del producto con la resta aplicada (número cerrado)
    customerFinalPrice,
    hasDiscount,
    adminPrivateDeduction,
    hasAdminDeduction,
    adminNetPrice,
  };
}

/**
 * Calcula la resta sugerida para que un precio quede en un número cerrado (ej. múltiplo de 100, 50, o sin centavos).
 * Si el precio es 4875, sugiere restar 75 para que quede en 4800 cerrado.
 */
export function calculateRoundingDeduction(currentPrice: number, roundTo: number = 100): number {
  if (currentPrice <= 0) return 0;
  const decimalPart = Math.round((currentPrice - Math.floor(currentPrice)) * 100) / 100;
  const intPart = Math.floor(currentPrice);
  const remainder = intPart % roundTo;
  return Math.round((remainder + decimalPart) * 100) / 100;
}


/**
 * Formatea moneda
 */
export function formatCurrency(amount: number, currency: string = '$'): string {
  const validAmount = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${validAmount.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
