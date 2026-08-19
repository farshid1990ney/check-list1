import React, { createContext, useContext, useEffect, useState } from "react";

/* ================= انواع ================= */

export type Plate = { d1: string; letter: string; d2: string; d3: string };

export type Perms = {
  vehicles: boolean;
  checklists: boolean;
  timesheet: boolean;
  reports: boolean;
  publicForms: boolean;
  admin: boolean;
};

export type User = {
  id: string;
  code: string;
  name: string;
  password: string;
  isAdmin: boolean;
  perms: Perms;
};

export type VehicleType = "سبک" | "مینی‌بوس" | "اتوبوس";
export type Ownership = "درکاو" | "پیمانکار آیاب و ذهاب";

export type Vehicle = {
  id: string;
  photo?: string;
  type: VehicleType;
  ownership: Ownership;
  brand: string;
  model: string;
  year: string;
  plate: Plate;
  color: string;
  driver: string;
  chassis: string;
  engine: string;
  insuranceExp: string;
  technicalExp: string;
  safetyCardExp: string;
  active: boolean;
  createdAt: string;
};

export type Frequency = "هفتگی" | "ماهیه" | "فصلی" | "سالانه";

/** نوع ورودی هر آیتم چک لیست: سه‌گزینه (پیش‌فرض) / تیک / بله‌خیر / متن آزاد */
export type ItemType = "tristate" | "check" | "yn" | "text";
export type ChecklistItem = { id: string; label: string; type?: ItemType };
export type ChecklistTemplate = {
  id: string;
  name: string;
  code: string;
  frequency: Frequency;
  description?: string;
  items: ChecklistItem[];
  /** شناسهٔ کاربران مجاز به تکمیل و امضا — خالی یعنی همهٔ کاربران */
  signers?: string[];
  /** عناوین جاهای امضای خروجی (مثلاً امضای راننده، بازرس، مسئول HSE) */
  signFields?: string[];
};

export type ItemStatus = "good" | "bad" | "na";
export type ItemResult = {
  itemId: string;
  label: string;
  status: ItemStatus;
  note?: string;
  text?: string;
  type?: ItemType;
};

export type ChecklistEntry = {
  id: string;
  templateId: string;
  templateName: string;
  code: string;
  frequency: Frequency;
  inspector: string;
  date: string; // ۱۴۵/۰۵/۲۰
  year: number;
  month: number;
  day: number;
  vehicleType: VehicleType;
  ownership: Ownership;
  plate: Plate;
  driver: string;
  vehicleId?: string;
  results: ItemResult[];
  signature?: string;
  /** عنوانی که امضای دیجیتال زیر آن درج می‌شود */
  signatureTitle?: string;
  /** عکس‌الگویی از جاهای امضای قالب در لحظهٔ ثبت */
  signFields?: string[];
  percent: number;
  createdAt: number;
};

export type TimesheetRow = {
  id: string;
  driver: string;
  date: string;
  year: number;
  month: number;
  day: number;
  morning: boolean;
  evening: boolean;
};

export type PublicSubmission = {
  id: string;
  ref: string;
  name: string;
  phone: string;
  plate: Plate;
  vehicleType: VehicleType;
  ownership: Ownership;
  brand: string;
  description: string;
  photo?: string;
  date: string;
  createdAt: number;
  /* مشخصات تکمیلی (مثل فرم ثبت خودرو) */
  driver?: string;
  year?: string;
  color?: string;
  chassis?: string;
  engine?: string;
  insuranceExp?: string;
  technicalExp?: string;
  safetyCardExp?: string;
};

export type Settings = { orgName: string; logo?: string };

export type DB = {
  users: User[];
  vehicles: Vehicle[];
  templates: ChecklistTemplate[];
  entries: ChecklistEntry[];
  timesheets: TimesheetRow[];
  publicForms: PublicSubmission[];
  reportsArchive: ArchivedReport[];
  settings: Settings;
};

