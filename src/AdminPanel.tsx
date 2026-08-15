import { useState } from "react"
import { Invitation } from "./types"
import { saveInvitation, deleteInvitation } from "./backend"

// كلمة مرور بسيطة لحماية لوحة التحكم من الزوار العاديين.
// ⚠️ هذا حماية سطحية فقط (client-side) — أي شخص يقدر يشوف الكود المصدري
// للموقع يقدر يلكيها. الحماية الحقيقية تصير من إعدادات Supabase نفسها عبر
// Row Level Security (RLS): تخلي القراءة عامة، لكن الإضافة/التعديل/الحذف
// تنحصر بمستخدم مسجّل دخول (Supabase Auth) بدل الاعتماد على هذا الرمز.
const ADMIN_PASSCODE = "dawaati-2026"
const SESSION_KEY = "dawaati_admin_authed"

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
    if (!result.savedExtraFields) {
      setNotice(
        "انحفظت الدعوة، لكن حقول (التاريخ الهجري، المدينة، عائلة العريس، عائلة العروس) ما انحفظت بقاعدة البيانات لأن أعمدتها غير موجودة بجدول invitations بعد — تنعرض بس محلياً بهذا المتصفح.",
      )
    }
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
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
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

function PasscodeGate({ onSuccess }: { onSuccess: () => void }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value === ADMIN_PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, "1")
      onSuccess()
    } else {
      setError("كلمة المرور غير صحيحة")
    }
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
          أدخل كلمة المرور للمتابعة
        </p>
        <input
          type="password"
          autoFocus
          className={inputClass}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="كلمة المرور"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full py-2.5 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810]"
        >
          دخول
        </button>
      </form>
    </div>
  )
}

export default function AdminPanel({
  invitations,
  onRefresh,
}: {
  invitations: Invitation[]
  onRefresh: () => void
}) {
  const [authed, setAuthed] = useState(
    sessionStorage.getItem(SESSION_KEY) === "1",
  )
  const [editing, setEditing] = useState<Invitation | null>(null)
  const [editingIsNew, setEditingIsNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState("")

  if (!authed) {
    return <PasscodeGate onSuccess={() => setAuthed(true)} />
  }

  const nextId =
    invitations.length > 0
      ? Math.max(...invitations.map((i) => i.id)) + 1
      : 1

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
              إدارة الدعوات — {invitations.length} دعوة
            </p>
          </div>
          <a href="?" className="text-sm text-[#8a7561] hover:text-[#2C1810]">
            ← رجوع للموقع
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {!editing && !creating && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">كل الدعوات</h2>
              <button
                onClick={() => setCreating(true)}
                className="px-5 py-2.5 rounded-full text-sm font-bold bg-[#D4AF37] text-[#2C1810]"
              >
                + إنشاء دعوة جديدة
              </button>
            </div>

            {deleteError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              {invitations.length === 0 && (
                <p className="text-sm text-[#8a7561] text-center py-10">
                  ما أكو دعوات بعد.
                </p>
              )}
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border border-[#e5d9c3] p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: inv.accentColor }}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">
                        #{inv.id} — {inv.title || "بدون عنوان"}
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
                    <button
                      onClick={() => {
                        setEditing(inv)
                        setEditingIsNew(false)
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#e5d9c3]"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => {
                        setEditing({
                          ...inv,
                          id: nextId,
                          sheetId: "",
                          sheetUrl: "",
                        })
                        setEditingIsNew(true)
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#e5d9c3]"
                      title="ينشئ دعوة جديدة بنفس التصميم"
                    >
                      نسخ كدعوة خاصة
                    </button>
                    {deletingId === inv.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(inv.id)}
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
              ))}
            </div>
          </>
        )}

        {creating && (
          <InvitationForm
            initial={emptyInvitation(nextId)}
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
