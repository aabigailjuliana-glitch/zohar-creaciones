export type OrderStatus =
  | 'pendiente'
  | 'en_produccion'
  | 'listo'
  | 'enviado'
  | 'retirado'
  | 'entregado'
  | 'cancelado';

export type DeliveryMethod =
  | 'retiro_local'
  | 'correo_argentino'
  | 'envio_mensajeria'
  | 'otro';

export type PaymentMethodType = 'efectivo' | 'transferencia' | 'otro';

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string; // ej. unidad, metro, pliego, ml, gramo
  unitPrice: number;
  wholesalePrice: number;
  wholesaleMinQty: number;
  supplierId?: string;
  stock?: number;
  notes?: string;
  updatedAt: string;
}

export interface InvisibleCost {
  id: string;
  name: string;
  monthlyCost: number;
  notes?: string;
}

export interface ProductMaterialUsage {
  materialId: string;
  quantity: number;
  useWholesale?: boolean;
}

export interface ProductVariant {
  id: string;
  name: string; // Variación escrita por el admin (ej. Tamaño A5, Pack x50, Rosa Pastel, Talle M)
  price: number; // Precio propio y específico de esta variante
  sku?: string;
  stock?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory?: string; // Subcategoría opcional
  description: string;
  imageUrl: string;
  images?: string[]; // Galería de 1 a 10 fotos del producto
  variants?: ProductVariant[]; // Variantes personalizables con precio propio
  stock: number;
  minStock: number;
  productionMinutes: number; // Tiempo de elaboración en minutos
  materials: ProductMaterialUsage[];
  extraDirectCost: number;
  profitMarginPercent: number; // Porcentaje de ganancia deseado (ej. 40%)
  manualPriceOverride?: number; // Precio fijado si desea sobreescribir la calculadora
  customerPromoEnabled?: boolean; // Activar o desactivar la promoción/descuento visible al cliente
  discountType?: 'percentage' | 'fixed'; // Descuento en porcentaje (%) o en pesos ($)
  discountValue?: number; // Monto o porcentaje de descuento visible al cliente (puede dejarse vacío o 0)
  adminPrivateDeduction?: number; // Resta privada al precio total que SOLO ve el admin y NO los clientes (puede dejarse en 0 o vacío)
  isMadeToOrder?: boolean; // Producto confeccionado a pedido / por encargo
  activeInCatalog: boolean;
  featuredInCatalog?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  date: string;
  method: PaymentMethodType;
  reference?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientDni?: string;
  clientAddress?: string;
  postalCode?: string;
  province?: string;
  items: OrderItem[];
  subtotal?: number; // Subtotal de productos antes de descuentos
  clientDiscountEnabled?: boolean; // Si el descuento al cliente está activo
  clientDiscountType?: 'percentage' | 'fixed'; // Tipo de descuento visible al cliente (% o $)
  clientDiscountValue?: number; // Valor del descuento visible al cliente
  clientDiscountAmount?: number; // Monto en pesos descontado al cliente
  adminPrivateDeduction?: number; // Resta privada que SOLO ve el admin y NO el cliente (puede dejarse en 0 o no anotar)
  customerTotal?: number; // Total que ve y debe pagar el cliente (subtotal - clientDiscountAmount)
  total: number; // Total final registrado para el pedido
  payments: PaymentRecord[];
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  deliveryDescription?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  deliveryDate?: string;
  invoiceNumber?: string;
  accountId?: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'ingreso' | 'egreso';
  category: string;
  amount: number;
  date: string;
  description: string;
  method: PaymentMethodType;
  orderId?: string;
  accountId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  productsSupplied?: string;
  notes?: string;
}

export interface AppSettings {
  businessName: string;
  ownerEmail: string;
  ownerPhone: string; // WhatsApp number
  currency: string;
  hourlyLaborRate: number; // Valor de la hora de trabajo
  monthlyWorkingHours: number; // Horas trabajadas por mes para prorratear costos invisibles
  bankAlias: string;
  bankCbu: string;
  bankHolder: string;
  bankName: string;
  defaultPaymentMessage: string;
  defaultOrderMessage: string;
  darkMode: boolean;
  notificationsEnabled: boolean;
  catalogTitle: string; // Título/Nombre del catálogo mostrado en la portada
  catalogTagline: string; // Subtítulo o etiqueta destacada del catálogo
  catalogDescription: string; // Descripción general y condiciones de envío
  catalogDefaultSort?: CatalogSortOption; // Orden predeterminado elegido por el admin
  catalogGroupByCategory?: boolean; // Si por defecto se muestran agrupados por categoría
  whatsappGreetingBuyer?: string; // Saludo adaptable del cliente al enviar pedido (ej: "¡Hola {NOMBRE_TIENDA}!")
  whatsappGreetingSeller?: string; // Saludo del vendedor al responder (ej: "¡Hola {NOMBRE_CLIENTE}!")
  businessLogoUrl?: string; // URL o Base64 de la imagen del logo del emprendimiento (con o sin fondo)
  businessLogoFit?: 'contain' | 'cover'; // Ajuste estético del logo
  businessLogoBg?: 'transparent' | 'white' | 'dark' | 'glass'; // Fondo para resaltar el logo
  catalogHeaderLayout?: 'square_logo' | 'horizontal_cover'; // Formato de la imagen: cuadrada (logo) o portada horizontal amplia
  catalogCoverUrl?: string; // URL o Base64 de la portada horizontal panorámica
  catalogCoverFit?: 'cover' | 'contain'; // Ajuste estético de la portada
  catalogCoverOverlay?: boolean; // Oscurecer sutilmente la portada para máxima legibilidad del texto
  savedVariantSuggestions?: string[]; // Sugerencias dinámicas aprendidas basadas en las variantes creadas por el usuario
  dismissedVariantSuggestions?: string[]; // Sugerencias predeterminadas que el admin decidió eliminar/ocultar
}

export type CatalogSortOption =
  | 'recientes'
  | 'alfabetico_asc'
  | 'alfabetico_desc'
  | 'precio_menor'
  | 'precio_mayor';

export interface CategoryDefinition {
  id: string;
  name: string;
  subcategories: string[];
}

export interface AdminAccount {
  id: string;
  email: string;
  label: string;
  passwordHash: string; // Plain key check for specific authorized credentials
  settings: AppSettings;
}

export interface CartItem {
  product: Product;
  quantity: number;
  calculatedPrice: number;
  selectedVariant?: ProductVariant;
  notes?: string;
}

export interface CustomerCheckoutForm {
  name: string;
  phone: string;
  email: string;
  dni: string;
  deliveryMethod: DeliveryMethod;
  street: string;
  number: string;
  floorApt: string;
  city: string;
  province: string;
  postalCode: string;
  referenceOrBranch: string;
  paymentMethod: 'transferencia' | 'efectivo';
  notes: string;
}
