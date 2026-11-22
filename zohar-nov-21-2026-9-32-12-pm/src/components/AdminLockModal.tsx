import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, X, Lock, Eye, EyeOff, UserCircle, Clipboard } from 'lucide-react';
import { ZoharLogo } from './ZoharLogo';

interface AdminLockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLockModal: React.FC<AdminLockModalProps> = ({ isOpen, onClose }) => {
  const { loginAdmin } = useApp();

  // Inputs start completely blank with no pre-written email or password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [maskEmail, setMaskEmail] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePasteEmail = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setEmail(text.trim());
        setErrorMsg('');
      }
    } catch {
      setErrorMsg('Usa Ctrl+V o mantén presionado para pegar tu correo.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa correo y contraseña.');
      return;
    }

    const success = loginAdmin(email.trim(), password);
    if (success) {
      setEmail('');
      setPassword('');
      onClose();
    } else {
      setErrorMsg('Correo o contraseña incorrectos. Verifica tus credenciales.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18141D] rounded-3xl max-w-sm w-full border border-pink-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Sparkle Emblem */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-100 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 flex items-center justify-center text-pink-600 dark:text-pink-400 shadow-xs overflow-hidden p-0.5">
              <ZoharLogo className="w-full h-full" showBadge={false} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Acceso Administrador
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Ingresa con tu correo y contraseña
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEmail('');
              setPassword('');
              setErrorMsg('');
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confidential Login Form - Inputs start empty */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Correo Electrónico
              </label>
              <button
                type="button"
                onClick={handlePasteEmail}
                className="text-[11px] text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
                title="Pegar correo del portapapeles"
              >
                <Clipboard className="w-3 h-3" />
                <span>Pegar</span>
              </button>
            </div>

            <div className="relative">
              <UserCircle className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={maskEmail ? 'password' : 'text'}
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Ingresa tu correo"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <button
                type="button"
                onClick={() => setMaskEmail(!maskEmail)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                title={maskEmail ? 'Mostrar texto de correo' : 'Ocultar visualmente el correo'}
              >
                {maskEmail ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Ingresa tu contraseña"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 leading-relaxed">
              {errorMsg}
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Ingresar como Administrador</span>
            </button>
          </div>
        </form>

        <div className="text-[11px] text-center text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2">
          Área restringida para administradores Sparkle.
        </div>
      </div>
    </div>
  );
};
