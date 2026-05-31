import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ message = "加载中..." }: { message?: string }) {
  return (
    <div className="empty-state" role="status" aria-label="加载中">
      <Loader2 style={{ animation: "spin 1s linear infinite" }} size={48} />
      <p>{message}</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
