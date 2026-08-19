import { useRef, useState } from "react";
import { Camera, CarFront, X } from "lucide-react";
import { Field, Input, Select, Btn, Toggle, Card } from "../components/shared";
import PlateInput from "../components/PlateInput";
import DateField from "../components/DateField";
import {
  Vehicle,
  VehicleType,
  Ownership,
  emptyPlate,
  fileToDataUrl,
  plateComplete,
  todayStr,
  uid,
  useDB,
  toFa,
} from "../data";

type Props = {
  initial?: Vehicle | null;
  onDone: () => void;
  onCancel: () => void;
  notify: (m: string, tone?: "ok" | "err") => void;
};

export default function VehicleForm({ initial, onDone, onCancel, notify }: Props) {
  const { update } = useDB();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [type, setType] = useState<VehicleType>(initial?.type ?? "سبک");
  const [ownership, setOwnership] = useState<Ownership>(initial?.ownership ?? "درکاو");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [year, setYear] = useState(initial?.year ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? emptyPlate());
  const [color, setColor] = useState(initial?.color ?? "");
  const [driver, setDriver] = useState(initial?.driver ?? "");
  const [chassis, setChassis] = useState(initial?.chassis ?? "");
  const [engine, setEngine] = useState(initial?.engine ?? "");
  const [insuranceExp, setInsuranceExp] = useState(initial?.insuranceExp ?? todayStr());
  const [technicalExp, setTechnicalExp] = useState(initial?.technicalExp ?? todayStr());
  const [safetyCardExp, setSafetyCardExp] = useState(initial?.safetyCardExp ?? todayStr());
  const [active, setActive] = useState(initial?.active ?? true);

  const pickFile = async (f?: File) => {
    if (!f) return;
    try {
      setPhoto(await fileToDataUrl(f, 1000, 0.72));
    } catch {
      notify("خواندن تصویر ناموفق بود", "err");
    }
  };

  const save = () => {
    if (!brand.trim()) return notify("لطفاً برند خودرو را وارد کنید", "err");
    if (!plateComplete(plate))
      return notify("شمارهٔ پلاک کامل نیست — ۲ رقم + حرف + ۳ رقم + ۲ رقم", "err");

    const veh: Vehicle = {
      id: initial?.id ?? uid(),
      photo,
      type,
      ownership,
      brand: brand.trim(),
      model: model.trim(),
      year: year.trim(),
      plate,
      color: color.trim(),
      driver: driver.trim(),
      chassis: chassis.trim(),
      engine: engine.trim(),
      insuranceExp,
      technicalExp,
      safetyCardExp,
      active,
      createdAt: initial?.createdAt ?? todayStr(),
    };
    update((db) => ({
      ...db,
      vehicles: initial
        ? db.vehicles.map((v) => (v.id === initial.id ? veh : v))
        : [veh, ...db.vehicles],
    }));
    notify(initial ? "تغییرات خودرو ذخیره شد" : "خودرو با موفقیت ثبت شد");
    onDone();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card
        title={initial ? "ویرایش خودرو" : "ثبت خودرو جدید"}
        icon={<CarFront className="h-5 w-5" />}
      >
        <div className="space-y-5">
          {/* تصویر خودرو */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">تصویر خودرو</label>
            {photo ? (
              <div className="relative inline-block">
                <img
                  src={photo}
                  alt="تصویر خودرو"
                  className="h-48 w-72 rounded-xl border border-slate-200 object-cover shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="absolute -left-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                  title="حذف تصویر"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-600"
              >
                <Camera className="h-8 w-8" />
                <span className="text-sm font-bold">انتخاب تصویر</span>
                <span className="text-xs text-slate-400">عکس خودرو را بارگذاری کنید (از گالری یا دوربین)</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          {/* نوع و مالکیت */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نوع خودرو" required>
              <Select value={type} onChange={(e) => setType(e.target.value as VehicleType)}>
                <option value="سبک">سبک</option>
                <option value="مینی‌بوس">مینی‌بوس</option>
                <option value="اتوبوس">اتوبوس</option>
              </Select>
            </Field>
            <Field label="مالکیت" required>
              <Select value={ownership} onChange={(e) => setOwnership(e.target.value as Ownership)}>
                <option value="درکاو">درکاو</option>
                <option value="پیمانکار آیاب و ذهاب">پیمانکار آیاب و ذهاب</option>
              </Select>
            </Field>
          </div>

          {/* برند و مدل */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="برند" required>
              <Input placeholder="مثال: سمند" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </Field>
            <Field label="مدل">
              <Input placeholder="مثال: LX" value={model} onChange={(e) => setModel(e.target.value)} />
            </Field>
          </div>

          {/* سال و رنگ */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="سال ساخت">
              <Input
                inputMode="numeric"
                placeholder={"مثال: " + toFa(1400)}
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
            <Field label="رنگ">
              <Input placeholder="مثال: سفید" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
          </div>

          {/* پلاک */}
          <Field label="شماره پلاک" required>
            <PlateInput value={plate} onChange={setPlate} hint />
          </Field>

          {/* راننده */}
          <Field label="نام راننده">
            <Input
              placeholder="نام و نام خانوادگی راننده را وارد کنید"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
            />
          </Field>

          {/* شاسی و موتور */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="شماره شاسی">
              <Input dir="ltr" className="text-left tracking-wider" value={chassis} onChange={(e) => setChassis(e.target.value)} />
            </Field>
            <Field label="شماره موتور">
              <Input dir="ltr" className="text-left tracking-wider" value={engine} onChange={(e) => setEngine(e.target.value)} />
            </Field>
          </div>

          {/* تاریخ‌ها */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="تاریخ انقضای بیمه">
              <DateField value={insuranceExp} onChange={setInsuranceExp} />
            </Field>
            <Field label="تاریخ معاینه فنی">
              <DateField value={technicalExp} onChange={setTechnicalExp} />
            </Field>
            <Field label="تاریخ کارت ایمنی">
              <DateField value={safetyCardExp} onChange={setSafetyCardExp} />
            </Field>
          </div>

          {/* وضعیت */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Toggle checked={active} onChange={setActive} label="خودرو فعال" />
            <span className={`text-xs font-bold ${active ? "text-emerald-600" : "text-slate-400"}`}>
              {active ? "در سرویس — قابل انتخاب در بازرسی" : "خارج از سرویس"}
            </span>
          </div>

          {/* دکمه‌ها */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Btn variant="secondary" onClick={onCancel}>
              انصراف
            </Btn>
            <Btn onClick={save}>ثبت خودرو</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