/* ================= ابزار عمومی ================= */

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export const toFa = (v: string | number) => String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
export const fromFa = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const pad = (n: number) => String(n).padStart(2, "0");

/* ================= تقویم جلالی ================= */

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function todayJalali() {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return { y: get("year"), m: get("month"), d: get("day") };
  } catch {
    return { y: 1404, m: 1, d: 1 };
  }
}

export const jalaliToStr = (y: number, m: number, d: number) => toFa(`${y}/${pad(m)}/${pad(d)}`);
export const todayStr = () => {
  const t = todayJalali();
  return jalaliToStr(t.y, t.m, t.d);
};

export function parseJalali(s?: string) {
  if (!s) return null;
  const clean = fromFa(s).replace(/[^\d/]/g, "");
  const [y, m, d] = clean.split("/").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/** تقریبی: روزِ تقریبی سال (برای مقایسهٔ انقضا) */
export const jalaliApproxDay = (y: number, m: number, d: number) => y * 365 + m * 30 + d;

export type ExpiryState = "expired" | "soon" | "ok" | "none";
export function expiryState(dateStr: string, horizon = 30): ExpiryState {
  const p = parseJalali(dateStr);
  if (!p) return "none";
  const t = todayJalali();
  const diff = jalaliApproxDay(p.y, p.m, p.d) - jalaliApproxDay(t.y, t.m, t.d);
  if (diff < 0) return "expired";
  if (diff <= horizon) return "soon";
  return "ok";
}

/* ================= پلاک ================= */

export const PLATE_LETTERS = ["ب", "ج", "د", "ر", "س", "ت", "خ", "ق", "ل", "م", "ن", "و", "ح", "ف", "ع", "غ", "پ", "ک", "ی"];
export const emptyPlate = (): Plate => ({ d1: "", letter: "", d2: "", d3: "" });
export const plateComplete = (p: Plate) =>
  /^\d{2}$/.test(p.d1) && !!p.letter && /^\d{3}$/.test(p.d2) && /^\d{2}$/.test(p.d3);
export const plateKey = (p: Plate) => `${p.d1}${p.letter}${p.d2}${p.d3}`;
/** متن پلاک به ترتیب صحیح: ۱۲ ب ۳۴۵ ایران ۷۸ */
export const plateText = (p: Plate) =>
  `${toFa(p.d1)} ${p.letter || "–"} ${toFa(p.d2)} ایران ${toFa(p.d3)}`;

/* ================= عکس ================= */

export function fileToDataUrl(file: File, maxW = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = r.result as string;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ================= دادهٔ اولیه ================= */

const ALL_PERMS: Perms = {
  vehicles: true,
  checklists: true,
  timesheet: true,
  reports: true,
  publicForms: true,
  admin: true,
};

function seedDB(): DB {
  const t = todayJalali();
  const today = jalaliToStr(t.y, t.m, t.d);
  const tpl1Items = [
    "روشنایی جلو (راست و چپ)",
    "روشنایی عقب (راست و چپ)",
    "راهنمای جلو (کوچک، نور بالا، نور پایین)",
    "راهنمای عقب (راست و چپ)",
    "راهنمای داخل کابین (راننده و شاگرد)",
    "ترمز پایین (جلو و عقب)",
    "ترمز دستی",
    "آینه‌ها (راست، چپ، وسط)",
    "چراغ دندهٔ عقب",
    "سنسور دندهٔ عقب",
    "دوربین دندهٔ عقب",
    "بوق",
    "برف‌پاک‌کن",
    "بخاری",
    "کولر",
    "شیشه‌ها (عقب، جلو، راننده، شاگرد)",
    "درب‌ها (عقب، جلو، راننده، شاگرد)",
    "لاستیک (جلو و عقب)",
    "لاستیک زاپاس",
    "تابلوی خطر (تابلوی سه‌گوش)",
    "آچار چرخ",
    "جک و دستهٔ جک",
    "چراغ گردان",
    "پرچم و میل پرچم",
    "آمپر‌ها",
    "استارت",
    "صندلی دندهٔ کمکی",
    "زنجیر چرخ",
    "وضعیت ظاهری ماشین (تمیزی)",
    "روغن‌سوزی",
    "گواهینامهٔ رانندگی",
    "عدم وجود آلودگی زیست‌محیطی",
    "عدم ریزش روغن، بنزین، گازوئیل و…",
    "تاریخ اعتبار کارت ایمنی راننده",
    "تاریخ اعتبار معاینهٔ فنی",
    "تاریخ اعتبار بیمهٔ شخص ثالث",
    "کپسول اطفاء حریق",
  ].map((label, i) => ({ id: `v1-${i}`, label }));

  const tpl2Items = [
    "فشار کپسول در محدودهٔ سبز",
    "تاریخ کالیبراسیون معتبر",
    "درب و پلمب سالم و درجا",
    "دسترسی آزاد به کپسول (فاصلهٔ کافی)",
    "محل نصب مناسب و محکم",
    "برچسب دستورالعمل کار با کپسول",
  ].map((label, i) => ({ id: `c1-${i}`, label }));

  const tpl3Items = [
    "درب تابلو بسته، قفل و سالم",
    "اتصال زمین (ارت) سالم",
    "عدم وجود سیم‌کشی و اتصالات غیراستاندارد",
    "برچسب خطر برق موجود و خوانا",
    "تمیزی داخل تابلو و بدون رطوبت",
    "قطع‌کننده‌ها در وضعیت مناسب",
  ].map((label, i) => ({ id: `e1-${i}`, label }));

  return {
    users: [
      {
        id: "u-admin",
        code: "FARSHID",
        name: "مدیر سامانه",
        password: "0917868",
        isAdmin: true,
        perms: ALL_PERMS,
      },
      {
        id: "u-1412",
        code: "1412",
        name: "بازرس نمونه",
        password: "1234",
        isAdmin: false,
        perms: { vehicles: true, checklists: true, timesheet: true, reports: false, publicForms: false, admin: false },
      },
    ],
    vehicles: [
      {
        id: "veh-1",
        photo: undefined,
        type: "سبک",
        ownership: "درکاو",
        brand: "سمند",
        model: "LX",
        year: "1400",
        plate: { d1: "12", letter: "ب", d2: "345", d3: "78" },
        color: "سفید",
        driver: "احمد محمدی",
        chassis: "1111-2222-3333",
        engine: "4444-5555-6666",
        insuranceExp: today,
        technicalExp: today,
        safetyCardExp: today,
        active: true,
        createdAt: today,
      },
      {
        id: "veh-2",
        photo: undefined,
        type: "مینی‌بوس",
        ownership: "پیمانکار آیاب و ذهاب",
        brand: "شاهین",
        model: "VIP",
        year: "1398",
        plate: { d1: "25", letter: "س", d2: "110", d3: "41" },
        color: "سفید",
        driver: "رضا کریمی",
        chassis: "7777-8888-9999",
        engine: "1010-1111-1212",
        insuranceExp: today,
        technicalExp: today,
        safetyCardExp: today,
        active: true,
        createdAt: today,
      },
    ],
    templates: [
      {
        id: "tpl-1",
        name: "بازرسی خودروهای سبک، مینی‌بوس و اتوبوس",
        code: "DK-CL-HSE-01",
        frequency: "ماهیه",
        description: "چک لیست بازدید ایمنی و زیست‌محیطی خودروها",
        items: tpl1Items,
      },
      {
        id: "tpl-2",
        name: "بازرسی کپسول‌های اطفاء حریق",
        code: "DK-CL-HSE-02",
        frequency: "هفتگی",
        items: tpl2Items,
      },
      {
        id: "tpl-3",
        name: "بازرسی تابلو برق",
        code: "DK-CL-HSE-03",
        frequency: "فصلی",
        items: tpl3Items,
      },
    ],
    entries: [],
    timesheets: [],
    publicForms: [],
    reportsArchive: [],
    settings: { orgName: "شرکت درکاو" },
  };
}

const DB_KEY = "hse-dk-v1";

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && Array.isArray(parsed.users)) {
        if (!Array.isArray(parsed.reportsArchive)) parsed.reportsArchive = [];
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return seedDB();
}

function saveDB(db: DB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* quota */
  }
}

