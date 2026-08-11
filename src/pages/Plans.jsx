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
  Target,
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
import ConfirmModal from "../components/common/ConfirmModal";
import ViewToggle from "../components/common/ViewToggle";

const GOAL_TYPES = [
  { id: "Buy Item", emoji: "🛒" },
  { id: "Travel", emoji: "✈️" },
  { id: "Marriage", emoji: "💍" },
  { id: "Build House", emoji: "🏗️" },
  { id: "Buy Home", emoji: "🏠" },
  { id: "Education", emoji: "🎓" },
  { id: "Emergency", emoji: "🆘" },
  { id: "Vehicle", emoji: "🚗" },
  { id: "Other", emoji: "🎯" },
];

const STATUSES = [
  "Planning",
  "In Progress",
  "Paused",
  "Accomplished",
  "Cancelled",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const PAGE_SIZES = [10, 20, 50];

const STATUS_TONE = {
  Planning: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  "In Progress": "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Paused:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Accomplished:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const PRIORITY_TONE = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const emptyForm = (currency) => ({
  title: "",
  description: "",
  goalType: "Buy Item",
  targetAmount: "",
  currency,
  currentFunding: "0",
  status: "Planning",
  priority: "Medium",
  targetDate: "",
  noted: "",
});

const Plans = () => {
  useDocumentTitle("Plans");
  const { t, tEnum } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_plans") || "list",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency));

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_plans", v);
  };

  const activeFilterCount = [
    typeFilter,
    statusFilter,
    priorityFilter,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setPriorityFilter("");
    setFilterSearch("");
    setPage(1);
  };

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get("/plans", { params });
      let list = data.data?.items || [];
      if (typeFilter) list = list.filter((x) => x.goalType === typeFilter);
      if (priorityFilter)
        list = list.filter((x) => x.priority === priorityFilter);
      setItems(list);
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter, priorityFilter]);

  useEffect(() => {
    setForm((f) => ({ ...f, currency: displayCurrency }));
  }, [displayCurrency]);

  const filteredItems = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const note = (item.noted || "").toLowerCase();
      const gtype = (item.goalType || "").toLowerCase();
      const amount = String(item.targetAmount ?? "");
      return (
        title.includes(q) ||
        desc.includes(q) ||
        note.includes(q) ||
        gtype.includes(q) ||
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
  }, [typeFilter, statusFilter, priorityFilter, filterSearch]);

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

  const summary = useMemo(() => {
    const totalTarget = items.reduce(
      (s, i) => s + (Number(i.targetAmountUSD) || Number(i.targetAmount) || 0),
      0,
    );
    const totalFunded = items.reduce(
      (s, i) =>
        s + (Number(i.currentFundingUSD) ?? Number(i.currentFunding) ?? 0),
      0,
    );
    return { count: items.length, totalTarget, totalFunded };
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(displayCurrency));
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      goalType: item.goalType || "Other",
      targetAmount: String(item.targetAmount ?? ""),
      currency: item.currency || displayCurrency,
      currentFunding: String(item.currentFunding ?? 0),
      status: item.status || "Planning",
      priority: item.priority || "Medium",
      targetDate: item.targetDate
        ? new Date(item.targetDate).toISOString().slice(0, 10)
        : "",
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
        targetAmount: Number(form.targetAmount),
        currentFunding: Number(form.currentFunding) || 0,
      };
      if (editing) {
        const { data } = await api.put(`/plans/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/plans", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      fetchData({ silent: true });
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
        const { data } = await api.delete("/plans");
        toast.success(data.message || t("success"));
      } else {
        await api.delete(`/plans/${confirmDel}`);
        toast.success(t("success"));
      }
      setConfirmDel(null);
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/plans/export");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = `plans-${Date.now()}.json`;
      a.click();
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const goalLabel = (id) => {
    const g = GOAL_TYPES.find((x) => x.id === id);
    return g ? `${g.emoji} ${tEnum(g.id)}` : tEnum(id);
  };

  const goalEmoji = (id) => {
    const g = GOAL_TYPES.find((x) => x.id === id);
    return g?.emoji || "🎯";
  };

  const statusLabel = (s) => {
    const map = {
      Planning: t("planning"),
      "In Progress": t("inProgress"),
      Paused: t("paused"),
      Accomplished: t("accomplished"),
      Cancelled: t("cancelled"),
    };
    return map[s] || s;
  };

  const progress = (item) => {
    const target = item.targetAmountUSD || item.targetAmount || 1;
    const funded = item.currentFundingUSD ?? item.currentFunding ?? 0;
    return Math.min(100, Math.round((funded / target) * 100));
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
          Showing{" "}
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {rangeFrom}–{rangeTo}
          </span>{" "}
          of{" "}
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
                {n} / page
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
                {t("plans")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles size={11} />
                {summary.count} {t("entries")}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("plansHint")} · {displayCurrency}
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
              {t("newPlan")}
            </button>
          </div>
        </div>
      </div>

      {/* Summary + filter toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t("targetAmount")}:{" "}
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatMoney(summary.totalTarget, displayCurrency, rates)}
          </span>
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t("currentFunding")}:{" "}
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatMoney(summary.totalFunded, displayCurrency, rates)}
          </span>
        </span>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`${btnSecondary} ml-auto relative`}
        >
          <Filter size={15} />
          <span className="hidden sm:inline">Filters</span>
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
              Advanced filters
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
              >
                <X size={12} /> Clear all
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
              placeholder="Search title, description, type, amount…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-600 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("goalType")}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {GOAL_TYPES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {tEnum(g.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("status")}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                {t("priority")}
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all")}</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick type chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setTypeFilter("")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                !typeFilter
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t("all")}
            </button>
            {GOAL_TYPES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  setTypeFilter((cur) => (cur === g.id ? "" : g.id))
                }
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  typeFilter === g.id
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {g.emoji} {tEnum(g.id)}
              </button>
            ))}
          </div>

          {/* Quick status chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                !statusFilter
                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t("all")}
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter((cur) => (cur === s ? "" : s))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  statusFilter === s
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        size="lg"
        closeOnBackdrop={!saving}
      >
        <Modal.Header>{editing ? t("edit") : t("newPlan")}</Modal.Header>
        <Modal.Body>
          <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("title")}
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                placeholder={t("goalTitlePlaceholder")}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("goalType")}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {GOAL_TYPES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setForm({ ...form, goalType: g.id })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition active:scale-[0.98] ${
                      form.goalType === g.id
                        ? "bg-teal-700 text-white border-teal-700 shadow-sm shadow-teal-700/20"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-teal-600"
                    }`}
                  >
                    {g.emoji} {tEnum(g.id)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("description")}
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className={inputCls}
                placeholder={t("goalDescPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("targetAmount")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.targetAmount}
                  onChange={(e) =>
                    setForm({ ...form, targetAmount: e.target.value })
                  }
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
                  {t("currentFunding")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.currentFunding}
                  onChange={(e) =>
                    setForm({ ...form, currentFunding: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("date")}
                </label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm({ ...form, targetDate: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
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
                  {t("priority")}
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className={inputCls}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
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
            form="plan-form"
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
          icon={Target}
          title={t("noData")}
          hint={t("plansHint")}
          action={
            activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreate}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition"
              >
                {t("newPlan")}
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
                  <th className="text-left p-3.5 font-medium">{t("title")}</th>
                  <th className="text-left p-3.5 font-medium">
                    {t("goalType")}
                  </th>
                  <th className="text-left p-3.5 font-medium">
                    {t("targetAmount")}
                  </th>
                  <th className="text-left p-3.5 font-medium">{t("status")}</th>
                  <th className="text-left p-3.5 font-medium">%</th>
                  <th className="text-right p-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => {
                  const pct = progress(item);
                  return (
                    <tr
                      key={item._id}
                      className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">{goalLabel(item.goalType)}</td>
                      <td className="p-3.5">
                        <div className="font-semibold tabular-nums text-slate-900 dark:text-white">
                          {formatMoney(
                            item.targetAmountUSD || item.targetAmount,
                            displayCurrency,
                            rates,
                          )}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                          {formatMoney(
                            item.currentFundingUSD ?? item.currentFunding ?? 0,
                            displayCurrency,
                            rates,
                          )}{" "}
                          funded
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_TONE[item.status] || STATUS_TONE.Planning}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-teal-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-slate-500">
                            {pct}%
                          </span>
                        </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar />
        </>
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {pagedItems.map((item) => {
              const pct = progress(item);
              return (
                <div
                  key={item._id}
                  className={`group relative ${card} rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-black/30`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 mb-0.5">
                        {goalLabel(item.goalType)}
                      </div>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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

                  {item.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}

                  <div className="text-sm mb-1.5 tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatMoney(
                        item.currentFundingUSD ?? item.currentFunding ?? 0,
                        displayCurrency,
                        rates,
                      )}
                    </span>
                    <span className="text-slate-400"> / </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {formatMoney(
                        item.targetAmountUSD || item.targetAmount,
                        displayCurrency,
                        rates,
                      )}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2.5">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${STATUS_TONE[item.status] || STATUS_TONE.Planning}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${PRIORITY_TONE[item.priority] || PRIORITY_TONE.Medium}`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <span className="tabular-nums text-slate-500 font-medium">
                      {pct}%
                    </span>
                  </div>

                  {item.targetDate && (
                    <div className="text-xs text-slate-400 mt-2">
                      {new Date(item.targetDate).toLocaleDateString()}
                    </div>
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
              const pct = progress(item);
              return (
                <div
                  key={item._id}
                  className={`group ${card} rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm transition-all duration-200 hover:shadow-md dark:hover:shadow-black/20`}
                >
                  <div className="min-w-0 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                      {goalEmoji(item.goalType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_TONE[item.status] || STATUS_TONE.Planning}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_TONE[item.priority] || PRIORITY_TONE.Medium}`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="tabular-nums">
                          {formatMoney(
                            item.currentFundingUSD ?? item.currentFunding ?? 0,
                            displayCurrency,
                            rates,
                          )}{" "}
                          /{" "}
                          {formatMoney(
                            item.targetAmountUSD || item.targetAmount,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span>{goalLabel(item.goalType)}</span>
                        {item.targetDate && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">
                              ·
                            </span>
                            <span>
                              {new Date(item.targetDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 max-w-xs">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-teal-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums text-slate-500 shrink-0">
                          {pct}%
                        </span>
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
              );
            })}
          </div>
          <PaginationBar />
        </>
      )}
    </div>
  );
};

export default Plans;
