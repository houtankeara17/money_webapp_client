import { useEffect, useState, useMemo } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Pencil,
  Sparkles,
  Filter,
  X,
  Search,
} from "lucide-react";
import { useAuth } from "../store/AuthContext";
import useI18n from "../hooks/useI18n";
import { formatMoney, formatOriginal } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ViewToggle from "../components/common/ViewToggle";
import ConfirmModal from "../components/common/ConfirmModal";

const MONTHS = [
  { n: 1, name: "January" },
  { n: 2, name: "February" },
  { n: 3, name: "March" },
  { n: 4, name: "April" },
  { n: 5, name: "May" },
  { n: 6, name: "June" },
  { n: 7, name: "July" },
  { n: 8, name: "August" },
  { n: 9, name: "September" },
  { n: 10, name: "October" },
  { n: 11, name: "November" },
  { n: 12, name: "December" },
];

const PAGE_SIZES = [10, 20, 50];

const emptyForm = (currency, year) => ({
  year,
  monthNumber: new Date().getMonth() + 1,
  currency,
  plannedIncome: "",
  savingsAmount: "",
  remittanceAmount: "",
  spendingAmount: "",
  noted: "",
});

const Budgets = () => {
  useDocumentTitle("Budgets");
  const { t, tMonth } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [items, setItems] = useState([]);
  const [yearSummary, setYearSummary] = useState({
    totalPlannedUSD: 0,
    totalEnvelopesUSD: 0,
    count: 0,
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_budgets") || "list",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency, currentYear));

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_budgets", v);
  };

  const activeFilterCount = [filterMonth, filterSearch.trim()].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setFilterMonth("");
    setFilterSearch("");
    setPage(1);
  };

  const fetchData = async (y = year, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { year: y, limit: 100 };
      if (filterMonth) params.monthNumber = filterMonth;
      const { data } = await api.get("/budgets", { params });
      const list = data.data?.items || [];
      setItems(list);

      // Derive summary if backend doesn't send one
      const summary = data.data?.yearSummary || {
        totalPlannedUSD: list.reduce(
          (s, i) => s + (Number(i.plannedIncomeUSD) || 0),
          0,
        ),
        totalEnvelopesUSD: list.reduce(
          (s, i) =>
            s +
            (Number(i.savingsAmountUSD) || 0) +
            (Number(i.remittanceAmountUSD) || 0) +
            (Number(i.spendingAmountUSD) || 0),
          0,
        ),
        count: list.length,
      };
      setYearSummary(summary);
      setAvailableYears(data.data?.availableYears || []);
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(year);
  }, [year, filterMonth]);

  useEffect(() => {
    setForm((f) => ({ ...f, currency: displayCurrency }));
  }, [displayCurrency]);

  const canPrev =
    availableYears.length === 0 || availableYears.some((y) => y < year);
  const canNext = availableYears.some((y) => y > year) || year < currentYear;

  const filteredItems = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const note = (item.noted || "").toLowerCase();
      const month = (
        item.month ||
        MONTHS.find((m) => m.n === item.monthNumber)?.name ||
        ""
      ).toLowerCase();
      const income = String(item.plannedIncome ?? "");
      return note.includes(q) || month.includes(q) || income.includes(q);
    });
  }, [items, filterSearch]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    setPage(1);
  }, [filterMonth, filterSearch]);

  const rangeFrom = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = Math.min(safePage * pageSize, totalItems);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(displayCurrency, year));
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      year: item.year,
      monthNumber: item.monthNumber,
      currency: item.currency || displayCurrency,
      plannedIncome: String(item.plannedIncome ?? ""),
      savingsAmount: String(item.savingsAmount ?? ""),
      remittanceAmount: String(item.remittanceAmount ?? ""),
      spendingAmount: String(item.spendingAmount ?? ""),
      noted: item.noted || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        year: Number(form.year),
        monthNumber: Number(form.monthNumber),
        currency: form.currency,
        plannedIncome: Number(form.plannedIncome) || 0,
        savingsAmount: Number(form.savingsAmount) || 0,
        remittanceAmount: Number(form.remittanceAmount) || 0,
        spendingAmount: Number(form.spendingAmount) || 0,
        noted: form.noted || "",
      };
      if (editing) {
        const { data } = await api.put(`/budgets/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/budgets", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      fetchData(year, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => setConfirmDel(id);
  const handleDeleteAll = () => setConfirmDel("all");

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "all") {
        const { data } = await api.delete("/budgets");
        toast.success(data.message || t("success"));
      } else {
        await api.delete(`/budgets/${confirmDel}`);
        toast.success(t("success"));
      }
      setConfirmDel(null);
      fetchData(year, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/budgets/export");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = `budgets-${Date.now()}.json`;
      a.click();
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const monthLabel = (item) =>
    item.month ||
    MONTHS.find((m) => m.n === item.monthNumber)?.name ||
    item.monthNumber;

  const envelopeTotal = (item) =>
    (Number(item.savingsAmountUSD) || 0) +
    (Number(item.remittanceAmountUSD) || 0) +
    (Number(item.spendingAmountUSD) || 0);

  const inputCls =
    "w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-600 text-sm transition";
  const card =
    "bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700";
  const btnSecondary =
    "inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 hover:border-teal-300/60 dark:hover:border-teal-700/50 shadow-sm text-sm font-medium transition active:scale-[0.98]";
  const btnDanger =
    "inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-sm font-medium transition active:scale-[0.98] hover:bg-rose-100 dark:hover:bg-rose-900/50";
  const btnPrimary =
    "inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/25 transition active:scale-[0.98]";

  const PaginationBar = () =>
    totalItems === 0 ? null : (
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("showing")}{" "}
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {rangeFrom}–{rangeTo}
          </span>{" "}
          {t("of")}{" "}
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {totalItems}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-9 px-2.5 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-600"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / {t("page")}
              </option>
            ))}
          </select>
          <div className="inline-flex items-center rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/70 backdrop-blur-md shadow-sm p-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`min-w-[2rem] h-8 px-2 rounded-xl text-sm font-medium tabular-nums transition ${
                  n === safePage
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="w-full min-h-full">
      {/* Header */}
      <div className="w-full mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("budgets") || "Budgets"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles size={11} />
                {yearSummary.count} {t("entries") || "entries"}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("budgetSubtitle") || "Monthly income & envelope plan"} ·{" "}
              {displayCurrency}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle view={view} onChange={setViewMode} />
            <button
              type="button"
              onClick={handleExport}
              className={btnSecondary}
            >
              <Download size={15} />
              <span className="hidden xs:inline sm:inline">{t("export")}</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteAll}
              className={btnDanger}
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">{t("deleteAll")}</span>
            </button>
            <button type="button" onClick={openCreate} className={btnPrimary}>
              <Plus size={16} />
              {t("addBudget") || "Add Budget"}
            </button>
          </div>
        </div>
      </div>

      {/* Year navigator + filter toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex items-center rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/70 backdrop-blur-md shadow-sm p-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setYear((y) => y - 1)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-lg font-semibold tabular-nums w-16 text-center text-slate-900 dark:text-white">
            {year}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setYear((y) => y + 1)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t("plannedIncome") || "Planned"}:{" "}
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatMoney(
              yearSummary.totalPlannedUSD || 0,
              displayCurrency,
              rates,
            )}
          </span>
        </span>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`${btnSecondary} ml-auto relative`}
        >
          <Filter size={15} />
          <span className="hidden sm:inline">{t("filters")}</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className={`${card} rounded-2xl p-4 mb-6 shadow-sm space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("advancedFilters")}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
              >
                <X size={12} /> {t("clearFilters")}
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder={`${t("searchMonth")}, ${t("month")}, ${t("incomePlan")}`}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-600 text-sm"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t("month") || "Month"}
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={inputCls}
            >
              <option value="">{t("all") || "All"}</option>
              {MONTHS.map((m) => (
                <option key={m.n} value={m.n}>
                  {tMonth ? tMonth(m.n) : m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick month chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setFilterMonth("")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                !filterMonth
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t("all") || "All"}
            </button>
            {MONTHS.map((m) => (
              <button
                key={m.n}
                type="button"
                onClick={() =>
                  setFilterMonth((cur) =>
                    String(cur) === String(m.n) ? "" : String(m.n),
                  )
                }
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  String(filterMonth) === String(m.n)
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tMonth ? tMonth(m.n) : m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        size="md"
        closeOnBackdrop={!saving}
      >
        <Modal.Header>
          {editing ? t("edit") : t("addBudget") || "Add Budget"}
        </Modal.Header>
        <Modal.Body>
          <form id="budget-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Year
                </label>
                <input
                  type="number"
                  required
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("month") || "Month"}
                </label>
                <select
                  value={form.monthNumber}
                  onChange={(e) =>
                    setForm({ ...form, monthNumber: Number(e.target.value) })
                  }
                  className={inputCls}
                >
                  {MONTHS.map((m) => (
                    <option key={m.n} value={m.n}>
                      {tMonth ? tMonth(m.n) : m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("currency")}
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputCls}
              >
                <option value="USD">USD</option>
                <option value="KHR">KHR</option>
                <option value="THB">THB</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("plannedIncome") || "Planned income (salary + bonus)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.plannedIncome}
                onChange={(e) =>
                  setForm({ ...form, plannedIncome: e.target.value })
                }
                className={inputCls}
                placeholder="600"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("savings")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.savingsAmount}
                  onChange={(e) =>
                    setForm({ ...form, savingsAmount: e.target.value })
                  }
                  className={inputCls}
                  placeholder="200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("remittances")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.remittanceAmount}
                  onChange={(e) =>
                    setForm({ ...form, remittanceAmount: e.target.value })
                  }
                  className={inputCls}
                  placeholder="200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("spendingEnvelope") || "Spending"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.spendingAmount}
                  onChange={(e) =>
                    setForm({ ...form, spendingAmount: e.target.value })
                  }
                  className={inputCls}
                  placeholder="200"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("note")}
              </label>
              <textarea
                value={form.noted}
                onChange={(e) => setForm({ ...form, noted: e.target.value })}
                rows={2}
                className={inputCls}
                placeholder="Optional note..."
              />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            disabled={saving}
            onClick={closeForm}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="budget-form"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50 shadow-md shadow-teal-700/20 transition"
          >
            {saving ? t("loading") : t("save")}
          </button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={deleting}
        title={confirmDel === "all" ? t("deleteAll") : t("delete")}
        message={
          confirmDel === "all" ? t("confirmDeleteAll") : t("confirmDelete")
        }
      />

      {/* Content */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <LoadingSpinner label={t("loading")} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title={t("noData")}
          hint={t("budgetEmptyHint") || t("noDataHint")}
          action={
            activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium"
              >
                {t("clearFilters")}
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreate}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition"
              >
                {t("addBudget") || "Add Budget"}
              </button>
            )
          }
        />
      ) : view === "table" ? (
        <>
          <div
            className={`overflow-x-auto rounded-2xl sm:rounded-3xl ${card} shadow-sm`}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400">
                  <th className="text-left p-3.5 font-medium">
                    {t("month") || "Month"}
                  </th>
                  <th className="text-left p-3.5 font-medium">
                    {t("plannedIncome") || "Income"}
                  </th>
                  <th className="text-left p-3.5 font-medium hidden sm:table-cell">
                    {t("savings")}
                  </th>
                  <th className="text-left p-3.5 font-medium hidden md:table-cell">
                    {t("remittances")}
                  </th>
                  <th className="text-left p-3.5 font-medium hidden md:table-cell">
                    {t("spendingEnvelope") || "Spending"}
                  </th>
                  <th className="text-right p-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {monthLabel(item)} {item.year}
                      </div>
                      {item.noted && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[140px]">
                          {item.noted}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatOriginal(item.plannedIncome, item.currency)}
                      </div>
                      <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                        {formatMoney(
                          item.plannedIncomeUSD,
                          displayCurrency,
                          rates,
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 hidden sm:table-cell tabular-nums text-slate-700 dark:text-slate-300">
                      {formatMoney(
                        item.savingsAmountUSD,
                        displayCurrency,
                        rates,
                      )}
                    </td>
                    <td className="p-3.5 hidden md:table-cell tabular-nums text-slate-700 dark:text-slate-300">
                      {formatMoney(
                        item.remittanceAmountUSD,
                        displayCurrency,
                        rates,
                      )}
                    </td>
                    <td className="p-3.5 hidden md:table-cell tabular-nums text-slate-700 dark:text-slate-300">
                      {formatMoney(
                        item.spendingAmountUSD,
                        displayCurrency,
                        rates,
                      )}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-2 rounded-xl text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar />
        </>
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {pagedItems.map((item) => {
              const totalEnv = envelopeTotal(item);
              return (
                <div
                  key={item._id}
                  className={`group relative ${card} rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-black/30`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                        {monthLabel(item)} {item.year}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t("plannedIncome") || "Income"}:{" "}
                        {formatMoney(
                          item.plannedIncomeUSD,
                          displayCurrency,
                          rates,
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-teal-700 shadow-sm"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-rose-500 shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-teal-50 dark:bg-teal-900/30 p-2">
                      <div className="text-xs text-slate-500">
                        {t("savings")}
                      </div>
                      <div className="font-semibold tabular-nums">
                        {formatMoney(
                          item.savingsAmountUSD,
                          displayCurrency,
                          rates,
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-900/30 p-2">
                      <div className="text-xs text-slate-500">
                        {t("remittances")}
                      </div>
                      <div className="font-semibold tabular-nums">
                        {formatMoney(
                          item.remittanceAmountUSD,
                          displayCurrency,
                          rates,
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 p-2">
                      <div className="text-xs text-slate-500">
                        {t("spendingEnvelope") || "Spending"}
                      </div>
                      <div className="font-semibold tabular-nums">
                        {formatMoney(
                          item.spendingAmountUSD,
                          displayCurrency,
                          rates,
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 text-right">
                    {t("total")}:{" "}
                    {formatMoney(totalEnv, displayCurrency, rates)}
                  </div>
                  {item.noted && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {item.noted}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <PaginationBar />
        </>
      ) : (
        <>
          <div className="space-y-2.5">
            {pagedItems.map((item) => {
              const totalEnv = envelopeTotal(item);
              return (
                <div
                  key={item._id}
                  className={`group ${card} rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm transition-all duration-200 hover:shadow-md dark:hover:shadow-black/20`}
                >
                  <div className="min-w-0 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                      <PieChart size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {monthLabel(item)} {item.year}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {formatMoney(
                            item.plannedIncomeUSD,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>
                          {t("savings")}:{" "}
                          {formatMoney(
                            item.savingsAmountUSD,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                        <span>
                          {t("remittances")}:{" "}
                          {formatMoney(
                            item.remittanceAmountUSD,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                        <span>
                          {t("spendingEnvelope") || "Spend"}:{" "}
                          {formatMoney(
                            item.spendingAmountUSD,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                      </div>
                      {item.noted && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {item.noted}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-xl text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationBar />
        </>
      )}
    </div>
  );
};

export default Budgets;
