import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

const PRESET_COLORS = [
  "#6366F1", "#818CF8", "#F43F5E", "#10B981", "#06B6D4",
  "#D97706", "#8B5CF6", "#EF4444", "#F59E0B", "#EC4899",
  "#14B8A6", "#3B82F6", "#F97316", "#22D3EE", "#A855F7",
  "#64748B", "#84CC16", "#E11D48",
];

interface Props {
  value: string;
  onChange: (color: string) => void;
  size?: number;
}

export default function ColorPicker({ value, onChange, size = 28 }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);
    }
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger = ref.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inTrigger && !inPanel) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const panel = (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        padding: 10,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--hairline)",
        background: "var(--surface-1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 6,
      }}
    >
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => { onChange(c); setOpen(false); }}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: c,
            border: value === c ? "2px solid var(--text-primary)" : "2px solid transparent",
            boxShadow: value === c ? `0 0 0 2px ${c}40` : "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 150ms ease",
          }}
          aria-label={`颜色 ${c}`}
        >
          {value === c && <Check size={12} color="white" strokeWidth={3} />}
        </button>
      ))}
      <label
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "2px dashed var(--hairline)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
        }}
        title="自定义颜色"
      >
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: "linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)",
        }} />
        <input
          type="color"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(false); }}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
        />
      </label>
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: size,
          height: size,
          borderRadius: "var(--radius-sm)",
          backgroundColor: value,
          border: `2px solid ${value}`,
          boxShadow: `0 0 0 2px var(--surface-1), 0 0 0 3px var(--hairline)`,
          cursor: "pointer",
          padding: 0,
          transition: "transform 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        aria-label="选择颜色"
      />
      {open && createPortal(panel, document.body)}
    </div>
  );
}
