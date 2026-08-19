import { useState } from "react";
import { Eye, EyeOff, KeyRound, LogIn, ShieldCheck, ClipboardList } from "lucide-react";
import { todayJalali, useDB, User, toFa } from "../data";
import { Input, Btn } from "../components/shared";

type Props = {
  onLogin: (u: User) => void;
  onPublic: () => void;
};

export default function Login({ onLogin, onPublic }: Props) {
  const { db } = useDB();
  const [code, setCode] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = db.users.find(
      (x) => x.code.trim().toLowerCase() === code.trim().toLowerCase() && x.password === pass
    );
    if (!u) {
      setError("کد پرسنلی یا رمز ورود نادرست است.");
      return;
    }
    onLogin(u);
  };

  return (
    <div className="flex min-h-screen items-stretch bg-slate-100">
      {/* برندینگ */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #f97316 0 24px, transparent 24px 48px)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
            {db.settings.logo ? (
              <img src={db.settings.logo} alt="لوگو" className="h-10 w-10 rounded-xl object-contain" />
            ) : (
              <ShieldCheck className="h-7 w-7" />
            )}
          </div>
          <div>
            <p className="text-lg font-extrabold">{db.settings.orgName}</p>
            <p className="text-xs text-slate-400">سامانه بازرسی ایمنی و زیست‌محیطی (HSE)</p>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-3xl font-black leading-relaxed">
            بازرسی خودروها، ماشین‌آلات
            <br />
            <span className="text-brand-400">در یک سامانه</span>
          </h1>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-brand-400" /> چک لیست‌های سفارشی با بازهٔ هفتگی، ماهیه، فصلی و سالانه
            </li>
            <li className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-brand-400" /> بانک اطلاعاتی خودروها همراه با تصویر و تاریخ انقضاها
            </li>
            <li className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-brand-400" /> امضای دیجیتال راننده، تایم‌شیت و گزارش‌های تجمیعی
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">نسخهٔ ۱.۰ | سال {toFa(todayJalali().y)}</p>
      </div>

      {/* فرم ورود */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
              {db.settings.logo ? (
                <img src={db.settings.logo} alt="لوگو" className="h-12 w-12 rounded-xl bg-white object-contain p-0.5" />
              ) : (
                <ShieldCheck className="h-8 w-8" />
              )}
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">{db.settings.orgName}</h1>
            <p className="text-xs text-slate-500">سامانهٔ بازرسی ایمنی و زیست‌محیطی</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-800">ورود به سامانه</h2>
            <p className="mb-6 mt-1 text-xs text-slate-500">کد پرسنلی و رمز اختصاصی خود را وارد کنید.</p>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">کد پرسنلی</label>
                <Input
                  dir="ltr"
                  className="text-left"
                  placeholder="کد پرسنلی"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">رمز ورود</label>
                <div className="relative">
                  <Input
                    dir="ltr"
                    className="pl-10 text-left"
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                  {error}
                </div>
              )}
              <Btn type="submit" className="w-full py-3">
                <LogIn className="h-4.5 w-4.5" /> ورود به سامانه
              </Btn>
            </form>
          </div>

          <button
            onClick={onPublic}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
          >
            <KeyRound className="h-4 w-4" />
            تکمیل فرم عمومی (بدون حساب کاربری)
          </button>
        </div>
      </div>
    </div>
  );
}
