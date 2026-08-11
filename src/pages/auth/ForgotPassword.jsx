import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import Logo from "../../components/common/Logo";

const ForgotPassword = () => {
  useEffect(() => {
    document.title = "Forgot Password — MoneyFlow";
  }, []);

  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 email, 2 code+new password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");

  const requestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      toast.success(data.message || "If that email exists, a code was sent");
      if (data.data?.resetCode) {
        setDevCode(data.data.resetCode);
        setCode(data.data.resetCode);
      }
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const resetWithCode = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.put("/auth/reset-password", {
        code: code.trim(),
        password,
      });
      toast.success(data.message || "Password updated — you can sign in");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-600";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex justify-center mb-4">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-bold text-center mb-1">
          {step === 1 ? "Forgot Password" : "Enter reset code"}
        </h1>
        <p className="text-center text-slate-500 text-sm mb-6">
          {step === 1
            ? "We'll send a 6-digit code to your email (local accounts only)"
            : "Enter the code and your new password"}
        </p>

        {step === 1 ? (
          <form onSubmit={requestCode} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetWithCode} className="space-y-4">
            {devCode && (
              <div className="text-xs p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                Dev mode — code: <strong className="tracking-widest">{devCode}</strong>
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-500 mb-1">6-digit code</label>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${input} tracking-widest text-center text-lg`}
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">New password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} minLength={6} />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Confirm password</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} minLength={6} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Updating..." : "Reset password"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-slate-500 hover:underline">
              Back
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="text-teal-700 dark:text-teal-400 hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
