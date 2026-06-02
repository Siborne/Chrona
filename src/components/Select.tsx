import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  dotColor?: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function Select({ options, value, onChange, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
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

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder ?? "";
  const displayDot = selected?.dotColor;

  const dropdown = (
    <div
      ref={panelRef}
      className="select-dropdown"
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--hairline)",
        background: "var(--surface-1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
        overflow: "hidden",
        maxHeight: 240,
        overflowY: "auto",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="select-option"
          onClick={() => {
            onChange(opt.value);
            setOpen(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 12px",
            border: "none",
            background: opt.value === value ? "var(--accent-dim)" : "transparent",
            color: opt.value === value ? "var(--accent)" : "var(--text-primary)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            transition: "background 120ms ease",
          }}
          onMouseEnter={(e) => {
            if (opt.value !== value) {
              e.currentTarget.style.background = "var(--surface-highlight)";
            }
          }}
          onMouseLeave={(e) => {
            if (opt.value !== value) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          {opt.dotColor && (
            <span className="color-dot" style={{ backgroundColor: opt.dotColor, color: opt.dotColor, flexShrink: 0 }} />
          )}
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        className={`input select-trigger ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          paddingRight: 34,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {displayDot && (
            <span className="color-dot" style={{ backgroundColor: displayDot, color: displayDot }} />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: "transform 200ms ease",
            flexShrink: 0,
            color: "var(--text-muted)",
          }}
        />
      </button>
      {open && createPortal(dropdown, document.body)}
    </div>
  );
}
