import { useEffect, useState } from "react"
import { Invitation, SiteSettings, CustomFont } from "./types"
import {
  saveInvitation,
  deleteInvitation,
  signInWithPassword,
  signOut,
  getCurrentSession,
  saveSiteSettings,
  createSheetForInvitation,
  uploadMedia,
} from "./backend"
import DesignPanel from "./DesignPanel"
import { DEFAULT_SCHEDULE } from "./InvitationView"

const categories = [
  { id: "wedding", label: "زفاف" },
  { id: "engagement", label: "خطوبة" },
  { id: "baby", label: "مولود" },
  { id: "graduation", label: "تخرج" },
  { id: "birthday", label: "عيد ميلاد" },
]

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
    eventDateTime: "",
    venue: "",
    mapUrl: "",
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
    schedule: [
      { label: "استقبال الضيوف", time: "٧:٠٠ مساءً" },
      { label: "عقد القران", time: "٧:٣٠ مساءً" },
      { label: "العشاء", time: "٩:٠٠ مساءً" },
    ],
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

// حقل رفع ملف وسائط (صورة/فيديو/صوت) لـ Supabase Storage. يعرض معاينة
// بسيطة للملف الحالي (لو موجود)، وزر رفع ملف جديد من جهاز المستخدم،
// بدل ما يحتاج يختار من قائمة ملفات جاهزة بس.
// يستخرج اسم ملف مقروء من رابط الرفع (يشيل المجلدات والـ timestamp
// اللي يضيفه uploadMedia، حتى ما نعرض رابط طويل مبعثر بالواجهة).
function getDisplayFilename(url: string): string {
  try {
    const last = decodeURIComponent(url.split("/").pop() || url)
    return last.replace(/^\d+-/, "")
  } catch {
    return url
  }
}

function MediaUploadField({
  label,
  hint,
  accept,
  kind,
  value,
  folder,
  onChange,
  fallback,
}: {
  label: string
  hint?: string
  accept: string
  kind: "image" | "video" | "audio"
  value: string
  folder: string
  onChange: (url: string) => void
  fallback?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [bucketMissing, setBucketMissing] = useState(false)
  const [mode, setMode] = useState<"upload" | "link">("upload")
  const [linkDraft, setLinkDraft] = useState("")
  const [replacing, setReplacing] = useState(false)
  const inputId = `upload-${folder}-${label}`.replace(/\s+/g, "-")

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError("")
    setBucketMissing(false)
    const result = await uploadMedia(file, folder)
    setUploading(false)
    if (!result.success || !result.url) {
      if (result.bucketMissing) {
        setBucketMissing(true)
      } else {
        setError(result.error || "تعذّر رفع الملف، حاول مرة ثانية")
      }
      return
    }
    setReplacing(false)
    onChange(result.url)
  }

  const handleUseLink = () => {
    const url = linkDraft.trim()
    if (!url) return
    setReplacing(false)
    onChange(url)
    setLinkDraft("")
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-bold text-[#2C1810]">{label}</span>

      {value ? (
        <div className="flex items-center gap-2.5 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg px-2.5 py-2">
          {kind === "image" && (
            <img
              src={value}
              alt=""
              className="w-9 h-9 rounded-md object-cover shrink-0 border border-[#e5d9c3]"
            />
          )}
          {kind === "video" && (
            <div className="w-9 h-9 rounded-md shrink-0 border border-[#e5d9c3] bg-[#2C1810] flex items-center justify-center text-sm">
              🎬
            </div>
          )}
          {kind === "audio" && (
            <div className="w-9 h-9 rounded-md shrink-0 border border-[#e5d9c3] bg-white flex items-center justify-center text-sm">
              🎵
            </div>
          )}

          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            title={value}
            className="min-w-0 flex-1 text-xs text-[#2C1810] hover:text-[#1a7f4b] hover:underline truncate"
          >
            {getDisplayFilename(value)}
          </a>

          <label
            htmlFor={inputId}
            title="استبدال"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-[#8a7561] hover:bg-[#e5d9c3] hover:text-[#2C1810] cursor-pointer transition"
          >
            🔄
          </label>
          <button
            type="button"
            title="إزالة"
            onClick={() => onChange("")}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition"
          >
            🗑
          </button>
        </div>
      ) : fallback && !replacing ? (
        <div className="flex items-center gap-2.5 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg px-2.5 py-2">
          {kind === "image" && (
            <img
              src={fallback}
              alt=""
              className="w-9 h-9 rounded-md object-cover shrink-0 border border-[#e5d9c3]"
            />
          )}
          {kind === "video" && (
            <div className="w-9 h-9 rounded-md shrink-0 border border-[#e5d9c3] bg-[#2C1810] flex items-center justify-center text-sm">
              🎬
            </div>
          )}
          {kind === "audio" && (
            <div className="w-9 h-9 rounded-md shrink-0 border border-[#e5d9c3] bg-white flex items-center justify-center text-sm">
              🎵
            </div>
          )}

          <span className="min-w-0 flex-1 text-xs text-[#8a7561]">
            الصورة/الملف الافتراضي اللي يظهر حالياً بالموقع — ما رفعت شي
            خاص بهذي الدعوة بعد
          </span>

          <button
            type="button"
            onClick={() => setReplacing(true)}
            className="shrink-0 px-3 py-1.5 rounded-md text-xs font-bold bg-[#D4AF37] text-[#2C1810]"
          >
            استبدال
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {fallback && (
            <button
              type="button"
              onClick={() => setReplacing(false)}
              className="text-xs text-[#8a7561] hover:text-[#2C1810]"
            >
              ← رجوع للافتراضي
            </button>
          )}
          <div className="flex items-center gap-1 bg-[#f5efe2] rounded-full p-1 w-fit">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                mode === "upload"
                  ? "bg-[#D4AF37] text-[#2C1810]"
                  : "text-[#8a7561]"
              }`}
            >
              ⬆️ رفع ملف
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                mode === "link"
                  ? "bg-[#D4AF37] text-[#2C1810]"
                  : "text-[#8a7561]"
              }`}
            >
              🔗 رابط مباشر
            </button>
          </div>

          {mode === "upload" ? (
            <label
              htmlFor={inputId}
              className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e5d9c3] rounded-lg py-3 text-sm text-[#8a7561] hover:border-[#D4AF37] hover:text-[#2C1810] cursor-pointer transition"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>جارٍ الرفع...</span>
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  <span>اضغط لرفع ملف</span>
                </>
              )}
            </label>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="url"
                dir="ltr"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleUseLink}
                disabled={!linkDraft.trim()}
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-[#D4AF37] text-[#2C1810] disabled:opacity-50"
              >
                استخدام
              </button>
            </div>
          )}
        </div>
      )}

      <input
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {hint && <span className="text-xs text-[#8a7561]">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {bucketMissing && (
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          مخزن الملفات "invitation-media" غير موجود بعد بـ Supabase Storage.
          روح لـ Supabase → Storage → New bucket → اكتب الاسم بالضبط
          invitation-media وفعّل "Public bucket"، وبعدها جرّب الرفع مرة
          ثانية.
        </span>
      )}
    </div>
  )
}

