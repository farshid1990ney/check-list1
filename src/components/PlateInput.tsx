import { cn } from "../utils/cn";
import { PLATE_LETTERS, Plate, fromFa, toFa } from "../data";

/**
 * ورودی شماره پلاک — دقیقاً به ترتیب واقعی پلاک ایرانی:
 *  [۲ رقم]  [حرف الفبا — کشویی]  [۳ رقم]  ایران  [۲ رقم]
 * جهت از چپ به راست است تا ترتیب جابه‌جا نشود.
 */

function digitsOnly(s: string, max: number) {
  return fromFa(s).replace(/\D/g, "").slice(0, max);
}

type Props = {
  value: Plate;
  onChange: (p: Plate) => void;
  readOnly?: boolean;
  hint?: boolean;
  size?: "md" | "lg";
};

export default function PlateInput({ value, onChange, readOnly, hint, size = "lg" }: Props) {
  const h = size === "lg" ? "h-12" : "h-10";
  const seg = cn(
    "rounded-lg border-2 border-slate-300 bg-white text-center font-bold tracking-widest text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100",
    h,
    size === "lg" ? "text-lg" : "text-base"
  );

  return (
    <div>
      <div dir="ltr" className="flex items-center gap-1.5">
        <input
          dir="ltr"
          inputMode="numeric"
          maxLength={2}
          placeholder={toFa("12")}
          value={value.d1}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, d1: digitsOnly(e.target.value, 2) })}
          className={cn(seg, "w-16")}
        />
        <select
          value={value.letter}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, letter: e.target.value })}
          className={cn(seg, "w-16 cursor-pointer font-bold")}
          title="حرف الفبای پلاک"
        >
          <option value="">—</option>
          {PLATE_LETTERS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <input
          dir="ltr"
          inputMode="numeric"
          maxLength={3}
          placeholder={toFa("345")}
          value={value.d2}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, d2: digitsOnly(e.target.value, 3) })}
          className={cn(seg, "w-20")}
        />
        <span
          className={cn(
            "flex items-center justify-center rounded-lg bg-blue-800 px-2.5 font-extrabold text-white",
            h,
            "text-sm leading-none"
          )}
        >
          ایران
        </span>
        <input
          dir="ltr"
          inputMode="numeric"
          maxLength={2}
          placeholder={toFa("78")}
          value={value.d3}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, d3: digitsOnly(e.target.value, 2) })}
          className={cn(seg, "w-16")}
        />
      </div>
      {hint && (
        <p className="mt-1.5 text-xs text-slate-500" dir="rtl">
          نمونه: {toFa("12")} ب {toFa("345")} ایران {toFa("78")} — ابتدا ۲ رقم، سپس حرف، ۳ رقم و در انتها ۲ رقم
        </p>
      )}
    </div>
  );
}

/** نمایش پلاک به شکل برچسب (برای لیست‌ها و خروجی‌ها) */
export function PlateBadge({ plate, size = "md" }: { plate: Plate; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "px-3 py-1.5 text-lg gap-2"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[11px] gap-1"
        : "px-2 py-1 text-sm gap-1.5";
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-flex items-center rounded-md border-2 border-slate-800 bg-white font-bold leading-none text-slate-900 shadow-sm",
        cls
      )}
    >
      <span className="tracking-wider">{toFa(plate.d1)}</span>
      <span className="rounded-sm bg-blue-800 px-1 text-white">{plate.letter}</span>
      <span className="tracking-wider">{toFa(plate.d2)}</span>
      <span className="font-extrabold text-blue-800">ایران</span>
      <span className="tracking-wider">{toFa(plate.d3)}</span>
    </span>
  );
}
