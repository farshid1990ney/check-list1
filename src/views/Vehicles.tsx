import { useMemo, useState } from "react";
import { CarFront, Pencil, Plus, QrCode, Search, Trash2, Eye } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge, Btn, Card, EmptyState, Modal, Select, inputCls } from "../components/shared";
import { PlateBadge } from "../components/PlateInput";
import { Vehicle, expiryState, plateKey, plateText, toFa, useDB, vehicleQrValue } from "../data";

type Props = {
  onNew: () => void;
  onEdit: (v: Vehicle) => void;
  onPrintQR: (v: Vehicle) => void;
  notify: (m: string, tone?: "ok" | "err") => void;
};

function ExpiryCell({ date }: { date: string }) {
  const st = expiryState(date);
  const map = {
    expired: { tone: "red" as const, label: "منقضی" },
    soon: { tone: "amber" as const, label: "نزدیک انقضا" },
    ok: { tone: "green" as const, label: "معتبر" },
    none: { tone: "slate" as const, label: "—" },
  };
  const m = map[st];
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-600" dir="ltr">
        {date || "—"}
      </p>
      <Badge tone={m.tone}>{m.label}</Badge>
    </div>
  );
}

export default function Vehicles({ onNew, onEdit, onPrintQR, notify }: Props) {
  const { db, update } = useDB();
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState("all");
  const [detail, setDetail] = useState<Vehicle | null>(null);
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);

  const list = useMemo(() => {
    const query = q.trim();
    return db.vehicles.filter((v) => {
      if (activeOnly === "active" && !v.active) return false;
      if (activeOnly === "inactive" && v.active) return false;
      if (!query) return true;
      const hay = `${v.brand} ${v.model} ${v.driver} ${v.color} ${plateText(v.plate)} ${plateKey(v.plate).toLowerCase()}`;
      return hay.includes(query);
    });
  }, [db.vehicles, q, activeOnly]);

  const doDelete = () => {
    if (!toDelete) return;
    update((d) => ({ ...d, vehicles: d.vehicles.filter((v) => v.id !== toDelete.id) }));
    notify("خودرو حذف شد");
    setToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">بانک اطلاعاتی خودروها</h1>
          <p className="text-xs text-slate-500">
            {toFa(db.vehicles.length)} خودرو ثبت شده — {toFa(db.vehicles.filter((v) => v.active).length)} دستگاه فعال
          </p>
        </div>
        <Btn onClick={onNew}>
          <Plus className="h-4 w-4" /> ثبت خودرو جدید
        </Btn>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputCls} pr-9`}
            placeholder="جستجو: برند، مدل، راننده، پلاک…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select className="w-44" value={activeOnly} onChange={(e) => setActiveOnly(e.target.value)}>
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">فقط فعال</option>
          <option value="inactive">فقط غیرفعال</option>
        </Select>
      </div>

      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-3 font-bold">خودرو</th>
                <th className="px-4 py-3 font-bold">نوع / مالکیت</th>
                <th className="px-4 py-3 font-bold">راننده</th>
                <th className="px-4 py-3 font-bold">بیمه</th>
                <th className="px-4 py-3 font-bold">معاینه فنی</th>
                <th className="px-4 py-3 font-bold">کارت ایمنی</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {v.photo ? (
                          <img src={v.photo} alt={v.brand} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <CarFront className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-800">
                          {v.brand}
                          {v.model && <span className="font-semibold text-slate-500"> {v.model}</span>}
                        </p>
                        <PlateBadge plate={v.plate} size="sm" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone="blue">{v.type}</Badge>
                      <Badge tone={v.ownership === "درکاو" ? "brand" : "slate"}>{v.ownership}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-600">{v.driver || "—"}</td>
                  <td className="px-4 py-3">
                    <ExpiryCell date={v.insuranceExp} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryCell date={v.technicalExp} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryCell date={v.safetyCardExp} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={v.active ? "green" : "slate"}>{v.active ? "فعال" : "غیرفعال"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDetail(v)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title="جزئیات"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onPrintQR(v)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                        title="کارت QR و چاپ"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(v)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                        title="ویرایش"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(v)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
            <EmptyState
              icon={<CarFront className="h-7 w-7" />}
              title="خودرویی یافت نشد"
              sub="با دکمهٔ «ثبت خودرو جدید» اولین خودرو را به بانک اطلاعاتی اضافه کنید."
            />
          )}
        </div>
      </Card>

      {/* جزئیات */}
      <Modal open={!!detail} title="جزئیات خودرو" onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-4">
            {detail.photo && (
              <img src={detail.photo} alt={detail.brand} className="h-56 w-full rounded-xl object-cover" />
            )}
            <div className="flex items-center justify-between">
              <p className="text-lg font-extrabold text-slate-800">
                {detail.brand} {detail.model}
              </p>
              <PlateBadge plate={detail.plate} size="lg" />
            </div>
            {/* کارت QR */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <QRCodeSVG value={vehicleQrValue(detail)} size={124} level="M" />
              </div>
              <div className="min-w-0 space-y-1 text-xs text-slate-500">
                <p className="text-sm font-extrabold text-slate-700">
                  خودرو: {detail.brand} {detail.model}
                </p>
                <p>
                  پلاک: <span dir="ltr" className="font-bold text-slate-700">{plateText(detail.plate)}</span>
                </p>
                <p>با اسکن این QR مشخصات خودرو/تجهیز قابل خواندن است.</p>
                <Btn variant="secondary" className="mt-2 !py-2 text-xs" onClick={() => onPrintQR(detail)}>
                  <QrCode className="h-4 w-4" /> چاپ کارت QR
                </Btn>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["نوع خودرو", detail.type],
                ["مالکیت", detail.ownership],
                ["سال ساخت", detail.year || "—"],
                ["رنگ", detail.color || "—"],
                ["راننده", detail.driver || "—"],
                ["شماره شاسی", detail.chassis || "—"],
                ["شماره موتور", detail.engine || "—"],
                ["وضعیت", detail.active ? "فعال" : "غیرفعال"],
                ["انقضای بیمه", detail.insuranceExp || "—"],
                ["معاینه فنی", detail.technicalExp || "—"],
                ["کارت ایمنی", detail.safetyCardExp || "—"],
                ["تاریخ ثبت", detail.createdAt],
              ].map(([k, val]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold text-slate-400">{k}</dt>
                  <dd className="font-bold text-slate-700">{val}</dd>
                </div>
              ))}
            </dl>
            <div className="flex justify-end">
              <Btn
                variant="secondary"
                onClick={() => {
                  onEdit(detail);
                  setDetail(null);
                }}
              >
                <Pencil className="h-4 w-4" /> ویرایش خودرو
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* حذف */}
      <Modal
        open={!!toDelete}
        title="حذف خودرو"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setToDelete(null)}>
              انصراف
            </Btn>
            <Btn variant="danger" onClick={doDelete}>
              <Trash2 className="h-4 w-4" /> حذف قطعی
            </Btn>
          </>
        }
      >
        {toDelete && (
          <p className="text-sm text-slate-600">
            آیا از حذف خودروی{" "}
            <span className="font-extrabold text-slate-800">
              {toDelete.brand} {toDelete.model}
            </span>{" "}
            با پلاک <span className="font-bold" dir="ltr">{plateText(toDelete.plate)}</span> مطمئن هستید؟
          </p>
        )}
      </Modal>

    </div>
  );
}
