import { cn } from "../utils/cn";
import { JALALI_MONTHS, jalaliToStr, parseJalali, toFa } from "../data";

type Props = {
  value?: string; // ۱۴۵/۱۲/۲۹
  onChange: (s: string) => void;
  years?: [number, number];
  size?: "md" | "lg";
  placeholder?: string;
};

/** ورودی تاریخ شمسی — سه کشوی سال/ماه/روز به ترتیب ۱۴۵/۱۲/۲۹ */
export default function DateField({ value, onChange, years = [1380, 1425], size = "lg" }: Props) {
  const p = parseJalali(value) ?? { y: 0, m: 0, d: 0 };
  const set = (patch: Partial<{ y: number; m: number; d: number }>) => {
    onChange(jalaliToStr(patch.y ?? p.y, patch.m ?? p.m, patch.d ?? p.d));
  };
  const sel = cn(
    "rounded-lg border border-slate-300 bg-white text-center text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
    size === "lg" ? "h-11" : "h-9"
  );
  const yearsRange: number[] = [];
  for (let y = years[1]; y >= years[0]; y--) yearsRange.push(y);

  return (
    <div dir="ltr" className="inline-flex items-center gap-1">
      <select value={p.y || ""} onChange={(e) => set({ y: Number(e.target.value) })} className={cn(sel, "w-[4.6rem]")} title="سال">
        <option value="" disabled>
          {toFa("سال")}
        </option>
        {yearsRange.map((y) => (
          <option key={y} value={y}>
            {toFa(y)}
          </option>
        ))}
      </select>
      <span className="text-slate-400">/</span>
      <select
        value={p.m || ""}
        onChange={(e) => set({ m: Number(e.target.value) })}
        className={cn(sel, "w-[3.4rem]")}
        title="ماه"
      >
        <option value="" disabled>
          {toFa("ماه")}
        </option>
        {JALALI_MONTHS.map((m, i) => (
          <option key={m} value={i + 1} title={m}>
            {toFa(i + 1)}
          </option>
        ))}
      </select>
      <span className="text-slate-400">/</span>
      <select
        value={p.d || ""}
        onChange={(e) => set({ d: Number(e.target.value) })}
        className={cn(sel, "w-[3.4rem]")}
        title={p.m ? `${JALALI_MONTHS[p.m - 1]} — روز` : "روز"}
      >
        <option value="" disabled>
          {toFa("روز")}
        </option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {toFa(d)}
          </option>
        ))}
      </select>
    </div>
  );
}
