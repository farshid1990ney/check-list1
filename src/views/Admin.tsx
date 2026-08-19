import { useRef, useState } from "react";
import { Building2, Check, KeyRound, Pencil, Plus, Printer, Trash2, Users } from "lucide-react";
import { Badge, Btn, Card, EmptyState, Field, Input, Modal } from "../components/shared";
import { PlateBadge } from "../components/PlateInput";
import {
  Perms,
  PrintDoc,
  PublicSubmission,
  User,
  fileToDataUrl,
  plateText,
  uid,
  useDB,
} from "../data";

type Props = {
  onPrint: (doc: PrintDoc) => void;
  notify: (m: string, tone?: "ok" | "err") => void;
};

const PERM_LABELS: { key: keyof Perms; label: string }[] = [
  { key: "vehicles", label: "خودروها" },
  { key: "checklists", label: "چک لیست‌ها" },
  { key: "timesheet", label: "تایم‌شیت" },
  { key: "reports", label: "گزارش‌ها" },
  { key: "publicForms", label: "فرم عمومی" },
  { key: "admin", label: "پنل مدیریت" },
];

export default function Admin({ onPrint, notify }: Props) {
  const [tab, setTab] = useState<"users" | "logo" | "public">("users");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">پنل مدیریت</h1>
          <p className="text-xs text-slate-500">کاربران و دسترسی‌ها، لوگو و تنظیمات، فرم‌های عمومی</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(
            [
              ["users", "کاربران و دسترسی‌ها", <Users key="i" className="h-4 w-4" />],
              ["logo", "لوگو و تنظیمات", <Building2 key="i" className="h-4 w-4" />],
              ["public", "فرم‌های عمومی", <KeyRound key="i" className="h-4 w-4" />],
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
      {tab === "users" && <UsersTab notify={notify} />}
      {tab === "logo" && <LogoTab notify={notify} />}
      {tab === "public" && <PublicTab onPrint={onPrint} notify={notify} />}
    </div>
  );
}

/* ---------- کاربران ---------- */

type UserDraft = { id?: string; code: string; name: string; password: string; perms: Perms };

function UsersTab({ notify }: { notify: (m: string, tone?: "ok" | "err") => void }) {
  const { db, update } = useDB();
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const openNew = () =>
    setDraft({
      code: "",
      name: "",
      password: "",
      perms: { vehicles: false, checklists: true, timesheet: false, reports: false, publicForms: false, admin: false },
    });

  const save = () => {
    if (!draft) return;
    if (!draft.code.trim() || !draft.name.trim() || !draft.password.trim())
      return notify("کد پرسنلی، نام و رمز ورود الزامی است", "err");
    if (db.users.some((u) => u.code.trim().toLowerCase() === draft.code.trim().toLowerCase() && u.id !== draft.id))
      return notify("این کد پرسنلی قبلاً ثبت شده است", "err");
    if (draft.id) {
      update((d) => ({
        ...d,
        users: d.users.map((u) =>
          u.id === draft.id ? { ...u, code: draft.code.trim(), name: draft.name.trim(), password: draft.password, perms: draft.perms } : u
        ),
      }));
      notify("کاربر به‌روزرسانی شد");
    } else {
      update((d) => ({
        ...d,
        users: [...d.users, { id: uid(), code: draft.code.trim(), name: draft.name.trim(), password: draft.password, isAdmin: false, perms: draft.perms }],
      }));
      notify("کاربر جدید ایجاد شد");
    }
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          برای هر کاربر می‌توانید دقیقاً مشخص کنید به کدام بخش‌ها دسترسی دارد.
        </p>
        <Btn onClick={openNew}>
          <Plus className="h-4 w-4" /> کاربر جدید
        </Btn>
      </div>

      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-3 font-bold">کد پرسنلی</th>
                <th className="px-4 py-3 font-bold">نام</th>
                <th className="px-4 py-3 font-bold">نوع</th>
                <th className="px-4 py-3 font-bold">دسترسی‌ها</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {db.users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-xs font-extrabold" dir="ltr">
                    {u.code}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-700">{u.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.isAdmin ? "brand" : "slate"}>{u.isAdmin ? "مدیر" : "کاربر"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {PERM_LABELS.filter((p) => (u.isAdmin || u.perms[p.key])).map((p) => (
                        <span key={p.key} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          {p.label}
                        </span>
                      ))}
                      {!u.isAdmin &&
                        PERM_LABELS.filter((p) => !u.perms[p.key]).length > 0 &&
                        PERM_LABELS.filter((p) => u.perms[p.key]).length === 0 && (
                          <span className="text-[10px] text-slate-300">بدون دسترسی</span>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setDraft({ id: u.id, code: u.code, name: u.name, password: u.password, perms: { ...u.perms } })
                        }
                        className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title="ویرایش"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        disabled={u.isAdmin}
                        onClick={() => setToDelete(u)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        title={u.isAdmin ? "حساب مدیر قابل حذف نیست" : "حذف"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!draft}
        title={draft?.id ? "ویرایش کاربر" : "کاربر جدید"}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)}>
              انصراف
            </Btn>
            <Btn onClick={save}>ذخیره کاربر</Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="کد پرسنلی" required>
                <Input dir="ltr" className="text-left" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
              </Field>
              <Field label="نام و نام خانوادگی" required>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
            </div>
            <Field label="رمز ورود" required>
              <Input dir="ltr" className="text-left" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
            </Field>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-700">دسترسی‌های این کاربر</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PERM_LABELS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() =>
                      setDraft({ ...draft, perms: { ...draft.perms, [p.key]: !draft.perms[p.key] } })
                    }
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-bold transition ${
                      draft.perms[p.key]
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md ${
                        draft.perms[p.key] ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-300"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                مثال: شخصی که فقط به تایم‌شیت دسترسی دارد، نمی‌تواند چک لیست تعریف کند یا به خودروها دسترسی داشته باشد.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!toDelete}
        title="حذف کاربر"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setToDelete(null)}>
              انصراف
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                update((d) => ({ ...d, users: d.users.filter((x) => x.id !== toDelete?.id) }));
                notify("کاربر حذف شد");
                setToDelete(null);
              }}
            >
              حذف کاربر
            </Btn>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          کاربر «{toDelete?.name}» ({toDelete?.code}) حذف می‌شود.
        </p>
      </Modal>
    </div>
  );
}

