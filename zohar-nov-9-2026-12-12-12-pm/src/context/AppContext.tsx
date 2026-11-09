import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Material,
  InvisibleCost,
  Product,
  Order,
  FinancialTransaction,
  Client,
  Supplier,
  AppSettings,
  PaymentRecord,
  CartItem,
  AdminAccount,
  CategoryDefinition,
  ProductVariant,
} from '../types';
import {
  ADMIN_ACCOUNTS,
  INITIAL_MATERIALS,
  INITIAL_INVISIBLE_COSTS,
  INITIAL_PRODUCTS,
  INITIAL_CLIENTS,
  INITIAL_SUPPLIERS,
  INITIAL_ORDERS,
  INITIAL_TRANSACTIONS,
  INITIAL_CATEGORIES,
} from '../utils/initialData';
import { calculateProductCost, ProductCostBreakdown } from '../utils/pricingCalculator';
import {
  subscribeToCollection,
  subscribeToDoc,
  syncItemToFirestore,
  deleteItemFromFirestore,
  initializeStoreOnceIfNeeded,
} from '../services/firebaseService';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

interface AppContextType {
  // State
  materials: Material[];
  invisibleCosts: InvisibleCost[];
  products: Product[];
  categories: CategoryDefinition[];
  orders: Order[];
  transactions: FinancialTransaction[];
  clients: Client[];
  suppliers: Supplier[];
  settings: AppSettings;
  accounts: AdminAccount[];
  currentAccountId: string;
  currentAccount: AdminAccount;
  isAdminUnlocked: boolean;
  toasts: ToastNotification[];
  cart: CartItem[];
  activeView: string;
  isCloudSynced: boolean;
  isSyncing: boolean;
  isInitialLoading: boolean;

  // View Navigation
  setActiveView: (view: string) => void;

  // Multi-account Admin Auth
  loginAdmin: (email: string, password: string) => boolean;
  lockAdmin: () => void;
  switchAccount: (accountId: string) => void;

