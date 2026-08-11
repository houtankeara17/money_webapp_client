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
  ArrowRightLeft,
  Pencil,
  Sparkles,
  Filter,
  X,
  Search,
} from "lucide-react";
import useI18n from "../hooks/useI18n";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ViewToggle from "../components/common/ViewToggle";
import ConfirmModal from "../components/common/ConfirmModal";

const PROVIDERS = [
  "ABA Bank",
  "ACLEDA Bank",
  "Wing",
  "Street Exchange",
  "Airport",
  "Other",
];
const CURRENCIES = ["USD", "KHR", "THB"];
const PAGE_SIZES = [10, 20, 50];

const ExchangeLog = () => {
  useDocumentTitle("Exchange Log");
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [providerFilter, setProviderFilter] = useState("");
  const [items, setItems] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [yearSummary, setYearSummary] = useState({ count: 0 });
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_exchange") || "list",
  );
  const [form, setForm] = useState({
    fromCurrency: "USD",
    fromAmount: "",
    toCurrency: "KHR",
    toAmount: "",
    rateUsed: "",
    officialRate: "",
    provider: "ABA Bank",
    exchangeDate: new Date().toISOString().slice(0, 10),
    noted: "",
  });

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_exchange", v);
  };

  const activeFilterCount = [
    providerFilter,
    currencyFilter,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setProviderFilter("");
    setCurrencyFilter("");
    setFilterSearch("");
    setPage(1);
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = async (
    y = year,
    prov = providerFilter,
    { silent = false } = {},
  ) => {
    if (!silent) setLoading(true);
    try {
      const params = { year: y, limit: 100 };
      if (prov) params.provider = prov;
      const { data } = await api.get("/exchange-logs", { params });
      setItems(data.data.items || []);
      setAvailableYears(data.data.availableYears || []);
      setYearSummary(data.data.yearSummary || { count: 0 });
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(year, providerFilter);
  }, [year, providerFilter]);

  const canPrev =
    availableYears.length === 0 || availableYears.some((y) => y < year);
  const canNext = availableYears.some((y) => y > year) || year < currentYear;

  const updateRate = (fromAmt, toAmt) => {
    const f = Number(fromAmt);
    const to = Number(toAmt);
    if (f > 0 && to > 0) return (to / f).toFixed(4);
    return "";
  };

  const filteredItems = useMemo(() => {
    let result = items;

    if (currencyFilter) {
      result = result.filter(
        (item) =>
          item.fromCurrency === currencyFilter ||
          item.toCurrency === currencyFilter,
      );
    }

    const q = filterSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const prov = (item.provider || "").toLowerCase();
        const note = (item.noted || "").toLowerCase();
        const fromC = (item.fromCurrency || "").toLowerCase();
        const toC = (item.toCurrency || "").toLowerCase();
        const fromA = String(item.fromAmount ?? "");
        const toA = String(item.toAmount ?? "");
        const rate = String(item.rateUsed ?? "");
        return (
          prov.includes(q) ||
          note.includes(q) ||
          fromC.includes(q) ||
          toC.includes(q) ||
          fromA.includes(q) ||
          toA.includes(q) ||
          rate.includes(q)
        );
      });
    }

    return result;
  }, [items, currencyFilter, filterSearch]);

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
  }, [providerFilter, currencyFilter, filterSearch]);

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
    setForm({
      fromCurrency: "USD",
      fromAmount: "",
      toCurrency: "KHR",
      toAmount: "",
      rateUsed: "",
      officialRate: "",
      provider: "ABA Bank",
      exchangeDate: new Date().toISOString().slice(0, 10),
      noted: "",
    });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      fromCurrency: item.fromCurrency || "USD",
      fromAmount: String(item.fromAmount ?? ""),
      toCurrency: item.toCurrency || "KHR",
      toAmount: String(item.toAmount ?? ""),
      rateUsed: String(item.rateUsed ?? ""),
      officialRate: String(item.officialRate ?? ""),
      provider: item.provider || "ABA Bank",
      exchangeDate: item.exchangeDate
        ? new Date(item.exchangeDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
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
        ...form,
        fromAmount: Number(form.fromAmount),
        toAmount: Number(form.toAmount),
        rateUsed: Number(form.rateUsed),
        officialRate: form.officialRate ? Number(form.officialRate) : null,
      };
      if (editing) {
        const { data } = await api.put(
          `/exchange-logs/${editing._id}`,
          payload,
        );
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/exchange-logs", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      fetchData(year, providerFilter, { silent: true });
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
        const { data } = await api.delete("/exchange-logs");
        toast.success(data.message || t("success"));
      } else {
        await api.delete(`/exchange-logs/${confirmDel}`);
        toast.success(t("success"));
      }
      setConfirmDel(null);
      fetchData(year, providerFilter, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/exchange-logs/export");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = `exchange-logs-${Date.now()}.json`;
      a.click();
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

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
                {t("exchange")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles size={11} />
                {yearSummary.count} {t("entries")}
              </span>
            </div>
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
              {t("logExchange")}
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
                <X size={12} /> {t("clearAll")}
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
              placeholder={`${t("provider")}, ${t("note")}, ${t("amount")}…`}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-600 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("provider")}
              </label>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("currency")}
              </label>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick provider chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setProviderFilter("")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                !providerFilter
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t("all")}
            </button>
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProviderFilter((cur) => (cur === p ? "" : p))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  providerFilter === p
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p}
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
        <Modal.Header>{editing ? t("edit") : t("logExchange")}</Modal.Header>
        <Modal.Body>
          <form
            id="exchange-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("from")}
                </label>
                <select
                  value={form.fromCurrency}
                  onChange={(e) =>
                    setForm({ ...form, fromCurrency: e.target.value })
                  }
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.fromAmount}
                  onChange={(e) => {
                    const fromAmount = e.target.value;
                    setForm({
                      ...form,
                      fromAmount,
                      rateUsed:
                        updateRate(fromAmount, form.toAmount) || form.rateUsed,
                    });
                  }}
                  className={inputCls}
                  placeholder={t("amount")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("to")}
                </label>
                <select
                  value={form.toCurrency}
                  onChange={(e) =>
                    setForm({ ...form, toCurrency: e.target.value })
                  }
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.toAmount}
                  onChange={(e) => {
                    const toAmount = e.target.value;
                    setForm({
                      ...form,
                      toAmount,
                      rateUsed:
                        updateRate(form.fromAmount, toAmount) || form.rateUsed,
                    });
                  }}
                  className={inputCls}
                  placeholder={t("amount")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("rate")}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.rateUsed}
                  onChange={(e) =>
                    setForm({ ...form, rateUsed: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("provider")}
                </label>
                <select
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                  className={inputCls}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("date")}
              </label>
              <input
                type="date"
                value={form.exchangeDate}
                onChange={(e) =>
                  setForm({ ...form, exchangeDate: e.target.value })
                }
                className={inputCls}
              />
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
            form="exchange-form"
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
          icon={ArrowRightLeft}
          title={t("noData")}
          hint={t("noDataHint")}
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
                {t("logExchange")}
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
                  <th className="text-left p-3.5 font-medium">{t("from")}</th>
                  <th className="text-left p-3.5 font-medium">{t("to")}</th>
                  <th className="text-left p-3.5 font-medium">{t("rate")}</th>
                  <th className="text-left p-3.5 font-medium">
                    {t("provider")}
                  </th>
                  <th className="text-left p-3.5 font-medium">{t("date")}</th>
                  <th className="text-right p-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="p-3.5 font-semibold tabular-nums text-slate-900 dark:text-white">
                      {item.fromAmount.toLocaleString()} {item.fromCurrency}
                    </td>
                    <td className="p-3.5 font-semibold tabular-nums text-slate-900 dark:text-white">
                      {item.toAmount.toLocaleString()} {item.toCurrency}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {item.rateUsed}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {item.provider}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">
                      {new Date(item.exchangeDate).toLocaleDateString()}
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
            {pagedItems.map((item) => (
              <div
                key={item._id}
                className={`group relative ${card} rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-black/30`}
              >
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <div className="flex items-center gap-2 font-bold text-base sm:text-lg tabular-nums tracking-tight text-slate-900 dark:text-white">
                  <span>
                    {item.fromAmount.toLocaleString()} {item.fromCurrency}
                  </span>
                  <ArrowRightLeft
                    size={16}
                    className="text-slate-400 shrink-0"
                  />
                  <span>
                    {item.toAmount.toLocaleString()} {item.toCurrency}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  @ {item.rateUsed}
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2.5">
                  {item.provider}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(item.exchangeDate).toLocaleDateString()}
                </div>
                {item.noted && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {item.noted}
                  </p>
                )}
              </div>
            ))}
          </div>
          <PaginationBar />
        </>
      ) : (
        <>
          <div className="space-y-2.5">
            {pagedItems.map((item) => (
              <div
                key={item._id}
                className={`group ${card} rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm transition-all duration-200 hover:shadow-md dark:hover:shadow-black/20`}
              >
                <div className="min-w-0 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
                    <ArrowRightLeft size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap font-semibold text-slate-900 dark:text-white">
                      <span>
                        {item.fromAmount.toLocaleString()} {item.fromCurrency}
                      </span>
                      <ArrowRightLeft
                        size={14}
                        className="text-slate-400 shrink-0"
                      />
                      <span>
                        {item.toAmount.toLocaleString()} {item.toCurrency}
                      </span>
                      <span className="text-xs text-slate-400 font-normal tabular-nums">
                        @ {item.rateUsed}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.provider} ·{" "}
                      {new Date(item.exchangeDate).toLocaleDateString()}
                    </div>
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
            ))}
          </div>
          <PaginationBar />
        </>
      )}
    </div>
  );
};

export default ExchangeLog;
