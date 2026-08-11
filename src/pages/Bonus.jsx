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
  Gift,
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
const STATUSES = ["Draft", "Confirmed", "Disbursed"];
const PAGE_SIZES = [10, 20, 50];
const TAGS = [
  "Performance",
  "Holiday",
  "Project",
  "Annual",
  "Referral",
  "Other",
];
const PAYMENTS = [
  "Cash",
  "ABA Bank",
  "ACLEDA Bank",
  "Wing",
  "Transfer",
  "Other",
];

const TAG_TONE = {
  Performance:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Holiday: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Project: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Annual:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Referral:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Other: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const STATUS_TONE = {
  Disbursed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Confirmed: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const emptyForm = (currency, year) => ({
  amount: "",
  currency,
  year,
  monthNumber: new Date().getMonth() + 1,
  status: "Confirmed",
  tag: "Performance",
  paymentMethod: "ABA Bank",
  noted: "",
});

const Bonus = () => {
  useDocumentTitle("Bonus");
  const { t, tEnum, tMonth } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";
  const statusLabel = (s) => {
    if (s === "Confirmed") return t("confirmed");
    if (s === "Draft") return t("draft");
    if (s === "Disbursed") return t("disbursed");
    return s;
  };

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [yearSummary, setYearSummary] = useState({
    totalUSD: 0,
    confirmedUSD: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [linkedSalary, setLinkedSalary] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_bonus") || "list",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency, currentYear));

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_bonus", v);
  };

  const activeFilterCount = [
    filterStatus,
    filterMonth,
    filterTag,
    filterPayment,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("");
    setFilterMonth("");
    setFilterTag("");
    setFilterPayment("");
    setFilterSearch("");
    setPage(1);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = async (y = year, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { year: y, limit: 100 };
      if (filterTag) params.tag = filterTag;
      if (filterStatus) params.status = filterStatus;
      if (filterMonth) params.monthNumber = filterMonth;
      if (filterPayment) params.paymentMethod = filterPayment;
      const { data } = await api.get("/bonuses", { params });
      setItems(data.data.items || []);
      setTotals(data.data.totals || []);
      setAvailableYears(data.data.availableYears || []);
      setYearSummary(
        data.data.yearSummary || { totalUSD: 0, confirmedUSD: 0, count: 0 },
      );
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(year);
  }, [year, filterTag, filterStatus, filterMonth, filterPayment]);

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
      const tag = (item.tag || "").toLowerCase();
      const pay = (item.paymentMethod || "").toLowerCase();
      const amount = String(item.amount ?? "");
      return (
        note.includes(q) ||
        tag.includes(q) ||
        pay.includes(q) ||
        amount.includes(q)
      );
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
  }, [filterStatus, filterMonth, filterPayment, filterSearch, filterTag]);

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

  const fetchLinkedSalary = async (y, m) => {
    setLoadingSalary(true);
    try {
      const { data } = await api.get("/salaries", {
        params: { year: y, monthNumber: m, limit: 5 },
      });
      const list = data.data?.items || [];
      setLinkedSalary(list[0] || null);
    } catch {
      setLinkedSalary(null);
    } finally {
      setLoadingSalary(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    const mn = new Date().getMonth() + 1;
    setForm(emptyForm(displayCurrency, year));
    setForm((f) => ({ ...f, monthNumber: mn, year }));
    setShowForm(true);
    fetchLinkedSalary(year, mn);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      amount: String(item.amount ?? ""),
      currency: item.currency || displayCurrency,
      year: item.year || year,
      monthNumber: item.monthNumber || 1,
      status: item.status || "Confirmed",
      tag: item.tag || "Performance",
      paymentMethod: item.paymentMethod || "ABA Bank",
      noted: item.noted || "",
    });
    setShowForm(true);
    fetchLinkedSalary(item.year || year, item.monthNumber || 1);
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
        amount: Number(form.amount),
        currency: form.currency,
        year: Number(form.year),
        monthNumber: Number(form.monthNumber),
        status: form.status,
        tag: form.tag,
        paymentMethod: form.paymentMethod,
        noted: form.noted || "",
      };
      if (editing) {
        const { data } = await api.put(`/bonuses/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/bonuses", payload);
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
        const { data } = await api.delete("/bonuses");
        toast.success(data.message || t("success"));
      } else {
        await api.delete(`/bonuses/${confirmDel}`);
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
      const { data } = await api.get("/bonuses/export");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = `bonuses-${Date.now()}.json`;
      a.click();
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const monthName = (n) =>
    tMonth ? tMonth(n) : MONTHS.find((m) => m.n === n)?.name || n;

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
                {t("bonus")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles size={11} />
                {yearSummary.count} {t("entries")}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatMoney(
                yearSummary.confirmedUSD || 0,
                displayCurrency,
                rates,
              )}{" "}
              · {displayCurrency}
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
              {t("addBonus")}
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
          {t("total")}:{" "}
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatMoney(yearSummary.totalUSD || 0, displayCurrency, rates)}
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
              placeholder={`${t("searchNote")} ${t("tag")} ${t("amount")}…`}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-600 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("status")}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("month")}
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {MONTHS.map((m) => (
                  <option key={m.n} value={m.n}>
                    {monthName(m.n)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("tag")}
              </label>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {TAGS.map((tg) => (
                  <option key={tg} value={tg}>
                    {tEnum ? tEnum(tg) : tg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("paymentMethod")}
              </label>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick tag chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setFilterTag("")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                !filterTag
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t("all")}
            </button>
            {TAGS.map((tg) => (
              <button
                key={tg}
                type="button"
                onClick={() => setFilterTag((cur) => (cur === tg ? "" : tg))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  filterTag === tg
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tEnum ? tEnum(tg) : tg}
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
        <Modal.Header>{editing ? t("edit") : t("addBonus")}</Modal.Header>
        <Modal.Body>
          <form id="bonus-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("amount")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("currency")}
                </label>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="USD">USD</option>
                  <option value="KHR">KHR</option>
                  <option value="THB">THB</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("year")}
                </label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setForm({ ...form, year: y });
                    fetchLinkedSalary(y, Number(form.monthNumber));
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("month")}
                </label>
                <select
                  value={form.monthNumber}
                  onChange={(e) => {
                    const mn = Number(e.target.value);
                    setForm({ ...form, monthNumber: mn });
                    fetchLinkedSalary(Number(form.year), mn);
                  }}
                  className={inputCls}
                >
                  {MONTHS.map((m) => (
                    <option key={m.n} value={m.n}>
                      {monthName(m.n)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linked salary card */}
            <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-900/20 p-3.5 text-sm space-y-1.5">
              {loadingSalary ? (
                <p className="text-slate-500">{t("loading")}</p>
              ) : linkedSalary ? (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-300">
                      {t("linkedSalary")}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatOriginal(
                        linkedSalary.amount,
                        linkedSalary.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-300">
                      {t("bonus")}
                    </span>
                    <span className="font-semibold text-violet-600 tabular-nums">
                      {form.amount
                        ? formatOriginal(
                            Number(form.amount) || 0,
                            form.currency,
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-teal-200 dark:border-teal-800 pt-1.5 mt-0.5">
                    <span className="text-slate-600 dark:text-slate-300">
                      {t("salaryRemaining")}
                    </span>
                    <span className="font-bold text-teal-700 tabular-nums">
                      {formatOriginal(
                        Math.max(
                          0,
                          Number(linkedSalary.amount) -
                            (Number(form.amount) || 0) +
                            (editing ? Number(editing.amount) || 0 : 0),
                        ),
                        linkedSalary.currency,
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t("bonusSalaryHint")}
                  </p>
                </>
              ) : (
                <p className="text-slate-500">{t("noSalaryThisMonth")}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("status")}
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("tag")}
                </label>
                <select
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className={inputCls}
                >
                  {TAGS.map((tg) => (
                    <option key={tg} value={tg}>
                      {tEnum ? tEnum(tg) : tg}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("paymentMethod")}
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
                className={inputCls}
              >
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
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
            form="bonus-form"
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
          icon={Gift}
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
                {t("addBonus")}
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
                  <th className="text-left p-3.5 font-medium">{t("amount")}</th>
                  <th className="text-left p-3.5 font-medium">{t("tag")}</th>
                  <th className="text-left p-3.5 font-medium">{t("month")}</th>
                  <th className="text-left p-3.5 font-medium">{t("status")}</th>
                  <th className="text-left p-3.5 font-medium">
                    {t("paymentMethod")}
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
                      <div className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatOriginal(item.amount, item.currency)}
                      </div>
                      <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                        {formatMoney(item.amountUSD, displayCurrency, rates)}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_TONE[item.tag] || TAG_TONE.Other}`}
                      >
                        {tEnum ? tEnum(item.tag) : item.tag}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">
                      {monthName(item.monthNumber)} {item.year}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_TONE[item.status] || STATUS_TONE.Draft}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {item.paymentMethod || "—"}
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
                <div className="font-bold text-lg tabular-nums tracking-tight text-slate-900 dark:text-white">
                  {formatOriginal(item.amount, item.currency)}
                </div>
                <div className="text-xs text-slate-400 tabular-nums mb-2.5">
                  {formatMoney(item.amountUSD, displayCurrency, rates)}
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {monthName(item.monthNumber)} {item.year}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_TONE[item.status] || STATUS_TONE.Draft}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_TONE[item.tag] || TAG_TONE.Other}`}
                  >
                    {tEnum ? tEnum(item.tag) : item.tag}
                  </span>
                </div>
                {item.paymentMethod && (
                  <div className="text-xs text-slate-400 mt-1.5">
                    {item.paymentMethod}
                  </div>
                )}
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
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <Gift size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatOriginal(item.amount, item.currency)}
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {formatMoney(item.amountUSD, displayCurrency, rates)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_TONE[item.status] || STATUS_TONE.Draft}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_TONE[item.tag] || TAG_TONE.Other}`}
                      >
                        {tEnum ? tEnum(item.tag) : item.tag}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {monthName(item.monthNumber)} {item.year}
                      {item.paymentMethod ? ` · ${item.paymentMethod}` : ""}
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

export default Bonus;
