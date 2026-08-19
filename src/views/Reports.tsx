import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, BarChart3, CarFront, FileText, Printer, Search, Trash2 } from "lucide-react";
import { Badge, Btn, Card, EmptyState, Select } from "../components/shared";
import { PlateBadge } from "../components/PlateInput";
import {
  AggregateRow,
  ArchivedReport,
  ChecklistTemplate,
  JALALI_MONTHS,
  PrintDoc,
  toFa,
  useDB,
} from "../data";

type Props = {
  onPrint: (doc: PrintDoc) => void;
  notify: (m: string, tone?: "ok" | "err") => void;
};

export default function Reports({ onPrint, notify }: Props) {
  const [tab, setTab] = useState<"aggregate" | "single" | "vehicles" | "archive">("aggregate");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">گزارش‌ها و خروجی‌ها</h1>
          <p className="text-xs text-slate-500">خروجی تجمیعی، خروجی تکی بازرسی‌ها، لیست خودروها و بایگانی</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(
            [
              ["aggregate", "خروجی تجمیعی", <BarChart3 key="i" className="h-4 w-4" />],
              ["single", "خروجی تکی", <FileText key="i" className="h-4 w-4" />],
              ["vehicles", "لیست خودروها", <CarFront key="i" className="h-4 w-4" />],
              ["archive", "بایگانی گزارش‌ها", <Archive key="i" className="h-4 w-4" />],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                tab === id ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "aggregate" && <AggregateTab onPrint={onPrint} notify={notify} />}
      {tab === "single" && <SingleTab onPrint={onPrint} />}
      {tab === "vehicles" && <VehiclesTab onPrint={onPrint} />}
      {tab === "archive" && <ArchiveTab onPrint={onPrint} notify={notify} />}
    </div>
  );
}

/* ---------- بایگانی گزارش‌ها ---------- */

const ARCHIVE_KIND: Record<ArchivedReport["kind"], { label: string; tone: "blue" | "brand" | "green" | "amber" }> = {
  entry: { label: "خروجی تکی بازرسی", tone: "blue" },
  aggregate: { label: "گزارش تجمیعی", tone: "brand" },
  vehicles: { label: "لیست خودروها", tone: "green" },
  public: { label: "فرم عمومی", tone: "amber" },
  qr: { label: "کارت QR خودرو", tone: "green" },
};

