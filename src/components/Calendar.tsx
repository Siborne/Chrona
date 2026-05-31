import { useState } from "react";

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Calendar({
  selected,
  onSelect,
  dataDates,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  dataDates?: Set<string>;
}) {
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const today = new Date();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const DAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={prevMonth} aria-label="上个月">‹</button>
        <span style={{ fontWeight: 600 }}>{viewYear}年 {MONTHS[viewMonth]}</span>
        <button className="btn btn-sm" onClick={nextMonth} aria-label="下个月">›</button>
      </div>
      <div className="calendar-grid" style={{ marginBottom: 4 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      <div className="calendar-grid" role="grid">
        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} role="gridcell" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(viewYear, viewMonth, day);
          const dateStr = formatDate(date);
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selected.toDateString();
          const hasData = dataDates?.has(dateStr) ?? false;
          return (
            <div
              key={day}
              className={`calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${hasData ? "has-data" : ""}`}
              onClick={() => onSelect(date)}
              role="gridcell"
              aria-label={`${viewYear}-${viewMonth + 1}-${day}`}
              style={{ position: "relative" }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
