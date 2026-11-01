import { useEffect, useMemo, useState } from "react"
import { Invitation } from "./types"
import { getCurrentSession, uploadMedia } from "./backend"

// تبويب "إرسال واتساب" بلوحة الإدارة: ترفعين PDF الدعوة، تلصقين أسماء/أرقام
// المدعوين، وبضغطة وحدة تنرسل لكل واحد رسالة واتساب فيها الملف + زر (Call to
// Action) يفتح رابط الدعوة. الإرسال الفعلي يتم من دالة السيرفر
// api/send-whatsapp.ts (التوكن محفوظ هناك مو بالمتصفح).

type Mode = "template" | "session"
type Result = { phone: string; name?: string; ok: boolean; error?: string }

const STORE_KEY = "wa-sender-v1"

function loadStore(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
  } catch {
    return {}
  }
}

function parseRecipients(text: string): { name?: string; phone: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/\+?[\d\s\-()]{7,}/)
      const phone = m ? m[0].trim() : ""
      const name = line.replace(phone, "").replace(/[,،;\t|:-]+/g, " ").trim()
      return { name: name || undefined, phone }
    })
    .filter((r) => r.phone.replace(/\D/g, "").length >= 7)
}

const inputCls =
  "w-full rounded-xl border border-[#e5d9c3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]"