/* ================= استور ================= */

type Ctx = { db: DB; update: (fn: (db: DB) => DB) => void; resetDB: () => void };
const DBContext = createContext<Ctx>(null as unknown as Ctx);

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB());
  useEffect(() => saveDB(db), [db]);
  const value: Ctx = {
    db,
    update: (fn) => setDb((prev) => fn(prev)),
    resetDB: () => setDb(seedDB()),
  };
  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}

export const useDB = () => useContext(DBContext);

/* ================= درصد انطباق ================= */

export function computePercent(results: ItemResult[]): number {
  const good = results.filter((r) => r.status === "good").length;
  const bad = results.filter((r) => r.status === "bad").length;
  const total = good + bad;
  if (!total) return 0;
  return Math.round((good / total) * 100);
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  good: "مطلوب / وجود دارد",
  bad: "نامطلوب / وجود ندارد",
  na: "N/A — قابل اجرا نیست",
};

/** پیش‌فرض جاهای امضای خروجی */
export const DEFAULT_SIGN_FIELDS = ["امضای راننده جهت اطلاع و رفع مغایرت‌ها", "امضا و مهر بازرس"];
export const signFieldsOf = (tpl?: { signFields?: string[] }): string[] =>
  tpl?.signFields && tpl.signFields.length ? tpl.signFields : DEFAULT_SIGN_FIELDS;

