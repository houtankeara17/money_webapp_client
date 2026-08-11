import { useEffect, useState, useCallback } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useI18n from "../hooks/useI18n";
import { useAuth } from "../store/AuthContext";
import { formatMoney } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import api from "../services/api";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  Wallet,
  PiggyBank,
  Send,
  Banknote,
  Gift,
  PieChart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Calendar,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Dashboard = () => {
  useDocumentTitle("Dashboard");
  const { t, tMonth } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sumRes, chartRes, budgetRes] = await Promise.allSettled([
        api.get("/reports/summary", { params: { year, monthNumber: month } }),
        api.get("/reports/charts", { params: { year } }),
        api.get("/budgets", { params: { year, monthNumber: month, limit: 1 } }),
      ]);

      if (sumRes.status === "fulfilled") {
        setSummary(sumRes.value.data?.data || null);
      } else {
        console.error("summary", sumRes.reason);
      }
      if (chartRes.status === "fulfilled") {
        setCharts(chartRes.value.data?.data || null);
      } else {
        console.error("charts", chartRes.reason);
      }
      if (budgetRes.status === "fulfilled") {
        setBudget(budgetRes.value.data?.data?.items?.[0] || null);
      } else {
        setBudget(null);
      }

      if (sumRes.status === "rejected" && chartRes.status === "rejected") {
        setError(t("failed"));
        toast.error(t("failed"));
      }
    } catch (err) {
      setError(err.response?.data?.message || t("failed"));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const money = (usd) => formatMoney(usd || 0, displayCurrency, rates);

  const amountBlock = (usd, size = "md") => {
    const main =
      size === "lg"
        ? "text-xl sm:text-2xl font-bold tracking-tight"
        : size === "sm"
          ? "text-sm font-semibold"
          : "text-base sm:text-lg font-semibold tracking-tight";
    return (
      <div className="space-y-0.5 min-w-0">
        <div
          className={`${main} text-slate-900 dark:text-white tabular-nums truncate`}
        >
          {formatMoney(usd || 0, "USD", rates)}
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums leading-snug truncate">
          {formatMoney(usd || 0, "KHR", rates)}
          <span className="mx-1 opacity-40">·</span>
          {formatMoney(usd || 0, "THB", rates)}
        </div>
      </div>
    );
  };

  if (loading && !summary && !charts) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner label={t("loading")} />
      </div>
    );
  }

  const yearTotals = charts?.yearTotals || {};
  const income = yearTotals.income || 0;
  const expenses = yearTotals.expenses || 0;
  const savings = yearTotals.savings || 0;
  const remittances = yearTotals.remittances || 0;
  const net = yearTotals.net ?? income - expenses;
  const spendRatio =
    income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 0;
  const overspend = expenses > income && income > 0;

  const monthBoxes = [
    {
      label: t("salary"),
      value: summary?.salary?.totalUSD,
      to: "/salaries",
      icon: Banknote,
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      glow: "group-hover:shadow-emerald-500/10",
      bar: "bg-emerald-500",
    },
    {
      label: t("bonus"),
      value: summary?.bonus?.totalUSD,
      to: "/bonuses",
      icon: Gift,
      iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      glow: "group-hover:shadow-violet-500/10",
      bar: "bg-violet-500",
    },
    {
      label: t("savings"),
      value: summary?.savings?.totalUSD,
      to: "/savings",
      icon: PiggyBank,
      iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
      glow: "group-hover:shadow-teal-500/10",
      bar: "bg-teal-500",
    },
    {
      label: t("expenses"),
      value: summary?.expenses?.totalUSD,
      to: "/expenses",
      icon: Wallet,
      iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      glow: "group-hover:shadow-rose-500/10",
      bar: "bg-rose-500",
    },
    {
      label: t("remittances"),
      value: summary?.remittances?.totalUSD,
      to: "/remittances",
      icon: Send,
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      glow: "group-hover:shadow-amber-500/10",
      bar: "bg-amber-500",
    },
  ];

  return (
    <div className="w-full min-h-full -mx-0 px-0">
      {/* Ambient background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-teal-500/5 dark:bg-teal-400/5 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[360px] h-[360px] rounded-full bg-violet-500/5 dark:bg-violet-400/5 blur-3xl" />
      </div>

      {/* Sticky-style header bar */}
      <div className="w-full mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("dashboard")}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles size={11} />
                {displayCurrency}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("overview")} · {tMonth(month)} {year}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/70 backdrop-blur-md shadow-sm shadow-slate-200/40 dark:shadow-black/20 p-1">
              <span className="pl-2.5 pr-1 text-slate-400">
                <Calendar size={15} />
              </span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="appearance-none bg-transparent border-0 text-sm font-medium text-slate-700 dark:text-slate-200 py-2 pr-5 pl-1 focus:outline-none cursor-pointer min-w-[7.5rem]"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {tMonth(i + 1)}
                  </option>
                ))}
              </select>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="appearance-none bg-transparent border-0 text-sm font-medium text-slate-700 dark:text-slate-200 py-2 pr-5 pl-1 focus:outline-none cursor-pointer"
              >
                {[
                  now.getFullYear(),
                  now.getFullYear() - 1,
                  now.getFullYear() - 2,
                ].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-300/60 dark:hover:border-teal-700/50 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span className="text-sm font-medium hidden xs:inline sm:inline">
                Refresh
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 px-4 py-3.5 text-sm text-rose-700 dark:text-rose-300 shadow-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={load}
            className="font-semibold underline underline-offset-2 hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========== MONTHLY SNAPSHOT — full width ========== */}
      <section className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {tMonth(month)} {year}
          </h2>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {monthBoxes.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className={`group relative flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${c.glow} dark:hover:shadow-black/30`}
            >
              {/* top accent bar */}
              <div
                className={`absolute top-0 left-4 right-4 h-0.5 rounded-full ${c.bar} opacity-0 group-hover:opacity-100 transition-opacity`}
              />

              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${c.iconBg} flex items-center justify-center shadow-inner`}
                >
                  <c.icon size={18} strokeWidth={2} />
                </div>
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowUpRight size={13} />
                </span>
              </div>

              <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                {c.label}
              </div>
              {amountBlock(c.value)}
            </Link>
          ))}
        </div>
      </section>

      {/* ========== TWO COLUMN: Budget + Year overview on large screens ========== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* Budget — full width on mobile, 5 cols on xl */}
        <section className="xl:col-span-5 rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <PieChart size={17} />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {t("budgets") || "Budget"}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {tMonth(month)}
                </p>
              </div>
            </div>
            <Link
              to="/budgets"
              className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition shrink-0"
            >
              {budget ? t("edit") : t("addBudget") || "Add"}
            </Link>
          </div>

          <div className="p-5 sm:p-6">
            {budget ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: t("plannedIncome") || "Planned income",
                    value: budget.plannedIncomeUSD,
                    icon: TrendingUp,
                  },
                  {
                    label: t("savings"),
                    value: budget.savingsAmountUSD,
                    icon: PiggyBank,
                  },
                  {
                    label: t("remittances"),
                    value: budget.remittanceAmountUSD,
                    icon: Send,
                  },
                  {
                    label: t("spendingEnvelope") || "Spending",
                    value: budget.spendingAmountUSD,
                    icon: Wallet,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100/80 dark:border-slate-700/40 px-3.5 py-3.5"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <item.icon size={12} className="text-slate-400" />
                      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                        {item.label}
                      </span>
                    </div>
                    {amountBlock(item.value, "sm")}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-4 text-slate-400 border border-slate-200/60 dark:border-slate-700/50">
                  <PieChart size={24} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-[200px]">
                  {t("noBudgetThisMonth")}
                </p>
                <Link
                  to="/budgets"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2 shadow-lg shadow-teal-600/20 transition active:scale-[0.98]"
                >
                  {t("addBudget") || "Add budget"}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Year overview — full width on mobile, 7 cols on xl */}
        <section
          className={`xl:col-span-7 rounded-2xl sm:rounded-3xl border overflow-hidden shadow-sm ${
            overspend
              ? "border-rose-200/90 dark:border-rose-800/50 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/40 dark:via-slate-900/60 dark:to-slate-900/60"
              : "border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md"
          }`}
        >
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100/90 dark:border-slate-800/60 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {overspend && (
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 shrink-0">
                    <AlertTriangle size={15} />
                  </span>
                )}
                <span>
                  {year} — {t("overview")}
                </span>
              </h2>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    overspend
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                      : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                  }`}
                >
                  {spendRatio}%
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t("spendingOfIncome")}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {t("net")}
              </div>
              <div
                className={`text-lg sm:text-xl font-bold tabular-nums flex items-center justify-end gap-1.5 ${
                  net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {net >= 0 ? (
                  <TrendingUp size={18} />
                ) : (
                  <TrendingDown size={18} />
                )}
                {money(net)}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="px-5 sm:px-6 pt-5">
            <div className="relative h-3 rounded-full bg-slate-200/90 dark:bg-slate-700/70 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                  overspend
                    ? "bg-gradient-to-r from-rose-500 via-rose-400 to-orange-400"
                    : "bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-400"
                }`}
                style={{ width: `${Math.min(100, spendRatio)}%` }}
              />
            </div>
          </div>

          {/* Year metrics — full width grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 sm:p-6">
            {[
              {
                label: t("income"),
                value: income,
                icon: TrendingUp,
                tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
              },
              {
                label: t("expenses"),
                value: expenses,
                icon: Wallet,
                tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
              },
              {
                label: t("savings"),
                value: savings,
                icon: PiggyBank,
                tone: "text-teal-600 dark:text-teal-400 bg-teal-500/10",
              },
              {
                label: t("remittances"),
                value: remittances,
                icon: Send,
                tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-700/30 px-3.5 py-3.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.tone}`}
                  >
                    <item.icon size={12} />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                    {item.label}
                  </span>
                </div>
                {amountBlock(item.value, "sm")}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
