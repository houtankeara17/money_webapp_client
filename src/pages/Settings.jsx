import { useState, useEffect, useRef } from "react";
import { useAuth } from "../store/AuthContext";
import { useTheme } from "../store/ThemeContext";
import api from "../services/api";
import toast from "react-hot-toast";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useI18n from "../hooks/useI18n";
import { ThemeCards, ThemeSwitch } from "../components/common/ThemeToggle";
import {
  Save,
  Lock,
  User,
  Palette,
  Globe,
  DollarSign,
  Sparkles,
  Camera,
  Trash2,
} from "lucide-react";

const CURRENCIES = [
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
  { code: "KHR", label: "Cambodian Riel (KHR)", symbol: "៛" },
  { code: "THB", label: "Thai Baht (THB)", symbol: "฿" },
];

const Settings = () => {
  useDocumentTitle("Settings");
  const { t } = useI18n();
  const { user, updateUser } = useAuth();
  const { theme, language, changeTheme, changeLanguage, changeCurrency } =
    useTheme();

  const avatarRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    avatar: "",
    currency: "USD",
    exchangeRateKhr: 4100,
    exchangeRateThb: 36.5,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        avatar: user.avatar || "",
        currency: user.currency || "USD",
        exchangeRateKhr: user.exchangeRateKhr ?? 4100,
        exchangeRateThb: user.exchangeRateThb ?? 36.5,
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put("/auth/profile", {
        name: profile.name,
        avatar: profile.avatar,
        currency: profile.currency,
        exchangeRateKhr: Number(profile.exchangeRateKhr),
        exchangeRateThb: Number(profile.exchangeRateThb),
        theme,
        language,
      });
      updateUser(data.data);
      toast.success(data.message || t("success"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCurrencyChange = async (code) => {
    setProfile((p) => ({ ...p, currency: code }));
    try {
      await changeCurrency(code);
      toast.success(`${t("currency")}: ${code}`);
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleLanguageClick = async (lang) => {
    await changeLanguage(lang);
    toast.success(lang === "km" ? "ភាសា: ខ្មែរ" : "Language: English");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      toast.error("Min 6 characters");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const { data } = await api.put("/auth/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success(data.message || t("success"));
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSavingPassword(false);
    }
  };

  const card =
    "rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-sm overflow-hidden";

  return (
    <div className="w-full min-h-full -mx-0 px-0">
      {/* Ambient background accents — same language as Dashboard */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-teal-500/5 dark:bg-teal-400/5 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[360px] h-[360px] rounded-full bg-violet-500/5 dark:bg-violet-400/5 blur-3xl" />
      </div>

      {/* Header */}
      <div className="w-full mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("settings")}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <Sparkles size={11} />
                {profile.currency || "USD"}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {language === "km"
                ? "ការផ្លាស់ប្តូរអនុវត្តភ្លាមៗ"
                : "Changes apply immediately"}
            </p>
          </div>
        </div>
      </div>

      {/* Full-width responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* ========== Appearance (unchanged content / structure) ========== */}
        <section className={`${card} lg:col-span-2 xl:col-span-1`}>
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Palette size={17} />
            </div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              {t("appearance")}
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {t("theme")}
            </p>
            <ThemeCards />
            <div className="mt-5 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium">{t("quickToggle")}</p>
                <p className="text-xs text-slate-500">{t("quickToggleDesc")}</p>
              </div>
              <ThemeSwitch />
            </div>
          </div>
        </section>

        {/* ========== Language ========== */}
        <section className={card}>
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Globe size={17} />
            </div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              {t("language")}
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: "en", label: "English" },
                { code: "km", label: "ខ្មែរ" },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleLanguageClick(l.code)}
                  className={`py-4 rounded-2xl border-2 text-sm font-medium transition active:scale-[0.98] ${
                    language === l.code
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-sm shadow-teal-500/10"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/30"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ========== Currency ========== */}
        <section className={card}>
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <DollarSign size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                {t("currency")}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {t("defaultCurrency")}
              </p>
            </div>
          </div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCurrencyChange(c.code)}
                  className={`py-3.5 rounded-2xl border-2 text-sm font-semibold transition active:scale-[0.98] ${
                    profile.currency === c.code
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-sm shadow-teal-500/10"
                      : "border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300"
                  }`}
                >
                  <div className="text-lg leading-none mb-1">{c.symbol}</div>
                  <div className="text-[11px] font-normal opacity-70">
                    {c.code}
                  </div>
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t("exchangeRates")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    KHR / 1 USD
                  </label>
                  <input
                    type="number"
                    value={profile.exchangeRateKhr}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        exchangeRateKhr: e.target.value,
                      })
                    }
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/40 transition tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    THB / 1 USD
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.exchangeRateThb}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        exchangeRateThb: e.target.value,
                      })
                    }
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/40 transition tabular-nums"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 transition active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={16} />
                {savingProfile ? t("loading") : t("save")}
              </button>
            </form>
          </div>
        </section>

        {/* ========== Profile ========== */}
        <section className={`${card} lg:col-span-2 xl:col-span-2`}>
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <User size={17} />
            </div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              {t("profile")}
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative shrink-0">
                  {profile.avatar ? (
                    <img
                      src={
                        profile.avatar.startsWith("/")
                          ? `http://localhost:5000${profile.avatar}`
                          : profile.avatar
                      }
                      alt=""
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-teal-500/30 shadow-md"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-inner">
                      {(profile.name || user?.name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-2.5">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t("profilePhoto")}
                  </p>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 8 * 1024 * 1024) {
                        toast.error("Max 8MB");
                        return;
                      }
                      setUploadingAvatar(true);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const { data } = await api.post("/upload", fd, {
                          headers: {
                            "Content-Type": "multipart/form-data",
                          },
                        });
                        const url = data.data?.url || "";
                        setProfile((prev) => ({ ...prev, avatar: url }));
                        await api.put("/auth/profile", { avatar: url });
                        const me = await api.get("/auth/me");
                        if (me.data?.data) {
                          localStorage.setItem(
                            "user",
                            JSON.stringify(me.data.data),
                          );
                        }
                        toast.success(t("success"));
                      } catch (err) {
                        toast.error(err.response?.data?.message || t("failed"));
                      } finally {
                        setUploadingAvatar(false);
                        if (avatarRef.current) avatarRef.current.value = "";
                      }
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => avatarRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium shadow-sm shadow-teal-600/20 transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <Camera size={15} />
                      {uploadingAvatar ? t("loading") : t("changeAvatar")}
                    </button>
                    {profile.avatar && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        onClick={async () => {
                          setProfile((prev) => ({ ...prev, avatar: "" }));
                          try {
                            await api.put("/auth/profile", { avatar: "" });
                            toast.success(t("success"));
                          } catch (_) {}
                        }}
                      >
                        <Trash2 size={14} />
                        {t("remove")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("displayName")}
                  </label>
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/40 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("email")}
                  </label>
                  <input
                    value={user?.email || ""}
                    disabled
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/50 text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 transition active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={16} />
                {t("saveProfile")}
              </button>
            </form>
          </div>
        </section>

        {/* ========== Change Password ========== */}
        {user?.authProvider === "local" && (
          <section className={`${card} lg:col-span-2 xl:col-span-1`}>
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Lock size={17} />
              </div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {t("changePassword")}
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("currentPassword")}
                  </label>
                  <input
                    type="password"
                    required
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/40 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("newPassword")}
                  </label>
                  <input
                    type="password"
                    required
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/40 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("confirmPassword")}
                  </label>
                  <input
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/40 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Lock size={16} />
                  {t("updatePassword")}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;
