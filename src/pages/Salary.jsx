import { useEffect, useState, useRef, useMemo } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Pencil,
  Upload,
  X,
  Image as ImageIcon,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
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

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function resolveUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

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
const PAYMENTS = [
  "Cash",
  "ABA Bank",
  "ACLEDA Bank",
  "Wing",
  "Transfer",
  "Other",
];

const PAYMENT_META = {
  Cash: {
    emoji: "💵",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  "ABA Bank": {
    emoji: "🏦",
    tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  "ACLEDA Bank": {
    emoji: "🏛️",
    tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  },
  Wing: {
    emoji: "📱",
    tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  Transfer: {
    emoji: "↔️",
    tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  Other: {
    emoji: "💰",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
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
  paymentMethod: "ABA Bank",
  noted: "",
  images: [],
});

const Salary = () => {
  useDocumentTitle("Salary");
  const { t } = useI18n();
  const { user } = useAuth();
  const fileRef = useRef(null);

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
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState(
    () => localStorage.getItem("view_salary") || "list",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency, currentYear));

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_salary", v);
  };

  const activeFilterCount = [
    filterStatus,
    filterMonth,
    filterPayment,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("");
    setFilterMonth("");
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
      if (filterStatus) params.status = filterStatus;
      if (filterMonth) params.monthNumber = filterMonth;
      if (filterPayment) params.paymentMethod = filterPayment;
      const { data } = await api.get("/salaries", { params });
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
  }, [year, filterStatus, filterMonth, filterPayment]);

  useEffect(() => {
    setForm((f) => ({ ...f, currency: displayCurrency }));
  }, [displayCurrency]);

  useEffect(() => {
    if (!imagePreview) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setImagePreview("");
        setZoom(1);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
      } else if (e.key === "0") {
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imagePreview]);

  const canPrev =
    availableYears.length === 0 || availableYears.some((y) => y < year);
  const canNext = availableYears.some((y) => y > year) || year < currentYear;

  const filteredItems = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const note = (item.noted || "").toLowerCase();
      const pay = (item.paymentMethod || "").toLowerCase();
      const amount = String(item.amount ?? "");
      return note.includes(q) || pay.includes(q) || amount.includes(q);
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
  }, [filterStatus, filterMonth, filterPayment, filterSearch]);

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
    setPreview("");
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const imgs = item.images || [];
    setForm({
      amount: String(item.amount ?? ""),
      currency: item.currency || displayCurrency,
      year: item.year || year,
      monthNumber: item.monthNumber || 1,
      status: item.status || "Confirmed",
      paymentMethod: item.paymentMethod || "ABA Bank",
      noted: item.noted || "",
      images: imgs,
    });
    setPreview(imgs[0] ? resolveUrl(imgs[0]) : "");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving || uploading) return;
    setShowForm(false);
    setEditing(null);
    setPreview("");
  };

  const uploadReceipt = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data?.url;
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File must be under 8MB");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const url = await uploadReceipt(file);
      if (!url) throw new Error("No URL returned");
      setForm((f) => ({ ...f, images: [url] }));
      setPreview(resolveUrl(url));
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Upload failed");
      setPreview("");
      setForm((f) => ({ ...f, images: [] }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeReceipt = () => {
    setForm((f) => ({ ...f, images: [] }));
    setPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) {
      toast.error("Wait for upload to finish");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        currency: form.currency,
        year: Number(form.year),
        monthNumber: Number(form.monthNumber),
        status: form.status,
        paymentMethod: form.paymentMethod,
        noted: form.noted || "",
        images: form.images?.filter(Boolean) || [],
      };
      if (editing) {
        const { data } = await api.put(`/salaries/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/salaries", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      setPreview("");
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
        const { data } = await api.delete("/salaries");
        toast.success(data.message || t("success"));
      } else {
        await api.delete(`/salaries/${confirmDel}`);
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
      const { data } = await api.get("/salaries/export");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = `salaries-${Date.now()}.json`;
      a.click();
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const monthName = (n) => MONTHS.find((m) => m.n === n)?.name || n;

  const payMeta = (method) =>
    PAYMENT_META[method] || {
      emoji: "💰",
      tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    };

  const openImagePreview = (src) => {
    if (!src) return;
    setZoom(1);
    setImagePreview(src);
  };

  /**
   * Thumbnail:
   * - salary slip / QR image when present (click to preview)
   * - payment-method emoji when no image
   */
  const MediaThumbSafe = ({ item, size = "md", className = "" }) => {
    const src = item.images?.[0] ? resolveUrl(item.images[0]) : "";
    const meta = payMeta(item.paymentMethod);
    const sizeCls =
      size === "lg"
        ? "w-full h-28 rounded-xl"
        : size === "sm"
          ? "w-10 h-10 rounded-xl"
          : "w-12 h-12 rounded-xl";

    const placeholder = (
      <div
        className={`${sizeCls} flex items-center justify-center shrink-0 text-xl sm:text-2xl ${meta.tone} ${className} ${src ? "hidden" : ""}`}
        title={item.paymentMethod}
      >
        {meta.emoji}
      </div>
    );

    if (!src) return placeholder;

    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openImagePreview(src);
          }}
          className={`${sizeCls} p-0 border-0 bg-transparent cursor-zoom-in shrink-0 overflow-hidden ring-1 ring-slate-200/60 dark:ring-slate-600/40 hover:ring-teal-500/50 transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${className}`}
          title="Click to preview"
        >
          <img
            src={src}
            alt="Salary slip"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = "none";
              const sib = e.currentTarget.parentElement?.nextElementSibling;
              if (sib) sib.classList.remove("hidden");
            }}
          />
        </button>
        {placeholder}
      </>
    );
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
                {t("salary")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles size={11} />
                {yearSummary.count} {t("entries")}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatMoney(yearSummary.confirmedUSD, displayCurrency, rates)} ·{" "}
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
              {t("addSalary")}
            </button>
          </div>
        </div>
      </div>

      {/* Year navigator */}
      <div className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8">
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
            {formatMoney(yearSummary.totalUSD, displayCurrency, rates)}
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
              placeholder={`${t("searchNote")} ${t("payment")} ${t("amount")}…`}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-600 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t("status")}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("all") || "All"}</option>
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
                <option value="">{t("all") || "All"}</option>
                {MONTHS.map((m) => (
                  <option key={m.n} value={m.n}>
                    {m.name}
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
                <option value="">{t("all") || "All"}</option>
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        size="md"
        closeOnBackdrop={!saving && !uploading}
      >
        <Modal.Header>{editing ? t("edit") : t("addSalary")}</Modal.Header>
        <Modal.Body>
          <form id="salary-form" onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("month")}
                </label>
                <select
                  value={form.monthNumber}
                  onChange={(e) =>
                    setForm({ ...form, monthNumber: e.target.value })
                  }
                  className={inputCls}
                >
                  {MONTHS.map((m) => (
                    <option key={m.n} value={m.n}>
                      {m.name}
                    </option>
                  ))}
                </select>
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

            {/* Slip / receipt image */}
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                <ImageIcon size={13} /> Salary slip / QR image
              </label>

              {preview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => openImagePreview(preview)}
                    className="w-full cursor-zoom-in block p-0 border-0 bg-transparent"
                    title="Click to preview"
                  >
                    <img
                      src={preview}
                      alt="Salary slip"
                      className="w-full max-h-48 object-contain bg-slate-100 dark:bg-slate-900"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-600 transition z-10"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm font-medium">
                      Uploading...
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition text-slate-500"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 flex items-center justify-center">
                    <Upload size={22} />
                  </div>
                  <span className="text-sm font-medium">
                    {uploading ? "Uploading..." : "Click to upload image"}
                  </span>
                  <span className="text-xs text-slate-400">
                    JPG, PNG, WebP or PDF · max 8MB
                  </span>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={onFileChange}
              />

              {preview && !uploading && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-xs text-teal-700 dark:text-teal-400 hover:underline"
                >
                  Replace image
                </button>
              )}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={closeForm}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="salary-form"
            disabled={saving || uploading}
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

      {/* Image lightbox with zoom */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-sm"
          onClick={() => {
            setImagePreview("");
            setZoom(1);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          {/* Top bar: close */}
          <button
            type="button"
            onClick={() => {
              setImagePreview("");
              setZoom(1);
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>

          {/* Image container */}
          <div
            className="relative flex-1 w-full flex items-center justify-center overflow-auto min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagePreview}
              alt="Salary slip preview"
              className="max-w-none rounded-2xl shadow-2xl transition-transform duration-200 ease-out select-none"
              style={{
                transform: `scale(${zoom})`,
                maxHeight: zoom <= 1 ? "75vh" : "none",
                maxWidth: zoom <= 1 ? "100%" : "none",
                width: zoom <= 1 ? "auto" : undefined,
                cursor: zoom > 1 ? "grab" : "default",
              }}
              draggable={false}
            />
          </div>

          {/* Zoom controls */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-1.5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
              }
              disabled={zoom <= 0.5}
              className="p-2.5 rounded-xl text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom out (−)"
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-w-[3.5rem] px-2 py-2 rounded-xl text-white text-sm font-medium tabular-nums hover:bg-white/15 transition"
              title="Reset zoom (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))
              }
              disabled={zoom >= 4}
              className="p-2.5 rounded-xl text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom in (+)"
            >
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-6 bg-white/20 mx-0.5" />
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-2.5 rounded-xl text-white hover:bg-white/15 transition"
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <LoadingSpinner label={t("loading")} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={t("noData")}
          hint={t("noDataHint")}
          action={
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition"
            >
              {t("addSalary")}
            </button>
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
                  <th className="text-left p-3.5 w-12 font-medium"></th>
                  <th className="text-left p-3.5 font-medium">{t("amount")}</th>
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
                      <MediaThumbSafe item={item} size="sm" />
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatOriginal(item.amount, item.currency)}
                      </div>
                      <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                        {formatMoney(item.amountUSD, displayCurrency, rates)}
                      </div>
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
                      {item.paymentMethod}
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
              const meta = payMeta(item.paymentMethod);
              return (
                <div
                  key={item._id}
                  className={`group relative ${card} rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-black/30`}
                >
                  <div className="mb-3">
                    {item.images?.[0] ? (
                      <MediaThumbSafe item={item} size="lg" />
                    ) : (
                      <div
                        className={`w-full h-28 rounded-xl flex flex-col items-center justify-center gap-1.5 ${meta.tone}`}
                      >
                        <span className="text-4xl leading-none">
                          {meta.emoji}
                        </span>
                        <span className="text-[11px] font-medium opacity-70">
                          {item.paymentMethod}
                        </span>
                      </div>
                    )}
                  </div>
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
                    <span className="text-xs text-slate-400">
                      {item.paymentMethod}
                    </span>
                  </div>
                  {item.noted && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
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
            {pagedItems.map((item) => (
              <div
                key={item._id}
                className={`group ${card} rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm transition-all duration-200 hover:shadow-md dark:hover:shadow-black/20`}
              >
                <div className="min-w-0 flex items-center gap-3.5">
                  <MediaThumbSafe item={item} size="md" />
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
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {monthName(item.monthNumber)} {item.year} ·{" "}
                      {item.paymentMethod}
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

export default Salary;
