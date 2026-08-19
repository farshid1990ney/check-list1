import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  PrintDoc,
  STATUS_LABEL,
  expiryState,
  plateText,
  signFieldsOf,
  todayStr,
  toFa,
  useDB,
  vehicleQrValue,
} from "../data";

/** سند چاپی — فقط هنگام چاپ (window.print) نمایش داده می‌شود */
export default function PrintSheet({ doc }: { doc: PrintDoc | null }) {
  const { db } = useDB();
  if (!doc) return null;
  const { logo, orgName } = db.settings;

  const header = (title: string, code: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #0f172a", paddingBottom: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {logo && <img src={logo} alt="logo" style={{ height: 52, maxWidth: 90, objectFit: "contain" }} />}
        <div>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{orgName}</div>
          <div style={{ fontSize: 10, color: "#475569" }}>سامانهٔ بازرسی ایمنی و زیست‌محیطی (HSE)</div>
        </div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 10, color: "#475569", direction: "ltr" }}>{code}</div>
      </div>
    </div>
  );

  const footer = (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 8, borderTop: "1px solid #cbd5e1", fontSize: 9, color: "#64748b" }}>
      <span>تاریخ چاپ: {todayStr()}</span>
      <span>این برگه از سامانهٔ {orgName} صادر شده است.</span>
    </div>
  );

  let body: React.ReactNode = null;

  if (doc.kind === "entry") {
    const e = doc.entry;
    body = (
      <>
        {header(e.templateName, e.code)}
        <table style={{ marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: "25%" }}><b>نام بازرس:</b> {e.inspector}</td>
              <td style={{ width: "25%" }}><b>تاریخ بازرسی:</b> <span dir="ltr">{e.date}</span></td>
              <td style={{ width: "25%" }}><b>نوع خودرو:</b> {e.vehicleType}</td>
              <td style={{ width: "25%" }}><b>مالکیت:</b> {e.ownership}</td>
            </tr>
            <tr>
              <td>
                <b>شماره پلاک: </b>
                <span dir="ltr" style={{ fontWeight: 900, letterSpacing: 1 }}>
                  {toFa(e.plate.d1)} {e.plate.letter} {toFa(e.plate.d2)} <span style={{ color: "#1d4ed8" }}>ایران</span> {toFa(e.plate.d3)}
                </span>
              </td>
              <td><b>راننده:</b> {e.driver || "—"}</td>
              <td colSpan={2}>
                <b>درصد انطباق: </b>
                <span style={{ fontWeight: 900, fontSize: 13 }}>{toFa(e.percent)}٪</span>
              </td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>ردیف</th>
              <th>شرح قلم</th>
              <th style={{ width: 130 }}>وضعیت</th>
              <th style={{ width: "30%" }}>توضیحات / اقدام اصلاحی</th>
            </tr>
          </thead>
          <tbody>
            {e.results.map((r, i) => {
              const itType = r.type ?? "tristate";
              let statusText = "N/A";
              let statusColor = "#64748b";
              if (itType === "text") {
                statusText = "متن آزاد";
              } else if (itType === "check") {
                statusText = r.status === "good" ? "✔ تیک" : "✘ بدون تیک";
                statusColor = r.status === "good" ? "#047857" : "#b91c1c";
              } else if (itType === "yn") {
                statusText = r.status === "good" ? "✔ بله" : "✘ خیر";
                statusColor = r.status === "good" ? "#047857" : "#b91c1c";
              } else {
                statusText = r.status === "good" ? "✔ مطلوب / وجود دارد" : r.status === "bad" ? "✘ نامطلوب / وجود ندارد" : "N/A";
                statusColor = r.status === "good" ? "#047857" : r.status === "bad" ? "#b91c1c" : "#64748b";
              }
              const detail = r.note || r.text || "";
              return (
                <tr key={i}>
                  <td>{toFa(i + 1)}</td>
                  <td style={{ textAlign: "right" }}>{r.label}</td>
                  <td style={{ color: statusColor, fontWeight: 700 }}>{statusText}</td>
                  <td style={{ textAlign: "right", color: detail ? (r.note ? "#b91c1c" : "#1e293b") : "#94a3b8" }}>{detail || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(() => {
          const fields = signFieldsOf(e);
          const signedTitle = e.signatureTitle ?? fields[0];
          return (
            <div style={{ display: "flex", gap: 18, marginTop: 18, alignItems: "flex-end", flexWrap: "wrap" }}>
              {fields.map((f, i) => (
                <div key={i} style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{f}</div>
                  {e.signature && f === signedTitle ? (
                    <img src={e.signature} alt="امضا" style={{ height: 64, border: "1px solid #cbd5e1", borderRadius: 6, padding: 4 }} />
                  ) : (
                    <div style={{ height: 64, border: "1px dashed #cbd5e1", borderRadius: 6 }} />
                  )}
                </div>
              ))}
            </div>
          );
        })()}
        {footer}
      </>
    );
  } else if (doc.kind === "aggregate") {
    const { template, rows, total, periodLabel, count } = doc;
    body = (
      <>
        {header(`گزارش تجمیعی — ${template.name}`, template.code)}
        <table style={{ marginBottom: 12 }}>
          <tbody>
            <tr>
              <td><b>بازهٔ گزارش:</b> {periodLabel}</td>
              <td><b>بازهٔ بازرسی قالب:</b> {template.frequency}</td>
              <td><b>تعداد بازرسی:</b> {toFa(count)} مورد</td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>ردیف</th>
              <th>شرح قلم</th>
              <th style={{ width: 70 }}>مطلوب</th>
              <th style={{ width: 70 }}>نامطلوب</th>
              <th style={{ width: 60 }}>N/A</th>
              <th style={{ width: 90 }}>درصد انطباق</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{toFa(i + 1)}</td>
                <td style={{ textAlign: "right" }}>{r.label}</td>
                <td style={{ color: "#047857", fontWeight: 700 }}>{toFa(r.good)}</td>
                <td style={{ color: "#b91c1c", fontWeight: 700 }}>{toFa(r.bad)}</td>
                <td style={{ color: "#64748b" }}>{toFa(r.na)}</td>
                <td style={{ fontWeight: 900 }}>{toFa(r.percent)}٪</td>
              </tr>
            ))}
            <tr>
              <td />
              <td style={{ fontWeight: 900, textAlign: "right" }}>مجموع</td>
              <td style={{ fontWeight: 900 }}>{toFa(total.good)}</td>
              <td style={{ fontWeight: 900 }}>{toFa(total.bad)}</td>
              <td style={{ fontWeight: 900 }}>{toFa(total.na)}</td>
              <td style={{ fontWeight: 900 }}>{toFa(total.percent)}٪</td>
            </tr>
          </tbody>
        </table>
        {footer}
      </>
    );
  } else if (doc.kind === "vehicles") {
    body = (
      <>
        {header("لیست خودروهای ثبت‌شده", "DK-VL-REG")}
        <table>
          <thead>
            <tr>
              <th style={{ width: 34 }}>ردیف</th>
              <th>برند / مدل</th>
              <th>شماره پلاک</th>
              <th>نوع</th>
              <th>مالکیت</th>
              <th>راننده</th>
              <th>انقضای بیمه</th>
              <th>معاینه فنی</th>
              <th>کارت ایمنی</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {doc.vehicles.map((v, i) => (
              <tr key={v.id}>
                <td>{toFa(i + 1)}</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {v.brand} {v.model} {v.year && `(${toFa(v.year)})`}
                </td>
                <td dir="ltr" style={{ fontWeight: 700, letterSpacing: 1 }}>
                  {toFa(v.plate.d1)} {v.plate.letter} {toFa(v.plate.d2)} ایران {toFa(v.plate.d3)}
                </td>
                <td>{v.type}</td>
                <td>{v.ownership}</td>
                <td>{v.driver || "—"}</td>
                <td dir="ltr">{v.insuranceExp}</td>
                <td dir="ltr">{v.technicalExp}</td>
                <td dir="ltr">{v.safetyCardExp}</td>
                <td style={{ color: v.active ? "#047857" : "#b91c1c", fontWeight: 700 }}>{v.active ? "فعال" : "غیرفعال"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {footer}
      </>
    );
  } else if (doc.kind === "qr") {
    const v = doc.vehicle;
    body = (
      <>
        {header("کارت شناسایی خودرو / تجهیز", `QR-${v.id.slice(0, 6).toUpperCase()}`)}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ border: "2px solid #0f172a", borderRadius: 10, padding: 12 }}>
            <QRCodeSVG value={vehicleQrValue(v)} size={216} level="M" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>
            خودرو: {v.brand} {v.model}
            {v.year && ` (${toFa(v.year)})`}
          </div>
          <div dir="ltr" style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2 }}>
            {toFa(v.plate.d1)} {v.plate.letter} {toFa(v.plate.d2)} ایران {toFa(v.plate.d3)}
          </div>
          <table style={{ width: 470 }}>
            <tbody>
              <tr>
                <td><b>نوع خودرو:</b></td>
                <td>{v.type}</td>
                <td><b>مالکیت:</b></td>
                <td>{v.ownership}</td>
              </tr>
              <tr>
                <td><b>رنگ:</b></td>
                <td>{v.color || "—"}</td>
                <td><b>راننده:</b></td>
                <td>{v.driver || "—"}</td>
              </tr>
              <tr>
                <td><b>شماره شاسی:</b></td>
                <td dir="ltr">{v.chassis || "—"}</td>
                <td><b>شماره موتور:</b></td>
                <td dir="ltr">{v.engine || "—"}</td>
              </tr>
              <tr>
                <td><b>انقضای بیمه:</b></td>
                <td dir="ltr">{v.insuranceExp}</td>
                <td><b>معاینه فنی:</b></td>
                <td dir="ltr">{v.technicalExp}</td>
              </tr>
              <tr>
                <td><b>کارت ایمنی:</b></td>
                <td dir="ltr">{v.safetyCardExp}</td>
                <td><b>وضعیت:</b></td>
                <td style={{ color: v.active ? "#047857" : "#b91c1c", fontWeight: 700 }}>{v.active ? "فعال" : "غیرفعال"}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 9, color: "#64748b" }}>
            با اسکن کد QR، مشخصات این خودرو/تجهیز (برند، پلاک، راننده و انقضاها) قابل خواندن است.
          </div>
          {footer}
        </div>
      </>
    );
  } else {
    const s = doc.sub;
    body = (
      <>
        {header("فرم عمومی — گزارش ارسالی", s.ref)}
        <table>
          <tbody>
            <tr>
              <td><b>نام:</b> {s.name}</td>
              <td><b>شماره تماس:</b> <span dir="ltr">{s.phone || "—"}</span></td>
              <td><b>تاریخ ثبت:</b> <span dir="ltr">{s.date}</span></td>
            </tr>
            <tr>
              <td>
                <b>پلاک: </b>
                <span dir="ltr" style={{ fontWeight: 900 }}>
                  {toFa(s.plate.d1)} {s.plate.letter} {toFa(s.plate.d2)} ایران {toFa(s.plate.d3)}
                </span>
              </td>
              <td><b>نوع خودرو:</b> {s.vehicleType}</td>
              <td><b>مالکیت:</b> {s.ownership}</td>
            </tr>
            <tr>
              <td><b>برند:</b> {s.brand || "—"}</td>
              <td><b>سال ساخت:</b> {s.year ? toFa(s.year) : "—"}</td>
              <td><b>رنگ:</b> {s.color || "—"}</td>
            </tr>
            <tr>
              <td><b>راننده:</b> {s.driver || "—"}</td>
              <td><b>شماره شاسی:</b> <span dir="ltr">{s.chassis || "—"}</span></td>
              <td><b>شماره موتور:</b> <span dir="ltr">{s.engine || "—"}</span></td>
            </tr>
            <tr>
              <td><b>انقضای بیمه:</b> <span dir="ltr">{s.insuranceExp || "—"}</span></td>
              <td><b>معاینه فنی:</b> <span dir="ltr">{s.technicalExp || "—"}</span></td>
              <td><b>کارت ایمنی:</b> <span dir="ltr">{s.safetyCardExp || "—"}</span></td>
            </tr>
            <tr>
              <td colSpan={3}>
                <b>توضیحات:</b> {s.description || "—"}
              </td>
            </tr>
          </tbody>
        </table>
        {s.photo && <img src={s.photo} alt="تصویر" style={{ maxWidth: 320, marginTop: 12, borderRadius: 6 }} />}
        {footer}
      </>
    );
  }

  return createPortal(<div className="print-sheet" dir="rtl">{body}</div>, document.body);
}

export { STATUS_LABEL, expiryState, plateText };
