import { useMemo, useState } from "react";
import { CalendarDays, History, Plus, Sun, Sunset, Trash2, UserPlus } from "lucide-react";
import { Badge, Btn, Card, EmptyState, Field, Input } from "../components/shared";
import DateField from "../components/DateField";
import { TimesheetRow, toFa, todayJalali, todayStr, uid, useDB } from "../data";

type Props = { notify: (m: string, tone?: "ok" | "err") => void };

export default function Timesheet({ notify }: Props) {
  const { db, update } = useDB();
  const t = todayJalali();
  const [date, setDate] = useState(todayStr());
  const [drivers, setDrivers] = useState<string[]>([]);
  const [newDriver, setNewDriver] = useState("");

  const allDrivers = useMemo(() => {
    const set = new Set<string>();
    db.vehicles.forEach((v) => v.driver && set.add(v.driver));
    db.timesheets.forEach((r) => set.add(r.driver));
    drivers.forEach((d) => set.add(d));
    return [...set];
  }, [db.vehicles, db.timesheets, drivers]);

  const rowsForDate = allDrivers
    .map((name) => ({ name, row: db.timesheets.find((r) => r.driver === name && r.date === date) }))
    .filter((x) => x.row || drivers.includes(x.name));

  const toggle = (name: string, part: "morning" | "evening") => {
    const existing = db.timesheets.find((r) => r.driver === name && r.date === date);
    const next: TimesheetRow = {
      id: existing?.id ?? uid(),
      driver: name,
      date,
      year: t.y,
      month: t.m,
      day: t.d,
      morning: existing?.morning ?? false,
      evening: existing?.evening ?? false,
      [part]: !(existing?.[part] ?? false),
    };
    update((d) => ({
      ...d,
      timesheets: existing ? d.timesheets.map((r) => (r.id === existing.id ? next : r)) : [next, ...d.timesheets],
    }));
  };

  const addDriver = () => {
    const n = newDriver.trim();
    if (!n) return;
    if (allDrivers.includes(n)) return notify("این راننده قبلاً ثبت شده است", "err");
    setDrivers((p) => [...p, n]);
    setNewDriver("");
  };

  const history = [...db.timesheets].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">تایم‌شیت رانندگان</h1>
        <p className="text-xs text-slate-500">ثبت حضور و غیاب راننده‌ها در دو نوبت صبح و عصر</p>
      </div>

      <Card
        title="ثبت حضور — دو نوبت (صبح / عصر)"
        icon={<CalendarDays className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">تاریخ:</span>
            <DateField value={date} onChange={setDate} size="md" />
          </div>
        }
      >
        <div className="space-y-2">
          {rowsForDate.length === 0 && (
            <EmptyState
              icon={<UserPlus className="h-7 w-7" />}
              title="هنوز راننده‌ای نیست"
              sub="راننده‌ها از بانک خودروها خوانده می‌شوند؛ یا نام جدید در زیر اضافه کنید."
            />
          )}
          {rowsForDate.map(({ name }) => {
            const row = rowsForDate.find((x) => x.name === name)?.row;
            return (
              <div
                key={name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <p className="text-sm font-extrabold text-slate-700">{name}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(name, "morning")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      row?.morning
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    {row?.morning ? "حاضر — صبح" : "غیرحاضر — صبح"}
                  </button>
                  <button
                    onClick={() => toggle(name, "evening")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      row?.evening
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <Sunset className="h-4 w-4" />
                    {row?.evening ? "حاضر — عصر" : "غیرحاضر — عصر"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <Field label="افزودن راننده جدید" className="min-w-[220px] flex-1">
            <Input placeholder="نام و نام خانوادگی" value={newDriver} onChange={(e) => setNewDriver(e.target.value)} />
          </Field>
          <Btn variant="secondary" onClick={addDriver}>
            <Plus className="h-4 w-4" /> افزودن
          </Btn>
        </div>
      </Card>

      <Card title="سوابق تایم‌شیت" icon={<History className="h-5 w-5" />}>
        {history.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="سابقه‌ای ثبت نشده است" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <th className="px-3 py-2.5 font-bold">تاریخ</th>
                  <th className="px-3 py-2.5 font-bold">راننده</th>
                  <th className="px-3 py-2.5 font-bold">نوبت صبح</th>
                  <th className="px-3 py-2.5 font-bold">نوبت عصر</th>
                  <th className="px-3 py-2.5 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-600" dir="ltr">{r.date}</td>
                    <td className="px-3 py-2.5 text-xs font-extrabold text-slate-700">{r.driver}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.morning ? "green" : "slate"}>{r.morning ? "حاضر" : "غیاب"}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.evening ? "green" : "slate"}>{r.evening ? "حاضر" : "غیاب"}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() =>
                          update((d) => ({ ...d, timesheets: d.timesheets.filter((x) => x.id !== r.id) }))
                        }
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-400">نمایش {toFa(history.length)} مورد اخیر</p>
      </Card>
    </div>
  );
}