/* ---------- لوگو و تنظیمات ---------- */

function LogoTab({ notify }: { notify: (m: string, tone?: "ok" | "err") => void }) {
  const { db, update } = useDB();
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    try {
      const url = await fileToDataUrl(f, 520, 0.85);
      update((d) => ({ ...d, settings: { ...d.settings, logo: url } }));
      notify("لوگو ذخیره شد و روی همهٔ خروجی‌ها نمایش داده می‌شود");
    } catch {
      notify("بارگذاری لوگو ناموفق بود", "err");
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="لوگوی سازمان" icon={<Building2 className="h-5 w-5" />}>
        <p className="mb-4 text-xs text-slate-500">
          لوگو در بالای صفحهٔ ورود و در سرتاسر تمام خروجی‌ها و گزارش‌های چاپی نمایش داده می‌شود.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-28 w-40 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
            {db.settings.logo ? (
              <img src={db.settings.logo} alt="لوگو" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-xs text-slate-400">لوگو ثبت نشده است</span>
            )}
          </div>
          <div className="space-y-2">
            <Btn variant="secondary" onClick={() => fileRef.current?.click()}>
              <Plus className="h-4 w-4" /> بارگذاری لوگو
            </Btn>
            {db.settings.logo && (
              <Btn
                variant="danger"
                onClick={() => {
                  update((d) => ({ ...d, settings: { ...d.settings, logo: undefined } }));
                  notify("لوگو حذف شد");
                }}
              >
                <Trash2 className="h-4 w-4" /> حذف لوگو
              </Btn>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </Card>

      <Card title="تنظیمات سامانه">
        <div className="space-y-4">
          <Field label="نام سازمان (روی خروجی‌ها درج می‌شود)">
            <Input
              value={db.settings.orgName}
              onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, orgName: e.target.value } }))}
            />
          </Field>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            <p className="font-bold text-slate-600">راهنما:</p>
            <p>• خروجی‌ها (تکی و تجمیعی) با چاپ یا «ذخیره به PDF» از همین سامانه گرفته می‌شود.</p>
            <p>• نام بازرس و تاریخ بازرسی هنگام ثبت، از تاریخ و نام کاربر فعلی پر می‌شود.</p>
            <p>• دسترسی هر کاربر را از تب «کاربران» تنظیم کنید.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------- فرم‌های عمومی ---------- */

