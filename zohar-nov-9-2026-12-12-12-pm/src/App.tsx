import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { OrdersView } from './components/OrdersView';
import { FinancesView } from './components/FinancesView';
import { CalculatorView } from './components/CalculatorView';
import { CatalogCustomerView } from './components/CatalogCustomerView';
import { ClientsSuppliersView } from './components/ClientsSuppliersView';
import { SettingsView } from './components/SettingsView';
import { CartDrawer } from './components/CartDrawer';
import { AdminLockModal } from './components/AdminLockModal';
import {
  ClipboardList,
  Wallet,
  Calculator,
  ShoppingBag,
  Users,
  Settings,
  Lock,
} from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView, setActiveView, isAdminUnlocked, cart } = useApp();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const renderActiveView = () => {
    switch (activeView) {
      case 'pedidos':
        return <OrdersView />;
      case 'finanzas':
        return <FinancesView />;
      case 'calculadora':
        return <CalculatorView />;
      case 'catalogo':
        return <CatalogCustomerView onOpenCart={() => setIsCartOpen(true)} />;
      case 'contactos':
        return <ClientsSuppliersView />;
      case 'ajustes':
        return <SettingsView />;
      default:
        return <OrdersView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA] dark:bg-[#151117] text-neutral-800 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-150 w-full max-w-full overflow-x-hidden">
      {/* Top Bar Navigation */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdminAuth={() => setIsAdminAuthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8 min-w-0 overflow-x-hidden">
        {renderActiveView()}
      </main>

      {/* Mobile Bottom Navigation Bar (ONLY VISIBLE WHEN ADMIN IS LOGGED IN) */}
      {isAdminUnlocked ? (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#18141D]/95 backdrop-blur-md border-t border-pink-100 dark:border-neutral-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveView('pedidos')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeView === 'pedidos'
                ? 'text-pink-600 dark:text-pink-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Pedidos</span>
          </button>

          <button
            onClick={() => setActiveView('finanzas')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeView === 'finanzas'
                ? 'text-pink-600 dark:text-pink-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Finanzas</span>
          </button>

          <button
            onClick={() => setActiveView('calculadora')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeView === 'calculadora'
                ? 'text-pink-600 dark:text-pink-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Costos</span>
          </button>

          <button
            onClick={() => setActiveView('catalogo')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeView === 'catalogo'
                ? 'text-pink-600 dark:text-pink-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-pink-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span>Catálogo</span>
          </button>

          <button
            onClick={() => setActiveView('contactos')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeView === 'contactos'
                ? 'text-pink-600 dark:text-pink-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes</span>
          </button>

          <button
            onClick={() => setActiveView('ajustes')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              activeView === 'ajustes'
                ? 'text-pink-600 dark:text-pink-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes</span>
          </button>
        </div>
      ) : (
        /* Subtle hidden trigger in bottom right corner (a delicate destello / heart) */
        <div className="fixed bottom-3 right-3 z-30">
          <button
            onClick={() => setIsAdminAuthModalOpen(true)}
            className="w-7 h-7 rounded-full bg-pink-100/60 hover:bg-pink-200 dark:bg-neutral-800/60 dark:hover:bg-neutral-700 text-pink-400 hover:text-pink-600 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
            title="✨"
          >
            <span className="text-[10px]">✨</span>
          </button>
        </div>
      )}

      {/* Interactive Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Admin Passcode / Biometric Modal */}
      <AdminLockModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
      />

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