function ArchiveTab({ onPrint, notify }: { onPrint: (d: PrintDoc) => void; notify: (m: string, tone?: "ok" | "err") => void }) {
  const { db, update } = useDB();
  const [q, setQ] = useState("");
  const list = (db.reportsArchive ?? []).filter((r) => {
    if (!q.trim()) return true;
    return `${r.ref} ${r.title} ${r.code} ${r.extra ?? ""} ${r.dateLabel}`.includes(q.trim());
  });

  const resolve = (rec: ArchivedReport): PrintDoc | null => {
    if (rec.kind === "entry") {
      const e = db.entries.find((x) => x.id === rec.entryId);
      return e ? { kind: "entry", entry: e } : null;
    }
    if (rec.kind === "aggregate") {
      if (!rec.snapshot) return null;
      const template: ChecklistTemplate = { id: rec.id, name: rec.templateName ?? rec.title, code: rec.code, frequency: "ماهیه", items: [] };
      return { kind: "aggregate", template, ...rec.snapshot };
    }
    if (rec.kind === "vehicles") return { kind: "vehicles", vehicles: db.vehicles };
    if (rec.kind === "qr") {
      const v = db.vehicles.find((x) => x.id === rec.vehicleId);
      return v ? { kind: "qr", vehicle: v } : null;
    }
    const s = db.publicForms.find((x) => x.id === rec.publicId);
    return s ? { kind: "public", sub: s } : null;
  };

  const recall = (rec: ArchivedReport) => {
    const doc = resolve(rec);
    if (!doc) return notify("مورد پایه این گزارش حذف شده و قابل فراخوانی نیست", "err");
    onPrint(doc);
    notify("گزارش از بایگانی فراخوانی شد");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            placeholder="جستجو در بایگانی: عنوان، کد فرم، پلاک…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Badge tone="slate">{toFa(list.length)} گزارش بایگانی‌شده</Badge>
      </div>

      <Card
        flush
        title="بایگانی خروجی‌ها"
        icon={<Archive className="h-5 w-5" />}
        actions={<p className="text-[11px] text-slate-400">هر خروجی چاپ‌شده به‌صورت خودکار اینجا بایگانی می‌شود</p>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-3 font-bold">کد مرجع</th>
                <th className="px-4 py-3 font-bold">عنوان</th>
                <th className="px-4 py-3 font-bold">نوع</th>
                <th className="px-4 py-3 font-bold">تاریخ گزارش</th>
                <th className="px-4 py-3 font-bold">تاریخ چاپ</th>
                <th className="px-4 py-3 font-bold">فراخوانی</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-xs font-extrabold text-slate-500" dir="ltr">{r.ref}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-extrabold text-slate-700">{r.title}</p>
                    {r.extra && <p className="mt-0.5 text-[11px] text-slate-400">{r.extra}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={ARCHIVE_KIND[r.kind].tone}>{ARCHIVE_KIND[r.kind].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-600" dir="ltr">{r.dateLabel}</td>
                  <td className="px-4 py-3 text-xs text-slate-500" dir="ltr">{r.printedOn}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Btn variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => recall(r)}>
                        <ArchiveRestore className="h-3.5 w-3.5" /> فراخوانی و چاپ
                      </Btn>
                      <button
                        onClick={() => {
                          update((d) => ({ ...d, reportsArchive: (d.reportsArchive ?? []).filter((x) => x.id !== r.id) }));
                          notify("رکورد از بایگانی حذف شد");
                        }}
                        className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                        title="حذف از بایگانی"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <EmptyState
              icon={<Archive className="h-7 w-7" />}
              title="بایگانی خالی است"
              sub="هر خروجی که چاپ کنید (تکی، تجمیعی، لیست خودروها، فرم عمومی) به‌صورت خودکار در اینجا ثبت و قابل فراخوانی می‌شود."
            />
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------- تجمیعی ---------- */

function AggregateTab({ onPrint, notify }: { onPrint: (d: PrintDoc) => void; notify: (m: string, tone?: "ok" | "err") => void }) {
  const { db } = useDB();
  const [tplId, setTplId] = useState(db.templates[0]?.id ?? "");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const template = db.templates.find((t) => t.id === tplId) ?? db.templates[0];

  const filtered = useMemo(
    () =>
      db.entries.filter((e) => {
        if (e.templateId !== tplId) return false;
        if (year && e.year !== Number(year)) return false;
        if (month && e.month !== Number(month)) return false;
        return true;
      }),
    [db.entries, tplId, year, month]
  );

  const years = useMemo(() => [...new Set(db.entries.map((e) => e.year))].sort().reverse(), [db.entries]);

  const { rows, total } = useMemo(() => {
    if (!template) return { rows: [] as AggregateRow[], total: { label: "", good: 0, bad: 0, na: 0, percent: 0 } as AggregateRow };
    const rows: AggregateRow[] = template.items.map((it) => {
      let good = 0,
        bad = 0,
        na = 0;
      filtered.forEach((e) => {
        const r = e.results.find((x) => x.itemId === it.id);
        if (!r) return;
        if (r.status === "good") good++;
        else if (r.status === "bad") bad++;
        else na++;
      });
      return { label: it.label, good, bad, na, percent: good + bad ? Math.round((good / (good + bad)) * 100) : 0 };
    });
    const tg = rows.reduce((s, r) => s + r.good, 0);
    const tb = rows.reduce((s, r) => s + r.bad, 0);
    const tn = rows.reduce((s, r) => s + r.na, 0);
    return { rows, total: { label: "مجموع", good: tg, bad: tb, na: tn, percent: tg + tb ? Math.round((tg / (tg + tb)) * 100) : 0 } };
  }, [template, filtered]);

  if (!template)
    return (
      <Card>
        <EmptyState icon={<BarChart3 className="h-7 w-7" />} title="قالبی برای گزارش وجود ندارد" />
      </Card>
    );

  const periodLabel = year && month ? `${JALALI_MONTHS[Number(month) - 1]} ${toFa(year)}` : year ? `سال ${toFa(year)}` : "کل زمان";

  const doPrint = () => {
    if (!filtered.length) return notify("موردی برای گزارش تجمیعی پیدا نشد", "err");
    onPrint({ kind: "aggregate", template, rows, total, periodLabel, count: filtered.length });
  };

  return (
    <div className="space-y-4">
      <Card
        title={`تجمیعی — ${template.code}`}
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select className="w-56" value={tplId} onChange={(e) => setTplId(e.target.value)}>
              {db.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select className="w-28" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">همه سال‌ها</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {toFa(y)}
                </option>
              ))}
            </Select>
            <Select className="w-32" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">همه ماه‌ها</option>
              {JALALI_MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
            <Btn onClick={doPrint}>
              <Printer className="h-4 w-4" /> خروجی تجمیعی
            </Btn>
          </div>
        }
      >
        <p className="mb-3 text-xs font-bold text-slate-500">
          {toFa(filtered.length)} بازرسی در بازهٔ «{periodLabel}»
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-3 py-2.5 font-bold">ردیف</th>
                <th className="px-3 py-2.5 font-bold">شرح قلم</th>
                <th className="px-3 py-2.5 font-bold">مطلوب</th>
                <th className="px-3 py-2.5 font-bold">نامطلوب</th>
                <th className="px-3 py-2.5 font-bold">N/A</th>
                <th className="w-48 px-3 py-2.5 font-bold">درصد انطباق</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-3 py-2 text-xs font-bold text-slate-400">{toFa(i + 1)}</td>
                  <td className="px-3 py-2 text-xs font-bold text-slate-700">{r.label}</td>
                  <td className="px-3 py-2 text-center text-xs font-extrabold text-emerald-600">{toFa(r.good)}</td>
                  <td className="px-3 py-2 text-center text-xs font-extrabold text-red-500">{toFa(r.bad)}</td>
                  <td className="px-3 py-2 text-center text-xs text-slate-400">{toFa(r.na)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${r.percent >= 85 ? "bg-emerald-500" : r.percent >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${r.percent}%` }}
                        />
                      </div>
                      <span className="w-10 text-left text-[11px] font-extrabold text-slate-600">{toFa(r.percent)}٪</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-xs font-extrabold text-slate-800">{total.label}</td>
                <td className="px-3 py-2.5 text-center text-xs font-extrabold text-emerald-600">{toFa(total.good)}</td>
                <td className="px-3 py-2.5 text-center text-xs font-extrabold text-red-500">{toFa(total.bad)}</td>
                <td className="px-3 py-2.5 text-center text-xs font-extrabold text-slate-500">{toFa(total.na)}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={total.percent >= 85 ? "green" : total.percent >= 60 ? "amber" : "red"}>{toFa(total.percent)}٪</Badge>
                </td>
              </tr>
            </tbody>
          </table>
          {!filtered.length && (
            <EmptyState icon={<BarChart3 className="h-7 w-7" />} title="موردی در این بازه یافت نشد" sub="پس از ثبت بازرسی‌ها، گزارش تجمیعی اینجا ساخته می‌شود." />
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------- تکی ---------- */

function SingleTab({ onPrint }: { onPrint: (d: PrintDoc) => void }) {
  const { db } = useDB();
  const [tpl, setTpl] = useState("all");
  const [insp, setInsp] = useState("all");
  const [q, setQ] = useState("");
  const inspectors = useMemo(() => [...new Set(db.entries.map((e) => e.inspector))], [db.entries]);
  const list = db.entries.filter((e) => {
    if (tpl !== "all" && e.templateId !== tpl) return false;
    if (insp !== "all" && e.inspector !== insp) return false;
    if (q.trim()) {
      const hay = `${e.inspector} ${e.driver} ${e.plate.d1}${e.plate.letter}${e.plate.d2}${e.plate.d3} ${e.date}`;
      if (!hay.includes(q.trim())) return false;
    }
    return true;
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Select className="w-64" value={tpl} onChange={(e) => setTpl(e.target.value)}>
          <option value="all">همهٔ قالب‌ها</option>
          {db.templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.name}
            </option>
          ))}
        </Select>
        <Select className="w-48" value={insp} onChange={(e) => setInsp(e.target.value)}>
          <option value="all">همهٔ بازرسین</option>
          {inspectors.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </Select>
        <div className="relative min-w-[200px] flex-1">
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            placeholder="جستجو: پلاک، راننده، تاریخ…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-3 font-bold">تاریخ</th>
                <th className="px-4 py-3 font-bold">کد فرم</th>
                <th className="px-4 py-3 font-bold">پلاک</th>
                <th className="px-4 py-3 font-bold">نوع / مالکیت</th>
                <th className="px-4 py-3 font-bold">بازرس</th>
                <th className="px-4 py-3 font-bold">انطباق</th>
                <th className="px-4 py-3 font-bold">خروجی</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-xs font-bold" dir="ltr">{e.date}</td>
                  <td className="px-4 py-3">
                    <Badge tone="slate" className="font-mono">{e.code}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PlateBadge plate={e.plate} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {e.vehicleType} <span className="text-slate-300">|</span> {e.ownership}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold">{e.inspector}</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.percent >= 85 ? "green" : e.percent >= 60 ? "amber" : "red"}>{toFa(e.percent)}٪</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Btn variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => onPrint({ kind: "entry", entry: e })}>
                      <Printer className="h-3.5 w-3.5" /> چاپ
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <EmptyState icon={<FileText className="h-7 w-7" />} title="بازرسی‌ای یافت نشد" />}
        </div>
      </Card>
    </div>
  );
}

/* ---------- لیست خودروها ---------- */

function VehiclesTab({ onPrint }: { onPrint: (d: PrintDoc) => void }) {
  const { db } = useDB();
  return (
    <Card
      title="لیست خودروهای ثبت‌شده"
      icon={<CarFront className="h-5 w-5" />}
      actions={
        <Btn onClick={() => onPrint({ kind: "vehicles", vehicles: db.vehicles })}>
          <Printer className="h-4 w-4" /> خروجی لیست
        </Btn>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-right text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
              <th className="px-3 py-2.5 font-bold">خودرو</th>
              <th className="px-3 py-2.5 font-bold">پلاک</th>
              <th className="px-3 py-2.5 font-bold">نوع</th>
              <th className="px-3 py-2.5 font-bold">مالکیت</th>
              <th className="px-3 py-2.5 font-bold">راننده</th>
              <th className="px-3 py-2.5 font-bold">بیمه</th>
              <th className="px-3 py-2.5 font-bold">معاینه</th>
              <th className="px-3 py-2.5 font-bold">کارت ایمنی</th>
            </tr>
          </thead>
          <tbody>
            {db.vehicles.map((v) => (
              <tr key={v.id} className="border-b border-slate-50">
                <td className="px-3 py-2.5 text-xs font-extrabold">{v.brand} {v.model}</td>
                <td className="px-3 py-2.5">
                  <PlateBadge plate={v.plate} size="sm" />
                </td>
                <td className="px-3 py-2.5 text-xs">{v.type}</td>
                <td className="px-3 py-2.5 text-xs">{v.ownership}</td>
                <td className="px-3 py-2.5 text-xs">{v.driver || "—"}</td>
                <td className="px-3 py-2.5 text-xs" dir="ltr">{v.insuranceExp}</td>
                <td className="px-3 py-2.5 text-xs" dir="ltr">{v.technicalExp}</td>
                <td className="px-3 py-2.5 text-xs" dir="ltr">{v.safetyCardExp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {db.vehicles.length === 0 && <EmptyState icon={<CarFront className="h-7 w-7" />} title="خودرویی ثبت نشده است" />}
      </div>
    </Card>
  );
}
