import { useEffect, useState } from "react"
import { Invitation, SiteSettings } from "./types"
import {
  saveInvitation,
  deleteInvitation,
  signInWithPassword,
  signOut,
  getCurrentSession,
  saveSiteSettings,
} from "./backend"

const categories = [
  { id: "wedding", label: "زفاف" },
  { id: "engagement", label: "خطوبة" },
  { id: "baby", label: "مولود" },
  { id: "graduation", label: "تخرج" },
  { id: "birthday", label: "عيد ميلاد" },
]

const HERO_BG_OPTIONS = ["/images/hero-bg.jpg", "/images/hero-bg-2.jpg"]
const INTRO_VIDEO_OPTIONS = ["/videos/intro.mp4", "/videos/intro-2.mp4"]
const INTRO_POSTER_OPTIONS = [
  "/videos/intro-poster.jpg",
  "/videos/intro-poster-2.jpg",
]
const MUSIC_OPTIONS = ["/music/background.mp3", "/music/background-2.mp3"]

// رابط جدول تأكيدات الحضور بجوجل شيت الخاص بهذي الدعوة. نفضّل sheetUrl لو
// موجود، وإلا نبنيه من sheetId (بافتراض إنه معرّف الشيت القياسي بجوجل).
function resolveSheetLink(inv: Invitation): string | null {
  if (inv.sheetUrl) return inv.sheetUrl
  if (inv.sheetId) return `https://docs.google.com/spreadsheets/d/${inv.sheetId}/edit`
  return null
}

function emptyInvitation(nextId: number): Invitation {
  return {
    id: nextId,
    category: "wedding",
    title: "",
    subtitle: "",
    groom: "",
    bride: "",
    date: "",
    dateGreg: "",
    time: "",
    venue: "",
    city: "",
    groomFamily: "",
    brideFamily: "",
    gradient: ["#1A0E10", "#2A161A", "#1A0E10"],
    accentColor: "#D4AF37",
    tag: "",
    price: "",
    verse: "",
    templateType: undefined,
    heroBg: "",
    doorBgVideo: "",
    introVideo: "",
    introPoster: "",
    musicUrl: "",
    sheetId: "",
    sheetUrl: "",
    isPrivate: false,
  }
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-bold text-[#2C1810]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[#8a7561]">{hint}</span>}
    </label>
  )
}

const inputClass =
  "w-full rounded-lg border border-[#e5d9c3] bg-white px-3 py-2 text-sm text-[#2C1810] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"

