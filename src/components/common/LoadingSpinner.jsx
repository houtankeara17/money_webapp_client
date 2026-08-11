export default function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-2xl bg-teal-700/20 animate-bounce" style={{ animationDuration: "1.2s" }} />
        <div
          className="absolute inset-1 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 shadow-lg shadow-teal-700/40 flex items-center justify-center text-white font-bold text-sm animate-bounce"
          style={{ animationDuration: "1.2s", animationDelay: "0.1s" }}
        >
          MF
        </div>
      </div>
      {label && (
        <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">{label}</p>
      )}
    </div>
  );
}