// إدارة مكتبة الخطوط المخصصة (SiteSettings.customFonts). كل خط = اسم
// يظهر بقائمة اختيار الخط + رابط ملف الخط الفعلي (يترفع لنفس مخزن
// invitation-media بمجلد "fonts"، أو تقدر تلصق رابط ملف خط جاهز مباشرة).
// التغييرات هنا محلية بس (state الفورم) لحد ما يضغط المستخدم "حفظ
// إعدادات الواجهة" بالفورم الأب — نفس سلوك باقي حقول SiteSettingsForm.
function FontsManagerField({
  value,
  onChange,
}: {
  value: CustomFont[]
  onChange: (fonts: CustomFont[]) => void
}) {
  const [nameDraft, setNameDraft] = useState("")
  const [linkDraft, setLinkDraft] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [bucketMissing, setBucketMissing] = useState(false)

  const addFont = (url: string) => {
    const name = nameDraft.trim()
    if (!name || !url.trim()) return
    if (value.some((f) => f.name === name)) {
      setError("فيه خط باسم مطابق مسجل مسبقاً — اختر اسم ثاني")
      return
    }
    onChange([...value, { name, url: url.trim() }])
    setNameDraft("")
    setLinkDraft("")
    setError("")
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!nameDraft.trim()) {
      setError("اكتب اسم الخط أول قبل ما ترفع الملف")
      return
    }
    setUploading(true)
    setError("")
    setBucketMissing(false)
    const result = await uploadMedia(file, "fonts")
    setUploading(false)
    if (!result.success || !result.url) {
      if (result.bucketMissing) setBucketMissing(true)
      else setError(result.error || "تعذّر رفع ملف الخط، حاول مرة ثانية")
      return
    }
    addFont(result.url)
  }

  const removeFont = (name: string) => {
    onChange(value.filter((f) => f.name !== name))
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((f) => (
            <li
              key={f.name}
              className="flex items-center gap-2.5 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg px-3 py-2"
            >
              <span
                className="min-w-0 flex-1 text-sm font-bold text-[#2C1810] truncate"
                style={{ fontFamily: `'${f.name}'` }}
                title={f.name}
              >
                {f.name} — أبجد هوز
              </span>
              <button
                type="button"
                title="إزالة"
                onClick={() => removeFont(f.name)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 bg-[#f5efe2] rounded-lg p-3">
        <input
          className={inputClass}
          placeholder="اسم الخط (مثلاً: خط الدعوة الجديد)"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label
            htmlFor="font-file-upload"
            className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-2.5 text-sm cursor-pointer transition ${
              nameDraft.trim()
                ? "border-[#e5d9c3] text-[#8a7561] hover:border-[#D4AF37] hover:text-[#2C1810]"
                : "border-[#e5d9c3] text-[#c9bda6] cursor-not-allowed"
            }`}
          >
            {uploading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>جارٍ الرفع...</span>
              </>
            ) : (
              <>
                <span>⬆️</span>
                <span>رفع ملف خط (ttf/otf/woff/woff2)</span>
              </>
            )}
          </label>
          <input
            id="font-file-upload"
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
            className="hidden"
            disabled={uploading || !nameDraft.trim()}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="url"
            dir="ltr"
            className={inputClass}
            placeholder="أو الصق رابط ملف خط مباشر (https://...woff2)"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
          />
          <button
            type="button"
            onClick={() => addFont(linkDraft)}
            disabled={!nameDraft.trim() || !linkDraft.trim()}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-[#D4AF37] text-[#2C1810] disabled:opacity-50"
          >
            إضافة
          </button>
        </div>
      </div>

      {error && <span className="text-xs text-red-600">{error}</span>}
      {bucketMissing && (
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          مخزن الملفات "invitation-media" غير موجود بعد بـ Supabase Storage.
          روح لـ Supabase → Storage → New bucket → اكتب الاسم بالضبط
          invitation-media وفعّل "Public bucket"، وبعدها جرّب الرفع مرة
          ثانية.
        </span>
      )}
    </div>
  )
}

// رابط الفيديو الافتراضي لو اللاحقة تدل إنه فيديو (نستخدمه لما المستخدم
// يلصق رابط مباشر بدل ما يرفع ملف، حتى نعرف نحطه بحقل doorBgVideo أو
// heroBg الصحيح).
function looksLikeVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
}

// حقل خلفية القسم الأول — يجمع heroBg (صورة) و doorBgVideo (فيديو) بحقل
// واحد: يرفع أي وحدة منهم والنظام يحدد نوعها تلقائياً ويخزنها بالمكان
// الصح، وكل وحدة تلغي الثانية (إما صورة أو فيديو، مو الاثنين مع بعض).
function HeroBackgroundField({
  heroBg,
  doorBgVideo,
  onChangeHeroBg,
  onChangeDoorBgVideo,
}: {
  heroBg: string
  doorBgVideo: string
  onChangeHeroBg: (url: string) => void
  onChangeDoorBgVideo: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [bucketMissing, setBucketMissing] = useState(false)
  const [mode, setMode] = useState<"upload" | "link">("upload")
  const [linkDraft, setLinkDraft] = useState("")
  const [replacing, setReplacing] = useState(false)
  const inputId = "upload-hero-section-media"

  const value = doorBgVideo || heroBg
  const kind: "image" | "video" = doorBgVideo ? "video" : "image"
  const fallback = "/images/hero-bg.jpg"

  const applyResult = (url: string, isVideo: boolean) => {
    setReplacing(false)
    if (isVideo) {
      onChangeDoorBgVideo(url)
      onChangeHeroBg("")
    } else {
      onChangeHeroBg(url)
      onChangeDoorBgVideo("")
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const isVideo = file.type.startsWith("video/")
    setUploading(true)
    setError("")
    setBucketMissing(false)
    const result = await uploadMedia(file, isVideo ? "door-bg-video" : "hero-bg")
    setUploading(false)
    if (!result.success || !result.url) {
      if (result.bucketMissing) {
        setBucketMissing(true)
      } else {
        setError(result.error || "تعذّر رفع الملف، حاول مرة ثانية")
      }
      return
    }
    applyResult(result.url, isVideo)
  }

  const handleUseLink = () => {
    const url = linkDraft.trim()
    if (!url) return
    applyResult(url, looksLikeVideoUrl(url))
    setLinkDraft("")
  }

  const handleRemove = () => {
    onChangeHeroBg("")
    onChangeDoorBgVideo("")
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-bold text-[#2C1810]">
        خلفية القسم الأول — صورة أو فيديو
      </span>

      {value ? (
        <div className="flex items-center gap-2.5 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg px-2.5 py-2">
          {kind === "image" ? (
            <img
              src={value}
              alt=""
              className="w-9 h-9 rounded-md object-cover shrink-0 border border-[#e5d9c3]"
            />
          ) : (
            <div className="w-9 h-9 rounded-md shrink-0 border border-[#e5d9c3] bg-[#2C1810] flex items-center justify-center text-sm">
              🎬
            </div>
          )}

          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            title={value}
            className="min-w-0 flex-1 text-xs text-[#2C1810] hover:text-[#1a7f4b] hover:underline truncate"
          >
            {getDisplayFilename(value)} · {kind === "image" ? "صورة" : "فيديو"}
          </a>

          <label
            htmlFor={inputId}
            title="استبدال"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-[#8a7561] hover:bg-[#e5d9c3] hover:text-[#2C1810] cursor-pointer transition"
          >
            🔄
          </label>
          <button
            type="button"
            title="إزالة"
            onClick={handleRemove}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition"
          >
            🗑
          </button>
        </div>
      ) : !replacing ? (
        <div className="flex items-center gap-2.5 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg px-2.5 py-2">
          <img
            src={fallback}
            alt=""
            className="w-9 h-9 rounded-md object-cover shrink-0 border border-[#e5d9c3]"
          />
          <span className="min-w-0 flex-1 text-xs text-[#8a7561]">
            الخلفية الافتراضية اللي تظهر حالياً — ما رفعت صورة أو فيديو
            خاص بهذي الدعوة بعد
          </span>
          <button
            type="button"
            onClick={() => setReplacing(true)}
            className="shrink-0 px-3 py-1.5 rounded-md text-xs font-bold bg-[#D4AF37] text-[#2C1810]"
          >
            استبدال
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setReplacing(false)}
            className="text-xs text-[#8a7561] hover:text-[#2C1810]"
          >
            ← رجوع للافتراضي
          </button>
          <div className="flex items-center gap-1 bg-[#f5efe2] rounded-full p-1 w-fit">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                mode === "upload"
                  ? "bg-[#D4AF37] text-[#2C1810]"
                  : "text-[#8a7561]"
              }`}
            >
              ⬆️ رفع ملف
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                mode === "link"
                  ? "bg-[#D4AF37] text-[#2C1810]"
                  : "text-[#8a7561]"
              }`}
            >
              🔗 رابط مباشر
            </button>
          </div>

          {mode === "upload" ? (
            <label
              htmlFor={inputId}
              className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e5d9c3] rounded-lg py-3 text-sm text-[#8a7561] hover:border-[#D4AF37] hover:text-[#2C1810] cursor-pointer transition"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>جارٍ الرفع...</span>
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  <span>اضغط لرفع صورة أو فيديو</span>
                </>
              )}
            </label>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="url"
                dir="ltr"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleUseLink}
                disabled={!linkDraft.trim()}
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-[#D4AF37] text-[#2C1810] disabled:opacity-50"
              >
                استخدام
              </button>
            </div>
          )}
        </div>
      )}

      <input
        id={inputId}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <span className="text-xs text-[#8a7561]">
        صورة ثابتة أو فيديو متحرك للخلفية الرئيسية بأول الدعوة — ارفع أي
        وحدة منهم وبتنحط تلقائياً بالمكان الصح
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
      {bucketMissing && (
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          مخزن الملفات "invitation-media" غير موجود بعد بـ Supabase Storage.
          روح لـ Supabase → Storage → New bucket → اكتب الاسم بالضبط
          invitation-media وفعّل "Public bucket"، وبعدها جرّب الرفع مرة
          ثانية.
        </span>
      )}
    </div>
  )
}

function InvitationForm({
  initial,
  isNew,
  onCancel,
  onSaved,
}: {
  initial: Invitation
  isNew: boolean
  onCancel: () => void
  onSaved: (inv: Invitation, keepFormOpen?: boolean) => void
}) {
  // لو الدعوة ما عندها برنامج حفل مخصص محفوظ، نبدأ النموذج بنفس القيم
  // الافتراضية اللي تظهر فعلياً بصفحة الدعوة (DEFAULT_SCHEDULE) بدل قائمة
  // فاضية — حتى المشرف يشوف وين بالضبط يعدّل، مو يبدأ من الصفر بالضغط
  // على "+" ثلاث مرات أول شي.
  const [inv, setInv] = useState<Invitation>(() => ({
    ...initial,
    schedule:
      initial.schedule && initial.schedule.length > 0
        ? initial.schedule
        : DEFAULT_SCHEDULE.map((item) => ({ ...item })),
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [creatingSheet, setCreatingSheet] = useState(false)
  const [sheetError, setSheetError] = useState("")
  const [showManualSheet, setShowManualSheet] = useState(false)

  const ADD_INVITATION_COLUMNS_SQL = `alter table public.invitations
  add column if not exists "isPrivate" boolean default false,
  add column if not exists "sheetId" text,
  add column if not exists "sheetUrl" text,
  add column if not exists "date" text,
  add column if not exists "city" text,
  add column if not exists "groomFamily" text,
  add column if not exists "brideFamily" text,
  add column if not exists "mapUrl" text,
  add column if not exists "eventDateTime" text,
  add column if not exists "coverImage" text,
  add column if not exists "hideCoverOverlay" boolean default false,
  add column if not exists "schedule" jsonb;`

  const set = <K extends keyof Invitation>(key: K, value: Invitation[K]) =>
    setInv((prev) => ({ ...prev, [key]: value }))

  // نفس فكرة normalizeExternalUrl بصفحة الدعوة: لو المشرف لصق رابط بدون
  // بروتوكول (مثلاً "maps.google.com/..." بدون https:// بالأول)، نضيفه
  // هنا وقت الحفظ حتى الرابط المخزّن بالقاعدة يكون صحيح دايماً وما نعتمد
  // بس على التصحيح وقت العرض.
  const normalizeMapUrl = (url: string): string => {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const handleCreateSheet = async () => {
    setCreatingSheet(true)
    setSheetError("")
    const result = await createSheetForInvitation({
      title:
        inv.title ||
        `دعوة خاصة — ${inv.groom || ""} و${inv.bride || ""}`.trim(),
    })
    setCreatingSheet(false)
    if (!result.success || !result.sheetId) {
      setSheetError(
        result.error ||
          "تعذّر إنشاء الشيت تلقائياً. جرّب مرة ثانية، أو عبّي معرّف شيت موجود يدوياً.",
      )
      return
    }
    setInv((prev) => ({
      ...prev,
      sheetId: result.sheetId!,
      sheetUrl: result.sheetUrl || "",
    }))
  }

  // أول ما تنفتح نموذج دعوة جديدة وما عندها شيت بعد، نسوّي لها شيت
  // جوجل تلقائياً بدون ما نطلب من المستخدم يسوّيه يدوياً وينسخ المعرّف.
  useEffect(() => {
    if (isNew && !inv.sheetId) {
      handleCreateSheet()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setGradientAt = (idx: number, value: string) => {
    const next = [...(inv.gradient ?? [])]
    next[idx] = value
    set("gradient", next)
  }

  // تحرير برنامج الحفل (الجدول الزمني الذهبي بصفحة الدعوة): إضافة/حذف/
  // تعديل عنصر (نص + وقت)، مع الحفاظ على الترتيب اللي يتحكم فيه المشرف.
  const setScheduleField = (
    idx: number,
    key: "label" | "time",
    value: string,
  ) => {
    const next = [...(inv.schedule ?? [])]
    next[idx] = { ...next[idx], [key]: value }
    set("schedule", next)
  }

  const addScheduleItem = () => {
    set("schedule", [...(inv.schedule ?? []), { label: "", time: "" }])
  }

  const removeScheduleItem = (idx: number) => {
    set(
      "schedule",
      (inv.schedule ?? []).filter((_, i) => i !== idx),
    )
  }

  const moveScheduleItem = (idx: number, direction: -1 | 1) => {
    const list = [...(inv.schedule ?? [])]
    const target = idx + direction
    if (target < 0 || target >= list.length) return
    ;[list[idx], list[target]] = [list[target], list[idx]]
    set("schedule", list)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")
    const cleanInv: Invitation = {
      ...inv,
      mapUrl: normalizeMapUrl(inv.mapUrl || ""),
      templateType: inv.heroBg || inv.introVideo ? "wisal" : undefined,
      // نشيل عناصر برنامج الحفل الفاضية كلياً (بدون نص وبدون وقت) قبل
      // الحفظ، حتى ما تظهر نقاط فاضية بخط الجدول الزمني بصفحة الدعوة.
      schedule: (inv.schedule ?? []).filter(
        (item) => item.label.trim() || item.time.trim(),
      ),
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
    if ((cleanInv.sheetId || cleanInv.sheetUrl) && !result.savedSheetLink) {
      notices.push(
        "⚠️ مهم: رابط شيت الحضور (sheetId/sheetUrl) ما انحفظ لأن أعمدتها غير موجودة بجدول invitations بعد — يعني زر 'شيت الحضور' راح يظل معطّل حتى لو حاطط القيمة هنا. لازم تضيف الأعمدة بالقاعدة أولاً (شوف التعليمات تحت).",
      )
    }
    if (cleanInv.mapUrl && !result.savedMapUrl) {
      notices.push(
        "⚠️ مهم: رابط الموقع (mapUrl) ما انحفظ لأن عمودها غير موجود بجدول invitations بعد — يعني زر 'الموقع على الخريطة' راح يفتح الرابط الافتراضي مو الرابط اللي حاططه. لازم تضيف العمود بالقاعدة أولاً (شوف التعليمات تحت).",
      )
    }
    if (cleanInv.eventDateTime && !result.savedEventDateTime) {
      notices.push(
        "⚠️ مهم: موعد المناسبة (eventDateTime) ما انحفظ لأن عمودها غير موجود بجدول invitations بعد — يعني العداد التنازلي بصفحة الدعوة راح يرجع للأرقام الافتراضية الوهمية مو الوقت الحقيقي اللي حاططه. لازم تضيف العمود بالقاعدة أولاً (شوف التعليمات تحت).",
      )
    }
    if (cleanInv.coverImage && !result.savedCoverImage) {
      notices.push(
        "⚠️ مهم: صورة العرض (coverImage) ما انحفظت لأن عمودها غير موجود بجدول invitations بعد — يعني الكرت بالصفحة الرئيسية راح يستمر يعرض خلفية القسم الأول أو التدرج اللوني مو الصورة اللي رفعتها. لازم تضيف العمود بالقاعدة أولاً (شوف التعليمات تحت).",
      )
    }
    if (
      cleanInv.schedule &&
      cleanInv.schedule.length > 0 &&
      !result.savedSchedule
    ) {
      notices.push(
        "⚠️ مهم: برنامج الحفل (schedule) ما انحفظ لأن عمودها غير موجود بجدول invitations بعد — يعني قسم «برنامج الحفل» بصفحة الدعوة راح يستمر يعرض القيم اللي كانت محفوظة قبل (أو يختفي لو ما كان فيه شي أصلاً) مو التعديل اللي سويته هنا. لازم تضيف العمود بالقاعدة أولاً (شوف التعليمات تحت).",
      )
    }
    if (!result.savedExtraFields) {
      notices.push(
        "انحفظت الدعوة، لكن حقول (التاريخ الهجري، المدينة، عائلة العريس، عائلة العروس) ما انحفظت بقاعدة البيانات لأن أعمدتها غير موجودة بجدول invitations بعد — تنعرض بس محلياً بهذا المتصفح.",
      )
    }
    if (notices.length > 0) setNotice(notices.join(" "))
    // لو فيه تنبيه مهم (⚠️) نخلي النموذج مفتوح حتى يقراه المستخدم —
    // قبل كانت onSaved تسكّر النموذج فوراً حتى لو كان فيه تنبيه، فينسكر
    // قبل لا حتى يشوفه المستخدم (وهذا سبب ليش الرابط "يحفظ بدون أي
    // رسالة" — الرسالة كانت تطلع وتختفي بنفس اللحظة).
    const hasWarning = notices.some((n) => n.includes("⚠️"))
    onSaved(cleanInv, hasWarning)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-2xl border border-[#e5d9c3] p-5 sm:p-7"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ fontFamily: "Amiri, serif" }}>
          {isNew
            ? inv.isPrivate
              ? "إنشاء دعوة خاصة"
              : "إنشاء دعوة جديدة"
            : "تعديل الدعوة"}{" "}
          #{inv.id}
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
      {notice.includes("⚠️") && (
        <div className="rounded-lg bg-[#2C1810] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D4AF37]">
              أمر SQL — الصق هذا بـ Supabase SQL Editor وشغّله
            </span>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(ADD_INVITATION_COLUMNS_SQL)
                  .catch(() => {})
              }
              className="text-xs font-bold text-[#D4AF37] hover:underline shrink-0"
            >
              نسخ
            </button>
          </div>
          <pre
            dir="ltr"
            className="text-xs text-[#f5efe2] overflow-x-auto whitespace-pre-wrap leading-relaxed"
          >
            {ADD_INVITATION_COLUMNS_SQL}
          </pre>
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
      </fieldset>

      {/* تفاصيل المناسبة */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          تفاصيل المناسبة
        </legend>
        <Field
          label="موعد المناسبة (للعداد التنازلي)"
          hint="هذا التاريخ والوقت هو اللي يُحسب عليه العداد التنازلي الحقيقي بصفحة الدعوة"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={inv.eventDateTime || ""}
            onChange={(e) => set("eventDateTime", e.target.value)}
          />
        </Field>
        <Field label="القاعة / الموقع (venue)">
          <input
            className={inputClass}
            value={inv.venue}
            onChange={(e) => set("venue", e.target.value)}
          />
        </Field>
        <Field
          label="رابط الموقع (خرائط جوجل)"
          hint="الرابط اللي ينفتح لما الضيف يضغط زر «الموقع على الخريطة». اتركه فاضي لاستخدام رابط خرائط جوجل الافتراضي"
        >
          <input
            type="url"
            dir="ltr"
            className={inputClass}
            value={inv.mapUrl || ""}
            onChange={(e) => set("mapUrl", e.target.value)}
            placeholder="https://maps.google.com/..."
          />
        </Field>
      </fieldset>

      {/* برنامج الحفل — الجدول الزمني الذهبي بصفحة الدعوة (استقبال الضيوف،
          عقد القران، العشاء...) — قابل للتعديل والإضافة والحذف وإعادة الترتيب */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold text-[#D4AF37] mb-1">
          برنامج الحفل (الجدول الزمني)
        </legend>
        <p className="text-xs text-[#8a7561] -mt-2">
          يظهر كخط ذهبي بصفحة الدعوة. كل صف عنصر (مثلاً "عقد القران") مع
          وقته (مثلاً "٧:٣٠ مساءً"). القائمة تحت مبيّنة لك بالقيم
          الافتراضية جاهزة للتعديل. لو حذفت كل الصفوف وحفظت، قسم "برنامج
          الحفل" بالكامل يختفي من صفحة الدعوة.
        </p>
        <div className="flex flex-col gap-2">
          {(inv.schedule ?? []).map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg p-2"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveScheduleItem(idx, -1)}
                  disabled={idx === 0}
                  className="text-xs text-[#8a7561] disabled:opacity-30 hover:text-[#D4AF37]"
                  title="تحريك لأعلى"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveScheduleItem(idx, 1)}
                  disabled={idx === (inv.schedule?.length ?? 0) - 1}
                  className="text-xs text-[#8a7561] disabled:opacity-30 hover:text-[#D4AF37]"
                  title="تحريك لأسفل"
                >
                  ▼
                </button>
              </div>
              <input
                className={inputClass}
                placeholder="النص (مثلاً: عقد القران)"
                value={item.label}
                onChange={(e) =>
                  setScheduleField(idx, "label", e.target.value)
                }
              />
              <input
                className={inputClass}
                placeholder="الوقت (مثلاً: ٧:٣٠ مساءً)"
                value={item.time}
                onChange={(e) =>
                  setScheduleField(idx, "time", e.target.value)
                }
              />
              <button
                type="button"
                onClick={() => removeScheduleItem(idx)}
                className="shrink-0 text-red-600 hover:text-red-800 text-sm px-2"
                title="حذف هذا العنصر"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addScheduleItem}
          className="self-start text-sm font-bold text-[#D4AF37] hover:underline"
        >
          + إضافة عنصر لبرنامج الحفل
        </button>
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
        <Field
          label="الآية / النص الديني"
          hint="يظهر أعلى الدعوة — كل سطر تكتبه يظهر بسطر مستقل بنفس الشكل"
        >
          <textarea
            className={inputClass}
            rows={6}
            value={inv.verse}
            onChange={(e) => set("verse", e.target.value)}
          />
        </Field>
      </fieldset>

      {/* صورة العرض بالصفحة الرئيسية */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          صورة العرض (كرت الدعوة بالصفحة الرئيسية)
        </legend>

        <MediaUploadField
          label="صورة العرض (coverImage)"
          hint="هذي الصورة اللي تظهر بكرت الدعوة بالصفحة الرئيسية — منفصلة عن خلفية القسم الأول جوّا الدعوة. لو تركتها فاضية، يترجع تلقائياً لخلفية القسم الأول (heroBg) أو التدرج اللوني"
          accept="image/*"
          kind="image"
          value={inv.coverImage || ""}
          folder="cover-image"
          onChange={(url) => set("coverImage", url)}
        />
      </fieldset>

      {/* قالب "وصال" (باب متحرك) والوسائط */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          قالب "وصال" والوسائط (اختياري)
        </legend>

        <MediaUploadField
          label="صورة بداية الدعوة (introPoster)"
          hint="تظهر كغلاف ثابت قبل ما يضغط الضيف يشغّل فيديو الفتح"
          accept="image/*"
          kind="image"
          value={inv.introPoster || ""}
          folder="intro-poster"
          fallback="/videos/intro-poster.jpg"
          onChange={(url) => set("introPoster", url)}
        />

        <MediaUploadField
          label="فيديو الفتح (introVideo)"
          hint="الفيديو اللي يشتغل لما الضيف يفتح الدعوة أول مرة"
          accept="video/*"
          kind="video"
          value={inv.introVideo || ""}
          folder="intro-video"
          fallback="/videos/intro.mp4"
          onChange={(url) => set("introVideo", url)}
        />

        <HeroBackgroundField
          heroBg={inv.heroBg || ""}
          doorBgVideo={inv.doorBgVideo || ""}
          onChangeHeroBg={(url) => set("heroBg", url)}
          onChangeDoorBgVideo={(url) => set("doorBgVideo", url)}
        />

        <MediaUploadField
          label="المقطع الموسيقى (musicUrl)"
          hint="يشتغل تلقائياً بالخلفية أثناء تصفح الضيف للدعوة"
          accept="audio/*"
          kind="audio"
          value={inv.musicUrl || ""}
          folder="music"
          fallback="/music/background.mp3"
          onChange={(url) => set("musicUrl", url)}
        />
      </fieldset>

      {/* ربط تأكيد الحضور RSVP */}
      <fieldset className="grid grid-cols-1 gap-3">
        <legend className="text-sm font-bold text-[#D4AF37] mb-1">
          تأكيد الحضور (Google Sheet)
        </legend>

        {creatingSheet && (
          <div className="flex items-center gap-2 text-sm text-[#8a7561] bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg px-4 py-3">
            <span className="animate-spin">🪄</span>
            <span>جارٍ إنشاء شيت تأكيدات الحضور تلقائياً لهذي الدعوة...</span>
          </div>
        )}

        {!creatingSheet && resolveSheetLink(inv) && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#eafaf1] border border-[#1a7f4b]/30 rounded-lg px-4 py-3">
            <a
              href={resolveSheetLink(inv)!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-[#1a7f4b] hover:underline"
            >
              📊 فتح شيت تأكيدات الحضور — انسوّى تلقائياً لهذي الدعوة
            </a>
            <button
              type="button"
              onClick={handleCreateSheet}
              className="text-xs font-bold text-[#8a7561] hover:text-[#2C1810]"
            >
              🔄 إنشاء شيت جديد بدله
            </button>
          </div>
        )}

        {!creatingSheet && !resolveSheetLink(inv) && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm text-amber-800 flex-1 min-w-[200px]">
                {sheetError ||
                  "ما أكو شيت تأكيدات حضور مربوط بهذي الدعوة بعد."}
              </p>
              <button
                type="button"
                onClick={handleCreateSheet}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#D4AF37] text-[#2C1810] shrink-0"
              >
                🪄 إنشاء شيت تلقائياً
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowManualSheet((prev) => !prev)}
          className="text-xs text-[#8a7561] hover:text-[#2C1810] w-fit"
        >
          {showManualSheet ? "إخفاء" : "أو اربط شيت موجود يدوياً"}
        </button>

        {showManualSheet && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#fdf8ee] border border-[#e5d9c3] rounded-lg p-4">
            <Field
              label="معرّف الشيت (sheetId)"
              hint="بدونه تبقى الدعوة معاينة محلية فقط، بدون إرسال RSVP حقيقي"
            >
              <input
                className={inputClass}
                value={inv.sheetId || ""}
                onChange={(e) => set("sheetId", e.target.value)}
                dir="ltr"
              />
            </Field>
            <Field label="رابط الشيت (sheetUrl)">
              <input
                className={inputClass}
                value={inv.sheetUrl || ""}
                onChange={(e) => set("sheetUrl", e.target.value)}
                dir="ltr"
              />
            </Field>
          </div>
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
              المعاينة المباشر (?preview={inv.id}).
            </span>
          </span>
        </label>
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
  const [showSqlHelp, setShowSqlHelp] = useState(false)

  useEffect(() => setSettings(initial), [initial])

  const set = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }))

  const ADD_COLUMNS_SQL = `alter table public.site_settings
  add column if not exists "siteName" text,
  add column if not exists "siteNameEn" text,
  add column if not exists "logoIcon" text,
  add column if not exists "logoImageUrl" text,
  add column if not exists "heroTitle" text,
  add column if not exists "whatsappNumberIraq" text,
  add column if not exists "whatsappNumberSaudi" text,
  add column if not exists "topHeroBadge" text,
  add column if not exists "topHeroTitleBefore" text,
  add column if not exists "topHeroTitleAccent" text,
  add column if not exists "topHeroTitleAfter" text,
  add column if not exists "topHeroSubtitle" text,
  add column if not exists "topHeroButtonText" text,
  add column if not exists "heroCard1Image" text,
  add column if not exists "heroCard2Image" text,
  add column if not exists "heroCard3Image" text,
  add column if not exists "customFonts" jsonb;`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")
    setShowSqlHelp(false)
    const result = await saveSiteSettings(settings)
    setSaving(false)
    if (!result.success) {
      if (result.tableMissing) {
        setError(
          "ما انحفظت الإعدادات لأن جدول site_settings غير موجود بعد بقاعدة البيانات. لازم تسوّي الجدول أولاً بلوحة تحكم Supabase: جدول باسم site_settings بالأعمدة (id رقم صحيح - primary key، siteName نص، siteNameEn نص، logoIcon نص، heroTitle نص، whatsappNumberIraq نص، whatsappNumberSaudi نص)، وبعدها جرّب الحفظ مرة ثانية.",
        )
      } else if (result.columnMissing) {
        setError(
          "ما انحفظت الإعدادات لأن جدول site_settings موجود بس ناقصه عمود واحد أو أكثر من الأعمدة المطلوبة. روح بلوحة تحكم Supabase → SQL Editor، وشغّل الأمر تحت حتى يضيف أي عمود ناقص (آمن، ما يمسح ولا يغيّر أي عمود موجود أصلاً)، وبعدها جرّب الحفظ مرة ثانية.",
        )
        setShowSqlHelp(true)
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
      {showSqlHelp && (
        <div className="rounded-lg bg-[#2C1810] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D4AF37]">
              أمر SQL — الصق هذا بـ Supabase SQL Editor وشغّله
            </span>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(ADD_COLUMNS_SQL)
                  .catch(() => {})
              }
              className="text-xs font-bold text-[#D4AF37] hover:underline shrink-0"
            >
              نسخ
            </button>
          </div>
          <pre
            dir="ltr"
            className="text-xs text-[#f5efe2] overflow-x-auto whitespace-pre-wrap leading-relaxed"
          >
            {ADD_COLUMNS_SQL}
          </pre>
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
          label="أيقونة الشعار (إيموجي)"
          hint="تُستخدم فقط لو ما رفعت صورة شعار تحت — إيموجي أو حرف واحد"
        >
          <input
            className={inputClass}
            value={settings.logoIcon}
            onChange={(e) => set("logoIcon", e.target.value)}
            maxLength={4}
          />
        </Field>
        <div />

        <MediaUploadField
          label="صورة الشعار (اختياري)"
          hint="لو رفعت صورة هنا، تظهر بدل الإيموجي بالدائرة أعلى يسار الموقع"
          accept="image/*"
          kind="image"
          value={settings.logoImageUrl || ""}
          folder="logo"
          onChange={(url) => set("logoImageUrl", url)}
        />
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
        <div />
        <Field
          label="رقم واتساب — العراق"
          hint="بصيغة دولية بدون + أو أصفار، مثال: 9647718031245"
        >
          <input
            className={inputClass}
            value={settings.whatsappNumberIraq}
            onChange={(e) => set("whatsappNumberIraq", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field
          label="رقم واتساب — السعودية"
          hint="بصيغة دولية بدون + أو أصفار، مثال: 966580690167"
        >
          <input
            className={inputClass}
            value={settings.whatsappNumberSaudi}
            onChange={(e) => set("whatsappNumberSaudi", e.target.value)}
            dir="ltr"
          />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          القسم الرئيسي العلوي (Hero)
        </legend>
        <p className="col-span-full text-xs text-[#8a7561] -mt-2 mb-1">
          هذا القسم يظهر أول شي بالصفحة الرئيسية، فوق شبكة الدعوات — البادج،
          العنوان الكبير، والنص تحته.
        </p>

        <Field
          label="نص البادج العلوي"
          hint="الشريط الصغير المستدير فوق العنوان"
        >
          <input
            className={inputClass}
            value={settings.topHeroBadge}
            onChange={(e) => set("topHeroBadge", e.target.value)}
          />
        </Field>
        <div />

        <Field label="العنوان — قبل الكلمة المميزة">
          <input
            className={inputClass}
            value={settings.topHeroTitleBefore}
            onChange={(e) => set("topHeroTitleBefore", e.target.value)}
          />
        </Field>
        <Field
          label="الكلمة المميزة"
          hint="تظهر بتأثير ذهبي متحرك (shimmer)"
        >
          <input
            className={inputClass}
            value={settings.topHeroTitleAccent}
            onChange={(e) => set("topHeroTitleAccent", e.target.value)}
          />
        </Field>
        <Field label="العنوان — السطر الثاني">
          <input
            className={inputClass}
            value={settings.topHeroTitleAfter}
            onChange={(e) => set("topHeroTitleAfter", e.target.value)}
          />
        </Field>
        <div />

        <Field label="النص الفرعي" hint="فقرة قصيرة تحت العنوان">
          <textarea
            className={inputClass}
            rows={3}
            value={settings.topHeroSubtitle}
            onChange={(e) => set("topHeroSubtitle", e.target.value)}
          />
        </Field>
        <Field label="نص الزر" hint="الزر اللي يسكرول لشبكة الدعوات">
          <input
            className={inputClass}
            value={settings.topHeroButtonText}
            onChange={(e) => set("topHeroButtonText", e.target.value)}
          />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="col-span-full text-sm font-bold text-[#D4AF37] mb-1">
          البطاقات الثلاث الزخرفية (تحت القسم الرئيسي)
        </legend>
        <p className="col-span-full text-xs text-[#8a7561] -mt-2 mb-1">
          ثلاث بطاقات صغيرة تظهر تحت العنوان والزر مباشرة. لكل بطاقة تقدر
          ترفع صورة توديها بدال تصميمها الافتراضي (الإيموجي/الأيقونة
          المرسومة). لو ما رفعت صورة لبطاقة معينة، تبقى بتصميمها الأصلي.
        </p>

        <MediaUploadField
          label="صورة البطاقة 1 (يمين)"
          hint="تظهر بدال دائرة الأحرف الوردية"
          accept="image/*"
          kind="image"
          value={settings.heroCard1Image || ""}
          folder="hero-cards"
          onChange={(url) => set("heroCard1Image", url)}
        />
        <MediaUploadField
          label="صورة البطاقة 2 (الوسط — وصال)"
          hint="تظهر بدال الباب الذهبي وكلمة وصال"
          accept="image/*"
          kind="image"
          value={settings.heroCard2Image || ""}
          folder="hero-cards"
          onChange={(url) => set("heroCard2Image", url)}
        />
        <MediaUploadField
          label="صورة البطاقة 3 (يسار — لمسة)"
          hint="تظهر بدال زهرة الكرزة وكلمة لمسة"
          accept="image/*"
          kind="image"
          value={settings.heroCard3Image || ""}
          folder="hero-cards"
          onChange={(url) => set("heroCard3Image", url)}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold text-[#D4AF37] mb-1">
          الخطوط
        </legend>
        <p className="text-xs text-[#8a7561] -mt-2 mb-1">
          أضف خط جديد (ملف .ttf / .otf / .woff / .woff2) هنا مرة وحدة —
          يصير متاح تلقائياً بقائمة اختيار الخط بكل الدعوات عبر "تعديل
          التصميم مباشر"، ويبقى محفوظ حتى لو سكرت الصفحة (لازم تضغط "حفظ
          إعدادات الواجهة" تحت حتى يثبت نهائياً).
        </p>
        <FontsManagerField
          value={settings.customFonts || []}
          onChange={(fonts) => set("customFonts", fonts)}
        />
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
  onDesignEdit,
}: {
  inv: Invitation
  nextId: number
  deletingId: number | null
  setDeletingId: (id: number | null) => void
  onDelete: (id: number) => void
  onEdit: (inv: Invitation) => void
  onCopyAsPrivate: (inv: Invitation, nextId: number) => void
  onDesignEdit: (inv: Invitation) => void
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
          onClick={() => onDesignEdit(inv)}
          className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#4A2B32] text-white"
        >
          🎨 تعديل التصميم مباشر
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
          لوحة تحكم سما
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
  const [designEditingInv, setDesignEditingInv] = useState<Invitation | null>(
    null,
  )

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

  const handleSaved = (_inv: Invitation, keepFormOpen?: boolean) => {
    onRefresh()
    // لو فيه تنبيه مهم بالنموذج (⚠️ عمود ناقص بالقاعدة مثلاً)، ما نسكّر
    // النموذج تلقائياً حتى يقدر المستخدم يقرا التنبيه وينسخ أمر الـ SQL.
    if (!keepFormOpen) closeForm()
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
              لوحة تحكم سما
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
                  onDesignEdit={setDesignEditingInv}
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
                + إنشاء دعوة خاصة
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
                  onDesignEdit={setDesignEditingInv}
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

      {designEditingInv && (
        <DesignPanel
          invitation={designEditingInv}
          onClose={() => setDesignEditingInv(null)}
          onSaved={onRefresh}
          customFonts={siteSettings.customFonts || []}
        />
      )}
    </div>
  )
}
