import { useEffect, useState, useCallback } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  Search,
  StickyNote,
  Link as LinkIcon,
  Image as ImageIcon,
  ListChecks,
  Download,
  Copy,
  ExternalLink,
  X,
  CheckCircle2,
  Circle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Eye,
} from "lucide-react";
import useI18n from "../hooks/useI18n";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ConfirmModal from "../components/common/ConfirmModal";
import ViewToggle from "../components/common/ViewToggle";
import { NOTE_CATEGORIES } from "../constants/categories";

const COLORS = [
  {
    id: "default",
    label: "Default",
    swatch: "bg-slate-200 dark:bg-slate-600",
    card: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  },
  {
    id: "green",
    label: "Green",
    swatch: "bg-emerald-400",
    card: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "blue",
    label: "Teal",
    swatch: "bg-teal-400",
    card: "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800",
  },
  {
    id: "yellow",
    label: "Yellow",
    swatch: "bg-amber-400",
    card: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
  },
  {
    id: "red",
    label: "Red",
    swatch: "bg-rose-400",
    card: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800",
  },
  {
    id: "purple",
    label: "Purple",
    swatch: "bg-violet-400",
    card: "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800",
  },
  {
    id: "orange",
    label: "Orange",
    swatch: "bg-orange-400",
    card: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
  },
];

const ICONS = [
  "📝",
  "📌",
  "💡",
  "⭐",
  "🔥",
  "💼",
  "🏠",
  "💰",
  "🎯",
  "📚",
  "✈️",
  "🛒",
  "❤️",
  "✅",
  "🔔",
  "🧠",
];

const emptyForm = () => ({
  title: "",
  body: "",
  icon: "📝",
  categoryTag: "General",
  color: "default",
  pinned: false,
  items: [],
  links: [],
  image: "",
});

