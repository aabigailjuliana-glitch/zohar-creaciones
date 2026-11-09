import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Client, Supplier } from '../types';
import { formatCurrency } from '../utils/pricingCalculator';
import {
  Users,
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Send,
  Upload,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  Building,
  UserCheck,
} from 'lucide-react';

export const ClientsSuppliersView: React.FC = () => {
  const {
    clients,
    suppliers,
    orders,
    settings,
    addClient,
    updateClient,
    deleteClient,
    importContacts,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getOrderPendingBalance,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'clientes' | 'proveedores'>('clientes');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Client form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  // Supplier form
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supProducts, setSupProducts] = useState('');
  const [supNotes, setSupNotes] = useState('');

  // Client statistics
  const clientStatsMap = useMemo(() => {
    const map = new Map<string, { totalSpent: number; ordersCount: number; pendingDebt: number }>();

    orders.forEach((o) => {
      const pending = getOrderPendingBalance(o);
      const key = o.clientId || o.clientName.toLowerCase();
      const curr = map.get(key) || { totalSpent: 0, ordersCount: 0, pendingDebt: 0 };
      curr.totalSpent += o.total;
      curr.ordersCount += 1;
      curr.pendingDebt += pending;
      map.set(key, curr);
    });

    return map;
  }, [orders, getOrderPendingBalance]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [clients, searchQuery]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.productsSupplied && s.productsSupplied.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchQuery]);

  // Open Client Modal
  const openClientModal = (cli?: Client) => {
    if (cli) {
      setEditingClient(cli);
      setClientName(cli.name);
      setClientPhone(cli.phone);
      setClientEmail(cli.email || '');
      setClientAddress(cli.address || '');
      setClientNotes(cli.notes || '');
    } else {
      setEditingClient(null);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientAddress('');
      setClientNotes('');
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    if (editingClient) {
      updateClient(editingClient.id, {
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        address: clientAddress,
        notes: clientNotes,
      });
    } else {
      addClient({
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        address: clientAddress,
        notes: clientNotes,
      });
    }
    setIsClientModalOpen(false);
  };

  // Open Supplier Modal
  const openSupplierModal = (sup?: Supplier) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupName(sup.name);
      setSupContact(sup.contactPerson || '');
      setSupPhone(sup.phone || '');
      setSupEmail(sup.email || '');
      setSupAddress(sup.address || '');
      setSupProducts(sup.productsSupplied || '');
      setSupNotes(sup.notes || '');
    } else {
      setEditingSupplier(null);
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      setSupProducts('');
      setSupNotes('');
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        productsSupplied: supProducts,
        notes: supNotes,
      });
    } else {
      addSupplier({
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        productsSupplied: supProducts,
        notes: supNotes,
      });
    }
    setIsSupplierModalOpen(false);
  };

  // WEB CONTACT PICKER API INTEGRATION (Mobile Android / Desktop Chrome)
  const handleNativeContactPicker = async () => {
    // Check if Contact Picker API is available
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel', 'email'];
        // @ts-expect-error - navigator.contacts is standard on Android Chrome
        const rawContacts = await navigator.contacts.select(props, { multiple: true });
        if (rawContacts && rawContacts.length > 0) {
          const formatted = rawContacts.map((c: any) => ({
            name: Array.isArray(c.name) ? c.name[0] : c.name || 'Sin nombre',
            phone: Array.isArray(c.tel) ? c.tel[0] : c.tel || '',
            email: Array.isArray(c.email) ? c.email[0] : c.email || '',
          }));
          importContacts(formatted);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Contact picker fallback', err);
        }
      }
    }
    // If not supported or user opted, open manual file import modal
    setIsImportModalOpen(true);
  };

  // File Import for Contacts (vCard .vcf or CSV)
  const handleFileContactImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const contactsToImport: Array<{ name: string; phone: string; email?: string }> = [];

      // Check if vCard
      if (content.includes('BEGIN:VCARD')) {
        const cards = content.split('BEGIN:VCARD');
        for (const card of cards) {
          if (!card.trim()) continue;
          let name = '';
          let phone = '';
          let email = '';

          const lines = card.split('\n');
          for (const line of lines) {
            if (line.startsWith('FN:')) name = line.replace('FN:', '').trim();
            else if (line.startsWith('TEL')) phone = line.split(':')[1]?.trim() || '';
            else if (line.startsWith('EMAIL')) email = line.split(':')[1]?.trim() || '';
          }

          if (name && (phone || email)) {
            contactsToImport.push({ name, phone, email });
          }
        }
      } else {
        // Assume CSV: name, phone, email
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.replace(/"/g, '').trim());
          if (parts.length >= 2 && parts[0] && parts[1]) {
            if (parts[0].toLowerCase() === 'nombre' || parts[0].toLowerCase() === 'name') continue;
            contactsToImport.push({
              name: parts[0],
              phone: parts[1],
              email: parts[2] || '',
            });
          }
        }
      }

      if (contactsToImport.length > 0) {
        importContacts(contactsToImport);
        setIsImportModalOpen(false);
      } else {
        addToast('No se detectaron contactos', 'Revisa el formato del archivo vCard o CSV.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const handleWhatsAppChat = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const storeTitle = (settings.catalogTitle || settings.businessName || 'Zohar Creaciones').trim();
    const greetingTemplate = settings.whatsappGreetingSeller && settings.whatsappGreetingSeller.trim() !== ''
      ? settings.whatsappGreetingSeller
      : `¡Hola {NOMBRE_CLIENTE}! Te escribo de {NOMBRE_TIENDA}:`;
    const formatted = greetingTemplate
      .replace(/{NOMBRE_CLIENTE}/g, name || 'Cliente')
      .replace(/{NOMBRE_TIENDA}/g, storeTitle);
    const msg = encodeURIComponent(`${formatted} ✨`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Directorio de Clientes & Proveedores
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Registro individual de contactos o importación rápida desde tu teléfono / agenda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'clientes' ? (
            <>
              <button
                onClick={handleNativeContactPicker}
                className="px-3 py-2 bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-pink-100 transition-colors"
                title="Importar contactos desde tu teléfono o archivo"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar de Contactos</span>
              </button>
              <button
                onClick={() => openClientModal()}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Cliente</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => openSupplierModal()}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'clientes'
                ? 'bg-pink-600 text-white shadow-2xs'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes Registrados ({clients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'proveedores'
                ? 'bg-pink-600 text-white shadow-2xs'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Proveedores de Insumos ({suppliers.length})</span>
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar en ${activeTab}...`}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          />
        </div>
      </div>

      {/* TAB: CLIENTES */}
      {activeTab === 'clientes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const stats = clientStatsMap.get(client.id) ||
              clientStatsMap.get(client.name.toLowerCase()) || {
                totalSpent: 0,
                ordersCount: 0,
                pendingDebt: 0,
              };

            return (
              <div
                key={client.id}
                className="bg-white dark:bg-[#18141D] rounded-2xl border border-pink-100 dark:border-neutral-800 p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {client.name}
                      </h3>
                      <span className="text-[10px] text-neutral-400">
                        Cliente desde: {new Date(client.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openClientModal(client)}
                        className="p-1 text-neutral-400 hover:text-pink-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="p-1 text-neutral-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mt-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                    {client.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-pink-500" />
                        <span className="font-mono">{client.phone}</span>
                      </p>
                    )}
                    {client.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-pink-500" />
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {client.address && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-pink-500" />
                        <span className="truncate">{client.address}</span>
                      </p>
                    )}
                  </div>

                  {client.notes && (
                    <p className="text-[11px] text-neutral-500 italic mt-2 p-2 bg-pink-50/50 dark:bg-neutral-900/50 rounded-lg">
                      {client.notes}
                    </p>
                  )}
                </div>

                {/* Orders & Debt Summary */}
                <div className="pt-2 border-t border-pink-50 dark:border-neutral-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500">Pedidos: {stats.ordersCount}</span>
                    {stats.pendingDebt > 0 ? (
                      <span className="text-rose-600 font-bold font-mono">
                        Deuda: {formatCurrency(stats.pendingDebt, settings.currency)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold text-[11px]">Al día</span>
                    )}
                  </div>

                  {client.phone && (
                    <button
                      onClick={() => handleWhatsAppChat(client.phone, client.name)}
                      className="w-full py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mensaje WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: PROVEEDORES */}
      {activeTab === 'proveedores' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white dark:bg-[#18141D] rounded-2xl border border-pink-100 dark:border-neutral-800 p-4 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {sup.name}
                    </h3>
                    {sup.contactPerson && (
                      <span className="text-[11px] text-pink-600 dark:text-pink-400 font-medium">
                        Contacto: {sup.contactPerson}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openSupplierModal(sup)}
                      className="p-1 text-neutral-400 hover:text-pink-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSupplier(sup.id)}
                      className="p-1 text-neutral-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mt-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                  {sup.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-pink-500" />
                      <span className="font-mono">{sup.phone}</span>
                    </p>
                  )}
                  {sup.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-pink-500" />
                      <span className="truncate">{sup.email}</span>
                    </p>
                  )}
                  {sup.productsSupplied && (
                    <div className="p-2 bg-pink-50/50 dark:bg-neutral-900/50 rounded-lg text-[11px] mt-1.5">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                        Insumos que provee:
                      </span>{' '}
                      {sup.productsSupplied}
                    </div>
                  )}
                  {sup.notes && (
                    <p className="text-[10px] text-neutral-400 italic mt-1">{sup.notes}</p>
                  )}
                </div>
              </div>

              {sup.phone && (
                <button
                  onClick={() => handleWhatsAppChat(sup.phone!, sup.contactPerson || sup.name)}
                  className="w-full py-1.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Contactar por WhatsApp</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Cliente */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-md w-full border border-pink-100 dark:border-neutral-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Martina González"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+54 9 11..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Dirección de Entrega habitual</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Calle, número, ciudad"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Notas / Preferencias</label>
                <textarea
                  rows={2}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Colores favoritos, detalles que le gustan..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-pink-600 text-white rounded-xl shadow-sm"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Proveedor */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-md w-full border border-pink-100 dark:border-neutral-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Nombre de Empresa / Proveedor *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Ej. Distribuidora Papelera Central"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Ej. Martín Gómez"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+54 9 11..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Insumos que Provee</label>
                <input
                  type="text"
                  value={supProducts}
                  onChange={(e) => setSupProducts(e.target.value)}
                  placeholder="Papeles opalina, cartones, tintas, vinilo..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Notas / Condiciones de Compra</label>
                <input
                  type="text"
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  placeholder="Descuento por cantidad, demora de envío..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-pink-600 text-white rounded-xl shadow-sm"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Importación de Contactos */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-md w-full border border-pink-100 dark:border-neutral-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Importar Contactos a Sparkle
              </h3>
              <button onClick={() => setIsImportModalOpen(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="p-3 rounded-xl bg-pink-50/70 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800">
                <p className="font-bold text-pink-900 dark:text-pink-200 text-xs">
                  Libreta de Contactos Vinculada
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Los contactos que importes se sincronizarán con el perfil de tu cuenta activa.
                </p>
              </div>

              {/* Native Cellphone / Google Contacts Button */}
              <button
                type="button"
                onClick={async () => {
                  if ('contacts' in navigator && 'ContactsManager' in window) {
                    try {
                      // @ts-expect-error - navigator.contacts is standard on Android Chrome
                      const raw = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: true });
                      if (raw && raw.length > 0) {
                        const fmt = raw.map((c: any) => ({
                          name: Array.isArray(c.name) ? c.name[0] : c.name || 'Sin nombre',
                          phone: Array.isArray(c.tel) ? c.tel[0] : c.tel || '',
                          email: Array.isArray(c.email) ? c.email[0] : c.email || '',
                        }));
                        importContacts(fmt);
                        setIsImportModalOpen(false);
                        return;
                      }
                    } catch (e: any) {
                      if (e.name !== 'AbortError') console.warn(e);
                    }
                  } else {
                    addToast('Contact Picker', 'Usa el selector de archivo .vcf o .csv abajo para importar tus contactos de Google.', 'info');
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Abrir Libreta de Contactos del Celular</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
                <span className="bg-white dark:bg-[#18141D] px-2 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                  O desde archivo de Google Contacts
                </span>
              </div>

              <div className="p-3.5 border-2 border-dashed border-pink-300 dark:border-neutral-700 rounded-xl text-center bg-pink-50/30 dark:bg-neutral-900 space-y-2">
                <FileSpreadsheet className="w-7 h-7 text-pink-500 mx-auto" />
                <p className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                  Cargar archivo exportado de Google Contacts (.vcf o .csv)
                </p>
                <input
                  type="file"
                  accept=".vcf,.csv,text/vcard,text/csv"
                  onChange={handleFileContactImport}
                  className="block w-full text-xs text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer"
                />
              </div>

              {/* Sample Google Contacts Quick Loader */}
              <button
                type="button"
                onClick={() => {
                  const googleDemoContacts = [
                    { name: 'Florencia Morales (Google Contacts)', phone: '+5491166778899', email: 'flor.morales@gmail.com' },
                    { name: 'Agustín Pereyra (Google Contacts)', phone: '+5491177889900', email: 'agustin.p@gmail.com' },
                    { name: 'Mariana Duarte (Google Contacts)', phone: '+5491188990011', email: 'mariana.duarte@gmail.com' },
                  ];
                  importContacts(googleDemoContacts);
                  setIsImportModalOpen(false);
                }}
                className="w-full py-1.5 text-[11px] text-pink-600 dark:text-pink-400 font-semibold hover:underline"
              >
                + Cargar contactos de ejemplo
              </button>
            </div>

            <button
              onClick={() => setIsImportModalOpen(false)}
              className="w-full py-2 text-xs font-semibold border rounded-xl text-neutral-600 mt-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