function InvitationForm({
  initial,
  isNew,
  onCancel,
  onSaved,
}: {
  initial: Invitation
  isNew: boolean
  onCancel: () => void
  onSaved: (inv: Invitation) => void
}) {
  const [inv, setInv] = useState<Invitation>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const set = <K extends keyof Invitation>(key: K, value: Invitation[K]) =>
    setInv((prev) => ({ ...prev, [key]: value }))

  const setGradientAt = (idx: number, value: string) => {
    const next = [...(inv.gradient ?? [])]
    next[idx] = value
    set("gradient", next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")
    const cleanInv: Invitation = {
      ...inv,
      templateType: inv.heroBg || inv.introVideo ? "wisal" : undefined,
    }
    const result = await saveInvitation(cleanInv)
    setSaving(false)
    if (!result.success) {
      setError(result.error || "صار خطأ أثناء الحفظ، حاول مرة ثانية")
      return
    }
    const notices: string[] = []
    if (cleanInv.isPrivate && !result.savedPrivacy) {
      notices.push(
        "⚠️ مهم: خاصية (دعوة خاصة) ما انحفظت لأن عمود isPrivate غير موجود بجدول invitations بعد — يعني هذي الدعوة راح تظهر بالصفحة الرئيسية للعموم رغم إنك حددتها خاصة! لازم تضيف العمود بالقاعدة أولاً (شوف التعليمات تحت).",
      )
    }
    if (!result.savedExtraFields) {
      notices.push(
        "انحفظت الدعوة، لكن حقول (التاريخ الهجري، المدينة، عائلة العريس، عائلة العروس) ما انحفظت بقاعدة البيانات لأن أعمدتها غير موجودة بجدول invitations بعد — تنعرض بس محلياً بهذا المتصفح.",
      )
    }
    if (notices.length > 0) setNotice(notices.join(" "))
    onSaved(cleanInv)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-2xl border border-[#e5d9c3] p-5 sm:p-7"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ fontFamily: "Amiri, serif" }}>
          {isNew ? "إنشاء دعوة جديدة" : "تعديل الدعوة"} #{inv.id}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[#8a7561] hover:text-[#2C1810]"
        >
          إلغاء
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}
      {notice && (
        <div
          className={`rounded-lg border text-sm px-4 py-3 ${
            notice.includes("⚠️")
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {notice}
        </div>
      )}

      {/* بيانات أساسية */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          بيانات أساسية
        </legend>
        <Field label="العنوان (title)">
          <input
            className={inputClass}
            value={inv.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </Field>
        <Field label="العنوان الفرعي (subtitle)">
          <input
            className={inputClass}
            value={inv.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </Field>
        <Field label="التصنيف">
          <select
            className={inputClass}
            value={inv.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الوسم (tag)" hint="مثال: مميز، جديد">
          <input
            className={inputClass}
            value={inv.tag}
            onChange={(e) => set("tag", e.target.value)}
          />
        </Field>
        <Field label="السعر">
          <input
            className={inputClass}
            value={inv.price}
            onChange={(e) => set("price", e.target.value)}
          />
        </Field>
      </fieldset>

      {/* أسماء وعوائل */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          العروسين والعوائل
        </legend>
        <Field label="اسم العريس">
          <input
            className={inputClass}
            value={inv.groom}
            onChange={(e) => set("groom", e.target.value)}
          />
        </Field>
        <Field label="اسم العروس">
          <input
            className={inputClass}
            value={inv.bride}
            onChange={(e) => set("bride", e.target.value)}
          />
        </Field>
        <Field
          label="عائلة العريس"
          hint="قد لا ينحفظ بالقاعدة إذا العمود غير موجود بعد"
        >
          <input
            className={inputClass}
            value={inv.groomFamily}
            onChange={(e) => set("groomFamily", e.target.value)}
          />
        </Field>
        <Field
          label="عائلة العروس"
          hint="قد لا ينحفظ بالقاعدة إذا العمود غير موجود بعد"
        >
          <input
            className={inputClass}
            value={inv.brideFamily}
            onChange={(e) => set("brideFamily", e.target.value)}
          />
        </Field>
      </fieldset>

      {/* تفاصيل المناسبة */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          تفاصيل المناسبة
        </legend>
        <Field label="التاريخ الهجري" hint="قد لا ينحفظ بالقاعدة">
          <input
            className={inputClass}
            value={inv.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label="التاريخ الميلادي (dateGreg)">
          <input
            className={inputClass}
            value={inv.dateGreg}
            onChange={(e) => set("dateGreg", e.target.value)}
          />
        </Field>
        <Field label="الوقت">
          <input
            className={inputClass}
            value={inv.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </Field>
        <Field label="القاعة / الموقع (venue)">
          <input
            className={inputClass}
            value={inv.venue}
            onChange={(e) => set("venue", e.target.value)}
          />
        </Field>
        <Field label="المدينة" hint="قد لا ينحفظ بالقاعدة">
          <input
            className={inputClass}
            value={inv.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
      </fieldset>

      {/* التصميم */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          التصميم
        </legend>
        <Field label="لون التمييز (accentColor)">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={inv.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
              className="h-9 w-12 rounded border border-[#e5d9c3]"
            />
            <input
              className={inputClass}
              value={inv.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
            />
          </div>
        </Field>
        <Field label="التدرج اللوني (gradient)">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="color"
                value={inv.gradient?.[i] ?? "#000000"}
                onChange={(e) => setGradientAt(i, e.target.value)}
                className="h-9 w-full rounded border border-[#e5d9c3]"
              />
            ))}
          </div>
        </Field>
        <Field label="الآية / النص الديني" hint="يظهر أعلى الدعوة">
          <textarea
            className={inputClass}
            rows={2}
            value={inv.verse}
            onChange={(e) => set("verse", e.target.value)}
          />
        </Field>
      </fieldset>

      {/* قالب وصال (باب متحرك) والوسائط */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          قالب "وصال" والوسائط (اختياري)
        </legend>
        <Field label="خلفية الصفحة (heroBg)">
          <select
            className={inputClass}
            value={inv.heroBg || ""}
            onChange={(e) => set("heroBg", e.target.value)}
          >
            <option value="">بدون</option>
            {HERO_BG_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="فيديو المقدمة (introVideo)">
          <select
            className={inputClass}
            value={inv.introVideo || ""}
            onChange={(e) => set("introVideo", e.target.value)}
          >
            <option value="">بدون</option>
            {INTRO_VIDEO_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="صورة غلاف الفيديو (introPoster)">
          <select
            className={inputClass}
            value={inv.introPoster || ""}
            onChange={(e) => set("introPoster", e.target.value)}
          >
            <option value="">بدون</option>
            {INTRO_POSTER_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الموسيقى (musicUrl)">
          <select
            className={inputClass}
            value={inv.musicUrl || ""}
            onChange={(e) => set("musicUrl", e.target.value)}
          >
            <option value="">بدون</option>
            {MUSIC_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="فيديو خلفية الباب (doorBgVideo)"
          hint="مسار ملف يدوي إذا رفعته لمجلد public/videos"
        >
          <input
            className={inputClass}
            value={inv.doorBgVideo || ""}
            onChange={(e) => set("doorBgVideo", e.target.value)}
            placeholder="/videos/door-bg.mp4"
          />
        </Field>
      </fieldset>

      {/* ربط تأكيد الحضور RSVP */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          تأكيد الحضور (Google Sheet)
        </legend>
        <Field
          label="معرّف الشيت (sheetId)"
          hint="بدونه تبقى الدعوة معاينة محلية فقط، بدون إرسال RSVP حقيقي"
        >
          <input
            className={inputClass}
            value={inv.sheetId || ""}
            onChange={(e) => set("sheetId", e.target.value)}
          />
        </Field>
        <Field label="رابط الشيت (sheetUrl)">
          <input
            className={inputClass}
            value={inv.sheetUrl || ""}
            onChange={(e) => set("sheetUrl", e.target.value)}
          />
        </Field>
        {resolveSheetLink(inv) && (
          <a
            href={resolveSheetLink(inv)!}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-full text-sm font-bold text-[#1a7f4b] hover:underline w-fit"
          >
            📊 فتح شيت تأكيدات الحضور بتبويب جديد
          </a>
        )}
      </fieldset>

      {/* الخصوصية */}
      <fieldset className="grid grid-cols-1 gap-3">
        <legend className="text-sm font-bold text-[#D4AF37] mb-1">
          الخصوصية
        </legend>
        <label className="flex items-start gap-3 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#D4AF37]"
            checked={!!inv.isPrivate}
            onChange={(e) => set("isPrivate", e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-bold block">دعوة خاصة</span>
            <span className="text-[#8a7561]">
              ما تظهر بشبكة الدعوات بالصفحة الرئيسية، توصل بس لمن عنده رابط
              المعاينة المباشر (?preview={inv.id}). فعّلها مع تعبئة معرّف
              الشيت (sheetId) بالأعلى حتى تنعرف تأكيدات الحضور.
            </span>
          </span>
        </label>
        {inv.isPrivate && !inv.sheetId && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            الدعوة محددة "خاصة" بس معرّف الشيت فارغ — تأكيدات الحضور ما راح
            تنرسل لأي شيت جوجل لحد ما تعبّي sheetId.
          </p>
        )}
      </fieldset>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-full text-sm font-bold border border-[#e5d9c3] text-[#2C1810]"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810] disabled:opacity-60"
        >
          {saving ? "جارِ الحفظ..." : "حفظ الدعوة"}
        </button>
      </div>
    </form>
  )
}

function SiteSettingsForm({
  initial,
  onSaved,
}: {
  initial: SiteSettings
  onSaved: () => void
}) {
  const [settings, setSettings] = useState<SiteSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => setSettings(initial), [initial])

  const set = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")
    const result = await saveSiteSettings(settings)
    setSaving(false)
    if (!result.success) {
      if (result.tableMissing) {
        setError(
          "ما انحفظت الإعدادات لأن جدول site_settings غير موجود بعد بقاعدة البيانات. لازم تسوّي الجدول أولاً بلوحة تحكم Supabase: جدول باسم site_settings بالأعمدة (id رقم صحيح - primary key، siteName نص، siteNameEn نص، logoIcon نص، heroTitle نص، whatsappNumber نص)، وبعدها جرّب الحفظ مرة ثانية.",
        )
      } else {
        setError(result.error || "صار خطأ أثناء الحفظ، حاول مرة ثانية")
      }
      return
    }
    setNotice("انحفظت إعدادات الواجهة بنجاح ✅")
    onSaved()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-2xl border border-[#e5d9c3] p-5 sm:p-7"
    >
      <h3
        className="text-lg font-bold"
        style={{ fontFamily: "Amiri, serif" }}
      >
        إعدادات الواجهة
      </h3>
      <p className="text-sm text-[#8a7561] -mt-4">
        هذي الإعدادات تتحكم بالمظهر العام للموقع (الشريط العلوي والقسم
        الرئيسي بالصفحة الرئيسية) — مو خاصة بدعوة معينة.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          {notice}
        </div>
      )}

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          الشعار والاسم
        </legend>
        <Field label="اسم الموقع (عربي)">
          <input
            className={inputClass}
            value={settings.siteName}
            onChange={(e) => set("siteName", e.target.value)}
            required
          />
        </Field>
        <Field label="اسم الموقع (إنجليزي)" hint="يظهر صغير تحت الاسم العربي">
          <input
            className={inputClass}
            value={settings.siteNameEn}
            onChange={(e) => set("siteNameEn", e.target.value)}
          />
        </Field>
        <Field
          label="أيقونة الشعار"
          hint="إيموجي أو حرف واحد يظهر بالدائرة أعلى يسار الموقع"
        >
          <input
            className={inputClass}
            value={settings.logoIcon}
            onChange={(e) => set("logoIcon", e.target.value)}
            maxLength={4}
          />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          الصفحة الرئيسية والتواصل
        </legend>
        <Field label="عنوان القسم الرئيسي" hint="يظهر أعلى شبكة الدعوات">
          <input
            className={inputClass}
            value={settings.heroTitle}
            onChange={(e) => set("heroTitle", e.target.value)}
          />
        </Field>
        <Field
          label="رقم واتساب للتواصل"
          hint="بصيغة دولية بدون + أو أصفار، مثال: 9647700000000"
        >
          <input
            className={inputClass}
            value={settings.whatsappNumber}
            onChange={(e) => set("whatsappNumber", e.target.value)}
          />
        </Field>
      </fieldset>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810] disabled:opacity-60"
        >
          {saving ? "جارِ الحفظ..." : "حفظ إعدادات الواجهة"}
        </button>
      </div>
    </form>
  )
}

function InvitationRow({
  inv,
  nextId,
  deletingId,
  setDeletingId,
  onDelete,
  onEdit,
  onCopyAsPrivate,
}: {
  inv: Invitation
  nextId: number
  deletingId: number | null
  setDeletingId: (id: number | null) => void
  onDelete: (id: number) => void
  onEdit: (inv: Invitation) => void
  onCopyAsPrivate: (inv: Invitation, nextId: number) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e5d9c3] p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: inv.accentColor }}
        />
        <div className="min-w-0">
          <p className="font-bold text-sm truncate flex items-center gap-2">
            <span>
              #{inv.id} — {inv.title || "بدون عنوان"}
            </span>
            {inv.isPrivate && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2C1810] text-[#D4AF37]">
                خاصة
              </span>
            )}
          </p>
          <p className="text-xs text-[#8a7561] truncate">
            {inv.groom} × {inv.bride} · {inv.venue || "بدون قاعة"}
            {inv.sheetId ? " · مربوطة بشيت RSVP" : " · معاينة فقط"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`?preview=${inv.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#e5d9c3]"
        >
          معاينة
        </a>
        {resolveSheetLink(inv) ? (
          <a
            href={resolveSheetLink(inv)!}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#1a7f4b]/30 bg-[#eafaf1] text-[#1a7f4b] flex items-center gap-1"
            title="فتح شيت تأكيدات الحضور بجوجل شيت"
          >
            📊 شيت الحضور
          </a>
        ) : (
          <span
            className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#e5d9c3] text-[#c7b89a] cursor-not-allowed"
            title="ما أكو sheetId أو sheetUrl مضاف لهذي الدعوة بعد"
          >
            📊 شيت الحضور
          </span>
        )}
        <button
          onClick={() => onEdit(inv)}
          className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#e5d9c3]"
        >
          تعديل
        </button>
        <button
          onClick={() => onCopyAsPrivate(inv, nextId)}
          className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#e5d9c3]"
          title="ينشئ دعوة جديدة خاصة بنفس التصميم — لا تظهر بالصفحة الرئيسية"
        >
          نسخ كدعوة خاصة
        </button>
        {deletingId === inv.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(inv.id)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-600 text-white"
            >
              تأكيد الحذف
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#e5d9c3]"
            >
              تراجع
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeletingId(inv.id)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border border-red-200 text-red-600"
          >
            حذف
          </button>
        )}
      </div>
    </div>
  )
}

function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await signInWithPassword(email, password)
    setLoading(false)
    if (!result.success) {
      setError(result.error || "تعذّر تسجيل الدخول")
      return
    }
    onSuccess()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#fefcf8] px-5"
      dir="rtl"
      style={{ fontFamily: "Tajawal, sans-serif" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl border border-[#e5d9c3] p-8 space-y-4 shadow-sm"
      >
        <h1
          className="text-xl font-bold text-center"
          style={{ fontFamily: "Amiri, serif" }}
        >
          لوحة تحكم دعوتي
        </h1>
        <p className="text-sm text-[#8a7561] text-center">
          سجّل الدخول بحساب المشرف
        </p>
        <input
          type="email"
          autoFocus
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="الإيميل"
          required
        />
        <input
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810] disabled:opacity-60"
        >
          {loading ? "جارِ الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  )
}

export default function AdminPanel({
  invitations,
  onRefresh,
  siteSettings,
  onSiteSettingsRefresh,
}: {
  invitations: Invitation[]
  onRefresh: () => void
  siteSettings: SiteSettings
  onSiteSettingsRefresh: () => void
}) {
  const [checkingSession, setCheckingSession] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "invitations" | "private" | "settings"
  >("invitations")
  const [editing, setEditing] = useState<Invitation | null>(null)
  const [editingIsNew, setEditingIsNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    getCurrentSession().then((session) => {
      setAuthed(!!session)
      setCheckingSession(false)
    })
  }, [])

  const handleLogout = async () => {
    await signOut()
    setAuthed(false)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fefcf8]">
        <p className="text-sm text-[#8a7561]">جارِ التحقق من الجلسة...</p>
      </div>
    )
  }

  if (!authed) {
    return <LoginGate onSuccess={() => setAuthed(true)} />
  }

  const nextId =
    invitations.length > 0
      ? Math.max(...invitations.map((i) => i.id)) + 1
      : 1

  const publicInvitations = invitations.filter((inv) => !inv.isPrivate)
  const privateInvitations = invitations.filter((inv) => inv.isPrivate)

  const handleDelete = async (id: number) => {
    setDeleteError("")
    const result = await deleteInvitation(id)
    if (!result.success) {
      setDeleteError(result.error || "تعذّر حذف الدعوة")
      setDeletingId(null)
      return
    }
    setDeletingId(null)
    onRefresh()
  }

  const closeForm = () => {
    setEditing(null)
    setEditingIsNew(false)
    setCreating(false)
  }

  const handleSaved = () => {
    closeForm()
    onRefresh()
  }

  const startEdit = (inv: Invitation) => {
    setEditing(inv)
    setEditingIsNew(false)
  }

  const startCopyAsPrivate = (inv: Invitation, forcedNextId: number) => {
    setEditing({
      ...inv,
      id: forcedNextId,
      sheetId: "",
      sheetUrl: "",
      isPrivate: true,
    })
    setEditingIsNew(true)
  }

  return (
    <div
      className="min-h-screen bg-[#fefcf8]"
      dir="rtl"
      style={{ fontFamily: "Tajawal, sans-serif" }}
    >
      <nav className="sticky top-0 z-40 border-b border-[#e5d9c3] bg-[#fefcf8]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-bold leading-none"
              style={{ fontFamily: "Amiri, serif" }}
            >
              لوحة تحكم دعوتي
            </h1>
            <p className="text-[10px] text-[#8a7561]">
              إدارة الدعوات — {publicInvitations.length} عامة ·{" "}
              {privateInvitations.length} خاصة
            </p>
          </div>
          <a href="?" className="text-sm text-[#8a7561] hover:text-[#2C1810]">
            ← رجوع للموقع
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#f5efe2] rounded-full p-1">
          <button
            onClick={() => {
              closeForm()
              setActiveTab("invitations")
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              activeTab === "invitations"
                ? "bg-[#D4AF37] text-[#2C1810]"
                : "text-[#8a7561]"
            }`}
          >
            الدعوات
          </button>
          <button
            onClick={() => {
              closeForm()
              setActiveTab("private")
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              activeTab === "private"
                ? "bg-[#D4AF37] text-[#2C1810]"
                : "text-[#8a7561]"
            }`}
          >
            الدعوات الخاصة
          </button>
          <button
            onClick={() => {
              closeForm()
              setActiveTab("settings")
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              activeTab === "settings"
                ? "bg-[#D4AF37] text-[#2C1810]"
                : "text-[#8a7561]"
            }`}
          >
            إعدادات الواجهة
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-[#8a7561] hover:text-red-600"
        >
          تسجيل الخروج
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {activeTab === "settings" && (
          <SiteSettingsForm
            initial={siteSettings}
            onSaved={onSiteSettingsRefresh}
          />
        )}

        {activeTab === "invitations" && !editing && !creating && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">الدعوات العامة</h2>
              <button
                onClick={() => setCreating(true)}
                className="px-5 py-2.5 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810]"
              >
                + إنشاء دعوة جديدة
              </button>
            </div>
            <p className="text-sm text-[#8a7561] -mt-3">
              هذي الدعوات تظهر بشبكة الدعوات بالصفحة الرئيسية للعموم.
            </p>

            {deleteError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              {publicInvitations.length === 0 && (
                <p className="text-sm text-[#8a7561] text-center py-10">
                  ما أكو دعوات عامة بعد.
                </p>
              )}
              {publicInvitations.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  inv={inv}
                  nextId={nextId}
                  deletingId={deletingId}
                  setDeletingId={setDeletingId}
                  onDelete={handleDelete}
                  onEdit={startEdit}
                  onCopyAsPrivate={startCopyAsPrivate}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === "private" && !editing && !creating && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">الدعوات الخاصة</h2>
              <button
                onClick={() => setCreating(true)}
                className="px-5 py-2.5 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810]"
              >
                + إنشاء دعوة جديدة
              </button>
            </div>
            <p className="text-sm text-[#8a7561] -mt-3">
              هذي الدعوات ما تظهر بشبكة الدعوات بالصفحة الرئيسية — توصل
              بس لمن عنده رابط المعاينة المباشر (?preview=ID).
            </p>

            {deleteError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              {privateInvitations.length === 0 && (
                <p className="text-sm text-[#8a7561] text-center py-10">
                  ما أكو دعوات خاصة بعد. تكدر تسوّي وحدة جديدة، أو تحدد
                  خيار "دعوة خاصة" بنموذج تعديل أي دعوة عامة.
                </p>
              )}
              {privateInvitations.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  inv={inv}
                  nextId={nextId}
                  deletingId={deletingId}
                  setDeletingId={setDeletingId}
                  onDelete={handleDelete}
                  onEdit={startEdit}
                  onCopyAsPrivate={startCopyAsPrivate}
                />
              ))}
            </div>
          </>
        )}

        {creating && (
          <InvitationForm
            initial={{
              ...emptyInvitation(nextId),
              isPrivate: activeTab === "private",
            }}
            isNew
            onCancel={closeForm}
            onSaved={handleSaved}
          />
        )}

        {editing && (
          <InvitationForm
            initial={editing}
            isNew={editingIsNew}
            onCancel={closeForm}
            onSaved={handleSaved}
          />
        )}
      </div>
    </div>
  )
}