/** محتوای QR خودرو — با اسکن، مشخصات خودرو خوانده می‌شود */
export const vehicleQrValue = (v: Vehicle): string =>
  [
    "HSE-VEHICLE",
    `ID: ${v.id}`,
    `خودرو: ${v.brand} ${v.model} ${v.year ? `(${toFa(v.year)})` : ""}`.trim(),
    `پلاک: ${plateText(v.plate)}`,
    `نوع: ${v.type} | مالکیت: ${v.ownership}`,
    v.color ? `رنگ: ${v.color}` : "",
    v.driver ? `راننده: ${v.driver}` : "",
    `انقضای بیمه: ${v.insuranceExp} | معاینه فنی: ${v.technicalExp} | کارت ایمنی: ${v.safetyCardExp}`,
  ]
    .filter(Boolean)
    .join("\n");

/* ================= اسناد چاپ ================= */

export type AggregateRow = { label: string; good: number; bad: number; na: number; percent: number };
export type PrintDoc =
  | { kind: "entry"; entry: ChecklistEntry }
  | { kind: "aggregate"; template: ChecklistTemplate; rows: AggregateRow[]; total: AggregateRow; periodLabel: string; count: number }
  | { kind: "vehicles"; vehicles: Vehicle[] }
  | { kind: "public"; sub: PublicSubmission }
  | { kind: "qr"; vehicle: Vehicle };

/** رکورد بایگانی گزارش — برای فراخوانی و چاپ مجدد در آینده */
export type ArchivedReport = {
  id: string;
  ref: string; // RPT-XXXX
  kind: PrintDoc["kind"];
  title: string;
  code: string;
  extra?: string;
  dateLabel: string;
  printedOn: string; // تاریخ شمسی چاپ
  createdAt: number;
  entryId?: string;
  publicId?: string;
  vehicleId?: string;
  templateName?: string;
  snapshot?: { rows: AggregateRow[]; total: AggregateRow; periodLabel: string; count: number };
};