  // Materials CRUD
  addMaterial: (material: Omit<Material, 'id' | 'updatedAt'>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;

  // Invisible Costs CRUD
  addInvisibleCost: (cost: Omit<InvisibleCost, 'id'>) => void;
  updateInvisibleCost: (id: string, cost: Partial<InvisibleCost>) => void;
  deleteInvisibleCost: (id: string) => void;

  // Products CRUD
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  duplicateProduct: (id: string) => Product | undefined;
  deleteProduct: (id: string) => void;

  // Categories & Subcategories CRUD
  addCategory: (name: string, subcategories?: string[]) => void;
  updateCategory: (categoryId: string, newName: string) => void;
  addSubcategory: (categoryName: string, subcategoryName: string) => void;
  updateSubcategory: (categoryKey: string, oldSubName: string, newSubName: string) => void;
  deleteCategory: (categoryId: string) => void;
  deleteSubcategory: (categoryName: string, subcategoryName: string) => void;

  // Orders CRUD & Payments
  addOrder: (
    order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'payments'>,
    initialPayment?: number,
    paymentMethod?: 'efectivo' | 'transferencia'
  ) => Order;
  updateOrder: (orderId: string, orderData: Partial<Order>) => void;
  updateOrderStatus: (orderId: string, status: Order['status'], trackingNumber?: string) => void;
  addPartialPayment: (orderId: string, payment: Omit<PaymentRecord, 'id' | 'orderId'>) => void;
  updatePaymentRecord: (orderId: string, paymentId: string, paymentData: Partial<PaymentRecord>) => void;
  deletePaymentRecord: (orderId: string, paymentId: string) => void;
  deleteOrder: (orderId: string) => void;

  // Finances CRUD
  addTransaction: (tx: Omit<FinancialTransaction, 'id'>) => void;
  updateTransaction: (id: string, txData: Partial<FinancialTransaction>) => void;
  deleteTransaction: (id: string) => void;

  // Clients & Suppliers
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  importContacts: (contactsList: Array<{ name: string; phone: string; email?: string }>) => number;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Settings & Theme
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleDarkMode: () => void;

  // Cart for Public Catalog
  addToCart: (product: Product, quantity?: number, selectedVariant?: ProductVariant, notes?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;

  // Notifications
  addToast: (title: string, message: string, type?: ToastNotification['type']) => void;
  removeToast: (id: string) => void;

  // Helper getters
  getProductBreakdown: (product: Product) => ProductCostBreakdown;
  invisibleCostPerMinute: number;
  laborCostPerMinute: number;
  getOrderPendingBalance: (order: Order) => number;
  getOrderTotalPaid: (order: Order) => number;

  // Backup & Reset
  exportBackupJson: () => string;
  importBackupJson: (jsonString: string) => boolean;
  resetToDemoData: () => void;
}

const STORAGE_KEY_PREFIX = 'sparkle_app_';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Error loading ${key} from localStorage:`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<AdminAccount[]>(() => {
    const stored = loadFromStorage<AdminAccount[]>('accounts', ADMIN_ACCOUNTS);
    return ADMIN_ACCOUNTS.map((baseAcc) => {
      const existing = stored.find((s) => s.id === baseAcc.id);
      const rawTagline = existing?.settings?.catalogTagline;
      const finalTagline = (!rawTagline || rawTagline === 'Papelería Creativa & Objetos Únicos') ? 'Catálogo Online' : rawTagline;
      return existing
        ? {
            ...existing,
            email: baseAcc.email,
            passwordHash: baseAcc.passwordHash,
            settings: {
              ...baseAcc.settings,
              ...existing.settings,
              ownerEmail: baseAcc.email,
              catalogTitle: existing.settings?.catalogTitle || baseAcc.settings.catalogTitle,
              catalogTagline: finalTagline,
              catalogDescription: existing.settings?.catalogDescription || baseAcc.settings.catalogDescription,
              businessLogoUrl: existing.settings?.businessLogoUrl || '/assets/aistudio/5x5_20261013_095819_0000_df4c0100.png',
              businessLogoFit: existing.settings?.businessLogoFit || 'contain',
              businessLogoBg: existing.settings?.businessLogoBg || 'white',
            },
          }
        : baseAcc;
    });
  });
  const [currentAccountId, setCurrentAccountId] = useState<string>(() =>
    loadFromStorage('current_account_id', 'zohar')
  );

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() =>
    loadFromStorage('is_admin_unlocked', false)
  );

  const [activeView, setActiveView] = useState<string>('catalogo'); // Default to Customer Catalog
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => loadFromStorage('cart', []));

  const [materials, setMaterials] = useState<Material[]>(() =>
    loadFromStorage('materials', INITIAL_MATERIALS)
  );
  const [invisibleCosts, setInvisibleCosts] = useState<InvisibleCost[]>(() =>
    loadFromStorage('invisible_costs', INITIAL_INVISIBLE_COSTS)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage('products', INITIAL_PRODUCTS)
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    loadFromStorage('orders', INITIAL_ORDERS)
  );
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() =>
    loadFromStorage('transactions', INITIAL_TRANSACTIONS)
  );
  const [clients, setClients] = useState<Client[]>(() =>
    loadFromStorage('clients', INITIAL_CLIENTS)
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadFromStorage('suppliers', INITIAL_SUPPLIERS)
  );
  const [categories, setCategories] = useState<CategoryDefinition[]>(() =>
    loadFromStorage('categories', INITIAL_CATEGORIES)
  );

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Active account resolution
  const currentAccount = useMemo(() => {
    return accounts.find((a) => a.id === currentAccountId) || accounts[0] || ADMIN_ACCOUNTS[0];
  }, [accounts, currentAccountId]);

  const settings = currentAccount.settings;

  // Sync state to local storage on changes as resilient offline cache
  useEffect(() => saveToStorage('accounts', accounts), [accounts]);
  useEffect(() => saveToStorage('current_account_id', currentAccountId), [currentAccountId]);
  useEffect(() => saveToStorage('is_admin_unlocked', isAdminUnlocked), [isAdminUnlocked]);
  useEffect(() => saveToStorage('materials', materials), [materials]);
  useEffect(() => saveToStorage('invisible_costs', invisibleCosts), [invisibleCosts]);
  useEffect(() => saveToStorage('products', products), [products]);
  useEffect(() => saveToStorage('categories', categories), [categories]);
  useEffect(() => saveToStorage('orders', orders), [orders]);
  useEffect(() => saveToStorage('transactions', transactions), [transactions]);
  useEffect(() => saveToStorage('clients', clients), [clients]);
  useEffect(() => saveToStorage('suppliers', suppliers), [suppliers]);
  useEffect(() => saveToStorage('cart', cart), [cart]);

  // Dark mode class sync with HTML root
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Real-time Firestore Subscriptions: Auto-synchronizes with all devices
  useEffect(() => {
    setIsSyncing(true);

    const initialLoadingTimer = setTimeout(() => {
      setIsInitialLoading(false);
      setIsSyncing(false);
    }, 1200);

    // Initial check: seed ONCE only if system has never ever been initialized.
    // If the database has already been initialized, this will NEVER re-seed or overwrite anything.
    const initCloud = async () => {
      try {
        const initialSettingsMap: Record<string, Partial<AppSettings>> = {};

        ADMIN_ACCOUNTS.forEach((a) => {
          initialSettingsMap[a.id] = a.settings;
        });

        await initializeStoreOnceIfNeeded({
          products: INITIAL_PRODUCTS,
          categories: INITIAL_CATEGORIES,
          materials: INITIAL_MATERIALS,
          invisibleCosts: INITIAL_INVISIBLE_COSTS,
          orders: INITIAL_ORDERS,
          transactions: INITIAL_TRANSACTIONS,
          clients: INITIAL_CLIENTS,
          suppliers: INITIAL_SUPPLIERS,
          settingsMap: initialSettingsMap,
        });
      } catch (err) {
        console.warn('Initial Firestore setup check:', err);
      }
    };
    initCloud();

    // Subscribe to products (Unconditionally updates state, even if empty [])
    const unsubProducts = subscribeToCollection<Product>('products', (cloudProducts) => {
      setProducts(cloudProducts);
      setIsCloudSynced(true);
      setIsSyncing(false);
      setIsInitialLoading(false);
    });

    // Subscribe to categories (Unconditionally updates state, even if empty [])
    const unsubCategories = subscribeToCollection<CategoryDefinition>('categories', (cloudCats) => {
      setCategories(cloudCats);
      setIsCloudSynced(true);
      setIsSyncing(false);
    });

    // Subscribe to materials (Unconditionally updates state, even if empty [])
    const unsubMaterials = subscribeToCollection<Material>('materials', (cloudMaterials) => {
      setMaterials(cloudMaterials);
      setIsCloudSynced(true);
    });

    // Subscribe to invisible costs (Unconditionally updates state, even if empty [])
    const unsubCosts = subscribeToCollection<InvisibleCost>('invisibleCosts', (cloudCosts) => {
      setInvisibleCosts(cloudCosts);
      setIsCloudSynced(true);
    });

    // Subscribe to orders (Unconditionally updates state, even if empty [])
    const unsubOrders = subscribeToCollection<Order>('orders', (cloudOrders) => {
      cloudOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(cloudOrders);
      setIsCloudSynced(true);
    });

    // Subscribe to financial transactions (Unconditionally updates state, even if empty [])
    const unsubTx = subscribeToCollection<FinancialTransaction>('transactions', (cloudTx) => {
      cloudTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(cloudTx);
      setIsCloudSynced(true);
    });

    // Subscribe to clients (Unconditionally updates state, even if empty [])
    const unsubClients = subscribeToCollection<Client>('clients', (cloudClients) => {
      setClients(cloudClients);
      setIsCloudSynced(true);
    });

    // Subscribe to suppliers (Unconditionally updates state, even if empty [])
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', (cloudSuppliers) => {
      setSuppliers(cloudSuppliers);
      setIsCloudSynced(true);
    });

    // Subscribe to global store settings (merges settings saved in cloud and syncs across all devices)
    const unsubSettings = subscribeToDoc<Record<string, any>>(
      'settings',
      'storeSettings',
      (cloudSettingsMap) => {
        if (cloudSettingsMap) {
          const cloudActiveAccId = (cloudSettingsMap.activeAccountId as string) || undefined;
          const activeCatalogPatch =
            (cloudSettingsMap.activeCatalogSettings as Partial<AppSettings> | undefined) ||
            (cloudActiveAccId ? (cloudSettingsMap[cloudActiveAccId] as Partial<AppSettings> | undefined) : undefined) ||
            (cloudSettingsMap['zohar'] as Partial<AppSettings> | undefined) ||
            (cloudSettingsMap['shaddai'] as Partial<AppSettings> | undefined);

          if (cloudActiveAccId) {
            setCurrentAccountId(cloudActiveAccId);
          }

          setAccounts((prevAccounts) =>
            prevAccounts.map((acc) => {
              const accPatch = cloudSettingsMap[acc.id];
              const resolvedActiveTitle = activeCatalogPatch?.catalogTitle || activeCatalogPatch?.businessName;
              // Merge both account-specific data and active catalog branding
              return {
                ...acc,
                label: (acc.id === cloudActiveAccId && resolvedActiveTitle) ? resolvedActiveTitle : acc.label,
                settings: {
                  ...acc.settings,
                  ...(accPatch || {}),
                  ...(activeCatalogPatch || {}),
                  ...(activeCatalogPatch
                    ? {
                        catalogTitle: activeCatalogPatch.catalogTitle ?? activeCatalogPatch.businessName ?? acc.settings.catalogTitle,
                        businessName: activeCatalogPatch.businessName ?? activeCatalogPatch.catalogTitle ?? acc.settings.businessName,
                        catalogTagline: activeCatalogPatch.catalogTagline ?? acc.settings.catalogTagline,
                        catalogDescription: activeCatalogPatch.catalogDescription ?? acc.settings.catalogDescription,
                        businessLogoUrl: activeCatalogPatch.businessLogoUrl !== undefined ? activeCatalogPatch.businessLogoUrl : acc.settings.businessLogoUrl,
                        businessLogoFit: activeCatalogPatch.businessLogoFit ?? acc.settings.businessLogoFit,
                        businessLogoBg: activeCatalogPatch.businessLogoBg ?? acc.settings.businessLogoBg,
                        catalogHeaderLayout: activeCatalogPatch.catalogHeaderLayout ?? acc.settings.catalogHeaderLayout,
                        catalogCoverUrl: activeCatalogPatch.catalogCoverUrl !== undefined ? activeCatalogPatch.catalogCoverUrl : acc.settings.catalogCoverUrl,
                        catalogCoverFit: activeCatalogPatch.catalogCoverFit ?? acc.settings.catalogCoverFit,
                        catalogCoverOverlay: activeCatalogPatch.catalogCoverOverlay !== undefined ? activeCatalogPatch.catalogCoverOverlay : acc.settings.catalogCoverOverlay,
                        bankAlias: activeCatalogPatch.bankAlias ?? acc.settings.bankAlias,
                        bankCbu: activeCatalogPatch.bankCbu ?? acc.settings.bankCbu,
                        bankHolder: activeCatalogPatch.bankHolder ?? acc.settings.bankHolder,
                        bankName: activeCatalogPatch.bankName ?? acc.settings.bankName,
                        ownerPhone: activeCatalogPatch.ownerPhone ?? acc.settings.ownerPhone,
                        currency: activeCatalogPatch.currency ?? acc.settings.currency,
                        catalogDefaultSort: activeCatalogPatch.catalogDefaultSort ?? acc.settings.catalogDefaultSort,
                        catalogGroupByCategory: activeCatalogPatch.catalogGroupByCategory !== undefined ? activeCatalogPatch.catalogGroupByCategory : acc.settings.catalogGroupByCategory,
                        savedVariantSuggestions: activeCatalogPatch.savedVariantSuggestions ?? acc.settings.savedVariantSuggestions,
                      }
                    : {}),
                },
              };
            })
          );
          setIsCloudSynced(true);
        }
      }
    );

    return () => {
      clearTimeout(initialLoadingTimer);
      unsubProducts();
      unsubCategories();
      unsubMaterials();
      unsubCosts();
      unsubOrders();
      unsubTx();
      unsubClients();
      unsubSuppliers();
      unsubSettings();
    };
  }, []);

  // Toast dispatch helper
  const addToast = useCallback((title: string, message: string, type: ToastNotification['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Multi-account Admin Auth
  const loginAdmin = useCallback(
    (email: string, password: string): boolean => {
      const cleanEmail = email.toLowerCase().trim();
      const targetAcc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

      if (!targetAcc) {
        addToast('Cuenta no encontrada', 'Verifica el correo ingresado.', 'error');
        return false;
      }

      if (targetAcc.passwordHash !== password) {
        addToast('Contraseña incorrecta', 'La clave no coincide para este usuario.', 'error');
        return false;
      }

      setCurrentAccountId(targetAcc.id);
      setIsAdminUnlocked(true);
      setActiveView('pedidos');
      addToast(
        '¡Bienvenida!',
        `Ingresaste como ${targetAcc.label} (${targetAcc.email}).`,
        'success'
      );
      return true;
    },
    [accounts, addToast]
  );

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false);
    setActiveView('catalogo');
    addToast('Modo Catálogo Activo', 'Panel administrativo cerrado. Vista de cliente habilitada.', 'info');
  }, [addToast]);

  const switchAccount = useCallback(
    (accountId: string) => {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        setCurrentAccountId(acc.id);
        addToast('Cuenta cambiada', `Ahora administrando: ${acc.label}`, 'info');
      }
    },
    [accounts, addToast]
  );

  // Settings & Theme
  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setAccounts((prev) => {
        const next = prev.map((acc) => {
          if (acc.id === currentAccountId) {
            // Keep catalogTitle and businessName perfectly synchronized
            const resolvedPatch = { ...patch };
            if (patch.catalogTitle && !patch.businessName) {
              resolvedPatch.businessName = patch.catalogTitle;
            } else if (patch.businessName && !patch.catalogTitle) {
              resolvedPatch.catalogTitle = patch.businessName;
            }

            const updatedSettings = {
              ...acc.settings,
              ...resolvedPatch,
            };

            const updatedLabel = updatedSettings.catalogTitle || updatedSettings.businessName || acc.label;

            // Sync to Firestore immediately so all devices (client and admin) receive the changes
            syncItemToFirestore('settings', 'storeSettings', {
              [currentAccountId]: updatedSettings,
              activeAccountId: currentAccountId,
              activeCatalogSettings: updatedSettings,
            });
            return {
              ...acc,
              label: updatedLabel,
              settings: updatedSettings,
            };
          }
          return acc;
        });
        return next;
      });
    },
    [currentAccountId]
  );

  const toggleDarkMode = useCallback(() => {
    updateSettings({ darkMode: !settings.darkMode });
  }, [settings.darkMode, updateSettings]);

  // Pricing Helpers
  const invisibleCostPerMinute = useMemo(() => {
    const total = invisibleCosts.reduce((acc, c) => acc + (Number(c.monthlyCost) || 0), 0);
    const mins = Math.max(1, (settings.monthlyWorkingHours || 160) * 60);
    return total / mins;
  }, [invisibleCosts, settings.monthlyWorkingHours]);

  const laborCostPerMinute = useMemo(() => {
    return (Number(settings.hourlyLaborRate) || 0) / 60;
  }, [settings.hourlyLaborRate]);

  const getProductBreakdown = useCallback(
    (product: Product) => {
      return calculateProductCost(product, materials, invisibleCosts, settings);
    },
    [materials, invisibleCosts, settings]
  );

  const getOrderTotalPaid = useCallback((order: Order): number => {
    if (!order.payments || !Array.isArray(order.payments)) return 0;
    return order.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, []);

  const getOrderPendingBalance = useCallback(
    (order: Order): number => {
      const paid = getOrderTotalPaid(order);
      return Math.max(0, (Number(order.total) || 0) - paid);
    },
    [getOrderTotalPaid]
  );

  // Materials handlers with instant Cloud Sync
  const addMaterial = useCallback((matData: Omit<Material, 'id' | 'updatedAt'>) => {
    const newMat: Material = {
      ...matData,
      id: 'mat-' + Date.now(),
      updatedAt: new Date().toISOString(),
    };
    setMaterials((prev) => [newMat, ...prev]);
    syncItemToFirestore('materials', newMat.id, newMat as unknown as Record<string, unknown>);
    addToast('Material agregado', `${newMat.name} fue registrado con éxito.`, 'success');
  }, [addToast]);

  const updateMaterial = useCallback((id: string, patch: Partial<Material>) => {
    setMaterials((prev) => {
      const updated = prev.map((m) => {
        if (m.id === id) {
          const item = { ...m, ...patch, updatedAt: new Date().toISOString() };
          syncItemToFirestore('materials', id, item as unknown as Record<string, unknown>);
          return item;
        }
        return m;
      });
      return updated;
    });
  }, []);

  const deleteMaterial = useCallback((id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    deleteItemFromFirestore('materials', id);
  }, []);

  // Invisible Costs handlers with instant Cloud Sync
  const addInvisibleCost = useCallback((costData: Omit<InvisibleCost, 'id'>) => {
    const newCost: InvisibleCost = {
      ...costData,
      id: 'inv-' + Date.now(),
    };
    setInvisibleCosts((prev) => [...prev, newCost]);
    syncItemToFirestore('invisibleCosts', newCost.id, newCost as unknown as Record<string, unknown>);
  }, []);

  const updateInvisibleCost = useCallback((id: string, patch: Partial<InvisibleCost>) => {
    setInvisibleCosts((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          const item = { ...c, ...patch };
          syncItemToFirestore('invisibleCosts', id, item as unknown as Record<string, unknown>);
          return item;
        }
        return c;
      });
      return updated;
    });
  }, []);

  const deleteInvisibleCost = useCallback((id: string) => {
    setInvisibleCosts((prev) => prev.filter((c) => c.id !== id));
    deleteItemFromFirestore('invisibleCosts', id);
  }, []);

  // Products handlers with instant Cloud Sync
  const addProduct = useCallback((prodData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newProd: Product = {
      ...prodData,
      id: 'prod-' + Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    setProducts((prev) => [newProd, ...prev]);
    syncItemToFirestore('products', newProd.id, newProd as unknown as Record<string, unknown>);
    addToast('Producto guardado', `${newProd.name} se sincronizó en todos los dispositivos.`, 'success');
  }, [addToast]);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const item = { ...p, ...patch, updatedAt: new Date().toISOString() };
          syncItemToFirestore('products', id, item as unknown as Record<string, unknown>);
          return item;
        }
        return p;
      });
      return updated;
    });
  }, []);

  const duplicateProduct = useCallback((id: string) => {
    let duplicatedProduct: Product | undefined = undefined;

    setProducts((prev) => {
      const source = prev.find((p) => p.id === id);
      if (!source) return prev;

      const now = new Date().toISOString();
      const uniqueSuffix = Date.now().toString().slice(-4);
      const newSku = source.sku ? `${source.sku}-C${uniqueSuffix}` : `PROD-${uniqueSuffix}`;
      const rawName = source.name.trim();
      const newName = `${rawName} (Copia)`;

      duplicatedProduct = {
        ...source,
        id: `prod-${Date.now()}`,
        sku: newSku,
        name: newName,
        images: source.images ? [...source.images] : (source.imageUrl ? [source.imageUrl] : []),
        variants: source.variants ? source.variants.map((v) => ({ ...v })) : [],
        materials: source.materials ? source.materials.map((m) => ({ ...m })) : [],
        createdAt: now,
        updatedAt: now,
      };

      syncItemToFirestore('products', duplicatedProduct.id, duplicatedProduct as unknown as Record<string, unknown>);
      return [duplicatedProduct, ...prev];
    });

    if (duplicatedProduct) {
      addToast('Producto duplicado ✨', `Se creó una copia de "${(duplicatedProduct as Product).name}".`, 'success');
    }
    return duplicatedProduct;
  }, [addToast]);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteItemFromFirestore('products', id);
    addToast('Producto eliminado', 'El producto se quitó de todos los dispositivos.', 'info');
  }, [addToast]);

  // Categories & Subcategories Handlers with instant Cloud Sync
  const addCategory = useCallback(
    (name: string, subcategories: string[] = []) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setCategories((prev) => {
        const exists = prev.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) return prev;
        const newCat: CategoryDefinition = {
          id: `cat-${Date.now()}`,
          name: trimmed,
          subcategories: subcategories.map((s) => s.trim()).filter(Boolean),
        };
        syncItemToFirestore('categories', newCat.id, newCat as unknown as Record<string, unknown>);
        return [...prev, newCat];
      });
      addToast('Categoría creada', `"${trimmed}" sincronizada en todos los dispositivos.`, 'success');
    },
    [addToast]
  );

  const updateCategory = useCallback(
    (categoryId: string, newName: string) => {
      const trimmedNew = newName.trim();
      if (!categoryId || !trimmedNew) return;

      setCategories((prev) => {
        const catIndex = prev.findIndex((c) => c.id === categoryId);
        if (catIndex < 0) return prev;
        const oldCat = prev[catIndex];
        const oldName = oldCat.name;
        if (oldName === trimmedNew) return prev;

        const updatedCat = {
          ...oldCat,
          name: trimmedNew,
        };
        syncItemToFirestore('categories', updatedCat.id, updatedCat as unknown as Record<string, unknown>);

        // Sincronizar actualización de categoría en todos los productos existentes
        setProducts((prodPrev) =>
          prodPrev.map((p) => {
            if (p.category && p.category.toLowerCase() === oldName.toLowerCase()) {
              const updatedProd = { ...p, category: trimmedNew, updatedAt: new Date().toISOString() };
              syncItemToFirestore('products', p.id, updatedProd as unknown as Record<string, unknown>);
              return updatedProd;
            }
            return p;
          })
        );

        const updated = [...prev];
        updated[catIndex] = updatedCat;
        return updated;
      });
      addToast('Categoría modificada', `Se renombró a "${trimmedNew}".`, 'success');
    },
    [addToast]
  );

  const addSubcategory = useCallback(
    (categoryKey: string, subcategoryName: string) => {
      const trimmedKey = categoryKey.trim();
      const trimmedSub = subcategoryName.trim();
      if (!trimmedKey || !trimmedSub) return;

      setCategories((prev) => {
        const catIndex = prev.findIndex(
          (c) => c.id === trimmedKey || c.name.toLowerCase() === trimmedKey.toLowerCase()
        );
        if (catIndex >= 0) {
          const cat = prev[catIndex];
          if (cat.subcategories.some((s) => s.toLowerCase() === trimmedSub.toLowerCase())) {
            return prev;
          }
          const updatedCat = {
            ...cat,
            subcategories: [...cat.subcategories, trimmedSub],
          };
          syncItemToFirestore('categories', updatedCat.id, updatedCat as unknown as Record<string, unknown>);
          const updated = [...prev];
          updated[catIndex] = updatedCat;
          return updated;
        } else {
          const newCat: CategoryDefinition = {
            id: `cat-${Date.now()}`,
            name: trimmedKey,
            subcategories: [trimmedSub],
          };
          syncItemToFirestore('categories', newCat.id, newCat as unknown as Record<string, unknown>);
          return [...prev, newCat];
        }
      });
      addToast('Subcategoría agregada', `"${trimmedSub}" agregada con éxito.`, 'success');
    },
    [addToast]
  );

  const updateSubcategory = useCallback(
    (categoryKey: string, oldSubName: string, newSubName: string) => {
      const trimmedKey = categoryKey.trim();
      const trimmedOld = oldSubName.trim();
      const trimmedNew = newSubName.trim();
      if (!trimmedKey || !trimmedOld || !trimmedNew || trimmedOld === trimmedNew) return;

      setCategories((prev) => {
        const catIndex = prev.findIndex(
          (c) => c.id === trimmedKey || c.name.toLowerCase() === trimmedKey.toLowerCase()
        );
        if (catIndex < 0) return prev;
        const cat = prev[catIndex];
        const updatedSubs = cat.subcategories.map((s) => (s.toLowerCase() === trimmedOld.toLowerCase() ? trimmedNew : s));
        const updatedCat = {
          ...cat,
          subcategories: updatedSubs,
        };
        syncItemToFirestore('categories', updatedCat.id, updatedCat as unknown as Record<string, unknown>);

        // Sincronizar en los productos con esta subcategoría
        setProducts((prodPrev) =>
          prodPrev.map((p) => {
            const matchesCat = !p.category || p.category.toLowerCase() === cat.name.toLowerCase();
            if (matchesCat && p.subcategory && p.subcategory.toLowerCase() === trimmedOld.toLowerCase()) {
              const updatedProd = { ...p, subcategory: trimmedNew, updatedAt: new Date().toISOString() };
              syncItemToFirestore('products', p.id, updatedProd as unknown as Record<string, unknown>);
              return updatedProd;
            }
            return p;
          })
        );

        const updated = [...prev];
        updated[catIndex] = updatedCat;
        return updated;
      });
      addToast('Subcategoría modificada', `Se renombró a "${trimmedNew}".`, 'success');
    },
    [addToast]
  );

  const deleteCategory = useCallback(
    (categoryKey: string) => {
      const trimmedKey = categoryKey.trim();
      if (!trimmedKey) return;

      setCategories((prev) => {
        const target = prev.find(
          (c) => c.id === trimmedKey || c.name.toLowerCase() === trimmedKey.toLowerCase()
        );
        const nameToClean = target ? target.name : trimmedKey;
        const idToDelete = target ? target.id : trimmedKey;

        // Delete from Firestore
        deleteItemFromFirestore('categories', idToDelete);

        // Clean up from products and sync them
        setProducts((prodPrev) =>
          prodPrev.map((p) => {
            if (p.category && p.category.toLowerCase() === nameToClean.toLowerCase()) {
              const cleanedProd = { ...p, category: '', subcategory: undefined, updatedAt: new Date().toISOString() };
              syncItemToFirestore('products', p.id, cleanedProd as unknown as Record<string, unknown>);
              return cleanedProd;
            }
            return p;
          })
        );

        return prev.filter(
          (c) => c.id !== trimmedKey && c.name.toLowerCase() !== trimmedKey.toLowerCase()
        );
      });
      addToast('Categoría eliminada', 'La categoría se eliminó en todos los dispositivos.', 'info');
    },
    [addToast]
  );

  const deleteSubcategory = useCallback(
    (categoryKey: string, subcategoryName: string) => {
      const trimmedKey = categoryKey.trim();
      const trimmedSub = subcategoryName.trim();
      if (!trimmedKey || !trimmedSub) return;

      setCategories((prev) => {
        const target = prev.find(
          (c) => c.id === trimmedKey || c.name.toLowerCase() === trimmedKey.toLowerCase()
        );
        const targetCatName = target ? target.name : trimmedKey;

        // Clean up subcategory from products in that category and sync
        setProducts((prodPrev) =>
          prodPrev.map((p) => {
            const matchesCat =
              !p.category || p.category.toLowerCase() === targetCatName.toLowerCase();
            if (matchesCat && p.subcategory && p.subcategory.toLowerCase() === trimmedSub.toLowerCase()) {
              const cleanedProd = { ...p, subcategory: undefined, updatedAt: new Date().toISOString() };
              syncItemToFirestore('products', p.id, cleanedProd as unknown as Record<string, unknown>);
              return cleanedProd;
            }
            return p;
          })
        );

        return prev.map((c) => {
          if (c.id === trimmedKey || c.name.toLowerCase() === trimmedKey.toLowerCase()) {
            const updatedCat = {
              ...c,
              subcategories: c.subcategories.filter(
                (s) => s.toLowerCase() !== trimmedSub.toLowerCase()
              ),
            };
            syncItemToFirestore('categories', updatedCat.id, updatedCat as unknown as Record<string, unknown>);
            return updatedCat;
          }
          return c;
        });
      });
      addToast('Subcategoría eliminada', `"${trimmedSub}" eliminada con éxito.`, 'info');
    },
    [addToast]
  );

  // Orders handlers with instant Cloud Sync
  const addOrder = useCallback(
    (
      orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'payments'>,
      initialPayment?: number,
      paymentMethod: 'efectivo' | 'transferencia' = 'transferencia'
    ): Order => {
      const now = new Date().toISOString();
      const orderCount = orders.length + 1001;
      const orderNumber = `SPK-${orderCount}`;
      const orderId = 'ord-' + Date.now();

      const payments: PaymentRecord[] = [];
      if (initialPayment && initialPayment > 0) {
        payments.push({
          id: 'pay-' + Date.now(),
          orderId,
          amount: initialPayment,
          date: now,
          method: paymentMethod,
          reference: 'Seña inicial de pedido',
          notes: 'Pago registrado al crear pedido',
        });
      }

      const newOrder: Order = {
        ...orderData,
        id: orderId,
        orderNumber,
        payments,
        createdAt: now,
        invoiceNumber: `FAC-0001-${String(orderCount).padStart(8, '0')}`,
        accountId: currentAccountId,
      };

      setOrders((prev) => [newOrder, ...prev]);
      syncItemToFirestore('orders', newOrder.id, newOrder as unknown as Record<string, unknown>);

      // If initial payment was made, automatically record transaction
      if (initialPayment && initialPayment > 0) {
        const tx: FinancialTransaction = {
          id: 'tx-' + Date.now(),
          type: 'ingreso',
          category: 'Venta de Pedido',
          amount: initialPayment,
          date: now,
          description: `Seña Pedido #${orderNumber} (${orderData.clientName})`,
          method: paymentMethod,
          orderId,
          accountId: currentAccountId,
        };
        setTransactions((prev) => [tx, ...prev]);
        syncItemToFirestore('transactions', tx.id, tx as unknown as Record<string, unknown>);
      }

      // Decrement stock of products and sync updated stock to Firestore
      setProducts((prev) =>
        prev.map((prod) => {
          const item = orderData.items.find((i) => i.productId === prod.id);
          if (item) {
            const updatedProd = {
              ...prod,
              stock: Math.max(0, prod.stock - item.quantity),
              updatedAt: now,
            };
            syncItemToFirestore('products', prod.id, updatedProd as unknown as Record<string, unknown>);
            return updatedProd;
          }
          return prod;
        })
      );

      // Celebration effect
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#EC4899', '#F472B6', '#FBCFE8', '#FDE047'],
        });
      } catch {
        // ignore
      }

      addToast('¡Pedido creado!', `Orden #${orderNumber} sincronizada en la nube.`, 'success');
      return newOrder;
    },
    [orders.length, currentAccountId, addToast]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: Order['status'], trackingNumber?: string) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const updatedOrder = {
              ...o,
              status,
              ...(trackingNumber !== undefined ? { trackingNumber } : {}),
            };
            syncItemToFirestore('orders', orderId, updatedOrder as unknown as Record<string, unknown>);
            return updatedOrder;
          }
          return o;
        })
      );
      addToast('Estado actualizado', `El pedido cambió a: ${status.replace('_', ' ').toUpperCase()}`, 'info');
    },
    [addToast]
  );

  const addPartialPayment = useCallback(
    (orderId: string, paymentData: Omit<PaymentRecord, 'id' | 'orderId'>) => {
      const now = new Date().toISOString();
      const paymentId = 'pay-' + Date.now();

      let targetOrder: Order | undefined;

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            targetOrder = order;
            const updatedPayments = [
              ...order.payments,
              {
                ...paymentData,
                id: paymentId,
                orderId,
                date: paymentData.date || now,
              },
            ];

            const totalPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const isFullyPaid = totalPaid >= order.total;

            if (isFullyPaid) {
              try {
                confetti({
                  particleCount: 70,
                  spread: 80,
                  origin: { y: 0.6 },
                  colors: ['#EC4899', '#10B981', '#F472B6', '#FDE047'],
                });
              } catch {
                // ignore
              }
            }

            const updatedOrder = {
              ...order,
              payments: updatedPayments,
              status: isFullyPaid && order.status === 'pendiente' ? ('en_produccion' as const) : order.status,
            };
            syncItemToFirestore('orders', orderId, updatedOrder as unknown as Record<string, unknown>);
            return updatedOrder;
          }
          return order;
        })
      );

      // Record automatically in finance ledger & sync
      const tx: FinancialTransaction = {
        id: 'tx-' + Date.now(),
        type: 'ingreso',
        category: 'Venta de Pedido',
        amount: paymentData.amount,
        date: paymentData.date || now,
        description: `Cobro parcial Pedido ${targetOrder ? '#' + targetOrder.orderNumber : ''} (${targetOrder?.clientName || ''})`,
        method: paymentData.method,
        orderId,
        accountId: currentAccountId,
      };
      setTransactions((prev) => [tx, ...prev]);
      syncItemToFirestore('transactions', tx.id, tx as unknown as Record<string, unknown>);

      addToast(
        'Pago Registrado ✨',
        `Se ingresaron $${paymentData.amount.toLocaleString()} a la caja (${paymentData.method.toUpperCase()}).`,
        'success'
      );
    },
    [currentAccountId, addToast]
  );

  const updateOrder = useCallback(
    (orderId: string, orderData: Partial<Order>) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const updated = { ...o, ...orderData };
            syncItemToFirestore('orders', orderId, updated as unknown as Record<string, unknown>);
            return updated;
          }
          return o;
        })
      );
      addToast('Pedido modificado', 'Los cambios en el pedido se guardaron en la nube.', 'success');
    },
    [addToast]
  );

  const deleteOrder = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    deleteItemFromFirestore('orders', orderId);
    addToast('Pedido eliminado', 'La orden fue eliminada de la nube.', 'info');
  }, [addToast]);

  const updatePaymentRecord = useCallback(
    (orderId: string, paymentId: string, paymentData: Partial<PaymentRecord>) => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            const updatedPayments = order.payments.map((p) => {
              if (p.id === paymentId) {
                return { ...p, ...paymentData };
              }
              return p;
            });
            const totalPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const isFullyPaid = totalPaid >= order.total;
            const updatedOrder = {
              ...order,
              payments: updatedPayments,
              status: isFullyPaid && order.status === 'pendiente' ? ('en_produccion' as const) : order.status,
            };
            syncItemToFirestore('orders', orderId, updatedOrder as unknown as Record<string, unknown>);
            return updatedOrder;
          }
          return order;
        })
      );

      // Sincronizar también la transacción contable si cambió
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.orderId === orderId) {
            const patch: Partial<FinancialTransaction> = {};
            if (paymentData.amount !== undefined) patch.amount = paymentData.amount;
            if (paymentData.date !== undefined) patch.date = paymentData.date;
            if (paymentData.method !== undefined) patch.method = paymentData.method;
            if (Object.keys(patch).length > 0) {
              const updatedTx = { ...tx, ...patch };
              syncItemToFirestore('transactions', tx.id, updatedTx as unknown as Record<string, unknown>);
              return updatedTx;
            }
          }
          return tx;
        })
      );

      addToast('Pago actualizado ✨', 'La fecha y datos del pago se guardaron con éxito.', 'success');
    },
    [addToast]
  );

  const deletePaymentRecord = useCallback(
    (orderId: string, paymentId: string) => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            const updatedPayments = order.payments.filter((p) => p.id !== paymentId);
            const updatedOrder = {
              ...order,
              payments: updatedPayments,
            };
            syncItemToFirestore('orders', orderId, updatedOrder as unknown as Record<string, unknown>);
            return updatedOrder;
          }
          return order;
        })
      );
      addToast('Pago eliminado', 'El pago fue quitado del pedido.', 'info');
    },
    [addToast]
  );

  // Transactions handlers with instant Cloud Sync
  const addTransaction = useCallback((txData: Omit<FinancialTransaction, 'id'>) => {
    const newTx: FinancialTransaction = {
      ...txData,
      id: 'tx-' + Date.now(),
      accountId: currentAccountId,
    };
    setTransactions((prev) => [newTx, ...prev]);
    syncItemToFirestore('transactions', newTx.id, newTx as unknown as Record<string, unknown>);
    addToast(
      newTx.type === 'ingreso' ? 'Ingreso anotado' : 'Gasto registrado',
      `$${newTx.amount.toLocaleString()} en ${newTx.category}.`,
      newTx.type === 'ingreso' ? 'success' : 'warning'
    );
  }, [currentAccountId, addToast]);

  const updateTransaction = useCallback(
    (id: string, patch: Partial<FinancialTransaction>) => {
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, ...patch };
            syncItemToFirestore('transactions', id, updated as unknown as Record<string, unknown>);
            return updated;
          }
          return t;
        })
      );
      addToast('Movimiento actualizado ✨', 'El ingreso/gasto se guardó correctamente.', 'success');
    },
    [addToast]
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    deleteItemFromFirestore('transactions', id);
    addToast('Transacción eliminada', 'El movimiento fue quitado de la caja.', 'info');
  }, [addToast]);

  // Clients & Contacts handlers with instant Cloud Sync
  const addClient = useCallback((clientData: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: 'cli-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    syncItemToFirestore('clients', newClient.id, newClient as unknown as Record<string, unknown>);
    addToast('Cliente guardado', `${newClient.name} fue añadido a tus contactos en la nube.`, 'success');
    return newClient;
  }, [addToast]);

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setClients((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          const item = { ...c, ...patch };
          syncItemToFirestore('clients', id, item as unknown as Record<string, unknown>);
          return item;
        }
        return c;
      });
      return updated;
    });
    addToast('Cliente actualizado', 'Datos guardados correctamente.', 'info');
  }, [addToast]);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    deleteItemFromFirestore('clients', id);
    addToast('Cliente eliminado', 'Se eliminó el contacto.', 'info');
  }, [addToast]);

  const importContacts = useCallback(
    (contactsList: Array<{ name: string; phone: string; email?: string }>): number => {
      let importedCount = 0;
      const now = new Date().toISOString();
      const existingPhones = new Set(clients.map((c) => c.phone.replace(/\D/g, '')));

      const newClients: Client[] = [];
      for (const item of contactsList) {
        const cleanPhone = item.phone.replace(/\D/g, '');
        if (item.name && (!cleanPhone || !existingPhones.has(cleanPhone))) {
          const newCli: Client = {
            id: 'cli-' + Date.now() + Math.random().toString().slice(2, 6),
            name: item.name,
            phone: item.phone,
            email: item.email || '',
            address: '',
            notes: `Importado de contactos (${currentAccount.email})`,
            createdAt: now,
          };
          newClients.push(newCli);
          syncItemToFirestore('clients', newCli.id, newCli as unknown as Record<string, unknown>);
          importedCount++;
          if (cleanPhone) existingPhones.add(cleanPhone);
        }
      }

      if (newClients.length > 0) {
        setClients((prev) => [...newClients, ...prev]);
        addToast(
          'Contactos importados',
          `Se sincronizaron ${importedCount} contactos nuevos en todos los dispositivos.`,
          'success'
        );
      } else {
        addToast('Sin nuevos contactos', 'Los contactos seleccionados ya se encontraban registrados.', 'info');
      }
      return importedCount;
    },
    [clients, currentAccount.email, addToast]
  );

  // Suppliers handlers with instant Cloud Sync
  const addSupplier = useCallback((supData: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...supData,
      id: 'sup-' + Date.now(),
    };
    setSuppliers((prev) => [...prev, newSup]);
    syncItemToFirestore('suppliers', newSup.id, newSup as unknown as Record<string, unknown>);
    addToast('Proveedor guardado', `${newSup.name} registrado con éxito.`, 'success');
  }, [addToast]);

  const updateSupplier = useCallback((id: string, patch: Partial<Supplier>) => {
    setSuppliers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === id) {
          const item = { ...s, ...patch };
          syncItemToFirestore('suppliers', id, item as unknown as Record<string, unknown>);
          return item;
        }
        return s;
      });
      return updated;
    });
    addToast('Proveedor actualizado', 'Datos actualizados.', 'info');
  }, [addToast]);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    deleteItemFromFirestore('suppliers', id);
    addToast('Proveedor eliminado', 'Se quitó el proveedor.', 'info');
  }, [addToast]);

  // Cart Handlers
  const addToCart = useCallback(
    (product: Product, quantity: number = 1, selectedVariant?: ProductVariant, notes?: string) => {
      const breakdown = getProductBreakdown(product);
      const effectivePrice = selectedVariant ? selectedVariant.price : breakdown.finalPrice;

      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => {
          const matchProd = i.product.id === product.id;
          const matchVar = (i.selectedVariant?.id || '') === (selectedVariant?.id || '');
          return matchProd && matchVar;
        });

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].quantity += quantity;
          if (notes) updated[existingIdx].notes = notes;
          return updated;
        }

        return [
          ...prev,
          {
            product,
            quantity,
            calculatedPrice: effectivePrice,
            selectedVariant,
            notes,
          },
        ];
      });

      const variantLabel = selectedVariant ? ` (${selectedVariant.name})` : '';
      addToast('Agregado al carrito ✨', `${product.name}${variantLabel} (x${quantity}) listo para pedir.`, 'success');
    },
    [getProductBreakdown, addToast]
  );

  const updateCartQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      setCart((prev) =>
        prev.filter((i) => !(i.product.id === productId && (i.selectedVariant?.id || '') === (variantId || '')))
      );
    } else {
      setCart((prev) =>
        prev.map((item) => {
          if (item.product.id === productId && (item.selectedVariant?.id || '') === (variantId || '')) {
            return { ...item, quantity };
          }
          return item;
        })
      );
    }
  }, []);

  const removeFromCart = useCallback((productId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter((i) => !(i.product.id === productId && (i.selectedVariant?.id || '') === (variantId || '')))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Backup & Reset with complete Cloud Sync
  const exportBackupJson = useCallback((): string => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      currentAccountId,
      accounts,
      materials,
      invisibleCosts,
      products,
      categories,
      orders,
      transactions,
      clients,
      suppliers,
    };
    return JSON.stringify(backupData, null, 2);
  }, [currentAccountId, accounts, materials, invisibleCosts, products, categories, orders, transactions, clients, suppliers]);

  const importBackupJson = useCallback(
    (jsonString: string): boolean => {
      try {
        const data = JSON.parse(jsonString);
        if (data.accounts) setAccounts(data.accounts);
        if (data.currentAccountId) setCurrentAccountId(data.currentAccountId);
        if (data.materials && Array.isArray(data.materials)) {
          setMaterials(data.materials);
          data.materials.forEach((m: Material) =>
            syncItemToFirestore('materials', m.id, m as unknown as Record<string, unknown>)
          );
        }
        if (data.invisibleCosts && Array.isArray(data.invisibleCosts)) {
          setInvisibleCosts(data.invisibleCosts);
          data.invisibleCosts.forEach((c: InvisibleCost) =>
            syncItemToFirestore('invisibleCosts', c.id, c as unknown as Record<string, unknown>)
          );
        }
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
          data.products.forEach((p: Product) =>
            syncItemToFirestore('products', p.id, p as unknown as Record<string, unknown>)
          );
        }
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
          data.categories.forEach((cat: CategoryDefinition) =>
            syncItemToFirestore('categories', cat.id, cat as unknown as Record<string, unknown>)
          );
        }
        if (data.orders && Array.isArray(data.orders)) {
          setOrders(data.orders);
          data.orders.forEach((o: Order) =>
            syncItemToFirestore('orders', o.id, o as unknown as Record<string, unknown>)
          );
        }
        if (data.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          data.transactions.forEach((t: FinancialTransaction) =>
            syncItemToFirestore('transactions', t.id, t as unknown as Record<string, unknown>)
          );
        }
        if (data.clients && Array.isArray(data.clients)) {
          setClients(data.clients);
          data.clients.forEach((c: Client) =>
            syncItemToFirestore('clients', c.id, c as unknown as Record<string, unknown>)
          );
        }
        if (data.suppliers && Array.isArray(data.suppliers)) {
          setSuppliers(data.suppliers);
          data.suppliers.forEach((s: Supplier) =>
            syncItemToFirestore('suppliers', s.id, s as unknown as Record<string, unknown>)
          );
        }
        addToast('Copia Restaurada ✨', 'Todos tus datos fueron sincronizados en la nube.', 'success');
        return true;
      } catch (e) {
        console.error('Error importing backup:', e);
        addToast('Error al importar', 'El archivo de copia de seguridad no es válido.', 'error');
        return false;
      }
    },
    [addToast]
  );

  const resetToDemoData = useCallback(() => {
    setAccounts(ADMIN_ACCOUNTS);
    setCurrentAccountId('shaddai');
    setMaterials(INITIAL_MATERIALS);
    setInvisibleCosts(INITIAL_INVISIBLE_COSTS);
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setOrders(INITIAL_ORDERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setClients(INITIAL_CLIENTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setCart([]);

    // Seed back to Firestore
    INITIAL_PRODUCTS.forEach((p) =>
      syncItemToFirestore('products', p.id, p as unknown as Record<string, unknown>)
    );
    INITIAL_CATEGORIES.forEach((c) =>
      syncItemToFirestore('categories', c.id, c as unknown as Record<string, unknown>)
    );
    INITIAL_MATERIALS.forEach((m) =>
      syncItemToFirestore('materials', m.id, m as unknown as Record<string, unknown>)
    );
    INITIAL_INVISIBLE_COSTS.forEach((c) =>
      syncItemToFirestore('invisibleCosts', c.id, c as unknown as Record<string, unknown>)
    );

    addToast('Datos Restaurados', 'Se cargaron y sincronizaron los ejemplos iniciales de Sparkle.', 'info');
  }, [addToast]);

  return (
    <AppContext.Provider
      value={{
        materials,
        invisibleCosts,
        products,
        categories,
        orders,
        transactions,
        clients,
        suppliers,
        settings,
        accounts,
        currentAccountId,
        currentAccount,
        isAdminUnlocked,
        toasts,
        cart,
        activeView,
        isCloudSynced,
        isSyncing,
        isInitialLoading,
        setActiveView,
        loginAdmin,
        lockAdmin,
        switchAccount,
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
        addCategory,
        updateCategory,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        deleteCategory,
        addOrder,
        updateOrder,
        updateOrderStatus,
        addPartialPayment,
        updatePaymentRecord,
        deletePaymentRecord,
        deleteOrder,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addClient,
        updateClient,
        deleteClient,
        importContacts,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        updateSettings,
        toggleDarkMode,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        addToast,
        removeToast,
        getProductBreakdown,
        invisibleCostPerMinute,
        laborCostPerMinute,
        getOrderPendingBalance,
        getOrderTotalPaid,
        exportBackupJson,
        importBackupJson,
        resetToDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
