import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import {
  LayoutDashboard,
  Wallet,
  Banknote,
  Gift,
  PiggyBank,
  Target,
  Send,
  ArrowRightLeft,
  StickyNote,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  PieChart,
  User,
  ChevronDown,
  Globe,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ThemeToggle from "../common/ThemeToggle";
import Logo from "../common/Logo";
import PageNav from "../common/PageNav";
import useI18n from "../../hooks/useI18n";

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, key: "dashboard" },
      { to: "/reports", icon: BarChart3, key: "reports" },
    ],
  },
  {
    title: "Money Operations",
    items: [
      { to: "/expenses", icon: Wallet, key: "expenses" },
      { to: "/salaries", icon: Banknote, key: "salary" },
      { to: "/bonuses", icon: Gift, key: "bonus" },
      { to: "/savings", icon: PiggyBank, key: "savings" },
      { to: "/budgets", icon: PieChart, key: "budgets" },
      { to: "/plans", icon: Target, key: "plans" },
      { to: "/remittances", icon: Send, key: "remittances" },
      { to: "/exchange-logs", icon: ArrowRightLeft, key: "exchange" },
    ],
  },
  {
    title: "Tools & Preferences",
    items: [
      { to: "/notes", icon: StickyNote, key: "notes" },
      { to: "/settings", icon: Settings, key: "settings" },
    ],
  },
];

const PAGE_TITLES = {
  "/": "Dashboard",
  "/expenses": "Expenses",
  "/salaries": "Salary",
  "/bonuses": "Bonus",
  "/savings": "Savings",
  "/budgets": "Budgets",
  "/plans": "Plans",
  "/remittances": "Remittances",
  "/exchange-logs": "Exchange Log",
  "/notes": "Notes",
  "/reports": "Reports",
  "/settings": "Settings",
};

const LayoutStyle2 = () => {
  const { user, logout, updateProfile } = useAuth();
  const { language } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dropdown states for top navbar
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const currencyRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || "MoneyFlow";
    document.title = `${title} MoneyFlow`;
  }, [location.pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyRef.current && !currencyRef.current.contains(event.target)) {
        setCurrencyDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCurrencySelect = async (currency) => {
    try {
      await updateProfile({ currency });
    } catch (_) {}
    setCurrencyDropdownOpen(false);
  };

  const label = (item) => t(item.key);

  const currencies = [
    { code: "USD", symbol: "$", label: "USD ($)" },
    { code: "KHR", symbol: "៛", label: "KHR (៛)" },
    { code: "THB", symbol: "฿", label: "THB (฿)" },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100/70 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 flex flex-col transform transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                MoneyFlow
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Finance OS
              </p>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? "bg-teal-700 text-white font-semibold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      }`
                    }
                  >
                    <item.icon size={17} className="shrink-0 opacity-80" />
                    <span className="truncate">{label(item)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={
                    user.avatar?.startsWith("/")
                      ? `http://localhost:5000${user.avatar}`
                      : user.avatar
                  }
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover shrink-0 ring-2 ring-teal-700/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              title={t("logout")}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Updated Navbar with Dropdowns */}
        <header className="h-16 px-6 flex items-center justify-between sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="hidden sm:block text-sm font-bold text-slate-800 dark:text-slate-100">
              {(() => {
                const allItems = NAV_GROUPS.flatMap((g) => g.items);
                const item = allItems.find((n) => n.to === location.pathname);
                return item ? t(item.key) : "MoneyFlow";
              })()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Currency Dropdown Menu */}
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-600"
              >
                <Globe
                  size={14}
                  className="text-slate-500 dark:text-slate-400"
                />
                <span>{user?.currency || "USD"}</span>
                <ChevronDown size={14} className="opacity-60" />
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Currency
                  </div>
                  {currencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleCurrencySelect(c.code)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/60 transition ${
                        (user?.currency || "USD") === c.code
                          ? "font-semibold text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/20"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>{c.label}</span>
                      {user?.currency === c.code && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* Profile & Controls Dropdown Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {user?.avatar ? (
                  <img
                    src={
                      user.avatar?.startsWith("/")
                        ? `http://localhost:5000${user.avatar}`
                        : user.avatar
                    }
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center text-xs font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <ChevronDown
                  size={14}
                  className="text-slate-500 dark:text-slate-400"
                />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate("/settings");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                    >
                      <User size={15} className="text-slate-400" />
                      <span>{t("settings") || "Profile & Settings"}</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <LogOut size={15} />
                      <span>{t("logout")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 overflow-auto">
          <PageNav />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LayoutStyle2;
