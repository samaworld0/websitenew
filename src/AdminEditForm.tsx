import { useState } from "react"
import { Invitation, categories } from "./types"
import { NAME_FONT_SIZE_OPTIONS, getDefaultProgramItems } from "./utils"
import { uploadInvitationFile } from "./backend"

type EditableInvitation = Omit<Invitation, "gradient"> & {
  gradientFrom: string
  gradientTo: string
}

function toEditable(inv: Invitation): EditableInvitation {
  const { gradient, ...rest } = inv
  return {
    ...rest,
    gradientFrom: gradient[0],
    gradientTo: gradient[1],
    // لو الدعوة ما فيها برنامج مخصص بعد، نبتدي بنسخة من البرنامج
    // الافتراضي لنفس القالب حتى الأدمن يقدر يعدّل عليه مباشرة
    programItems:
      rest.programItems && rest.programItems.length === 3
        ? rest.programItems
        : getDefaultProgramItems(rest.templateType).map((item) => ({ ...item })),
  }
}

function fromEditable(form: EditableInvitation): Invitation {
  const { gradientFrom, gradientTo, ...rest } = form
  return { ...rest, gradient: [gradientFrom, gradientTo, gradientFrom] }
}


export function AdminEditForm({
  inv,
  onSave,
  onCancel,
}: {
  inv: Invitation
  onSave: (updated: Invitation) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<EditableInvitation>(toEditable(inv))
  // اسم الحقل اللي يترفع له ملف حالياً (لعرض "جارِ الرفع...")، أو null لو ما في رفع شغال
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  const updateField = (key: keyof EditableInvitation, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const toggleUnlisted = () => {
    setForm((f) => ({ ...f, unlisted: !f.unlisted }))
  }

  const toggleSkipIntroVideo = () => {
    setForm((f) => ({ ...f, skipIntroVideo: !f.skipIntroVideo }))
  }

  const updateProgramItem = (
    index: number,
    field: "label" | "time",
    value: string,
  ) => {
    setForm((f) => {
      const items = [...(f.programItems || getDefaultProgramItems(f.templateType))]
      items[index] = { ...items[index], [field]: value }
      return { ...f, programItems: items }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(fromEditable(form))
  }

  // دالة رفع الملف إلى Supabase Storage (بدل تحويله Base64 وتخزينه بالجدول
  // مباشرة، اللي كان يسبب فشل الحفظ مع الفيديوهات الكبيرة). بعد الرفع
  // نخزن رابط الملف العام بنفس الحقل، تماماً متل لو المستخدم كتب رابط يدوي.
  const handleFileUpload = async (key: keyof EditableInvitation, file: File | null) => {
    if (!file) return
    setUploadingField(key)
    try {
      const url = await uploadInvitationFile(file, form.id, key)
      updateField(key, url)
    } catch (err) {
      console.error("File upload error:", err)
      alert(
        "فشل رفع الملف. تأكد من إنشاء bucket عام باسم \"invitation-media\" داخل Supabase Storage، أو استخدم رابط مباشر بدل الرفع.",
      )
    } finally {
      setUploadingField(null)
    }
  }

  // خلفية القسم الأول صارت خيار واحد بس (صورة أو فيديو، مو الاثنين):
  // heroBg و doorBgVideo يبقوا حقلين بالبيانات، بس نتعامل معهم بالنموذج
  // كحقل واحد — أي قيمة تنكتب/تترفع تروح للحقل المناسب حسب نوعها، ونصفّر
  // الحقل الثاني تلقائياً حتى ما يضلوا الاثنين معبّين بنفس الوقت.
  const heroMediaValue = form.heroBg || form.doorBgVideo || ""
  const isVideoUrl = (value: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(value.trim())

  const updateHeroMediaUrl = (value: string) => {
    if (isVideoUrl(value)) {
      setForm((f) => ({ ...f, doorBgVideo: value, heroBg: "" }))
    } else {
      setForm((f) => ({ ...f, heroBg: value, doorBgVideo: "" }))
    }
  }

  const handleHeroMediaUpload = async (file: File | null) => {
    if (!file) return
    const isVideo = file.type.startsWith("video/")
    const key = isVideo ? "doorBgVideo" : "heroBg"
    const otherKey = isVideo ? "heroBg" : "doorBgVideo"
    setUploadingField(key)
    try {
      const url = await uploadInvitationFile(file, form.id, key)
      setForm((f) => ({ ...f, [key]: url, [otherKey]: "" }))
    } catch (err) {
      console.error("File upload error:", err)
      alert(
        "فشل رفع الملف. تأكد من إنشاء bucket عام باسم \"invitation-media\" داخل Supabase Storage، أو استخدم رابط مباشر بدل الرفع.",
      )
    } finally {
      setUploadingField(null)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#FAF7F2] border border-border rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4"
    >
      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">التصنيف</label>
        <select
          value={form.category}
          onChange={(e) => updateField("category", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        >
          {categories
            .filter((c) => c.id !== "all")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">عنوان الدعوة</label>
        <input
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-2">
          العنوان الفرعي (يظهر بالكارد)
        </label>
        <input
          value={form.subtitle}
          onChange={(e) => updateField("subtitle", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">
          النص فوق الوردة (أعلى الشاشة الأولى)
        </label>
        <input
          value={form.heroEyebrow ?? ""}
          onChange={(e) => updateField("heroEyebrow", e.target.value)}
          placeholder="مثال: دعوة زفاف — لو تركته فاضي ما يطلع أي نص"
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">اسم العريس</label>
        <input
          value={form.groom}
          onChange={(e) => updateField("groom", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-2">اسم العروس</label>
        <input
          value={form.bride}
          onChange={(e) => updateField("bride", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">
          التاريخ (يظهر تحت الاسمين بأعلى الدعوة)
        </label>
        <input
          value={form.dateGreg}
          onChange={(e) => updateField("dateGreg", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-2">الوقت</label>
        <input
          value={form.time}
          onChange={(e) => updateField("time", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">القاعة</label>
        <input
          value={form.venue}
          onChange={(e) => updateField("venue", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          رابط خرائط جوجل (اختياري — انسخه من كوكل ماب مباشرة)
        </label>
        <input
          value={form.mapUrl || ""}
          onChange={(e) => updateField("mapUrl", e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
          dir="ltr"
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          لو تركته فاضي، الزر بالدعوة يبحث تلقائياً باسم القاعة — لكن الأدق إنك
          تفتح كوكل ماب، تدور على القاعة، وتنسخ رابط "مشاركة" وتحطه هنا.
        </p>
      </div>

      <div className="md:col-span-2 bg-[#FFF8E8] border border-[#D4AF37]/30 rounded-2xl px-5 py-4">
        <label className="block text-sm font-bold mb-2">
          تاريخ ووقت العد التنازلي "باقي على فرحنا"
        </label>
        <input
          type="datetime-local"
          value={form.countdownDate || ""}
          onChange={(e) => updateField("countdownDate", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
          dir="ltr"
        />
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          هذا التاريخ يتحكم بأرقام العداد (أيام/ساعات/دقائق/ثواني) بصفحة الدعوة
          — يفضل يكون نفس موعد الحفل الفعلي.
        </p>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          الآية / العبارة الافتتاحية
        </label>
        <textarea
          rows={2}
          value={form.verse}
          onChange={(e) => updateField("verse", e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white resize-none"
        />
      </div>

      {/* ============ تخصيص القالب: حجم الخط + برنامج الحفل ============ */}
      <div className="md:col-span-2 bg-[#F3EEE4] border border-border rounded-2xl px-5 py-5">
        <h4 className="text-sm font-bold mb-4">تخصيص القالب</h4>

        <div className="mb-5">
          <label className="block text-sm font-bold mb-2">
            حجم خط أسماء العروسين (بالشاشة الأولى)
          </label>
          <select
            value={form.nameFontSize || ""}
            onChange={(e) => updateField("nameFontSize", e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
          >
            <option value="">افتراضي (نفس التصميم الأصلي)</option>
            {NAME_FONT_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">
            برنامج الحفل (3 فقرات — الاسم والوقت)
          </label>
          <div className="space-y-3">
            {(form.programItems || getDefaultProgramItems(form.templateType)).map(
              (item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item.label}
                    onChange={(e) => updateProgramItem(i, "label", e.target.value)}
                    placeholder="مثال: استقبال الضيوف"
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-sm"
                  />
                  <input
                    value={item.time}
                    onChange={(e) => updateProgramItem(i, "time", e.target.value)}
                    placeholder="مثال: ٧:٠٠ مساءً"
                    dir="rtl"
                    className="w-40 shrink-0 border border-border rounded-xl px-4 py-2.5 bg-white text-sm"
                  />
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">
          لون وميض فتح الدعوة
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.flashColor || "#FFFFFF"}
            onChange={(e) => updateField("flashColor", e.target.value)}
            className="w-12 h-10 rounded-lg border border-border"
          />
          <input
            value={form.flashColor || ""}
            onChange={(e) => updateField("flashColor", e.target.value)}
            placeholder="#FFFFFF (أبيض افتراضياً)"
            dir="ltr"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-left"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          هذا هو لون اللمعة/الوميض اللي تطلع لحظة ما الضيف يضغط لفتح الدعوة.
          اتركه فاضي عشان يضل أبيض زي الأصل.
        </p>
      </div>

      {form.templateType === "wisal" && (
        <div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.skipIntroVideo}
              onChange={toggleSkipIntroVideo}
              className="w-5 h-5 rounded border-border accent-[#B8862F]"
            />
            <span className="text-sm font-bold">
              تخطي فيديو فتح الدعوة (الدخول مباشرة بومضة خفيفة فقط)
            </span>
          </label>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            لو مفعّل: ضغطة الضيف على "اضغط لفتح الدعوة" تدخله مباشرة لمحتوى
            الدعوة مع نفس ومضة الفتح أعلاه، بدون تشغيل فيديو الباب/الظرف.
          </p>
        </div>
      )}

      {/* --- حقول الرفع الجديدة المدمجة --- */}
      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          صورة الغلاف (رابط أو رفع ملف)
        </label>
        <div className="flex gap-2">
          <input
            value={form.coverImage || ""}
            onChange={(e) => updateField("coverImage", e.target.value)}
            placeholder="/mnbra/wedding-03.jpg"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-left"
            dir="ltr"
          />
          <label className="shrink-0 px-6 py-2.5 bg-[#B8862F] hover:bg-[#9E7024] text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-2 aria-disabled:opacity-60 aria-disabled:cursor-not-allowed">
            <span>{uploadingField === "coverImage" ? "⏳ جارِ الرفع..." : "📎 رفع صورة"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingField !== null}
              onChange={(e) => handleFileUpload("coverImage", e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          هذي الصورة تظهر بشبكة الدعوات بالصفحة الرئيسية، قبل ما الضيف يضغط لفتح الدعوة.
        </p>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          الشعار / اللوقو (رابط أو رفع ملف)
        </label>
        <div className="flex gap-2">
          <input
            value={form.logoUrl || ""}
            onChange={(e) => updateField("logoUrl", e.target.value)}
            placeholder="/images/logo.png"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-left"
            dir="ltr"
          />
          <label className="shrink-0 px-6 py-2.5 bg-[#B8862F] hover:bg-[#9E7024] text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-2 aria-disabled:opacity-60 aria-disabled:cursor-not-allowed">
            <span>{uploadingField === "logoUrl" ? "⏳ جارِ الرفع..." : "📎 رفع شعار"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingField !== null}
              onChange={(e) => handleFileUpload("logoUrl", e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          لو رفعت شعار، يظهر أعلى الشاشة الأولى فوق الآية والأسماء. اتركه
          فاضي عشان ما يظهر أي شعار (قالب "وصال" فقط حاليًا).
        </p>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          صورة بوستر الفيديو (رابط أو رفع ملف)
        </label>
        <div className="flex gap-2">
          <input
            value={form.introPoster || ""}
            onChange={(e) => updateField("introPoster", e.target.value)}
            placeholder="/videos/intro-poster-3.jpg"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-left"
            dir="ltr"
          />
          <label className="shrink-0 px-6 py-2.5 bg-[#B8862F] hover:bg-[#9E7024] text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-2 aria-disabled:opacity-60 aria-disabled:cursor-not-allowed">
            <span>{uploadingField === "introPoster" ? "⏳ جارِ الرفع..." : "📎 رفع صورة"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingField !== null}
              onChange={(e) => handleFileUpload("introPoster", e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          هذي الصورة تظهر بشاشة الفتح قبل ما يضغط الضيف عليها (وقبل تشغيل فيديو الفتح).
        </p>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          فيديو الفتح (رابط أو رفع ملف)
        </label>
        <div className="flex gap-2">
          <input
            value={form.introVideo || ""}
            onChange={(e) => updateField("introVideo", e.target.value)}
            placeholder="/videos/intro-3.mp4"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-left"
            dir="ltr"
          />
          <label className="shrink-0 px-6 py-2.5 bg-[#B8862F] hover:bg-[#9E7024] text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-2 aria-disabled:opacity-60 aria-disabled:cursor-not-allowed">
            <span>{uploadingField === "introVideo" ? "⏳ جارِ الرفع..." : "🎥 رفع فيديو"}</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploadingField !== null}
              onChange={(e) => handleFileUpload("introVideo", e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          يشتغل لما الضيف يضغط "اضغط لفتح الدعوة". ملاحظة: الملفات الآن تترفع مباشرة إلى Supabase Storage (bucket: invitation-media) بدل تخزينها Base64 داخل قاعدة البيانات، فما راح تواجه مشكلة الحفظ حتى مع فيديوهات أكبر. لازم تتأكد إن الـ bucket موجود ومفعّل كـ Public من لوحة تحكم Supabase.
        </p>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          خلفية القسم الأول (صورة أو فيديو — رابط أو رفع ملف)
        </label>
        <div className="flex gap-2">
          <input
            value={heroMediaValue}
            onChange={(e) => updateHeroMediaUrl(e.target.value)}
            placeholder="/images/hero-bg-3.jpg أو /videos/door-bg-3.mp4"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-left"
            dir="ltr"
          />
          <label className="shrink-0 px-6 py-2.5 bg-[#B8862F] hover:bg-[#9E7024] text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-2 aria-disabled:opacity-60 aria-disabled:cursor-not-allowed">
            <span>
              {uploadingField === "heroBg" || uploadingField === "doorBgVideo"
                ? "⏳ جارِ الرفع..."
                : "📎 رفع صورة أو فيديو"}
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              disabled={uploadingField !== null}
              onChange={(e) => handleHeroMediaUpload(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          هذي خلفية القسم الأول اللي يظهر بعد ما ينفتح الدعوة (بعد شاشة/فيديو
          الفتح). اختر صورة واحدة أو فيديو واحد بس — لو رفعت فيديو يشتغل هو
          بدل الصورة تلقائياً، ولو رجعت لصورة يوقف الفيديو.
        </p>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          الموسيقى الخلفية (رابط أو رفع ملف)
        </label>
        <div className="flex gap-2">
          <input
            value={form.musicUrl || ""}
            onChange={(e) => updateField("musicUrl", e.target.value)}
            placeholder="/music/background-3.mp3"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-left"
            dir="ltr"
          />
          <label className="shrink-0 px-6 py-2.5 bg-[#B8862F] hover:bg-[#9E7024] text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-2 aria-disabled:opacity-60 aria-disabled:cursor-not-allowed">
            <span>{uploadingField === "musicUrl" ? "⏳ جارِ الرفع..." : "🎵 رفع صوت"}</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={uploadingField !== null}
              onChange={(e) => handleFileUpload("musicUrl", e.target.files?.[0] || null)}
            />
          </label>
        </div>
        {form.musicUrl && (
          <audio
            src={form.musicUrl}
            controls
            className="w-full mt-2 h-9"
          />
        )}
      </div>

      <div className="md:col-span-2 flex items-center gap-3 bg-[#FFF8E8] border border-[#D4AF37]/30 rounded-2xl px-5 py-4">
        <input
          type="checkbox"
          id={`unlisted-${inv.id}`}
          checked={Boolean(form.unlisted)}
          onChange={toggleUnlisted}
          className="w-5 h-5"
        />
        <label htmlFor={`unlisted-${inv.id}`} className="text-sm font-bold">
          دعوة خاصة — ما تظهر بشبكة الدعوات بالصفحة الرئيسية، تنفتح برابطها
          المباشر فقط
        </label>
      </div>

      <div className="md:col-span-2 flex items-center gap-3 mt-2">
        <button
          type="submit"
          className="px-8 py-3 bg-[#B8862F] text-white rounded-2xl font-bold"
        >
          حفظ التعديل
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 border border-border rounded-2xl font-bold"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}
