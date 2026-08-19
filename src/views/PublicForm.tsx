import { useRef, useState } from "react";
import { ArrowRight, Camera, CheckCircle2, Send, X } from "lucide-react";
import { Btn, Card, Field, Input, Select, Textarea } from "../components/shared";
import PlateInput from "../components/PlateInput";
import DateField from "../components/DateField";
import {
  Ownership,
  VehicleType,
  emptyPlate,
  fileToDataUrl,
  plateComplete,
  todayStr,
  toFa,
  uid,
  useDB,
} from "../data";

type Props = { onBack: () => void };

export default function PublicForm({ onBack }: Props) {
  const { db, update } = useDB();
  const fileRef = useRef<HTMLInputElement>(null);
  const t0 = todayStr();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState(emptyPlate());
  const [type, setType] = useState<VehicleType>("سبک");
  const [ownership, setOwnership] = useState<Ownership>("درکاو");
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [driver, setDriver] = useState("");
  const [chassis, setChassis] = useState("");
  const [engine, setEngine] = useState("");
  const [insuranceExp, setInsuranceExp] = useState(t0);
  const [technicalExp, setTechnicalExp] = useState(t0);
  const [safetyCardExp, setSafetyCardExp] = useState(t0);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pick = async (f?: File) => {
    if (!f) return;
    try {
      setPhoto(await fileToDataUrl(f, 1000, 0.7));
    } catch {
      setError("خواندن تصویر ناموفق بود");
    }
  };

  const submit = () => {
    if (!name.trim()) return setError("نام و نام خانوادگی را وارد کنید");
    if (!driver.trim()) return setError("نام و نام خانوادگی راننده را وارد کنید");
    if (!plateComplete(plate)) return setError("شمارهٔ پلاک کامل نیست — ۲ رقم + حرف + ۳ رقم + ۲ رقم");
    const ref = `PF-${Math.floor(1000 + Math.random() * 9000)}`;
    update((d) => ({
      ...d,
      publicForms: [
        {
          id: uid(),
          ref,
          name: name.trim(),
          phone: phone.trim(),
          plate,
          vehicleType: type,
          ownership,
          brand: brand.trim(),
          description: description.trim(),
          photo,
          date: todayStr(),
          createdAt: Date.now(),
          driver: driver.trim(),
          year: year.trim(),
          color: color.trim(),
          chassis: chassis.trim(),
          engine: engine.trim(),
          insuranceExp,
          technicalExp,
          safetyCardExp,
        },
        ...d.publicForms,
      ],
    }));
    setDone(ref);
  };

  if (done)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-800">فرم با موفقیت ثبت شد</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            اطلاعات شما در بانک اطلاعاتی {db.settings.orgName} ذخیره شد.
            <br />
            کد پیگیری: <span className="font-extrabold text-slate-800" dir="ltr">{done}</span>
          </p>
          <Btn className="mt-6 w-full" onClick={onBack}>
            <ArrowRight className="h-4 w-4" /> بازگشت به صفحهٔ ورود
          </Btn>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-800">فرم عمومی {db.settings.orgName}</h1>
              <p className="text-[11px] text-slate-500">بدون نیاز به حساب کاربری — اطلاعات شما در بانک اطلاعاتی ثبت می‌شود</p>
            </div>
          </div>
          <button onClick={onBack} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
            ورود سامانه
          </button>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-2xl space-y-4 px-4">
        {/* مشخصات فرستنده */}
        <Card title="مشخصات شما">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" />
            </Field>
            <Field label="شماره تماس" required>
              <Input dir="ltr" className="text-left" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" />
            </Field>
          </div>
        </Card>

        {/* مشخصات خودرو */}
        <Card title="مشخصات خودرو / تجهیز">
          <div className="space-y-4">
            <Field label="شماره پلاک" required>
              <PlateInput value={plate} onChange={setPlate} hint />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="نوع خودرو">
                <Select value={type} onChange={(e) => setType(e.target.value as VehicleType)}>
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
              <Field label="برند">
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="مثال: سمند" />
              </Field>
            </div>

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
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="مثال: سفید" />
              </Field>
            </div>

            <Field label="نام و نام خانوادگی راننده" required>
              <Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="نام و نام خانوادگی راننده را وارد کنید" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="شماره شاسی">
                <Input dir="ltr" className="text-left tracking-wider" value={chassis} onChange={(e) => setChassis(e.target.value)} />
              </Field>
              <Field label="شماره موتور">
                <Input dir="ltr" className="text-left tracking-wider" value={engine} onChange={(e) => setEngine(e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        {/* تاریخ انقضاها */}
        <Card title="تاریخ انقضاها (پیش‌فرض: امروز)">
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
        </Card>

        {/* توضیحات و تصویر */}
        <Card title="توضیحات و تصویر">
          <div className="space-y-4">
            <Field label="توضیحات / گزارش مغایرت">
              <Textarea
                className="min-h-[110px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مشکلات مشاهده‌شده، مغایرت‌ها یا اطلاعاتی که باید ثبت شود را بنویسید…"
              />
            </Field>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">تصویر خودرو (اختیاری)</label>
              {photo ? (
                <div className="relative inline-block">
                  <img src={photo} alt="تصویر" className="h-40 w-60 rounded-xl border border-slate-200 object-cover" />
                  <button
                    onClick={() => setPhoto(undefined)}
                    className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-brand-400 hover:text-brand-600"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs font-bold">انتخاب تصویر</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</div>
            )}

            <Btn onClick={submit} className="w-full py-3">
              <Send className="h-4.5 w-4.5" /> ارسال فرم
            </Btn>
            <p className="text-center text-[11px] text-slate-400">
              این فرم به {db.settings.orgName} تعلق دارد.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
