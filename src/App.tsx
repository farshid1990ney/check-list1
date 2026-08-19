import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  ArchivedReport,
  DBProvider,
  Perms,
  PrintDoc,
  User,
  Vehicle,
  plateText,
  todayJalali,
  todayStr,
  toFa,
  uid,
  useDB,
} from "./data";
import { cn } from "./utils/cn";
import Login from "./views/Login";
import PublicForm from "./views/PublicForm";
import Dashboard from "./views/Dashboard";
import Vehicles from "./views/Vehicles";
import VehicleForm from "./views/VehicleForm";
import Checklists from "./views/Checklists";
import Timesheet from "./views/Timesheet";
import Reports from "./views/Reports";
import Admin from "./views/Admin";
import PrintSheet from "./views/PrintSheet";

type Route = "dashboard" | "vehicles" | "vehicle-form" | "checklists" | "timesheet" | "reports" | "admin";

function buildArchiveRecord(doc: PrintDoc): ArchivedReport {
  const base = {
    id: uid(),
    ref: `RPT-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: Date.now(),
    printedOn: todayStr(),
  };
  if (doc.kind === "entry")
    return {
      ...base,
      kind: "entry",
      title: `بازرسی — ${doc.entry.templateName}`,
      code: doc.entry.code,
      extra: plateText(doc.entry.plate),
      dateLabel: doc.entry.date,
      entryId: doc.entry.id,
    };
  if (doc.kind === "aggregate")
    return {
      ...base,
      kind: "aggregate",
      title: `گزارش تجمیعی — ${doc.template.name}`,
      code: doc.template.code,
      extra: `${toFa(doc.count)} بازرسی`,
      dateLabel: doc.periodLabel,
      templateName: doc.template.name,
      snapshot: { rows: doc.rows, total: doc.total, periodLabel: doc.periodLabel, count: doc.count },
    };
  if (doc.kind === "vehicles")
    return { ...base, kind: "vehicles", title: "لیست خودروهای ثبت‌شده", code: "DK-VL-REG", extra: `${toFa(doc.vehicles.length)} خودرو`, dateLabel: todayStr() };
  if (doc.kind === "qr")
    return {
      ...base,
      kind: "qr",
      title: `کارت QR — ${doc.vehicle.brand} ${doc.vehicle.model}`,
      code: "QR-VEH",
      extra: plateText(doc.vehicle.plate),
      dateLabel: todayStr(),
      vehicleId: doc.vehicle.id,
    };
  return {
    ...base,
    kind: "public",
    title: `فرم عمومی — ${doc.sub.name}`,
    code: doc.sub.ref,
    extra: plateText(doc.sub.plate),
    dateLabel: doc.sub.date,
    publicId: doc.sub.id,
  };
}

function Shell() {
  const { db, update } = useDB();
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "public" | "app">("login");
  const [route, setRoute] = useState<Route>("dashboard");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [printDoc, setPrintDoc] = useState<PrintDoc | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const [sidebar, setSidebar] = useState(false);

  // بازیابی سشن (db از همان رندر اولیه آماده است)
  useEffect(() => {
    const id = sessionStorage.getItem("hse-session");
    if (id) {
      const u = db.users.find((x) => x.id === id);
      if (u) {
        setUser(u);
        setMode("app");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = (msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const doPrint = (doc: PrintDoc) => {
    // بایگانی خودکار خروجی برای فراخوانی بعدی
    const rec = buildArchiveRecord(doc);
    update((d) => ({ ...d, reportsArchive: [rec, ...(d.reportsArchive ?? [])] }));
    setPrintDoc(doc);
    window.setTimeout(() => window.print(), 400);
  };

  useEffect(() => {
    const after = () => setPrintDoc(null);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  /* ---------- قبل از ورود ---------- */
  if (mode === "public")
    return (
      <>
        <PublicForm onBack={() => setMode("login")} />
        <ToastView toast={toast} />
        <PrintSheet doc={printDoc} />
      </>
    );

  if (mode === "login" || !user)
    return (
      <>
        <Login
          onLogin={(u) => {
            setUser(u);
            setMode("app");
            setRoute("dashboard");
            sessionStorage.setItem("hse-session", u.id);
            notify(`خوش آمدید، ${u.name}`);
          }}
          onPublic={() => setMode("public")}
        />
        <ToastView toast={toast} />
        <PrintSheet doc={printDoc} />
      </>
    );

  /* ---------- پوستهٔ اپ ---------- */
  const can = (p: keyof Perms) => user.isAdmin || user.perms[p];
  const nav: { id: Route; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "dashboard", label: "داشبورد", icon: <LayoutDashboard className="h-4.5 w-4.5" />, show: true },
    { id: "vehicles", label: "خودروها", icon: <CarFront className="h-4.5 w-4.5" />, show: can("vehicles") },
    { id: "checklists", label: "چک لیست‌ها", icon: <ClipboardCheck className="h-4.5 w-4.5" />, show: can("checklists") },
    { id: "timesheet", label: "تایم‌شیت رانندگان", icon: <CalendarDays className="h-4.5 w-4.5" />, show: can("timesheet") },
    { id: "reports", label: "گزارش‌ها", icon: <BarChart3 className="h-4.5 w-4.5" />, show: can("reports") },
    { id: "admin", label: "پنل مدیریت", icon: <Settings className="h-4.5 w-4.5" />, show: can("admin") && user.isAdmin },
  ];
  const visible = nav.filter((n) => n.show);
  // «vehicle-form» صفحه‌ای جداست که در منو نیست؛ فقط با دسترسی خودروها مجاز است
  if (route !== "dashboard" && route !== "vehicle-form" && !visible.some((n) => n.id === route))
    setRoute("dashboard");
  if (route === "vehicle-form" && !can("vehicles")) setRoute("dashboard");

  const t = todayJalali();
  const pageTitles: Record<Route, string> = {
    dashboard: "داشبورد",
    vehicles: "خودروها",
    "vehicle-form": editing ? "ویرایش خودرو" : "ثبت خودرو جدید",
    checklists: "چک لیست‌ها",
    timesheet: "تایم‌شیت رانندگان",
    reports: "گزارش‌ها",
    admin: "پنل مدیریت",
  };

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-white">
          {db.settings.logo ? (
            <img src={db.settings.logo} alt="لوگو" className="h-full w-full object-contain p-1" />
          ) : (
            <ShieldCheck className="h-5.5 w-5.5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-white">{db.settings.orgName}</p>
          <p className="text-[10px] font-semibold text-slate-400">سامانهٔ HSE</p>
        </div>
        <button className="mr-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden" onClick={() => setSidebar(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visible.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (n.id === "vehicle-form") setEditing(null);
              setRoute(n.id);
              setSidebar(false);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition",
              route === n.id ? "bg-brand-600 text-white shadow-md shadow-brand-600/25" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-800/70 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-extrabold text-brand-300">
            {user.name.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold text-white">{user.name}</p>
            <p className="text-[10px] text-slate-400" dir="ltr">{user.code}</p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("hse-session");
              setUser(null);
              setMode("login");
              notify("از سامانه خارج شدید");
            }}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-red-400"
            title="خروج از سامانه"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="px-1 text-center text-[10px] text-slate-500" dir="ltr">
          {t.y}/{String(t.m).padStart(2, "0")}/{String(t.d).padStart(2, "0")}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {/* سایدبار دسکتاپ */}
      <aside className="hidden w-64 shrink-0 bg-slate-900 lg:sticky lg:top-0 lg:block lg:h-screen">{sidebarBody}</aside>
      {/* سایدبار موبایل */}
      {sidebar && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSidebar(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 bg-slate-900 shadow-2xl">{sidebarBody}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setSidebar(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-extrabold text-slate-800">{pageTitles[route]}</h2>
          <span className="mr-auto hidden text-xs font-semibold text-slate-400 sm:block" dir="ltr">
            {toFa(t.y)}/{toFa(String(t.m).padStart(2, "0"))}/{toFa(String(t.d).padStart(2, "0"))}
          </span>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {route === "dashboard" && <Dashboard user={user} onNav={(r) => { if (r === "vehicle-form") setEditing(null); setRoute(r); }} />}
          {route === "vehicles" && (
            <Vehicles
              onNew={() => {
                setEditing(null);
                setRoute("vehicle-form");
              }}
              onEdit={(v) => {
                setEditing(v);
                setRoute("vehicle-form");
              }}
              onPrintQR={(v) => doPrint({ kind: "qr", vehicle: v })}
              notify={notify}
            />
          )}
          {route === "vehicle-form" && (
            <VehicleForm
              initial={editing}
              notify={notify}
              onCancel={() => setRoute("vehicles")}
              onDone={() => setRoute("vehicles")}
            />
          )}
          {route === "checklists" && <Checklists user={user} onPrint={doPrint} notify={notify} />}
          {route === "timesheet" && <Timesheet notify={notify} />}
          {route === "reports" && <Reports onPrint={doPrint} notify={notify} />}
          {route === "admin" && <Admin onPrint={doPrint} notify={notify} />}
        </main>
      </div>

      <ToastView toast={toast} />
      <PrintSheet doc={printDoc} />
    </div>
  );
}

function ToastView({ toast }: { toast: { msg: string; tone: "ok" | "err" } | null }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl",
        toast.tone === "ok" ? "bg-slate-900" : "bg-red-600"
      )}
      dir="rtl"
    >
      <CheckCircle2 className="h-4.5 w-4.5" />
      {toast.msg}
    </div>
  );
}

export default function App() {
  return (
    <DBProvider>
      <Shell />
    </DBProvider>
  );
}