function PublicTab({ onPrint, notify }: { onPrint: (d: PrintDoc) => void; notify: (m: string, tone?: "ok" | "err") => void }) {
  const { db, update } = useDB();
  const [view, setView] = useState<PublicSubmission | null>(null);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        فرم‌هایی که افراد گروه بدون حساب کاربری ارسال می‌کنند؛ در بانک اطلاعاتی سامانه ثبت می‌شوند.
      </p>
      {db.publicForms.length === 0 ? (
        <Card>
          <EmptyState icon={<KeyRound className="h-7 w-7" />} title="هنوز فرم عمومی‌ای ثبت نشده است" sub="از صفحهٔ ورود، گزینهٔ «تکمیل فرم عمومی (بدون حساب کاربری)» را امتحان کنید." />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {db.publicForms.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {s.photo && <img src={s.photo} alt="تصویر" className="h-36 w-full object-cover" />}
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-800">{s.name}</p>
                  <span className="text-[10px] font-bold text-slate-400" dir="ltr">
                    {s.ref}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span dir="ltr" className="font-mono">{s.phone || "—"}</span>
                  <span>•</span>
                  <span>{s.vehicleType}</span>
                  <span>•</span>
                  <span>{s.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <PlateBadge plate={s.plate} size="sm" />
                  <div className="flex gap-1">
                    <button
                      onClick={() => setView(s)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      title="مشاهده"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        update((d) => ({ ...d, publicForms: d.publicForms.filter((x) => x.id !== s.id) }));
                        notify("فرم عمومی حذف شد");
                      }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!view} title="جزئیات فرم عمومی" onClose={() => setView(null)} footer={
        <>
          <Btn variant="secondary" onClick={() => view && onPrint({ kind: "public", sub: view })}>
            <Printer className="h-4 w-4" /> چاپ
          </Btn>
          <Btn variant="secondary" onClick={() => setView(null)}>بستن</Btn>
        </>
      }>
        {view && (
          <div className="space-y-3 text-sm">
            {view.photo && <img src={view.photo} alt="تصویر" className="h-52 w-full rounded-xl object-cover" />}
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["نام", view.name],
                ["شماره تماس", view.phone],
                ["نوع خودرو", view.vehicleType],
                ["مالکیت", view.ownership],
                ["برند", view.brand || "—"],
                ["تاریخ", view.date],
                ["کد پیگیری", view.ref],
                ["راننده", view.driver || "—"],
                ["سال ساخت", view.year || "—"],
                ["رنگ", view.color || "—"],
                ["شماره شاسی", view.chassis || "—"],
                ["شماره موتور", view.engine || "—"],
                ["انقضای بیمه", view.insuranceExp || "—"],
                ["معاینه فنی", view.technicalExp || "—"],
                ["کارت ایمنی", view.safetyCardExp || "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold text-slate-400">{k}</dt>
                  <dd className="font-bold text-slate-700">{v}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[11px] font-semibold text-slate-400">پلاک</dt>
                <dd dir="ltr" className="font-bold">{plateText(view.plate)}</dd>
              </div>
              <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[11px] font-semibold text-slate-400">توضیحات</dt>
                <dd className="font-bold leading-6 text-slate-700">{view.description || "—"}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
