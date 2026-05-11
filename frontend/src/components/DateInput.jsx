import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

/**
 * Date input that displays DD/MM/AAAA and accepts keyboard entry with auto-masking.
 * value / onChange use YYYY-MM-DD strings (same contract as <input type="date">).
 */
export default function DateInput({ value, onChange, min, max, placeholder = "DD/MM/AAAA", className = "" }) {
  const nativeRef = useRef(null);

  function toDisplay(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  }

  function toIso(display) {
    const digits = display.replace(/\D/g, "");
    if (digits.length !== 8) return null;
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    const date = new Date(`${y}-${m}-${d}`);
    if (isNaN(date)) return null;
    return `${y}-${m}-${d}`;
  }

  const [display, setDisplay] = useState(() => toDisplay(value));

  // Sync if parent changes value externally
  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  function handleText(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    // Build masked string DD/MM/AAAA
    let masked = raw;
    if (raw.length > 4) masked = raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4);
    else if (raw.length > 2) masked = raw.slice(0, 2) + "/" + raw.slice(2);
    setDisplay(masked);

    const iso = toIso(masked);
    if (iso) {
      // Validate against min/max
      if (min && iso < min) return;
      if (max && iso > max) return;
      onChange(iso);
    } else if (raw.length === 0) {
      onChange("");
    }
  }

  function handleNative(e) {
    const iso = e.target.value;
    onChange(iso);
    setDisplay(toDisplay(iso));
  }

  function openNative() {
    nativeRef.current?.showPicker?.();
    nativeRef.current?.click();
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        value={display}
        onChange={handleText}
        placeholder={placeholder}
        maxLength={10}
        className="field-input pr-9 w-full"
        inputMode="numeric"
      />
      {/* hidden native picker — opened on calendar icon click */}
      <input
        ref={nativeRef}
        type="date"
        value={value || ""}
        min={min}
        max={max}
        onChange={handleNative}
        tabIndex={-1}
        className="sr-only"
      />
      <button
        type="button"
        onClick={openNative}
        className="absolute right-2.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
        tabIndex={-1}
      >
        <Calendar size={14} />
      </button>
    </div>
  );
}
