import { useMemo, useState } from "react";
import {
  Check,
  ClipboardCheck,
  ClipboardList,
  History,
  Minus,
  Pencil,
  PenLine,
  Plus,
  Printer,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { Badge, Btn, Card, EmptyState, Field, Input, Modal, Select, Textarea } from "../components/shared";
import PlateInput, { PlateBadge } from "../components/PlateInput";
import DateField from "../components/DateField";
import SignaturePad from "../components/SignaturePad";
import {
  ChecklistEntry,
  ChecklistTemplate,
  Frequency,
  ItemResult,
  ItemStatus,
  ItemType,
  Ownership,
  PrintDoc,
  User,
  VehicleType,
  DEFAULT_SIGN_FIELDS,
  computePercent,
  emptyPlate,
  parseJalali,
  plateComplete,
  plateText,
  signFieldsOf,
  todayJalali,
  todayStr,
  toFa,
  uid,
  useDB,
} from "../data";

type Props = {
  user: User;
  onPrint: (doc: PrintDoc) => void;
  notify: (m: string, tone?: "ok" | "err") => void;
};

const FREQUENCIES: Frequency[] = ["هفتگی", "ماهیه", "فصلی", "سالانه"];

export default function Checklists({ user, onPrint, notify }: Props) {
  const [tab, setTab] = useState<"new" | "history" | "templates">("new");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">چک لیست‌های بازرسی HSE</h1>
          <p className="text-xs text-slate-500">انجام بازرسی، سوابق و تعریف قالب‌ها</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(
            [
              ["new", "بازرسی جدید", <ClipboardCheck key="i" className="h-4 w-4" />],
              ["history", "سوابق بازرسی", <History key="i" className="h-4 w-4" />],
              ["templates", "تعریف چک لیست", <ClipboardList key="i" className="h-4 w-4" />],
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
      {tab === "new" && <FillForm key="fill" user={user} onPrint={onPrint} notify={notify} />}
      {tab === "history" && <HistoryTab onPrint={onPrint} notify={notify} />}
      {tab === "templates" && user.isAdmin && <TemplatesTab notify={notify} />}
      {tab === "templates" && !user.isAdmin && (
        <Card>
          <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="فقط مدیر می‌تواند قالب‌ها را تعریف کند" />
        </Card>
      )}
    </div>
  );
}

/* ================= فرم انجام بازرسی ================= */

function FillForm({
  user,
  onPrint,
  notify,
}: {
  user: User;
  onPrint: (doc: PrintDoc) => void;
  notify: (m: string, tone?: "ok" | "err") => void;
}) {
  const { db, update } = useDB();
  const t = todayJalali();
  const [templateId, setTemplateId] = useState(db.templates[0]?.id ?? "");
  const template = db.templates.find((x) => x.id === templateId) ?? db.templates[0];

  // مجوز امضا — مدیر برای هر قالب تعیین می‌کند چه کسانی بتوانند امضا کنند
  const signerIds = template?.signers ?? [];
  const authorized = signerIds.length === 0 || signerIds.includes(user.id);
  const signerNames = signerIds
    .map((id) => db.users.find((u) => u.id === id)?.name)
    .filter(Boolean)
    .join("، ");
  const [date, setDate] = useState(todayStr());
  const [inspector, setInspector] = useState(user.name);
  const [vehicleType, setVehicleType] = useState<VehicleType>("سبک");
  const [ownership, setOwnership] = useState<Ownership>("درکاو");
  const [vehicleId, setVehicleId] = useState("");
  const [plate, setPlate] = useState(emptyPlate());
  const [driver, setDriver] = useState("");
  const [results, setResults] = useState<Record<string, { status: ItemStatus | null; note: string; text: string }>>({});
  const [signature, setSignature] = useState<string | undefined>();
  const [sigOpen, setSigOpen] = useState(false);
  const [signatureTitle, setSignatureTitle] = useState("");

  const pickVehicle = (id: string) => {
    setVehicleId(id);
    const v = db.vehicles.find((x) => x.id === id);
    if (v) {
      setPlate(v.plate);
      setVehicleType(v.type);
      setOwnership(v.ownership);
      if (!driver) setDriver(v.driver);
    }
  };

  const setItem = (itemId: string, patch: Partial<{ status: ItemStatus | null; note: string; text: string }>) =>
    setResults((p) => {
      const cur = p[itemId] ?? { status: null as ItemStatus | null, note: "", text: "" };
      return { ...p, [itemId]: { ...cur, ...patch } };
    });

  const buildResults = (): ItemResult[] =>
    (template?.items ?? []).map((it) => {
      const r = results[it.id];
      const itType = it.type ?? "tristate";
      let status: ItemStatus = "na";
      if (itType === "check") status = r?.status === "good" ? "good" : "bad";
      else if (itType !== "text") status = (r?.status ?? "na") as ItemStatus;
      return {
        itemId: it.id,
        label: it.label,
        type: itType,
        status,
        note: r?.note?.trim() || undefined,
        text: r?.text?.trim() || undefined,
      };
    });

  const finalResults = buildResults();
  const percent = computePercent(finalResults);
  const scored = finalResults.filter((r) => r.status !== "na").length;

  const save = (printAfter: boolean) => {
    if (!template) return notify("قالب چک لیست انتخاب نشده است", "err");
    if (!authorized) return notify("شما مجاز به تکمیل و امضای این چک لیست نیستید", "err");
    if (!inspector.trim()) return notify("نام بازرس را وارد کنید", "err");
    if (!plateComplete(plate)) return notify("شماره پلاک کامل نیست — ۲ رقم + حرف + ۳ رقم + ۲ رقم", "err");
    const p = parseJalali(date) ?? t;
    const finalResults = buildResults();
    const signFields = signFieldsOf(template);
    const currentTitle = signFields.includes(signatureTitle)
      ? signatureTitle
      : (signFields.find((f) => f.includes("راننده")) ?? signFields[0]);
    const entry: ChecklistEntry = {
      id: uid(),
      templateId: template.id,
      templateName: template.name,
      code: template.code,
      frequency: template.frequency,
      inspector: inspector.trim(),
      date,
      year: p.y,
      month: p.m,
      day: p.d,
      vehicleType,
      ownership,
      plate,
      driver: driver.trim(),
      vehicleId: vehicleId || undefined,
      results: finalResults,
      signature,
      signatureTitle: currentTitle,
      signFields,
      percent: computePercent(finalResults),
      createdAt: Date.now(),
    };
    update((d) => ({ ...d, entries: [entry, ...d.entries] }));
    notify("بازرسی ذخیره شد" + (entry.percent ? ` — درصد انطباق ${toFa(entry.percent)}٪` : ""));
    if (printAfter) onPrint({ kind: "entry", entry });
  };

  if (!template)
    return (
      <Card>
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="هیچ قالب چک لیستی تعریف نشده است" />
      </Card>
    );

  const signFields = signFieldsOf(template);
  const currentTitle = signFields.includes(signatureTitle)
    ? signatureTitle
    : (signFields.find((f) => f.includes("راننده")) ?? signFields[0]);

  return (
    <div className="space-y-4">
      {/* اطلاعات کلی */}
      <Card title="مشخصات بازرسی" icon={<ClipboardCheck className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="قالب چک لیست">
            <Select value={template.id} onChange={(e) => { setTemplateId(e.target.value); setResults({}); }}>
              {db.templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.code} — {tpl.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] font-semibold text-brand-600">بازهٔ بازرسی: {template.frequency}</p>
          </Field>
          <Field label="نام بازرس">
            <Input value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="نام و نام خانوادگی بازرس" />
          </Field>
          <Field label="تاریخ بازرسی" hint="به‌صورت خودکار از تاریخ دستگاه">
            <DateField value={date} onChange={setDate} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع خودرو">
              <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
                <option>سبک</option>
                <option>مینی‌بوس</option>
                <option>اتوبوس</option>
              </Select>
            </Field>
            <Field label="مالکیت">
              <Select value={ownership} onChange={(e) => setOwnership(e.target.value as Ownership)}>
                <option>درکاو</option>
                <option>پیمانکار آیاب و ذهاب</option>
              </Select>
            </Field>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field label="انتخاب خودرو از بانک اطلاعاتی">
            <Select value={vehicleId} onChange={(e) => pickVehicle(e.target.value)}>
              <option value="">— بدون انتخاب (ورود دستی پلاک) —</option>
              {db.vehicles
                .filter((v) => v.active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} — {plateText(v.plate)}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="شماره پلاک خودرو" required>
            <PlateInput value={plate} onChange={(p) => { setPlate(p); setVehicleId(""); }} hint />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="نام راننده">
            <Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="نام و نام خانوادگی راننده را وارد کنید" />
          </Field>
        </div>
      </Card>

      {/* هشدار مجوز امضا */}
      {!authorized && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="text-sm">
            <p className="font-extrabold text-red-700">شما مجاز به تکمیل و امضای این چک لیست نیستید.</p>
            {signerNames && (
              <p className="mt-0.5 text-xs font-semibold text-red-600">
                افراد مجاز به امضا: {signerNames} — برای تغییر مجوزات با مدیر هماهنگ کنید.
              </p>
            )}
          </div>
        </div>
      )}

      {/* اقلام چک لیست */}
      <Card
        title={`اقلام بازرسی — ${template.name}`}
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${percent >= 85 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <Badge tone={percent >= 85 ? "green" : percent >= 60 ? "amber" : "red"}>انطباق {toFa(percent)}٪</Badge>
          </div>
        }
      >
        <div className="space-y-2">
          {template.items.map((it, i) => {
            const r = results[it.id];
            const itType = it.type ?? "tristate";
            const st = r?.status ?? null;
            return (
              <div key={it.id} className="rounded-xl border border-slate-100 bg-slate-50/50 transition">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <p className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-200 text-[11px] font-extrabold text-slate-500">
                      {toFa(i + 1)}
                    </span>
                    {it.label}
                    {itType !== "tristate" && (
                      <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {itType === "check" ? "تیک" : itType === "yn" ? "بله / خیر" : "متن آزاد"}
                      </span>
                    )}
                  </p>

                  {itType === "tristate" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setItem(it.id, { status: st === "good" ? null : "good" })}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                          st === "good"
                            ? "border-emerald-400 bg-emerald-500 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:text-emerald-600"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" /> مطلوب
                      </button>
                      <button
                        onClick={() => setItem(it.id, { status: st === "bad" ? null : "bad" })}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                          st === "bad"
                            ? "border-red-400 bg-red-500 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-600"
                        }`}
                      >
                        <X className="h-3.5 w-3.5" /> نامطلوب
                      </button>
                      <button
                        onClick={() => setItem(it.id, { status: st === "na" ? null : "na" })}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                          st === "na"
                            ? "border-slate-400 bg-slate-500 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <Minus className="h-3.5 w-3.5" /> N/A
                      </button>
                    </div>
                  )}

                  {itType === "check" && (
                    <button
                      onClick={() => setItem(it.id, { status: st === "good" ? null : "good" })}
                      className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-extrabold transition ${
                        st === "good"
                          ? "border-emerald-400 bg-emerald-500 text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-400 hover:border-emerald-300 hover:text-emerald-600"
                      }`}
                    >
                      <span
                        className={`flex h-4.5 w-4.5 items-center justify-center rounded border-2 ${
                          st === "good" ? "border-white bg-white text-emerald-600" : "border-slate-300"
                        }`}
                      >
                        {st === "good" && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {st === "good" ? "تیک — موجود / انجام شد" : "تیک بزنید"}
                    </button>
                  )}

                  {itType === "yn" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setItem(it.id, { status: st === "good" ? null : "good" })}
                        className={`flex items-center gap-1 rounded-lg border px-3.5 py-1.5 text-[11px] font-bold transition ${
                          st === "good"
                            ? "border-emerald-400 bg-emerald-500 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:text-emerald-600"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" /> بله
                      </button>
                      <button
                        onClick={() => setItem(it.id, { status: st === "bad" ? null : "bad" })}
                        className={`flex items-center gap-1 rounded-lg border px-3.5 py-1.5 text-[11px] font-bold transition ${
                          st === "bad"
                            ? "border-red-400 bg-red-500 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-600"
                        }`}
                      >
                        <X className="h-3.5 w-3.5" /> خیر
                      </button>
                    </div>
                  )}

                  {itType === "text" && (
                    <Input
                      className="!w-64 !py-2 text-xs"
                      placeholder="مقدار / توضیح را بنویسید (اختیاری)"
                      value={r?.text ?? ""}
                      onChange={(e) => setItem(it.id, { text: e.target.value })}
                    />
                  )}
                </div>
                {itType !== "text" && st === "bad" && (
                  <div className="border-t border-red-100 bg-red-50/50 px-4 py-3">
                    <Textarea
                      className="min-h-[52px] border-red-200 bg-white text-xs"
                      placeholder="توضیح مغایرت (اختیاری) — شرح مشکل و اقدام اصلاحی را بنویسید…"
                      value={r?.note ?? ""}
                      onChange={(e) => setItem(it.id, { note: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* امضا و ثبت */}
      <Card title="امضا و تأییدهای خروجی" icon={<PenLine className="h-5 w-5" />}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {signature ? (
            <div className="relative">
              <img src={signature} alt="امضا" className="h-20 rounded-lg border border-slate-200 bg-white px-4" />
              <button
                onClick={() => setSignature(undefined)}
                className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                title="حذف امضا"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="mt-1 text-[10px] font-bold text-slate-400">{currentTitle}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">هنوز امضایی ثبت نشده است.</p>
          )}
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={() => setSigOpen(true)} disabled={!authorized} title={authorized ? undefined : "امضا برای شما فعال نیست"}>
              <PenLine className="h-4 w-4" /> {signature ? "تغییر امضا" : "دریافت امضای دیجیتال"}
            </Btn>
          </div>
        </div>
        {signFields.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-bold text-slate-600">امضای دیجیتال زیر عنوان زیر در خروجی درج شود:</span>
            <Select className="!w-80 !py-2 text-xs" value={currentTitle} onChange={(e) => setSignatureTitle(e.target.value)}>
              {signFields.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-5 text-slate-400">
          جاهای امضای درج‌شده روی برگهٔ خروجی: <span className="font-bold text-slate-500">{signFields.join("، ")}</span> — جاهای دیگر برای امضای دستی چاپ می‌شوند.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <span className="ml-auto text-xs font-bold text-slate-500">
            {toFa(scored)} از {toFa(template.items.length)} قلم ارزیابی شد
          </span>
          <Btn variant="secondary" onClick={() => save(true)} disabled={!authorized}>
            <Printer className="h-4 w-4" /> ذخیره و چاپ
          </Btn>
          <Btn onClick={() => save(false)} disabled={!authorized}>
            <Save className="h-4 w-4" /> ذخیره بازرسی
          </Btn>
        </div>
      </Card>

      <SignaturePad
        open={sigOpen}
        title="امضای راننده"
        onClose={() => setSigOpen(false)}
        onSave={(url) => {
          setSignature(url);
          setSigOpen(false);
          notify("امضای راننده ثبت شد");
        }}
      />
    </div>
  );
}

/* ================= سوابق ================= */

function HistoryTab({ onPrint, notify }: { onPrint: (doc: PrintDoc) => void; notify: (m: string, tone?: "ok" | "err") => void }) {
  const { db, update } = useDB();
  const [tplFilter, setTplFilter] = useState("all");
  const [inspFilter, setInspFilter] = useState("all");
  const [toDelete, setToDelete] = useState<ChecklistEntry | null>(null);

  const inspectors = useMemo(() => [...new Set(db.entries.map((e) => e.inspector))], [db.entries]);
  const list = db.entries.filter((e) => {
    if (tplFilter !== "all" && e.templateId !== tplFilter) return false;
    if (inspFilter !== "all" && e.inspector !== inspFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select className="w-64" value={tplFilter} onChange={(e) => setTplFilter(e.target.value)}>
          <option value="all">همهٔ قالب‌ها</option>
          {db.templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.name}
            </option>
          ))}
        </Select>
        <Select className="w-52" value={inspFilter} onChange={(e) => setInspFilter(e.target.value)}>
          <option value="all">همهٔ بازرسین</option>
          {inspectors.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </Select>
      </div>

      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-3 font-bold">تاریخ</th>
                <th className="px-4 py-3 font-bold">کد فرم</th>
                <th className="px-4 py-3 font-bold">پلاک</th>
                <th className="px-4 py-3 font-bold">نوع / مالکیت</th>
                <th className="px-4 py-3 font-bold">بازرس</th>
                <th className="px-4 py-3 font-bold">راننده</th>
                <th className="px-4 py-3 font-bold">انطباق</th>
                <th className="px-4 py-3 font-bold">امضا</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 transition hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-xs font-bold text-slate-600" dir="ltr">
                    {e.date}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="slate" className="font-mono">{e.code}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PlateBadge plate={e.plate} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {e.vehicleType}
                    <span className="mx-1 text-slate-300">|</span>
                    {e.ownership}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-700">{e.inspector}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.driver || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.percent >= 85 ? "green" : e.percent >= 60 ? "amber" : "red"}>{toFa(e.percent)}٪</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {e.signature ? (
                      <img src={e.signature} alt="امضا" className="h-8 rounded border border-slate-200 bg-white px-1" />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onPrint({ kind: "entry", entry: e })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        title="چاپ / خروجی PDF"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(e)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="حذف"
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
            <EmptyState icon={<History className="h-7 w-7" />} title="سابقهٔ بازرسی‌ای وجود ندارد" sub="اولین بازرسی را از تب «بازرسی جدید» انجام دهید." />
          )}
        </div>
      </Card>

      <Modal
        open={!!toDelete}
        title="حذف سوابق بازرسی"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setToDelete(null)}>
              انصراف
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                update((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== toDelete?.id) }));
                notify("سابقه حذف شد");
                setToDelete(null);
              }}
            >
              <Trash2 className="h-4 w-4" /> حذف
            </Btn>
          </>
        }
      >
        <p className="text-sm text-slate-600">این سابقهٔ بازرسی برای همیشه حذف می‌شود. ادامه می‌دهید؟</p>
      </Modal>
    </div>
  );
}

/* ================= تعریف قالب‌ها ================= */

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "tristate", label: "مطلوب / نامطلوب / N-A" },
  { value: "check", label: "تیک (موجود / غیرموجود)" },
  { value: "yn", label: "بله / خیر" },
  { value: "text", label: "متن آزاد (ثبت مقدار)" },
];

type TplDraft = {
  id?: string;
  name: string;
  code: string;
  frequency: Frequency;
  description: string;
  signers: string[];
  signFields: string[];
  items: { id: string; label: string; type: ItemType }[];
};

function TemplatesTab({ notify }: { notify: (m: string, tone?: "ok" | "err") => void }) {
  const { db, update } = useDB();
  const [draft, setDraft] = useState<TplDraft | null>(null);
  const [toDelete, setToDelete] = useState<ChecklistTemplate | null>(null);

  const openNew = () =>
    setDraft({ name: "", code: "", frequency: "ماهیه", description: "", signers: [], signFields: [...DEFAULT_SIGN_FIELDS], items: [{ id: uid(), label: "", type: "tristate" }] });
  const openEdit = (t: ChecklistTemplate) =>
    setDraft({
      id: t.id,
      name: t.name,
      code: t.code,
      frequency: t.frequency,
      description: t.description ?? "",
      signers: t.signers ?? [],
      signFields: [...(t.signFields ?? DEFAULT_SIGN_FIELDS)],
      items: t.items.map((i) => ({ id: i.id, label: i.label, type: i.type ?? "tristate" })),
    });

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim()) return notify("نام چک لیست را وارد کنید", "err");
    const items = draft.items.filter((i) => i.label.trim());
    if (!items.length) return notify("حداقل یک آیتم تعریف کنید", "err");
    const signFields = draft.signFields.map((s) => s.trim()).filter(Boolean);
    if (draft.id) {
      update((d) => ({
        ...d,
        templates: d.templates.map((t) => (t.id === draft.id ? { ...t, name: draft.name.trim(), code: draft.code.trim(), frequency: draft.frequency, description: draft.description.trim(), signers: draft.signers, signFields, items } : t)),
      }));
      notify("چک لیست به‌روزرسانی شد");
    } else {
      update((d) => ({
        ...d,
        templates: [...d.templates, { id: uid(), name: draft.name.trim(), code: draft.code.trim() || `DK-CL-HSE-${String(d.templates.length + 1).padStart(2, "0")}`, frequency: draft.frequency, description: draft.description.trim(), signers: draft.signers, signFields, items }],
      }));
      notify("چک لیست جدید ایجاد شد");
    }
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">قالب‌های تعریف‌شده را می‌توانید ویرایش، افزودن و حذف کنید. بازرسی با هر قالب با همین آیتم‌ها انجام می‌شود.</p>
        <Btn onClick={openNew}>
          <Plus className="h-4 w-4" /> چک لیست جدید
        </Btn>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {db.templates.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge tone="slate" className="mb-2 font-mono">{t.code}</Badge>
                <h3 className="text-sm font-extrabold text-slate-800">{t.name}</h3>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={t.frequency === "هفتگی" ? "amber" : t.frequency === "ماهیه" ? "blue" : t.frequency === "فصلی" ? "brand" : "green"}>
                  {t.frequency}
                </Badge>
                <Badge tone={t.signers?.length ? "amber" : "slate"}>
                  امضا: {t.signers?.length ? `${toFa(t.signers.length)} نفر مجاز` : "همه کاربران"}
                </Badge>
              </div>
            </div>
            {t.description && <p className="mt-2 text-xs text-slate-400">{t.description}</p>}
            <p className="mt-3 text-xs font-bold text-slate-500">{toFa(t.items.length)} قلم</p>
            <ul className="mt-2 space-y-1 overflow-hidden text-xs text-slate-400">
              {t.items.slice(0, 4).map((i) => (
                <li key={i.id} className="truncate">• {i.label}</li>
              ))}
              {t.items.length > 4 && <li>… و {toFa(t.items.length - 4)} مورد دیگر</li>}
            </ul>
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
              <Btn variant="secondary" className="flex-1 !py-2 text-xs" onClick={() => openEdit(t)}>
                <Pencil className="h-3.5 w-3.5" /> ویرایش
              </Btn>
              <Btn variant="danger" className="!py-2" onClick={() => setToDelete(t)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>
          </div>
        ))}
      </div>

      {/* ادیتور قالب */}
      <Modal
        open={!!draft}
        title={draft?.id ? "ویرایش چک لیست" : "تعریف چک لیست جدید"}
        onClose={() => setDraft(null)}
        wide
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)}>
              انصراف
            </Btn>
            <Btn onClick={saveDraft}>
              <Save className="h-4 w-4" /> ذخیره قالب
            </Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="نام چک لیست" required className="sm:col-span-2">
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثلاً: بازرسی کپسول‌های اطفاء حریق" />
              </Field>
              <Field label="کد فرم">
                <Input dir="ltr" className="text-left" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="DK-CL-HSE-0X" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="بازهٔ انجام بازرسی">
                <Select value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as Frequency })}>
                  {FREQUENCIES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>
              <Field label="توضیح (اختیاری)">
                <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-bold text-slate-700">افراد مجاز به تکمیل و امضای این چک لیست</p>
              <p className="mb-3 mt-0.5 text-[11px] text-slate-400">
                اگر کسی انتخاب نشود، همهٔ کاربران می‌توانند این چک لیست را تکمیل و امضا کنند.
              </p>
              <div className="flex flex-wrap gap-2">
                {db.users.map((u) => {
                  const on = draft.signers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, signers: on ? draft.signers.filter((x) => x !== u.id) : [...draft.signers, u.id] })
                      }
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition",
                        on
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded",
                          on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-300"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      {u.name}
                      {u.isAdmin ? " (مدیر)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-bold text-slate-700">جاهای امضای خروجی</p>
              <p className="mb-3 mt-0.5 text-[11px] text-slate-400">
                این عناوین روی برگهٔ چاپی به‌عنوان جای امضا درج می‌شوند؛ امضای دیجیتالِ گرفته‌شده زیر عنوان انتخاب‌شده قرار می‌گیرد.
              </p>
              <div className="space-y-2">
                {draft.signFields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-7 text-center text-xs font-bold text-slate-400">{toFa(i + 1)}</span>
                    <Input
                      value={f}
                      onChange={(e) =>
                        setDraft({ ...draft, signFields: draft.signFields.map((x, xi) => (xi === i ? e.target.value : x)) })
                      }
                      placeholder="مثال: امضای مسئول HSE"
                    />
                    <button
                      onClick={() => setDraft({ ...draft, signFields: draft.signFields.filter((_, xi) => xi !== i) })}
                      className="shrink-0 rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                      title="حذف جای امضا"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Btn variant="ghost" className="!p-2 text-xs" onClick={() => setDraft({ ...draft, signFields: [...draft.signFields, ""] })}>
                  <Plus className="h-4 w-4" /> افزودن جای امضا
                </Btn>
                {draft.signFields.length === 0 && (
                  <p className="text-[11px] text-slate-400">خالی = پیش‌فرض (امضای راننده + امضا و مهر بازرس)</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">
                  آیتم‌های چک لیست <span className="text-xs font-semibold text-slate-400">(برای هر قلم نوع ورودی دلخواه را انتخاب کنید)</span>
                </p>
                <Btn
                  variant="ghost"
                  className="!p-2 text-xs"
                  onClick={() => setDraft({ ...draft, items: [...draft.items, { id: uid(), label: "", type: "tristate" }] })}
                >
                  <Plus className="h-4 w-4" /> افزودن آیتم
                </Btn>
              </div>
              {draft.items.map((it, i) => (
                <div key={it.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-7 text-center text-xs font-bold text-slate-400">{toFa(i + 1)}</span>
                  <Input
                    className="flex-1 min-w-[200px]"
                    value={it.label}
                    onChange={(e) =>
                      setDraft({ ...draft, items: draft.items.map((x) => (x.id === it.id ? { ...x, label: e.target.value } : x)) })
                    }
                    placeholder="شرح آیتم — مثال: فشار کپسول در محدودهٔ سبز"
                  />
                  <Select
                    className="!w-52 shrink-0"
                    value={it.type}
                    onChange={(e) =>
                      setDraft({ ...draft, items: draft.items.map((x) => (x.id === it.id ? { ...x, type: e.target.value as ItemType } : x)) })
                    }
                    title="نوع ورودی این آیتم"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() => setDraft({ ...draft, items: draft.items.filter((x) => x.id !== it.id) })}
                    className="shrink-0 rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    title="حذف آیتم"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!toDelete}
        title="حذف چک لیست"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setToDelete(null)}>
              انصراف
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                update((d) => ({ ...d, templates: d.templates.filter((x) => x.id !== toDelete?.id) }));
                notify("قالب حذف شد");
                setToDelete(null);
              }}
            >
              حذف قالب
            </Btn>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          قالب «{toDelete?.name}» حذف می‌شود (سوابق بازرسی‌های قبلی باقی می‌مانند).
        </p>
      </Modal>
    </div>
  );
}
