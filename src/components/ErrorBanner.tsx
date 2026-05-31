import { AlertCircle } from "lucide-react";

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card" role="alert" style={{ backgroundColor: "var(--danger)", color: "white", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <AlertCircle size={20} />
      <span style={{ flex: 1, fontSize: 14 }}>{message}</span>
      {onRetry && (
        <button className="btn btn-sm" style={{ borderColor: "white", color: "white" }} onClick={onRetry} aria-label="重试">重试</button>
      )}
    </div>
  );
}
