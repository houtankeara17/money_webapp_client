import { useEffect, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useI18n from "../hooks/useI18n";
import { useAuth } from "../store/AuthContext";
import { formatMoney } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Send,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

const PIE_COLORS = [
  "#0f766e",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
  "#f97316",
  "#64748b",
];

// Custom Modern Glassmorphic Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs text-slate-100 min-w-[140px]">
        {label && (
          <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800 pb-1">
            {label}
          </p>
        )}
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div
              key={`item-${index}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold tabular-nums text-slate-100">
                ${Number(entry.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Reports = () => {
  useDocumentTitle("Reports");
  const { t, tMonthShort } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    remittances: 0,
    net: 0,
    expenseCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async (y = year) => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/charts", {
        params: { year: y },
      });
      setMonthlyTrend(
        (data.data.monthlyTrend || []).map((row) => ({
          ...row,
          month: tMonthShort(row.monthNumber) || row.month,
        })),
      );
      setByCategory(data.data.expensesByCategory || []);
      setTotals(data.data.yearTotals || {});
      setAvailableYears(data.data.availableYears || [y]);
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(year);
  }, [year]);

  const canPrev = availableYears.some((y) => y < year) || year > 2020;
  const canNext = year < currentYear;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner label={t("loading")} />
      </div>
    );
  }

  const summaryCards = [
    {
      label: t("income"),
      value: totals.income,
      sub: "Salary + Bonus",
      icon: TrendingUp,
      tone: "text-emerald-600 dark:text-emerald-400",
      iconBg:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
      bar: "bg-emerald-500",
    },
    {
      label: t("expenses"),
      value: totals.expenses,
      sub: `${totals.expenseCount || 0} transactions`,
      icon: TrendingDown,
      tone: "text-rose-600 dark:text-rose-400",
      iconBg:
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20",
      bar: "bg-rose-500",
    },
    {
      label: t("savings") || "Savings",
      value: totals.savings,
      sub: "Total saved",
      icon: PiggyBank,
      tone: "text-teal-600 dark:text-teal-400",
      iconBg:
        "bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20",
      bar: "bg-teal-500",
    },
    {
      label: t("net") || "Net",
      value: totals.net,
      sub: `${t("income")} − ${t("expenses")}`,
      icon: Wallet,
      tone:
        totals.net >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
      iconBg:
        totals.net >= 0
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20",
      bar: totals.net >= 0 ? "bg-emerald-500" : "bg-rose-500",
    },
  ];

  return (
    <div className="w-full min-h-full">
      {/* Ambient Glow Effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-teal-500/5 dark:bg-teal-400/5 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-[320px] h-[320px] rounded-full bg-violet-500/5 dark:bg-violet-400/5 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t("reports")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={12} className="animate-pulse" />
              {displayCurrency}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("amountsInUsd")} · {year}
          </p>
        </div>

        {/* Year Navigator */}
        <div className="inline-flex items-center rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/70 backdrop-blur-md shadow-sm p-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setYear((y) => y - 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
            aria-label="Previous year"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[4.5rem] text-center text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100 px-2">
            {year}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setYear((y) => y + 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
            aria-label="Next year"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <div
              className={`absolute top-0 left-4 right-4 h-0.5 rounded-full ${card.bar} opacity-70 group-hover:opacity-100 transition-opacity`}
            />
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-sm`}
              >
                <card.icon size={17} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                {card.label}
              </span>
            </div>
            <p
              className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${card.tone}`}
            >
              {formatMoney(card.value, displayCurrency, rates)}
            </p>
            {card.sub && (
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate font-medium">
                {card.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Main Income vs Expense Chart */}
      <section className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20 flex items-center justify-center">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t("income")} vs {t("expenses")}
            </h2>
            <p className="text-xs text-slate-400">
              Monthly trend breakdown · {year}
            </p>
          </div>
        </div>
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyTrend}
              margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                strokeOpacity={0.15}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="income"
                name={t("income")}
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 3.5, strokeWidth: 0, fill: "#22c55e" }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name={t("expenses")}
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 3.5, strokeWidth: 0, fill: "#ef4444" }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name={t("net") || "Net"}
                stroke="#0ea5e9"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, strokeWidth: 0, fill: "#0ea5e9" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Savings & Remittances */}
        <section className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20 flex items-center justify-center">
              <Send size={17} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Savings & Remittances
              </h2>
              <p className="text-xs text-slate-400">
                Monthly breakdown · {year}
              </p>
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrend}
                margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  strokeOpacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="savings"
                  name={t("savings") || "Savings"}
                  fill="#0ea5e9"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="remittances"
                  name={t("remittances") || "Remittances"}
                  fill="#a855f7"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Expenses by Category Pie */}
        <section className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 flex items-center justify-center">
              <PieChartIcon size={17} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {t("expenses")} · {t("category")}
              </h2>
              <p className="text-xs text-slate-400">
                Share of spending · {year}
              </p>
            </div>
          </div>
          {byCategory.length === 0 ? (
            <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Wallet size={22} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("noExpenseData")} {year}
              </p>
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "#64748b", strokeWidth: 1 }}
                  >
                    {byCategory.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="transparent"
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Category Breakdown Table */}
      {byCategory.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Category Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {byCategory.length} categories · {year}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 font-semibold">
                  <th className="py-3 px-5 sm:px-6">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">
                    Count
                  </th>
                  <th className="py-3 px-5 sm:px-6 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {byCategory.map((c, idx) => {
                  const pct =
                    totals.expenses > 0
                      ? ((c.value / totals.expenses) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr
                      key={c.name}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 sm:px-6">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor:
                                PIE_COLORS[idx % PIE_COLORS.length],
                            }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100">
                        ${Number(c.value).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-slate-500 dark:text-slate-400 font-medium hidden sm:table-cell">
                        {c.count}
                      </td>
                      <td className="py-3.5 px-5 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-3 justify-end">
                          <div className="hidden sm:block w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, Number(pct))}%`,
                                backgroundColor:
                                  PIE_COLORS[idx % PIE_COLORS.length],
                              }}
                            />
                          </div>
                          <span className="tabular-nums font-semibold text-slate-600 dark:text-slate-300 w-12 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default Reports;