export default function WhatsAppSender({ invitations }: { invitations: Invitation[] }) {
  const saved = useMemo(loadStore, [])
  const [invId, setInvId] = useState<number | "">(saved.invId ?? (invitations[0]?.id ?? ""))
  const [linkUrl, setLinkUrl] = useState<string>(saved.linkUrl ?? "")
  const [pdfUrl, setPdfUrl] = useState<string>(saved.pdfUrl ?? "")
  const [pdfName, setPdfName] = useState<string>(saved.pdfName ?? "")
  const [mode, setMode] = useState<Mode>(saved.mode ?? "template")
  const [templateName, setTemplateName] = useState<string>(saved.templateName ?? "")
  const [language, setLanguage] = useState<string>(saved.language ?? "ar")
  const [nameInBody, setNameInBody] = useState<boolean>(saved.nameInBody ?? true)
  const [buttonSuffix, setButtonSuffix] = useState<string>(saved.buttonSuffix ?? "")
  const [bodyText, setBodyText] = useState<string>(
    saved.bodyText ?? "حياكم الله {name} 🌸\nيسعدنا دعوتكم لحضور حفلنا. تجدون الدعوة بالملف أعلاه، أو اضغطوا الزر لفتحها.",
  )
  const [buttonLabel, setButtonLabel] = useState<string>(saved.buttonLabel ?? "فتح الدعوة")
  const [recipientsText, setRecipientsText] = useState<string>(saved.recipientsText ?? "")
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<Result[] | null>(null)

  // الرابط الافتراضي من الدعوة المختارة (ما يمسح رابط كتبتيه يدوياً)
  useEffect(() => {
    if (invId === "") return
    if (!saved.linkUrl || saved.invId !== invId) {
      setLinkUrl(`${window.location.origin}/?preview=${invId}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invId])

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ invId, linkUrl, pdfUrl, pdfName, mode, templateName, language, nameInBody, buttonSuffix, bodyText, buttonLabel, recipientsText }),
      )
    } catch {
      /* التخزين المحلي اختياري */
    }
  }, [invId, linkUrl, pdfUrl, pdfName, mode, templateName, language, nameInBody, buttonSuffix, bodyText, buttonLabel, recipientsText])

  const recipients = useMemo(() => parseRecipients(recipientsText), [recipientsText])

  const onPdf = async (file: File | undefined) => {
    if (!file) return
    setError("")
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("الملف لازم يكون PDF.")
      return
    }
    setUploading(true)
    const r = await uploadMedia(file, "whatsapp-pdf")
    setUploading(false)
    if (!r.success || !r.url) {
      setError(r.bucketMissing ? "مخزن الملفات (invitation-media) مو موجود بـ Supabase." : r.error || "تعذّر رفع الملف.")
      return
    }
    setPdfUrl(r.url)
    setPdfName(file.name)
  }

  const send = async () => {
    setError("")
    setResults(null)
    if (!pdfUrl) return setError("ارفعي ملف PDF أول.")
    if (recipients.length === 0) return setError("أضيفي رقم واحد على الأقل.")
    if (!window.confirm(`راح ينرسل واتساب لـ ${recipients.length} رقم. نكمل؟`)) return
    setSending(true)
    try {
      const session = await getCurrentSession()
      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({
          mode, recipients, pdfUrl, pdfFilename: pdfName || "invitation.pdf", linkUrl,
          templateName, language, nameInBody, buttonSuffix: buttonSuffix || undefined,
          bodyText, buttonLabel,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data?.error || `فشل الإرسال (${res.status}). تأكدي إن الموقع منشور على Vercel.`)
      else setResults(data.results)
    } catch (e: any) {
      setError(e?.message || "تعذّر الاتصال بالسيرفر.")
    }
    setSending(false)
  }

  const label = "block text-xs font-bold text-[#6b5a48] mb-1.5"

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold">📲 إرسال الدعوات عبر واتساب</h2>
        <p className="text-sm text-[#8a7561] mt-1">
          يرسل لكل مدعو رسالة فيها ملف PDF وزر يفتح رابط الدعوة، بدون ما ترسلين يدوي لكل شخص.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e5d9c3] bg-white p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>الدعوة</label>
            <select className={inputCls} value={invId} onChange={(e) => setInvId(e.target.value ? Number(e.target.value) : "")}>
              {invitations.map((i) => (
                <option key={i.id} value={i.id}>{i.groom} & {i.bride} (#{i.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>رابط الزر (الدعوة)</label>
            <input className={inputCls} dir="ltr" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div>
          <label className={label}>ملف الدعوة (PDF)</label>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="px-4 py-2 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810] cursor-pointer">
              {uploading ? "جارِ الرفع..." : pdfUrl ? "تغيير الملف" : "رفع PDF"}
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => onPdf(e.target.files?.[0])} />
            </label>
            {pdfUrl && <span className="text-sm text-[#5A4A3C]" dir="ltr">📄 {pdfName || "ملف مرفوع"}</span>}
          </div>
        </div>

        <div>
          <label className={label}>طريقة الإرسال</label>
          <div className="flex gap-2 flex-wrap">
            {([["template", "قالب معتمد من Meta (لأي رقم) — الموصى به"], ["session", "رسالة عادية (لأرقام راسلتك آخر 24 ساعة فقط)"]] as const).map(([v, t]) => (
              <button key={v} onClick={() => setMode(v)} className={`px-4 py-2 rounded-full text-xs font-bold border ${mode === v ? "bg-[#D4AF37] border-[#D4AF37] text-[#2C1810]" : "border-[#e5d9c3] text-[#8a7561]"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {mode === "template" ? (
          <div className="rounded-xl bg-[#faf6ee] p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>اسم القالب (بالضبط مثل ما بـ Meta)</label>
                <input className={inputCls} dir="ltr" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="wedding_invitation" />
              </div>
              <div>
                <label className={label}>لغة القالب</label>
                <input className={inputCls} dir="ltr" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="ar" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={nameInBody} onChange={(e) => setNameInBody(e.target.checked)} />
              نص القالب فيه <code dir="ltr">{"{{1}}"}</code> = اسم المدعو
            </label>
            <div>
              <label className={label}>الجزء المتغيّر برابط الزر (اتركيه فاضي لو رابط القالب ثابت)</label>
              <input className={inputCls} dir="ltr" value={buttonSuffix} onChange={(e) => setButtonSuffix(e.target.value)} placeholder="?preview=12" />
            </div>
            <p className="text-xs text-[#8a7561] leading-relaxed">
              القالب لازم يكون بنوع Marketing/Utility، بالترويسة <b>مستند (Document)</b>، وفيه زر <b>زيارة الموقع (URL)</b>. اسم الزر ورابطه يتحددون عند إنشاء القالب بـ Meta.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-[#faf6ee] p-4 space-y-3">
            <div>
              <label className={label}>نص الرسالة (اكتبي <code>{"{name}"}</code> مكان اسم المدعو)</label>
              <textarea className={inputCls} rows={4} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
            </div>
            <div>
              <label className={label}>اسم الزر (حد أقصى 20 حرف)</label>
              <input className={inputCls} maxLength={20} value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className={label}>المدعوون — كل سطر: الاسم ثم الرقم ({recipients.length} رقم)</label>
          <textarea className={inputCls} dir="auto" rows={7} value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)} placeholder={"أبو محمد 07701234567\nأم علي +9647801234567"} />
          <p className="text-xs text-[#8a7561] mt-1">الأرقام اللي تبدأ بـ 0 تنحسب عراقية (+964). الحد الأقصى 100 رقم بالمرة.</p>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

        <button onClick={send} disabled={sending || uploading} className="px-6 py-3 rounded-full text-sm font-bold bg-[#25D366] text-white disabled:opacity-50">
          {sending ? "جارِ الإرسال..." : `إرسال لـ ${recipients.length} رقم`}
        </button>

        {results && (
          <div className="space-y-1.5">
            <p className="text-sm font-bold">
              تم: {results.filter((r) => r.ok).length} — فشل: {results.filter((r) => !r.ok).length}
            </p>
            {results.map((r, i) => (
              <div key={i} className={`text-xs rounded-lg px-3 py-2 ${r.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
                {r.ok ? "✓" : "✗"} {r.name || ""} <span dir="ltr">{r.phone}</span> {r.error ? `— ${r.error}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="rounded-2xl border border-[#e5d9c3] bg-white p-5 text-sm text-[#5A4A3C]">
        <summary className="font-bold cursor-pointer">⚙️ الإعداد لمرة وحدة (مطلوب قبل أول إرسال)</summary>
        <ol className="list-decimal pr-5 mt-3 space-y-1.5 leading-relaxed">
          <li>سوّي حساب <b>WhatsApp Business Platform</b> بـ Meta وسجّلي رقم الإرسال.</li>
          <li>أنشئي <b>قالب رسالة</b> (ترويسة مستند + نص + زر رابط) وانتظري اعتماده.</li>
          <li>بـ Vercel → Settings → Environment Variables أضيفي <code dir="ltr">WHATSAPP_TOKEN</code> و <code dir="ltr">WHATSAPP_PHONE_NUMBER_ID</code> ثم أعيدي النشر.</li>
        </ol>
      </details>
    </div>
  )
}
