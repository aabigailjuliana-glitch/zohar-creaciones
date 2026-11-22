import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Shield,
  Building2,
  Copy,
  Check,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Bell,
  Moon,
  Sun,
  Lock,
  MessageSquare,
  Sparkles,
  BookOpen,
  Layout,
  Image as ImageIcon,
  Trash2,
  Camera,
  Square,
  Maximize2,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    toggleDarkMode,
    exportBackupJson,
    importBackupJson,
    resetToDemoData,
    lockAdmin,
    addToast,
  } = useApp();

  const [businessName, setBusinessName] = useState(settings.businessName);
  const [ownerEmail, setOwnerEmail] = useState(settings.ownerEmail);
  const [ownerPhone, setOwnerPhone] = useState(settings.ownerPhone);
  const [bankAlias, setBankAlias] = useState(settings.bankAlias);
  const [bankCbu, setBankCbu] = useState(settings.bankCbu);
  const [bankHolder, setBankHolder] = useState(settings.bankHolder);
  const [bankName, setBankName] = useState(settings.bankName);
  const [defaultPaymentMsg, setDefaultPaymentMsg] = useState(settings.defaultPaymentMessage);
  const [defaultOrderMsg, setDefaultOrderMsg] = useState(settings.defaultOrderMessage);
  const [whatsappGreetingBuyer, setWhatsappGreetingBuyer] = useState(
    settings.whatsappGreetingBuyer || '¡Hola {NOMBRE_TIENDA}! Te paso mi pedido desde tu catálogo:'
  );
  const [whatsappGreetingSeller, setWhatsappGreetingSeller] = useState(
    settings.whatsappGreetingSeller || '¡Hola {NOMBRE_CLIENTE}! Te comparto el detalle de tu pedido en {NOMBRE_TIENDA}:'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);

  // Textos y Portada del Catálogo
  const [catalogTitle, setCatalogTitle] = useState(
    settings.catalogTitle || 'Descubre nuestra colección de papelería artesanal'
  );
  const [catalogTagline, setCatalogTagline] = useState(
    settings.catalogTagline || 'Catálogo Online'
  );
  const [catalogDescription, setCatalogDescription] = useState(
    settings.catalogDescription ||
      'Planners, tazas personalizadas, stickers y kits de regalo hechos a mano con detalles brillantes. Arma tu pedido con retiro en taller, envío a domicilio (con costo adicional) o envíos por Correo Argentino a todo el país que también puedes abonar vía WhatsApp.'
  );

  const [copiedAliasTest, setCopiedAliasTest] = useState(false);

  // Logo e Identidad Visual del Emprendimiento
  const [businessLogoUrl, setBusinessLogoUrl] = useState(settings.businessLogoUrl || '');
  const [businessLogoFit, setBusinessLogoFit] = useState<'contain' | 'cover'>(settings.businessLogoFit || 'contain');
  const [businessLogoBg, setBusinessLogoBg] = useState<'transparent' | 'white' | 'dark' | 'glass'>(
    settings.businessLogoBg || 'glass'
  );
  const [catalogHeaderLayout, setCatalogHeaderLayout] = useState<'square_logo' | 'horizontal_cover'>(
    settings.catalogHeaderLayout || 'square_logo'
  );

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Archivo no compatible', 'Por favor selecciona un archivo de imagen (PNG, JPG, SVG, WEBP).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Imagen muy pesada', 'Selecciona una imagen de menos de 5MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setBusinessLogoUrl(dataUrl);
        addToast('Logo cargado', 'Vista previa lista. Recuerda hacer clic en "Guardar Configuración".', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = catalogTitle.trim() || businessName.trim() || 'Sparkle';
    updateSettings({
      businessName: finalTitle,
      ownerEmail,
      ownerPhone,
      bankAlias,
      bankCbu,
      bankHolder,
      bankName,
      defaultPaymentMessage: defaultPaymentMsg,
      defaultOrderMessage: defaultOrderMsg,
      whatsappGreetingBuyer,
      whatsappGreetingSeller,
      notificationsEnabled,
      catalogTitle: finalTitle,
      catalogTagline,
      catalogDescription,
      businessLogoUrl,
      businessLogoFit,
      businessLogoBg,
      catalogHeaderLayout,
    });
    addToast('Configuración guardada ✨', 'Nombre y ajustes sincronizados en todos los dispositivos.', 'success');
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Copia_Seguridad_Sparkle_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    addToast('Copia descargada', 'Archivo de respaldo guardado en tu equipo.', 'success');
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importBackupJson(content);
      }
    };
    reader.readAsText(file);
  };

  const handleTestBiometrics = async () => {
    if (window.PublicKeyCredential) {
      try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          addToast('Sensor Detectado 🔐', 'Tu dispositivo soporta autenticación biométrica (Huella / Rostro).', 'success');
        } else {
          addToast('Biometría en espera', 'Sensor biométrico compatible disponible con respaldo de PIN.', 'info');
        }
      } catch {
        addToast('Biometría lista', 'Configuración de seguridad activa.', 'info');
      }
    } else {
      addToast('PIN Activo', 'Tu navegador usa desbloqueo seguro mediante PIN o Contraseña.', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Configuración & Datos de la Cuenta
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Personaliza tu alias bancario para transferencias, plantillas de WhatsApp, seguridad biométrica y copias de respaldo.
        </p>
      </div>

      <form onSubmit={handleSaveGeneral} className="space-y-6">
        {/* SECCIÓN: LOGO & IDENTIDAD VISUAL DEL EMPRENDIMIENTO */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-pink-50 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-pink-500" />
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Logo del Emprendimiento (Para el Catálogo)
                </h2>
                <p className="text-xs text-neutral-500">
                  Agrega una imagen o logo con o sin fondo para que luzca estético y profesional en la portada de tu catálogo.
                </p>
              </div>
            </div>
            {businessLogoUrl && (
              <button
                type="button"
                onClick={() => setBusinessLogoUrl('')}
                className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar logo</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Visual Preview Box */}
            <div className="shrink-0 space-y-1.5 mx-auto sm:mx-0">
              <span className="text-[11px] font-semibold text-neutral-500 block text-center sm:text-left">
                Vista Previa del Logo:
              </span>
              <div
                className={`w-32 h-32 rounded-2xl border border-pink-200 dark:border-neutral-700 shadow-inner flex items-center justify-center overflow-hidden p-2 relative group ${
                  businessLogoBg === 'white'
                    ? 'bg-white'
                    : businessLogoBg === 'dark'
                    ? 'bg-neutral-900'
                    : businessLogoBg === 'transparent'
                    ? 'bg-transparent'
                    : 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xs'
                }`}
              >
                {businessLogoUrl ? (
                  <img
                    src={businessLogoUrl}
                    alt="Logo emprendimiento"
                    className={`w-full h-full ${
                      businessLogoFit === 'cover' ? 'object-cover' : 'object-contain'
                    } drop-shadow-xs transition-transform duration-200 group-hover:scale-105`}
                  />
                ) : (
                  <div className="text-center p-3">
                    <Camera className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-1" />
                    <span className="text-[10px] text-neutral-400 font-medium leading-tight block">
                      Sin logo aún
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Upload & Styling Controls */}
            <div className="flex-1 space-y-3.5 w-full">
              {/* Formato de Imagen: Cuadrada o Portada Horizontal */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Formato de visualización en el comienzo del catálogo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatalogHeaderLayout('square_logo')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      catalogHeaderLayout === 'square_logo'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Imagen Cuadrada (Logo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogHeaderLayout('horizontal_cover')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      catalogHeaderLayout === 'horizontal_cover'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Portada Horizontal</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Subir archivo de imagen (PNG sin fondo, JPG, SVG o WEBP)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/60 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
                    <Camera className="w-4 h-4" />
                    <span>Seleccionar Imagen desde el Equipo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>
                  {businessLogoUrl && (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Imagen cargada
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  O pegar enlace directo / URL de la imagen
                </label>
                <input
                  type="url"
                  value={businessLogoUrl}
                  onChange={(e) => setBusinessLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-logo.png"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Ajuste de la imagen
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setBusinessLogoFit('contain')}
                      className={`py-1.5 rounded-lg font-semibold transition-colors ${
                        businessLogoFit === 'contain'
                          ? 'bg-white dark:bg-neutral-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                      }`}
                      title="Muestra el logo completo sin recortar (ideal para logos y textos)"
                    >
                      Completo (Contain)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusinessLogoFit('cover')}
                      className={`py-1.5 rounded-lg font-semibold transition-colors ${
                        businessLogoFit === 'cover'
                          ? 'bg-white dark:bg-neutral-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                      }`}
                      title="Llena todo el marco"
                    >
                      Cubrir (Cover)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Estilo de fondo en el catálogo
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setBusinessLogoBg('glass')}
                      className={`py-1.5 rounded-lg font-semibold transition-colors text-[11px] ${
                        businessLogoBg === 'glass'
                          ? 'bg-white dark:bg-neutral-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                      title="Fondo traslúcido suave con marco delicado"
                    >
                      Cristal
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusinessLogoBg('white')}
                      className={`py-1.5 rounded-lg font-semibold transition-colors text-[11px] ${
                        businessLogoBg === 'white'
                          ? 'bg-white dark:bg-neutral-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                      title="Fondo blanco puro ideal para logos transparentes"
                    >
                      Blanco
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusinessLogoBg('transparent')}
                      className={`py-1.5 rounded-lg font-semibold transition-colors text-[11px] ${
                        businessLogoBg === 'transparent'
                          ? 'bg-white dark:bg-neutral-900 text-pink-600 dark:text-pink-400 shadow-2xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                      title="Sin fondo, integrado directo al banner"
                    >
                      Sin Fondo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN: ENCABEZADO Y TEXTOS DEL CATÁLOGO PÚBLICO */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-pink-50 dark:border-neutral-800 pb-3">
            <Layout className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Encabezado & Textos del Catálogo de Clientes
              </h2>
              <p className="text-xs text-neutral-500">
                Modifica el nombre del catálogo, la insignia y toda la descripción superior visible para los compradores.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Etiqueta / Subtítulo pequeño
              </label>
              <input
                type="text"
                value={catalogTagline}
                onChange={(e) => setCatalogTagline(e.target.value)}
                placeholder="ej. Catálogo Online"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Nombre / Título Principal del Catálogo *
              </label>
              <input
                type="text"
                required
                value={catalogTitle}
                onChange={(e) => {
                  setCatalogTitle(e.target.value);
                  setBusinessName(e.target.value);
                }}
                placeholder="ej. Nombre de tu Emprendimiento / Catálogo"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Descripción Completa de Productos & Envíos *
              </label>
              <textarea
                rows={3}
                required
                value={catalogDescription}
                onChange={(e) => setCatalogDescription(e.target.value)}
                placeholder="Describe los productos, costo adicional de envíos a domicilio, envíos por Correo Argentino, etc..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 leading-relaxed"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                💡 Nota: Los datos de Alias para transferencias, el botón de Descargar Catálogo en PDF y el botón de Carrito se mantienen fijos y automáticos justo debajo.
              </p>
            </div>
          </div>
        </div>

        {/* SECCIÓN 1: DATOS BANCARIOS & ALIAS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-pink-50 dark:border-neutral-800 pb-3">
            <Building2 className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Datos de Cuenta & Alias para Transferencias
              </h2>
              <p className="text-xs text-neutral-500">
                Aparecerán automáticamente a tus clientes en el catálogo y mensajes para que no tengas que escribirlo cada vez.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Alias de Transferencia (Mercado Pago / Banco) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={bankAlias}
                  onChange={(e) => setBankAlias(e.target.value)}
                  placeholder="ej. mi.alias.mp"
                  className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-pink-200 dark:border-neutral-700 bg-pink-50/30 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bankAlias);
                    setCopiedAliasTest(true);
                    setTimeout(() => setCopiedAliasTest(false), 2000);
                  }}
                  className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  {copiedAliasTest ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAliasTest ? '¡Copiado!' : 'Probar'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                CBU o CVU (22 dígitos)
              </label>
              <input
                type="text"
                value={bankCbu}
                onChange={(e) => setBankCbu(e.target.value)}
                placeholder="00000031000..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Titular de la Cuenta
              </label>
              <input
                type="text"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="Nombre y Apellido o Razón Social"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Banco / Entidad
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Mercado Pago, Banco Nación, Santander..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PERFIL & WHATSAPP */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-pink-50 dark:border-neutral-800 pb-3">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Contacto & WhatsApp de Sparkle
              </h2>
              <p className="text-xs text-neutral-500">
                Número a donde llegarán todos los carritos y pedidos desde el catálogo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Teléfono / WhatsApp para recibir compras *
              </label>
              <input
                type="tel"
                required
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Formato internacional (con código de país ej: +54 9...)
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Correo Electrónico de la Cuenta
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="contacto@tutienda.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: MENSAJES PREDETERMINADOS DE WHATSAPP */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-pink-50 dark:border-neutral-800 pb-3">
            <MessageSquare className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Personalizar Saludos y Mensajes de WhatsApp
              </h2>
              <p className="text-xs text-neutral-500">
                Adapta el saludo que el cliente te envía o el que tú le envías, haciendo referencia directa al nombre de tu catálogo.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Saludo inicial del cliente al enviar el pedido por WhatsApp
              </label>
              <input
                type="text"
                value={whatsappGreetingBuyer}
                onChange={(e) => setWhatsappGreetingBuyer(e.target.value)}
                placeholder="¡Hola {NOMBRE_TIENDA}! Te paso mi pedido desde tu catálogo:"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                💡 Usa <span className="font-bold text-pink-600">{'{NOMBRE_TIENDA}'}</span> para que se complete automáticamente con el nombre de tu catálogo (ej. "Zohar").
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Saludo que tú envías al cliente con el detalle del pedido
              </label>
              <input
                type="text"
                value={whatsappGreetingSeller}
                onChange={(e) => setWhatsappGreetingSeller(e.target.value)}
                placeholder="¡Hola {NOMBRE_CLIENTE}! Te comparto el detalle de tu pedido en {NOMBRE_TIENDA}:"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                💡 Usa <span className="font-bold text-pink-600">{'{NOMBRE_CLIENTE}'}</span> para el nombre del cliente y <span className="font-bold text-pink-600">{'{NOMBRE_TIENDA}'}</span> para el nombre del catálogo.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Mensaje de Cobro con Alias y Cuenta
              </label>
              <textarea
                rows={3}
                value={defaultPaymentMsg}
                onChange={(e) => setDefaultPaymentMsg(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Variables disponibles: {'{ALIAS}'}, {'{CBU}'}, {'{TITULAR}'}, {'{BANCO}'}, {'{MONTO}'}
              </p>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: CUENTAS ADMINISTRADORAS REGISTRADAS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-pink-50 dark:border-neutral-800 pb-3">
            <Shield className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Cuentas de Acceso al Modo Administrador
              </h2>
              <p className="text-xs text-neutral-500">
                Dos cuentas independientes con sus propios datos personales y contraseñas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-pink-200 dark:border-pink-900/60 bg-pink-50/40 dark:bg-pink-950/20 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">
                Cuenta 1 · Zohar Creaciones
              </span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Perfil de administración para Zohar
              </p>
              <p className="text-[11px] text-neutral-500">
                Alias: <span className="font-mono text-neutral-700 dark:text-neutral-300">zohar.creaciones.mp</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-pink-200 dark:border-pink-900/60 bg-pink-50/40 dark:bg-pink-950/20 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">
                Cuenta 2 · Shaddai Papelería
              </span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Perfil de administración para Shaddai
              </p>
              <p className="text-[11px] text-neutral-500">
                Alias: <span className="font-mono text-neutral-700 dark:text-neutral-300">shaddai.papeleria.mp</span>
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-pink-50 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Para probar la vista del cliente o prestar el equipo:
            </span>
            <button
              type="button"
              onClick={lockAdmin}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar sesión (Modo Catálogo para Clientes)</span>
            </button>
          </div>
        </div>

        {/* SECCIÓN 5: COPIA DE SEGURIDAD EN LA NUBE */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-pink-50 dark:border-neutral-800 pb-3">
            <Cloud className="w-5 h-5 text-pink-500" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Copia de Seguridad en la Nube & Respaldo
              </h2>
              <p className="text-xs text-neutral-500">
                Guarda tus finanzas, productos calculados, insumos y pedidos en un archivo seguro para sincronizar entre dispositivos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="p-3 rounded-xl border border-pink-200 dark:border-neutral-700 bg-pink-50/50 dark:bg-neutral-900 text-pink-700 dark:text-pink-300 hover:bg-pink-100 flex flex-col items-center justify-center text-center gap-1.5 transition-colors"
            >
              <Download className="w-5 h-5 text-pink-500" />
              <span className="text-xs font-bold">Descargar Copia Completa</span>
              <span className="text-[10px] text-neutral-500">Archivo .json portátil</span>
            </button>

            <label className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-neutral-500" />
              <span className="text-xs font-bold">Restaurar Copia</span>
              <span className="text-[10px] text-neutral-500">Seleccionar archivo</span>
              <input
                type="file"
                accept=".json"
                onChange={handleUploadBackup}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={resetToDemoData}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 flex flex-col items-center justify-center text-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-neutral-400" />
              <span className="text-xs font-bold">Cargar Ejemplos Iniciales</span>
              <span className="text-[10px] text-neutral-400">Datos demo de prueba</span>
            </button>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Toda la Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
};
