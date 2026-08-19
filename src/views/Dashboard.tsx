import { useMemo } from "react";
import { AlertTriangle, CarFront, ClipboardCheck, Gauge, History, Plus, ShieldAlert } from "lucide-react";
import { Badge, Btn, Card, EmptyState, StatCard } from "../components/shared";
import { PlateBadge } from "../components/PlateInput";
import { User, expiryState, toFa, todayJalali, useDB } from "../data";

type Props = {
  user: User;
  onNav: (r: "vehicles" | "vehicle-form" | "checklists" | "timesheet" | "reports") => void;
};

export default function Dashboard({ user, onNav }: Props) {
  const { db } = useDB();
  const t = todayJalali();
  const canVehicles = user.isAdmin || user.perms.vehicles;

  const monthEntries = db.entries.filter((e) => e.year === t.y && e.month === t.m);
  const avg = monthEntries.length
    ? Math.round(monthEntries.reduce((s, e) => s + e.percent, 0) / monthEntries.length)
    : null;

  const badRecent = useMemo(
    () =>
      db.entries.slice(0, 10).flatMap((e) =>
        e.results.filter((r) => r.status === "bad").map((r) => ({ date: e.date, plate: e.plate, label: r.label, note: r.note }))
      ),
    [db.entries]
  );

  const expiries = useMemo(
    () =>
      db.vehicles
        .flatMap((v) => [
          { v, kind: "بیمه", date: v.insuranceExp, st: expiryState(v.insuranceExp) },
          { v, kind: "معاینه فنی", date: v.technicalExp, st: expiryState(v.technicalExp) },
          { v, kind: "کارت ایمنی", date: v.safetyCardExp, st: expiryState(v.safetyCardExp) },
        ])
        .filter((x) => x.st === "expired" || x.st === "soon")
        .slice(0, 8),
    [db.vehicles]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">سلام، {user.name} 👋</h1>
          <p className="text-xs text-slate-500">نمای کلی وضعیت ایمنی و بازرسی — امروز {toFa(`${t.y}/${String(t.m).padStart(2, "0")}/${String(t.d).padStart(2, "0")}`)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canVehicles && (
            <Btn onClick={() => onNav("vehicle-form")}>
              <Plus className="h-4 w-4" /> ثبت خودرو جدید
            </Btn>
          )}
          {(user.isAdmin || user.perms.checklists) && (
            <Btn variant="secondary" onClick={() => onNav("checklists")}>
              <ClipboardCheck className="h-4 w-4" /> بازرسی جدید
            </Btn>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<CarFront className="h-5.5 w-5.5" />} label="خودروهای ثبت‌شده" value={toFa(db.vehicles.length)} tone="blue" />
        <StatCard icon={<ClipboardCheck className="h-5.5 w-5.5" />} label="بازرسی این ماه" value={toFa(monthEntries.length)} tone="brand" />
        <StatCard icon={<Gauge className="h-5.5 w-5.5" />} label="میانگین انطباق (این ماه)" value={avg === null ? "—" : `${toFa(avg)}٪`} tone="green" />
        <StatCard icon={<ShieldAlert className="h-5.5 w-5.5" />} label="مغایرت‌های ۱۰ بازرسی اخیر" value={toFa(badRecent.length)} tone="slate" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* انقضای پرونده‌ها */}
        <Card title="هشدار انقضا (بیمه / معاینه / کارت ایمنی)" icon={<AlertTriangle className="h-5 w-5" />}>
          {expiries.length === 0 ? (
            <EmptyState icon={<ShieldAlert className="h-7 w-7" />} title="همهٔ پرونده‌ها معتبر است" />
          ) : (
            <ul className="space-y-2">
              {expiries.map((x, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-extrabold text-slate-700">
                      {x.v.brand} {x.v.model}
                    </div>
                    <PlateBadge plate={x.v.plate} size="sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {x.kind}: <span dir="ltr">{x.date}</span>
                    </span>
                    <Badge tone={x.st === "expired" ? "red" : "amber"}>{x.st === "expired" ? "منقضی" : "نزدیک انقضا"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* آخرین بازرسی‌ها */}
        <Card title="آخرین بازرسی‌ها" icon={<History className="h-5 w-5" />}>
          {db.entries.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-7 w-7" />}
              title="هنوز بازرسی‌ای ثبت نشده"
              sub="اولین بازرسی را از بخش چک لیست‌ها شروع کنید."
            />
          ) : (
            <ul className="space-y-2">
              {db.entries.slice(0, 5).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] font-bold text-slate-400">{e.code}</span>
                    <PlateBadge plate={e.plate} size="sm" />
                    <span className="text-[11px] text-slate-500">{e.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">{e.inspector}</span>
                    <Badge tone={e.percent >= 85 ? "green" : e.percent >= 60 ? "amber" : "red"}>{toFa(e.percent)}٪</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* آخرین مغایرت‌ها */}
      {badRecent.length > 0 && (
        <Card title="آخرین مغایرت‌های مشاهده‌شده" icon={<ShieldAlert className="h-5 w-5" />}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {badRecent.slice(0, 6).map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/50 px-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-slate-700">{b.label}</p>
                  <p className="text-[11px] text-slate-500" dir="ltr">
                    {b.date} • {b.plate.d1}{b.plate.letter}{b.plate.d2}-{b.plate.d3}
                  </p>
                  {b.note && <p className="mt-1 truncate text-[11px] text-red-600">{b.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
