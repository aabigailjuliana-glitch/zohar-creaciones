import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  Moon,
  Sun,
  Lock,
  Menu,
  X,
  Sparkles,
  Heart,
  LogOut,
  ChevronDown,
  Cloud,
} from 'lucide-react';
import { ZoharLogo } from './ZoharLogo';

interface HeaderProps {
  onOpenCart?: () => void;
  onOpenAdminAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart, onOpenAdminAuth }) => {
  const {
    settings,
    toggleDarkMode,
    activeView,
    setActiveView,
    cart,
    isAdminUnlocked,
    lockAdmin,
    accounts,
    currentAccountId,
    switchAccount,
    isCloudSynced,
    isSyncing,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const adminNavItems = [
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'finanzas', label: 'Finanzas' },
    { id: 'calculadora', label: 'Calculadora & Costos' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'contactos', label: 'Clientes & Proveedores' },
    { id: 'ajustes', label: 'Ajustes' },
  ];

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    setMobileMenuOpen(false);
  };

  const handleSecretAdminTrigger = () => {
    if (!isAdminUnlocked && onOpenAdminAuth) {
      onOpenAdminAuth();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#151117]/95 backdrop-blur-md border-b border-pink-100 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 md:gap-8">
          {/* Zone 1: Brand Wordmark with Secret Destello / Logo Admin Access */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSecretAdminTrigger}
              title={isAdminUnlocked ? 'ZOHAR' : 'Acceso a cuentas'}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="relative w-9 h-9 rounded-xl bg-white dark:bg-neutral-900 border border-pink-200 dark:border-pink-800 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform overflow-hidden p-0.5">
                {settings.businessLogoUrl ? (
                  <img
                    src={settings.businessLogoUrl}
                    alt={settings.businessName || 'ZOHAR'}
                    className={`w-full h-full ${settings.businessLogoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                  />
                ) : (
                  <ZoharLogo className="w-full h-full" showBadge={false} />
                )}
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                  {settings.catalogTitle || settings.businessName || 'ZOHAR'}
                </span>
                {isAdminUnlocked && (
                  <span className="hidden sm:inline-block text-[10px] text-pink-600 dark:text-pink-400 font-semibold ml-2 bg-pink-50 dark:bg-pink-950 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-800">
                    {settings.catalogTitle || settings.businessName || 'Modo Admin'}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (ONLY VISIBLE IF ADMIN IS UNLOCKED!) */}
          {isAdminUnlocked ? (
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {adminNavItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : null}

          {/* Zone 3: Actions & Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* If Admin is Unlocked: Show Account Switcher & Lock Button */}
            {isAdminUnlocked ? (
              <div className="relative">
                <button
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 rounded-lg hover:bg-pink-100 transition-colors whitespace-nowrap"
                >
                  <span className="font-bold truncate max-w-[130px]">
                    {settings.catalogTitle || settings.businessName || (currentAccountId === 'zohar' ? 'Zohar' : 'Admin')}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {accountDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#18141D] rounded-xl border border-pink-100 dark:border-neutral-800 shadow-lg py-1.5 z-50 text-xs">
                    <div className="px-3 py-1 text-[10px] text-neutral-400 font-semibold uppercase">
                      Cuenta Activa
                    </div>
                    {accounts.map((acc) => {
                      const displayTitle = acc.id === currentAccountId
                        ? (settings.catalogTitle || settings.businessName || acc.label)
                        : acc.label;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            switchAccount(acc.id);
                            setAccountDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-pink-50 dark:hover:bg-neutral-800 ${
                            currentAccountId === acc.id ? 'font-bold text-pink-600' : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className="truncate">
                            <p className="font-medium">{displayTitle}</p>
                          </div>
                        </button>
                      );
                    })}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          lockAdmin();
                          setAccountDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-rose-600 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar sesión (Modo Cliente)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Real-time Cloud Sync Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                isCloudSynced
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
              title={
                isCloudSynced
                  ? 'Sincronización en tiempo real activa: los cambios se actualizan automáticamente en todos los dispositivos'
                  : 'Conectando con la nube...'
              }
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isCloudSynced ? 'En la nube' : 'Conectando...'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCloudSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
                }`}
              />
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-pink-50 dark:hover:bg-neutral-800 transition-colors"
              title="Carrito de pedidos"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-pink-50 dark:hover:bg-neutral-800 transition-colors"
              title={settings.darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {settings.darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mobile Menu Button (Only shown if admin is logged in) */}
            {isAdminUnlocked && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Only when admin unlocked) */}
      {isAdminUnlocked && mobileMenuOpen && (
        <div className="md:hidden border-t border-pink-100 dark:border-neutral-800 bg-white dark:bg-[#151117] px-4 pt-3 pb-5 space-y-1 shadow-lg">
          <div className="px-3 py-1 mb-2 bg-pink-50 dark:bg-pink-950 rounded-lg text-xs font-semibold text-pink-700 dark:text-pink-300">
            Cuenta activa: {settings.catalogTitle || settings.businessName || (currentAccountId === 'zohar' ? 'Zohar Creaciones' : 'Catálogo')}
          </div>
          {adminNavItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                  isActive
                    ? 'bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => {
                lockAdmin();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión y ver solo como cliente
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