const Notes = () => {
  useDocumentTitle("Notes");
  const { t, tEnum } = useI18n();

  const [items, setItems] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [pinFilter, setPinFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(
    () => localStorage.getItem("view_notes") || "grid",
  );
  const [form, setForm] = useState(emptyForm());
  const [newItemText, setNewItemText] = useState("");
  const [newLink, setNewLink] = useState({ url: "", label: "" });
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Image Zoom Modal state
  const [zoomImage, setZoomImage] = useState(null);
  const [scale, setScale] = useState(1);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_notes", v);
  };

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const params = { limit: 100 };
        if (catFilter) params.categoryTag = catFilter;
        if (pinFilter) params.pinned = pinFilter;
        if (search.trim()) params.search = search.trim();
        const { data } = await api.get("/notes", { params });
        setItems(Array.isArray(data?.data?.items) ? data.data.items : []);
      } catch (err) {
        console.error("Notes fetch error:", err);
        toast.error(err.response?.data?.message || "Failed to load notes");
        setItems([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [catFilter, pinFilter, search],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (search) {
        await new Promise((r) => setTimeout(r, 350));
      }
      if (!cancelled) await fetchData();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setNewItemText("");
    setNewLink({ url: "", label: "" });
    setShowForm(true);
  };

  const openEdit = (note) => {
    setEditing(note);
    setForm({
      title: note.title || "",
      body: note.body || "",
      icon: note.icon || "📝",
      categoryTag: note.categoryTag || "General",
      color: note.color || "default",
      pinned: !!note.pinned,
      items: (note.items || []).map((i) => ({
        _id: i._id,
        text: i.text,
        checked: !!i.checked,
        order: i.order ?? 0,
      })),
      links: (note.links || []).map((l) => ({
        _id: l._id,
        url: l.url,
        label: l.label || "",
      })),
      image: note.image || "",
    });
    setNewItemText("");
    setNewLink({ url: "", label: "" });
    setShowForm(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({ ...prev, image: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body || "",
        icon: form.icon || "📝",
        categoryTag: form.categoryTag || "General",
        color: form.color || "default",
        pinned: !!form.pinned,
        image: form.image || "",
        items: form.items.map((it, idx) => ({
          text: it.text,
          checked: !!it.checked,
          order: idx,
        })),
        links: form.links.map((l) => ({
          url: l.url,
          label: l.label || "",
        })),
      };
      if (editing) {
        const { data } = await api.put(`/notes/${editing._id}`, payload);
        toast.success(data.message || "Note updated");
      } else {
        const { data } = await api.post("/notes", payload);
        toast.success(data.message || "Note created");
      }
      setShowForm(false);
      setEditing(null);
      await fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (id, e) => {
    e?.stopPropagation?.();
    try {
      const { data } = await api.patch(`/notes/${id}/pin`);
      toast.success(data.message);
      fetchData({ silent: true });
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleDuplicate = async (id, e) => {
    e?.stopPropagation?.();
    try {
      const { data } = await api.post(`/notes/${id}/duplicate`);
      toast.success(data.message || "Duplicated");
      fetchData({ silent: true });
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleToggleCheck = async (noteId, itemId, e) => {
    e?.stopPropagation?.();
    setItems((prev) =>
      prev.map((n) => {
        if (n._id !== noteId) return n;
        return {
          ...n,
          items: n.items.map((it) =>
            it._id === itemId ? { ...it, checked: !it.checked } : it,
          ),
        };
      }),
    );
    try {
      await api.patch(`/notes/${noteId}/items/${itemId}`);
    } catch {
      toast.error(t("failed"));
      fetchData({ silent: true });
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "all") {
        const { data } = await api.delete("/notes");
        toast.success(data.message || "All notes deleted");
      } else {
        await api.delete(`/notes/${confirmDel}`);
        toast.success("Note deleted");
      }
      setConfirmDel(null);
      if (editing && editing._id === confirmDel) {
        setShowForm(false);
        setEditing(null);
      }
      await fetchData({ silent: true });
    } catch {
      toast.error(t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/notes/export");
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `notes-${Date.now()}.json`;
      a.click();
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    setForm({
      ...form,
      items: [
        ...form.items,
        { text: newItemText.trim(), checked: false, order: form.items.length },
      ],
    });
    setNewItemText("");
  };

  const addLink = () => {
    let url = newLink.url.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setForm({
      ...form,
      links: [...form.links, { url, label: newLink.label.trim() || url }],
    });
    setNewLink({ url: "", label: "" });
  };

  const openImageZoom = (imgSrc, e) => {
    e?.stopPropagation();
    setZoomImage(imgSrc);
    setScale(1);
  };

  const colorClass = (c) =>
    COLORS.find((x) => x.id === c)?.card || COLORS[0].card;
  const catEmoji = (id) =>
    NOTE_CATEGORIES.find((c) => c.id === id)?.emoji || "📝";
  const pinned = items.filter((n) => n.pinned);
  const unpinned = items.filter((n) => !n.pinned);

  const inputCls =
    "w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm shadow-sm";

  const NoteCard = ({ note }) => {
    const done = note.items?.filter((i) => i.checked).length || 0;
    const total = note.items?.length || 0;
    return (
      <div
        onClick={() => openEdit(note)}
        className={`group relative rounded-2xl border p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${colorClass(note.color)}`}
      >
        <div>
          {note.image ? (
            <div className="relative overflow-hidden rounded-xl mb-3 h-40 w-full bg-slate-100 dark:bg-slate-900 group/img">
              <img
                src={note.image}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.parentElement.style.display = "none";
                }}
              />
              <button
                type="button"
                onClick={(e) => openImageZoom(note.image, e)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                title="Zoom Preview"
              >
                <Eye size={14} />
              </button>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl p-1 bg-white/50 dark:bg-slate-900/50 rounded-lg shrink-0">
                {note.icon || "📝"}
              </span>
              <h3 className="font-semibold truncate text-base text-slate-900 dark:text-slate-100">
                {note.title}
              </h3>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                title="Duplicate"
                onClick={(e) => handleDuplicate(note._id, e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors"
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                title={note.pinned ? "Unpin" : "Pin"}
                onClick={(e) => handleTogglePin(note._id, e)}
                className={`p-1.5 rounded-lg transition-colors ${note.pinned ? "text-amber-500 opacity-100" : "text-slate-400 hover:text-amber-500 hover:bg-white/60 dark:hover:bg-slate-900/60"}`}
              >
                {note.pinned ? (
                  <Pin size={14} className="fill-amber-500" />
                ) : (
                  <PinOff size={14} />
                )}
              </button>
              <button
                type="button"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDel(note._id);
                }}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {note.body ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-3 whitespace-pre-wrap leading-relaxed">
              {note.body}
            </p>
          ) : null}

          {/* Checklist */}
          {total > 0 && (
            <ul className="space-y-1.5 mb-3 bg-white/40 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
              {note.items.slice(0, 4).map((item) => (
                <li
                  key={item._id || item.text}
                  className="text-xs flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={(e) =>
                      item._id && handleToggleCheck(note._id, item._id, e)
                    }
                    className={`shrink-0 transition-colors ${
                      item.checked
                        ? "text-teal-600 dark:text-teal-400"
                        : "text-slate-400 hover:text-teal-500"
                    }`}
                  >
                    {item.checked ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Circle size={14} />
                    )}
                  </button>
                  <span
                    className={`truncate ${item.checked ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}
                  >
                    {item.text}
                  </span>
                </li>
              ))}
              {total > 4 && (
                <li className="text-[11px] text-slate-400 font-medium pl-6">
                  +{total - 4} more items
                </li>
              )}
            </ul>
          )}

          {/* Links */}
          {note.links?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {note.links.slice(0, 3).map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-50/80 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 truncate max-w-[160px] hover:underline inline-flex items-center gap-1 border border-teal-200/50 dark:border-teal-800/50"
                >
                  <ExternalLink size={10} className="shrink-0" />{" "}
                  <span className="truncate">{l.label || l.url}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer Details */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 mt-auto">
          <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400">
            {catEmoji(note.categoryTag)} {tEnum(note.categoryTag)}
          </span>
          {total > 0 && (
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {done}/{total} done
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderList = (list) => {
    if (view === "list") {
      return (
        <div className="space-y-2.5">
          {list.map((note) => (
            <div
              key={note._id}
              onClick={() => openEdit(note)}
              className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition ${colorClass(note.color)}`}
            >
              <span className="text-xl p-1.5 bg-white/60 dark:bg-slate-900/60 rounded-lg">
                {note.icon || "📝"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {note.title}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {catEmoji(note.categoryTag)} {tEnum(note.categoryTag)}
                  {note.body ? ` · ${note.body.slice(0, 60)}` : ""}
                </div>
              </div>
              {note.pinned && (
                <Pin
                  size={14}
                  className="text-amber-500 fill-amber-500 shrink-0"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDel(note._id);
                }}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {list.map((n) => (
          <NoteCard key={n._id} note={n} />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("notes")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {items.length} {t("entries")} · {pinned.length} {t("pinned")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ViewToggle view={view} onChange={setViewMode} />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Download size={15} /> {t("export")}
          </button>
          <button
            onClick={() => setConfirmDel("all")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-sm font-medium border border-rose-200/60 dark:border-rose-800 hover:bg-rose-100 transition"
          >
            <Trash2 size={15} /> {t("deleteAll")}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 transition"
          >
            <Plus size={16} /> {t("addNote")}
          </button>
        </div>
      </div>

      {/* Search + pin filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm transition"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {[
            { v: "", label: t("all") },
            { v: "true", label: t("pinned") },
            { v: "false", label: t("others") },
          ].map((f) => (
            <button
              key={f.v || "all"}
              onClick={() => setPinFilter(f.v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                pinFilter === f.v
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setCatFilter("")}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!catFilter ? "bg-teal-600 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50"}`}
        >
          {t("all")}
        </button>
        {NOTE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatFilter(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              catFilter === c.id
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            {c.emoji} {tEnum(c.id)}
          </button>
        ))}
      </div>

      {/* Editor Modal */}
      <Modal
        open={showForm}
        onClose={() => !saving && setShowForm(false)}
        size="lg"
        closeOnBackdrop={!saving}
      >
        <Modal.Header>{editing ? t("edit") : t("addNote")}</Modal.Header>
        <Modal.Body>
          <form id="note-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Icon + Title */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Choose Icon
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm({ ...form, icon: ic })}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition ${
                      form.icon === ic
                        ? "bg-teal-50 dark:bg-teal-900/40 border-2 border-teal-500 scale-105"
                        : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={`${inputCls} text-base font-semibold`}
                placeholder="Note title..."
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                Content
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                className={`${inputCls} leading-relaxed`}
                placeholder="Write note body standard text or details..."
              />
            </div>

            {/* Category + Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  {t("category")}
                </label>
                <select
                  value={form.categoryTag}
                  onChange={(e) =>
                    setForm({ ...form, categoryTag: e.target.value })
                  }
                  className={inputCls}
                >
                  {NOTE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {tEnum(c.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Theme Color
                </label>
                <div className="flex gap-2.5 items-center pt-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => setForm({ ...form, color: c.id })}
                      className={`w-7 h-7 rounded-full ${c.swatch} border-2 transition-all ${
                        form.color === c.id
                          ? "border-teal-600 ring-2 ring-teal-500/30 scale-110"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Cover Image Input (Choose File or URL) & Scale/Zoom Controls */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-teal-600" /> Cover Image
                </span>
                {form.image && (
                  <button
                    type="button"
                    onClick={() => openImageZoom(form.image)}
                    className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 text-xs"
                  >
                    <Eye size={12} /> Zoom Preview
                  </button>
                )}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className={inputCls}
                  placeholder="Paste URL (https://...)"
                />
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                  <Upload size={14} className="text-teal-600" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {form.image ? (
                <div className="relative rounded-xl overflow-hidden h-36 w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 group/prev">
                  <img
                    src={form.image}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/prev:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openImageZoom(form.image)}
                      className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-800 text-xs font-semibold flex items-center gap-1 hover:bg-white"
                    >
                      <ZoomIn size={14} /> Preview & Zoom
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image: "" })}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-rose-500"
                    >
                      <X size={14} /> Remove
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Checklist */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <ListChecks size={14} className="text-teal-600" /> Interactive
                Checklist
              </label>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 px-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!!item.checked}
                      onChange={() => {
                        const items = [...form.items];
                        items[idx] = {
                          ...items[idx],
                          checked: !items[idx].checked,
                        };
                        setForm({ ...form, items });
                      }}
                      className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <input
                      value={item.text}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx] = { ...items[idx], text: e.target.value };
                        setForm({ ...form, items });
                      }}
                      className={`flex-1 text-sm bg-transparent outline-none ${
                        item.checked
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          items: form.items.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-500 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  placeholder="Add item..."
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-semibold transition shrink-0"
                >
                  {t("add")}
                </button>
              </div>
            </div>

            {/* Links Editor */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <LinkIcon size={14} className="text-teal-600" /> External Links
              </label>

              <div className="space-y-2">
                {form.links.map((l, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm text-sm"
                  >
                    <ExternalLink
                      size={14}
                      className="text-teal-600 shrink-0"
                    />
                    <input
                      value={l.label}
                      onChange={(e) => {
                        const links = [...form.links];
                        links[idx].label = e.target.value;
                        setForm({ ...form, links });
                      }}
                      placeholder="Label"
                      className="w-1/3 bg-transparent font-medium text-slate-800 dark:text-slate-200 outline-none border-b border-transparent focus:border-teal-500"
                    />
                    <input
                      value={l.url}
                      onChange={(e) => {
                        const links = [...form.links];
                        links[idx].url = e.target.value;
                        setForm({ ...form, links });
                      }}
                      placeholder="URL"
                      className="flex-1 bg-transparent text-slate-500 dark:text-slate-400 outline-none border-b border-transparent focus:border-teal-500 truncate"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          links: form.links.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-500 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  value={newLink.url}
                  onChange={(e) =>
                    setNewLink({ ...newLink, url: e.target.value })
                  }
                  placeholder="https://..."
                  className={`flex-1 min-w-[140px] ${inputCls}`}
                />
                <input
                  value={newLink.label}
                  onChange={(e) =>
                    setNewLink({ ...newLink, label: e.target.value })
                  }
                  placeholder="Label (optional)"
                  className={`w-36 ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-semibold transition shrink-0"
                >
                  {t("add")}
                </button>
              </div>
            </div>

            {/* Pinned Switch */}
            <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <Pin size={15} className="text-amber-500 fill-amber-500" />{" "}
              {t("pinned")}
            </label>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            disabled={saving}
            onClick={() => setShowForm(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="note-form"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 disabled:opacity-50 transition"
          >
            {saving ? t("loading") : t("save")}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Image Preview & Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            {/* Controls Header */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 p-2 rounded-2xl z-10">
              <button
                onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={() => setScale(1)}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition"
                title="Reset Zoom"
              >
                <RotateCcw size={18} />
              </button>
              <span className="text-white text-xs font-medium px-2">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setZoomImage(null)}
                className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image Preview Canvas */}
            <div className="overflow-auto max-h-[80vh] max-w-full p-8 flex items-center justify-center">
              <img
                src={zoomImage}
                alt="Zoomed preview"
                className="transition-transform duration-150 ease-out max-h-[75vh] object-contain rounded-xl"
                style={{ transform: `scale(${scale})` }}
              />
            </div>
          </div>
        </div>
      )}

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

      {loading ? (
        <LoadingSpinner label={t("loading")} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={t("noData")}
          hint={t("noDataHint")}
          action={
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-500/20"
            >
              {t("addNote")}
            </button>
          }
        />
      ) : (
        <>
          {pinned.length > 0 && pinFilter !== "false" && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Pin size={13} className="text-amber-500 fill-amber-500" />{" "}
                {t("pinned")}
              </h2>
              {renderList(pinned)}
            </div>
          )}
          {unpinned.length > 0 && pinFilter !== "true" && (
            <div>
              {pinned.length > 0 && pinFilter === "" && (
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  {t("others")}
                </h2>
              )}
              {renderList(unpinned)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notes;
