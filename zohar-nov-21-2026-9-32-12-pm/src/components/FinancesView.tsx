import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FinancialTransaction, PaymentMethodType } from '../types';
import { formatCurrency } from '../utils/pricingCalculator';
import { generateFinancialReportPdf } from '../utils/pdfGenerator';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileDown,
  Plus,
  Pencil,
  Search,
  Trash2,
  PieChart,
  BarChart3,
  X,
  Check,
  Building2,
  Banknote,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Wallet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const FinancesView: React.FC = () => {
  const { transactions, settings, addTransaction, updateTransaction, deleteTransaction, addToast } = useApp();

  const [periodType, setPeriodType] = useState<'diario' | 'mensual' | 'anual'>('mensual');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear())); // YYYY

  const [txTypeFilter, setTxTypeFilter] = useState<'todos' | 'ingreso' | 'egreso'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMultiMonthTable, setShowMultiMonthTable] = useState(true);

  // Transaction Modal State (Crear o Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [modalTxType, setModalTxType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [modalCategory, setModalCategory] = useState('Venta de Pedido');
  const [modalAmount, setModalAmount] = useState<number>(0);
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalDescription, setModalDescription] = useState('');
  const [modalMethod, setModalMethod] = useState<PaymentMethodType>('transferencia');

  // Month labels and navigation (previous and next month)
  const { prevMonthStr, nextMonthStr, prevMonthName, currentMonthName, nextMonthName } = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const currDate = new Date(y, m - 1, 1);
    const nextDate = new Date(y, m, 1);

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const fmt = (d: Date) => capitalize(d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }));

    const pStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const nStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      prevMonthStr: pStr,
      nextMonthStr: nStr,
      prevMonthName: fmt(prevDate),
      currentMonthName: fmt(currDate),
      nextMonthName: fmt(nextDate),
    };
  }, [selectedMonth]);

  // Filter transactions by selected period
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDateStr = tx.date.slice(0, 10);
      if (periodType === 'diario') {
        return txDateStr === selectedDate;
      }
      if (periodType === 'mensual') {
        return txDateStr.startsWith(selectedMonth);
      }
      if (periodType === 'anual') {
        return txDateStr.startsWith(selectedYear);
      }
      return true;
    });
  }, [transactions, periodType, selectedDate, selectedMonth, selectedYear]);

  // Detailed Cash Flow Carryover Calculations for Month
  const cashFlowMetrics = useMemo(() => {
    // 1. Saldo acumulado histórico ANTES del mes seleccionado (Saldo Inicial de Caja / Arrastre)
    let priorIncomes = 0;
    let priorExpenses = 0;
    transactions.forEach((tx) => {
      const txMonth = tx.date.slice(0, 7);
      const amt = Number(tx.amount) || 0;
      if (txMonth < selectedMonth) {
        if (tx.type === 'ingreso') priorIncomes += amt;
        else priorExpenses += amt;
      }
    });
    const openingBalance = priorIncomes - priorExpenses;

    // 2. Movimientos específicos del Mes Anterior inmediato
    let prevIncomes = 0;
    let prevExpenses = 0;
    transactions.forEach((tx) => {
      const txMonth = tx.date.slice(0, 7);
      const amt = Number(tx.amount) || 0;
      if (txMonth === prevMonthStr) {
        if (tx.type === 'ingreso') prevIncomes += amt;
        else prevExpenses += amt;
      }
    });
    const prevNet = prevIncomes - prevExpenses;

    // 3. Movimientos del Mes Seleccionado
    let currIncomes = 0;
    let currExpenses = 0;
    transactions.forEach((tx) => {
      const txMonth = tx.date.slice(0, 7);
      const amt = Number(tx.amount) || 0;
      if (txMonth === selectedMonth) {
        if (tx.type === 'ingreso') currIncomes += amt;
        else currExpenses += amt;
      }
    });
    const currNet = currIncomes - currExpenses;

    // 4. Saldo Final Resultante que impacta y se traslada al Mes Siguiente
    const closingBalance = openingBalance + currNet;

    // 5. Comparativa porcentual vs mes anterior
    const incomeGrowth = prevIncomes > 0 ? ((currIncomes - prevIncomes) / prevIncomes) * 100 : null;
    const expenseGrowth = prevExpenses > 0 ? ((currExpenses - prevExpenses) / prevExpenses) * 100 : null;

    return {
      openingBalance,
      prevIncomes,
      prevExpenses,
      prevNet,
      currIncomes,
      currExpenses,
      currNet,
      closingBalance,
      incomeGrowth,
      expenseGrowth,
    };
  }, [transactions, selectedMonth, prevMonthStr]);

  // Continuous Multi-Month Cash Flow Breakdown (Chronological carryover across all recorded months)
  const allMonthsCashFlow = useMemo(() => {
    const monthSet = new Set<string>();
    transactions.forEach((tx) => {
      const m = tx.date.slice(0, 7);
      if (m && m.length === 7) monthSet.add(m);
    });

    // Ensure months of the selected year are represented
    const [selY] = selectedMonth.split('-');
    for (let m = 1; m <= 12; m++) {
      monthSet.add(`${selY}-${String(m).padStart(2, '0')}`);
    }

    const sortedMonths = Array.from(monthSet).sort();

    let rollingBalance = 0;
    return sortedMonths.map((mStr) => {
      const opening = rollingBalance;
      let inc = 0;
      let exp = 0;
      transactions.forEach((tx) => {
        if (tx.date.startsWith(mStr)) {
          const amt = Number(tx.amount) || 0;
          if (tx.type === 'ingreso') inc += amt;
          else exp += amt;
        }
      });
      const net = inc - exp;
      const closing = opening + net;
      rollingBalance = closing; // impacta y se traslada al mes siguiente!

      const [y, mNum] = mStr.split('-').map(Number);
      const d = new Date(y, mNum - 1, 1);
      const label = d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
      const fullLabel = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

      return {
        monthStr: mStr,
        label,
        fullLabel,
        opening,
        incomes: inc,
        expenses: exp,
        net,
        closing,
        isCurrentSelected: mStr === selectedMonth,
      };
    });
  }, [transactions, selectedMonth]);

  // Aggregated Totals
  const { totalIncomes, totalExpenses, netBalance } = useMemo(() => {
    let incomes = 0;
    let expenses = 0;
    periodTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'ingreso') {
        incomes += amt;
      } else {
        expenses += amt;
      }
    });
    return { totalIncomes: incomes, totalExpenses: expenses, netBalance: incomes - expenses };
  }, [periodTransactions]);

  // Filtered list for display in ledger table
  const displayedTransactions = useMemo(() => {
    return periodTransactions.filter((tx) => {
      const matchType = txTypeFilter === 'todos' || tx.type === txTypeFilter;
      const matchQuery =
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [periodTransactions, txTypeFilter, searchQuery]);

  // Monthly Breakdown for Annual Chart (12 Months)
  const annualMonthlyData = useMemo(() => {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    return months.map((mName, idx) => {
      const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      let inc = 0;
      let exp = 0;
      transactions.forEach((tx) => {
        if (tx.date.startsWith(monthPrefix)) {
          if (tx.type === 'ingreso') inc += Number(tx.amount) || 0;
          else exp += Number(tx.amount) || 0;
        }
      });
      return { month: mName, inc, exp, net: inc - exp };
    });
  }, [transactions, selectedYear]);

  // Expenses Category Breakdown
  const expenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    periodTransactions
      .filter((t) => t.type === 'egreso')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + (Number(t.amount) || 0));
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [periodTransactions]);

  const handleExportPdf = () => {
    let periodLabel = selectedMonth;
    if (periodType === 'diario') periodLabel = selectedDate;
    if (periodType === 'anual') periodLabel = `Año ${selectedYear}`;

    const opening = periodType === 'mensual' ? cashFlowMetrics.openingBalance : undefined;
    generateFinancialReportPdf(periodType, periodLabel, periodTransactions, settings, opening);
    addToast('Reporte generado', `Reporte financiero ${periodType} descargado en PDF con flujo de caja.`, 'success');
  };

  const handleExportCsv = () => {
    let csv = `Reporte de Finanzas y Flujo de Caja - ${periodType.toUpperCase()} - ${selectedMonth}\n`;
    if (periodType === 'mensual') {
      csv += `Saldo Inicial de Caja (Arrastre mes anterior): ${cashFlowMetrics.openingBalance}\n`;
      csv += `Ingresos del Mes: ${cashFlowMetrics.currIncomes}\n`;
      csv += `Gastos del Mes: ${cashFlowMetrics.currExpenses}\n`;
      csv += `Flujo Neto del Mes: ${cashFlowMetrics.currNet}\n`;
      csv += `Saldo Final de Caja (Pasa al mes siguiente): ${cashFlowMetrics.closingBalance}\n\n`;
    }
    csv += 'ID,Fecha,Tipo,Categoría,Descripción,Método,Monto\n';
    periodTransactions.forEach((t) => {
      csv += `"${t.id}","${t.date.slice(0, 10)}","${t.type}","${t.category}","${t.description.replace(/"/g, '""')}","${t.method}","${t.amount}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Finanzas_FlujoCaja_${periodType}_ZOHAR.csv`;
    link.click();
    addToast('CSV exportado', 'Datos exportados correctamente con arrastre de caja.', 'info');
  };

  const handleOpenNewTransaction = () => {
    setEditingTransaction(null);
    setModalTxType('ingreso');
    setModalCategory('Venta de Pedido');
    setModalAmount(0);
    setModalDate(new Date().toISOString().slice(0, 10));
    setModalDescription('');
    setModalMethod('transferencia');
    setIsModalOpen(true);
  };

  const handleOpenEditTransaction = (tx: FinancialTransaction) => {
    setEditingTransaction(tx);
    setModalTxType(tx.type);
    setModalCategory(tx.category);
    setModalAmount(tx.amount);
    setModalDate(tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setModalDescription(tx.description || '');
    setModalMethod(tx.method || 'transferencia');
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalAmount <= 0) {
      addToast('Monto inválido', 'Ingresa un valor positivo.', 'warning');
      return;
    }

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        type: modalTxType,
        category: modalCategory || (modalTxType === 'ingreso' ? 'Ventas' : 'General'),
        amount: Number(modalAmount),
        date: new Date(modalDate).toISOString(),
        description: modalDescription || (modalTxType === 'ingreso' ? 'Ingreso de caja' : 'Gasto operativo'),
        method: modalMethod,
      });
    } else {
      addTransaction({
        type: modalTxType,
        category: modalCategory || (modalTxType === 'ingreso' ? 'Ventas' : 'General'),
        amount: Number(modalAmount),
        date: new Date(modalDate).toISOString(),
        description: modalDescription || (modalTxType === 'ingreso' ? 'Ingreso de caja' : 'Gasto operativo'),
        method: modalMethod,
      });
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
    setModalAmount(0);
    setModalDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Control de Finanzas, Ingresos & Gastos
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Monitorea el movimiento real de tu caja en vista diaria, mensual o anual con gráficos estadísticos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold hover:bg-neutral-50 transition-colors"
          >
            Exportar CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3 py-2 bg-white dark:bg-neutral-800 border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-pink-50 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Reporte PDF</span>
          </button>
          <button
            onClick={handleOpenNewTransaction}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Anotar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-2xs">
        {/* Daily, Monthly, Yearly Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPeriodType('diario')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              periodType === 'diario'
                ? 'bg-pink-600 text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Diario
          </button>
          <button
            onClick={() => setPeriodType('mensual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              periodType === 'mensual'
                ? 'bg-pink-600 text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setPeriodType('anual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              periodType === 'anual'
                ? 'bg-pink-600 text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Anual
          </button>
        </div>

        {/* Dynamic Period Picker */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
          {periodType === 'diario' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-medium"
            />
          )}
          {periodType === 'mensual' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedMonth(prevMonthStr)}
                className="px-2.5 py-1 rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                title={`Ir a ${prevMonthName}`}
              >
                <ChevronLeft className="w-3.5 h-3.5 text-pink-600" />
                <span className="hidden sm:inline">{prevMonthName}</span>
                <span className="sm:hidden">Ant.</span>
              </button>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold text-xs"
              />

              <button
                type="button"
                onClick={() => setSelectedMonth(nextMonthStr)}
                className="px-2.5 py-1 rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                title={`Ir a ${nextMonthName}`}
              >
                <span className="hidden sm:inline">{nextMonthName}</span>
                <span className="sm:hidden">Sig.</span>
                <ChevronRight className="w-3.5 h-3.5 text-pink-600" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-pink-600 hover:bg-pink-50 dark:hover:bg-neutral-800 transition-colors"
                title="Ir al mes en curso"
              >
                Mes Actual
              </button>
            </div>
          )}
          {periodType === 'anual' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-pink-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold"
            >
              {[2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={String(yr)}>
                  Año {yr}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* PANEL DESTACADO: FLUJO DE CAJA CONTINUO (MES ANTERIOR -> MES VIGENTE -> MES SIGUIENTE) */}
      {periodType === 'mensual' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white via-pink-50/20 to-pink-50/40 dark:from-[#18141D] dark:via-[#1c1722] dark:to-[#221a2a] border border-pink-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100/80 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-pink-100/80 dark:bg-pink-950/60 text-pink-600">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
                  <span>Flujo de Caja Continuo & Arrastre de Saldos</span>
                  <span className="text-[10px] font-semibold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/80 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-800">
                    {currentMonthName}
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Visualiza cómo impacta la caja del mes anterior ({prevMonthName}) en este mes y el saldo final acumulado que se transfiere al mes siguiente ({nextMonthName}).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMultiMonthTable((prev) => !prev)}
              className="self-start sm:self-auto text-xs font-semibold text-pink-600 hover:text-pink-700 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-pink-200 dark:border-neutral-700 shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-pink-500" />
              <span>{showMultiMonthTable ? 'Ocultar Tabla Mes a Mes' : 'Ver Tabla de Todos los Meses'}</span>
            </button>
          </div>

          {/* 3-Column Pipeline: Mes Anterior -> Mes Vigente -> Mes Siguiente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ETAPA 1: MES ANTERIOR & CAJA INICIAL DE APERTURA */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#15111a] border border-blue-100 dark:border-neutral-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                  <span>1. Mes Anterior</span>
                  <span className="text-neutral-400 font-normal">({prevMonthName})</span>
                </span>
                {cashFlowMetrics.openingBalance >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> A favor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                    <AlertTriangle className="w-3 h-3" /> En contra
                  </span>
                )}
              </div>

              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  Saldo Inicial arrastrado a {currentMonthName}:
                </p>
                <p className={`text-xl font-black font-mono tabular-nums ${cashFlowMetrics.openingBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(cashFlowMetrics.openingBalance, settings.currency)}
                </p>
              </div>

              <div className="pt-2 border-t border-dashed border-neutral-100 dark:border-neutral-800 text-[11px] space-y-1 text-neutral-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Ingresos {prevMonthName}:</span>
                  <span className="font-mono font-semibold text-emerald-600">+{formatCurrency(cashFlowMetrics.prevIncomes, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos {prevMonthName}:</span>
                  <span className="font-mono font-semibold text-rose-600">-{formatCurrency(cashFlowMetrics.prevExpenses, settings.currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-neutral-800 dark:text-neutral-200 pt-0.5 border-t border-neutral-100 dark:border-neutral-800">
                  <span>Flujo neto {prevMonthName}:</span>
                  <span className={`font-mono ${cashFlowMetrics.prevNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {cashFlowMetrics.prevNet >= 0 ? '+' : ''}{formatCurrency(cashFlowMetrics.prevNet, settings.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* ETAPA 2: MOVIMIENTO DEL MES VIGENTE */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#15111a] border border-pink-200 dark:border-neutral-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider flex items-center gap-1">
                  <span>2. Mes Vigente</span>
                  <span className="text-pink-600 font-bold">({currentMonthName})</span>
                </span>
                <span className="text-[10px] text-pink-600 font-bold bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-800">
                  Operación Actual
                </span>
              </div>

              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  Flujo Neto generado en {currentMonthName}:
                </p>
                <p className={`text-xl font-black font-mono tabular-nums ${cashFlowMetrics.currNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {cashFlowMetrics.currNet >= 0 ? '+' : ''}{formatCurrency(cashFlowMetrics.currNet, settings.currency)}
                </p>
              </div>

              <div className="pt-2 border-t border-dashed border-neutral-100 dark:border-neutral-800 text-[11px] space-y-1 text-neutral-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Ingresos del mes:</span>
                  <span className="font-mono font-semibold text-emerald-600">+{formatCurrency(cashFlowMetrics.currIncomes, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos del mes:</span>
                  <span className="font-mono font-semibold text-rose-600">-{formatCurrency(cashFlowMetrics.currExpenses, settings.currency)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 pt-0.5 border-t border-neutral-100 dark:border-neutral-800">
                  <span>Variación vs mes anterior:</span>
                  <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                    {cashFlowMetrics.incomeGrowth !== null ? `${cashFlowMetrics.incomeGrowth >= 0 ? '+' : ''}${Math.round(cashFlowMetrics.incomeGrowth)}% cobros` : 'Sin base previa'}
                  </span>
                </div>
              </div>
            </div>

            {/* ETAPA 3: SALDO FINAL QUE PASA AL MES SIGUIENTE */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#15111a] border border-purple-200 dark:border-neutral-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                  <span>3. Impacto en Próximo Mes</span>
                  <span className="text-neutral-400 font-normal">({nextMonthName})</span>
                </span>
                {cashFlowMetrics.closingBalance >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                    <Sparkles className="w-3 h-3 text-purple-500" /> A Favor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                    <AlertTriangle className="w-3 h-3 text-rose-500" /> Déficit
                  </span>
                )}
              </div>

              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  Saldo de Caja acumulado que pasa a {nextMonthName}:
                </p>
                <p className={`text-xl font-black font-mono tabular-nums ${cashFlowMetrics.closingBalance >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(cashFlowMetrics.closingBalance, settings.currency)}
                </p>
              </div>

              <div className="pt-2 border-t border-dashed border-neutral-100 dark:border-neutral-800 text-[11px] space-y-1 text-neutral-600 dark:text-neutral-400">
                <p className="text-[10px] leading-relaxed text-purple-900/80 dark:text-purple-300/80">
                  {cashFlowMetrics.closingBalance >= 0
                    ? `✨ Iniciarás ${nextMonthName} con ${formatCurrency(cashFlowMetrics.closingBalance, settings.currency)} de saldo positivo a favor en tu caja.`
                    : `⚠️ Iniciarás ${nextMonthName} con un saldo negativo de ${formatCurrency(cashFlowMetrics.closingBalance, settings.currency)} a cubrir con nuevos ingresos.`}
                </p>
              </div>
            </div>
          </div>

          {/* Formula Bar Footer */}
          <div className="p-2.5 rounded-xl bg-pink-100/50 dark:bg-neutral-900 border border-pink-200/60 dark:border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-2 text-neutral-700 dark:text-neutral-300">
            <span className="font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" />
              <span>Fórmula del Flujo de Caja:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="bg-white dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                Saldo Inicial: <strong>{formatCurrency(cashFlowMetrics.openingBalance, settings.currency)}</strong>
              </span>
              <span>+</span>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Ingresos: <strong>+{formatCurrency(cashFlowMetrics.currIncomes, settings.currency)}</strong>
              </span>
              <span>-</span>
              <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                Gastos: <strong>-{formatCurrency(cashFlowMetrics.currExpenses, settings.currency)}</strong>
              </span>
              <span>=</span>
              <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-0.5 rounded font-extrabold border border-purple-300 dark:border-purple-800">
                Saldo Próximo Mes: {formatCurrency(cashFlowMetrics.closingBalance, settings.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards (4 en modo mensual, 3 en modo diario/anual) */}
      {periodType === 'mensual' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Saldo Inicial (Caja que viene del mes anterior) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-blue-100 dark:border-blue-900/40 shadow-2xs">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Caja Inicial (Arrastre)</span>
              <Wallet className="w-4 h-4" />
            </div>
            <p className={`text-xl sm:text-2xl font-black mt-1.5 font-mono tabular-nums ${cashFlowMetrics.openingBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
              {formatCurrency(cashFlowMetrics.openingBalance, settings.currency)}
            </p>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Viene del cierre de {prevMonthName}
            </span>
          </div>

          {/* Card 2: Ingresos del Mes */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ingresos del Mes</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono tabular-nums">
              +{formatCurrency(totalIncomes, settings.currency)}
            </p>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              {periodTransactions.filter((t) => t.type === 'ingreso').length} cobros en {currentMonthName}
            </span>
          </div>

          {/* Card 3: Gastos del Mes */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-rose-100 dark:border-rose-900/40 shadow-2xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gastos del Mes</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 font-mono tabular-nums">
              -{formatCurrency(totalExpenses, settings.currency)}
            </p>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              {periodTransactions.filter((t) => t.type === 'egreso').length} egresos en {currentMonthName}
            </span>
          </div>

          {/* Card 4: Saldo Final Acumulado de Caja (Pasa a próximo mes) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-purple-200 dark:border-neutral-800 shadow-2xs">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Caja Final Acumulada</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <p
              className={`text-xl sm:text-2xl font-black mt-1.5 font-mono tabular-nums ${
                cashFlowMetrics.closingBalance >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600'
              }`}
            >
              {formatCurrency(cashFlowMetrics.closingBalance, settings.currency)}
            </p>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Impacta directamente en {nextMonthName}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Incomes */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ingresos Totales</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono tabular-nums">
              +{formatCurrency(totalIncomes, settings.currency)}
            </p>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              {periodTransactions.filter((t) => t.type === 'ingreso').length} cobros registrados
            </span>
          </div>

          {/* Expenses */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-rose-100 dark:border-rose-900/40 shadow-2xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gastos / Egresos</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 font-mono tabular-nums">
              -{formatCurrency(totalExpenses, settings.currency)}
            </p>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              {periodTransactions.filter((t) => t.type === 'egreso').length} gastos anotados
            </span>
          </div>

          {/* Net Margin */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-200 dark:border-neutral-800 shadow-2xs">
            <div className="flex items-center justify-between text-pink-600 dark:text-pink-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ganancia Neta en Caja</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <p
              className={`text-2xl font-black mt-1.5 font-mono tabular-nums ${
                netBalance >= 0 ? 'text-pink-600 dark:text-pink-400' : 'text-rose-600'
              }`}
            >
              {formatCurrency(netBalance, settings.currency)}
            </p>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              {totalIncomes > 0
                ? `Margen de rentabilidad: ${Math.round((netBalance / totalIncomes) * 100)}%`
                : 'Sin ingresos en el período'}
            </span>
          </div>
        </div>
      )}

      {/* STATISTICAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart Column (2 spans): Evolution Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-pink-500" />
              Evolución Comparativa (Ingresos vs Gastos)
            </h3>
            <span className="text-xs text-neutral-400">
              {periodType === 'anual' ? `Año ${selectedYear}` : selectedMonth}
            </span>
          </div>

          {/* SVG / HTML Bar Chart */}
          <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-neutral-100 dark:border-neutral-800 overflow-x-auto">
            {annualMonthlyData.map((d, i) => {
              const maxVal = Math.max(
                1,
                ...annualMonthlyData.map((m) => Math.max(m.inc, m.exp))
              );
              const incHeight = Math.max(4, Math.round((d.inc / maxVal) * 130));
              const expHeight = Math.max(4, Math.round((d.exp / maxVal) * 130));

              return (
                <div key={i} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group">
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${incHeight}px` }}
                      title={`Ingresos ${d.month}: ${formatCurrency(d.inc, settings.currency)}`}
                      className="w-2.5 rounded-t bg-emerald-500/80 group-hover:bg-emerald-500 transition-all cursor-pointer"
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${expHeight}px` }}
                      title={`Gastos ${d.month}: ${formatCurrency(d.exp, settings.currency)}`}
                      className="w-2.5 rounded-t bg-rose-400/80 group-hover:bg-rose-500 transition-all cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">{d.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              <span>Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-400 inline-block" />
              <span>Gastos</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown (1 span) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-pink-500" />
            Distribución de Gastos
          </h3>

          {expenseCategories.length === 0 ? (
            <p className="text-xs text-neutral-400 italic py-10 text-center">
              No hay gastos registrados en este período.
            </p>
          ) : (
            <div className="space-y-3 pt-1">
              {expenseCategories.map(([category, amt], index) => {
                const percent = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
                        {category}
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {formatCurrency(amt, settings.currency)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full rounded-full bg-pink-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TABLA DE FLUJO CONTINUO MES A MES (IMPACTO SUCESIVO DE CAJA) */}
      {showMultiMonthTable && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-50 dark:border-neutral-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Hoja de Flujo de Caja Continuo (Todos los Meses)
                </h3>
                <p className="text-xs text-neutral-500">
                  Comprueba cómo cada mes arrastra su saldo al mes siguiente sucesivamente para ver el flujo real acumulado.
                </p>
              </div>
            </div>

            <div className="text-xs text-neutral-400 font-mono">
              Mostrando {allMonthsCashFlow.length} meses cronológicos
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pink-50/60 dark:bg-neutral-900/60 border-b border-pink-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Mes</th>
                  <th className="p-3 text-right">Saldo Inicial (Arrastre)</th>
                  <th className="p-3 text-right">Ingresos (+)</th>
                  <th className="p-3 text-right">Gastos (-)</th>
                  <th className="p-3 text-right">Flujo Neto del Mes</th>
                  <th className="p-3 text-right">Saldo Final (Pasa al Sig.)</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {allMonthsCashFlow.map((row) => {
                  const isSelected = row.isCurrentSelected && periodType === 'mensual';
                  const isPosOpening = row.opening >= 0;
                  const isPosNet = row.net >= 0;
                  const isPosClosing = row.closing >= 0;

                  return (
                    <tr
                      key={row.monthStr}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-pink-50/60 dark:bg-pink-950/30 font-semibold'
                          : 'hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">
                            {row.fullLabel}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-pink-500 text-white font-bold px-2 py-0.5 rounded-full shadow-2xs">
                              En Vista
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Saldo Inicial */}
                      <td className={`p-3 text-right font-mono font-medium tabular-nums ${isPosOpening ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
                        {formatCurrency(row.opening, settings.currency)}
                      </td>

                      {/* Ingresos */}
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                        {row.incomes > 0 ? `+${formatCurrency(row.incomes, settings.currency)}` : '-'}
                      </td>

                      {/* Gastos */}
                      <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                        {row.expenses > 0 ? `-${formatCurrency(row.expenses, settings.currency)}` : '-'}
                      </td>

                      {/* Flujo Neto */}
                      <td className={`p-3 text-right font-mono font-bold tabular-nums ${isPosNet ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                        {isPosNet ? '+' : ''}{formatCurrency(row.net, settings.currency)}
                      </td>

                      {/* Saldo Final (Pasa al Sig.) */}
                      <td className={`p-3 text-right font-mono font-black text-sm tabular-nums ${isPosClosing ? 'text-purple-700 dark:text-purple-300' : 'text-rose-600'}`}>
                        {formatCurrency(row.closing, settings.currency)}
                      </td>

                      {/* Estado */}
                      <td className="p-3 text-center">
                        {isPosClosing ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> A favor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> En contra
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonth(row.monthStr);
                            setPeriodType('mensual');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-pink-600 text-white shadow-2xs'
                              : 'bg-neutral-100 hover:bg-pink-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          {isSelected ? 'Viendo' : 'Ver mes'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECENT TRANSACTIONS LEDGER */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#18141D] border border-pink-100 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Historial de Transacciones
            </h3>
            <p className="text-xs text-neutral-500">
              Movimientos detallados de ingresos y egresos ordenados por fecha.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                onClick={() => setTxTypeFilter('todos')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  txTypeFilter === 'todos' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTxTypeFilter('ingreso')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  txTypeFilter === 'ingreso' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-neutral-500'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setTxTypeFilter('egreso')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  txTypeFilter === 'egreso' ? 'bg-rose-600 text-white shadow-2xs' : 'text-neutral-500'
                }`}
              >
                Gastos
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por texto..."
                className="pl-8 pr-2.5 py-1 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pink-50/60 dark:bg-neutral-900/60 border-b border-pink-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Descripción</th>
                <th className="p-3">Método</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-neutral-400 italic">
                    No hay transacciones que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((tx) => {
                  const isIncome = tx.type === 'ingreso';

                  return (
                    <tr key={tx.id} className="hover:bg-pink-50/20 dark:hover:bg-neutral-800/30">
                      <td className="p-3 text-neutral-500 font-mono">
                        {new Date(tx.date).toLocaleDateString('es-AR')}
                      </td>
                      <td className="p-3 font-semibold">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                            isIncome
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {isIncome ? '+ Ingreso' : '- Gasto'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-neutral-700 dark:text-neutral-300">
                        {tx.category}
                      </td>
                      <td className="p-3 text-neutral-700 dark:text-neutral-300 text-xs font-normal whitespace-pre-wrap break-words leading-relaxed min-w-[180px]">
                        {tx.description || '-'}
                      </td>
                      <td className="p-3 capitalize text-neutral-500">{tx.method}</td>
                      <td
                        className={`p-3 text-right font-bold font-mono text-sm tabular-nums ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(tx.amount, settings.currency)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditTransaction(tx)}
                          className="p-1 text-neutral-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-neutral-800 rounded transition-colors mr-1"
                          title="Editar este movimiento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-neutral-800 rounded transition-colors"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar o Editar Ingreso o Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18141D] rounded-2xl max-w-md w-full border border-pink-100 dark:border-neutral-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-pink-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingTransaction ? 'Editar Movimiento de Caja' : 'Anotar Movimiento de Caja'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalTxType('ingreso');
                    setModalCategory('Venta de Pedido');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    modalTxType === 'ingreso'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  + Ingreso a Caja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTxType('egreso');
                    setModalCategory('Compra de Materiales');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    modalTxType === 'egreso'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  - Gasto / Egreso
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Monto ({settings.currency}) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={modalAmount === 0 ? '' : modalAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    setModalAmount(raw === '' ? 0 : parseFloat(raw) || 0);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Categoría</label>
                <input
                  type="text"
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  placeholder={
                    modalTxType === 'ingreso'
                      ? 'Venta de Pedido, Seña, Obsequio...'
                      : 'Compra de Materiales, Luz, Alquiler, Herramientas, Packaging...'
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Descripción / Concepto</label>
                <input
                  type="text"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Detalles del movimiento..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Método</label>
                  <select
                    value={modalMethod}
                    onChange={(e) => setModalMethod(e.target.value as PaymentMethodType)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-sm ${
                    modalTxType === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {editingTransaction ? 'Guardar Cambios' : 'Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
