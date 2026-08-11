import { useState, useRef } from "react"
import { SiteSettings, SITE_FONT_OPTIONS } from "./siteSettings"
import { uploadInvitationFile } from "./backend"

// حقل نص عادي (سطر واحد)
function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
      />
    </div>
  )
}

// حقل نص متعدد الأسطر
function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-bold mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full border border-border rounded-xl px-4 py-2.5 bg-white resize-y"
      />
    </div>
  )
}

// حقل لون: منتقي لون + مربع نص للكود Hex، مرتبطين ببعض
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-11 rounded-lg border border-border cursor-pointer bg-white p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white text-sm"
        />
      </div>
    </div>
  )
}

// حقل اختيار خط: قائمة منسدلة بخطوط جاهزة، أو رفع خط مخصص من الجهاز
// (ttf/otf/woff/woff2) يترفع لـ Supabase Storage ويتحقن كـ @font-face
function FontField({
  label,
  value,
  onChange,
}: {
  label: string
  value: SiteSettings["typography"]
  onChange: (v: SiteSettings["typography"]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const ALLOWED_EXT = [".ttf", ".otf", ".woff", ".woff2"]
  const CUSTOM_VALUE = "__custom__"

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const lowerName = file.name.toLowerCase()
    if (!ALLOWED_EXT.some((ext) => lowerName.endsWith(ext))) {
      alert("صيغة الخط غير مدعومة. الصيغ المقبولة: ttf, otf, woff, woff2")
      return
    }

    setUploading(true)
    try {
      const url = await uploadInvitationFile(
        file,
        "site-settings",
        `site-font-${Date.now()}`,
      )
      const family = `site-uploaded-font-${Date.now()}`
      onChange({ fontFamily: family, customFontUrl: url })
    } catch (err) {
      alert(
        `تعذّر رفع ملف الخط.\n\nتفاصيل الخطأ: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="flex gap-2">
        <select
          value={value.customFontUrl ? CUSTOM_VALUE : value.fontFamily}
          onChange={(e) => {
            if (e.target.value === CUSTOM_VALUE) return
            onChange({ fontFamily: e.target.value })
          }}
          className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-white"
        >
          {value.customFontUrl && (
            <option value={CUSTOM_VALUE}>🎨 خط مرفوع من الجهاز</option>
          )}
          {SITE_FONT_OPTIONS.map((f) => (
            <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-5 py-2.5 bg-[#B8862F] hover:bg-[#9E7024] text-white rounded-xl font-bold transition disabled:opacity-60"
        >
          {uploading ? "⏳ جارِ الرفع..." : "⬆ رفع خط"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        تقدر تختار من الخطوط الجاهزة، أو ترفع ملف خط من جهازك (ttf, otf, woff, woff2) ليستخدم كخط الواجهة.
      </p>
    </div>
  )
}
function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#FAF7F2] border border-border rounded-3xl p-6">
      <h3
        className="text-base font-bold mb-1"
        style={{ fontFamily: "'El Messiri', serif" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        {children}
      </div>
    </div>
  )
}

export function SiteSettingsForm({
  initial,
  onSave,
  onPreviewColors,
  onPreviewFont,
  saving,
}: {
  initial: SiteSettings
  onSave: (settings: SiteSettings) => void
  onPreviewColors: (colors: SiteSettings["colors"]) => void
  onPreviewFont: (typography: SiteSettings["typography"]) => void
  saving: boolean
}) {
  const [form, setForm] = useState<SiteSettings>(initial)

  const update = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const updateStep = (
    index: number,
    field: "title" | "description",
    value: string,
  ) => {
    setForm((f) => {
      const steps = [...f.howItWorks.steps]
      steps[index] = { ...steps[index], [field]: value }
      return { ...f, howItWorks: { ...f.howItWorks, steps } }
    })
  }

  const updateColor = (key: keyof SiteSettings["colors"], value: string) => {
    setForm((f) => {
      const colors = { ...f.colors, [key]: value }
      // معاينة حية فورية بدون حفظ
      onPreviewColors(colors)
      return { ...f, colors }
    })
  }

  const updateFont = (typography: SiteSettings["typography"]) => {
    setForm((f) => {
      // معاينة حية فورية بدون حفظ
      onPreviewFont(typography)
      return { ...f, typography }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SectionCard
        title="الألوان"
        description="تتغيّر بكل مكان بالموقع فوراً — الأزرار، الشارات، النافذة الحمراء، والفوتر."
      >
        <ColorField
          label="اللون الأساسي (ذهبي — الأزرار والشارات)"
          value={form.colors.primary}
          onChange={(v) => updateColor("primary", v)}
        />
        <ColorField
          label="اللون الثانوي (وردي/أحمر — النافذة والشعار)"
          value={form.colors.secondary}
          onChange={(v) => updateColor("secondary", v)}
        />
        <ColorField
          label="خلفية الفوتر (القسم السفلي الغامق)"
          value={form.colors.footerBg}
          onChange={(v) => updateColor("footerBg", v)}
        />
      </SectionCard>

      <SectionCard
        title="الخط"
        description="خط نصوص الواجهة العامة (الصفحة الرئيسية ولوحة التحكم) — ما يغيّر خطوط تصميم الدعوات نفسها."
      >
        <FontField
          label="خط الواجهة"
          value={form.typography}
          onChange={updateFont}
        />
      </SectionCard>

      <SectionCard title="الشاشة الرئيسية (Hero)">
        <TextField
          label="نص الشارة العلوية"
          value={form.hero.badge}
          onChange={(v) => update("hero", { ...form.hero, badge: v })}
        />
        <TextField
          label="نص الزر الرئيسي"
          value={form.hero.ctaButton}
          onChange={(v) => update("hero", { ...form.hero, ctaButton: v })}
        />
        <TextField
          label="العنوان — السطر الأول"
          value={form.hero.titleLine1}
          onChange={(v) => update("hero", { ...form.hero, titleLine1: v })}
        />
        <TextField
          label="العنوان — السطر الثاني"
          value={form.hero.titleLine2}
          onChange={(v) => update("hero", { ...form.hero, titleLine2: v })}
        />
        <TextAreaField
          label="الوصف تحت العنوان"
          value={form.hero.subtitle}
          onChange={(v) => update("hero", { ...form.hero, subtitle: v })}
        />
      </SectionCard>

      <SectionCard title="قسم القوالب">
        <TextField
          label="عنوان القسم"
          value={form.templatesSection.title}
          onChange={(v) => update("templatesSection", { title: v })}
        />
      </SectionCard>

      <SectionCard
        title="قسم كيف نشتغل"
        description="العنوان والوصف العام، وكل خطوة من الأربع خطوات."
      >
        <TextField
          label="عنوان القسم"
          value={form.howItWorks.title}
          onChange={(v) =>
            update("howItWorks", { ...form.howItWorks, title: v })
          }
        />
        <TextField
          label="الوصف تحت العنوان"
          value={form.howItWorks.subtitle}
          onChange={(v) =>
            update("howItWorks", { ...form.howItWorks, subtitle: v })
          }
        />
        {form.howItWorks.steps.map((step, i) => (
          <div key={i} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border pt-5">
            <TextField
              label={`عنوان الخطوة ${i + 1}`}
              value={step.title}
              onChange={(v) => updateStep(i, "title", v)}
            />
            <TextField
              label={`وصف الخطوة ${i + 1}`}
              value={step.description}
              onChange={(v) => updateStep(i, "description", v)}
            />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="النافذة الحمراء (الدعوة للتجربة)">
        <TextField
          label="النص الصغير بالأعلى"
          value={form.ctaBanner.eyebrow}
          onChange={(v) =>
            update("ctaBanner", { ...form.ctaBanner, eyebrow: v })
          }
        />
        <TextField
          label="نص الزر"
          value={form.ctaBanner.buttonText}
          onChange={(v) =>
            update("ctaBanner", { ...form.ctaBanner, buttonText: v })
          }
        />
        <TextField
          label="العنوان"
          value={form.ctaBanner.title}
          onChange={(v) =>
            update("ctaBanner", { ...form.ctaBanner, title: v })
          }
        />
        <TextAreaField
          label="الوصف"
          value={form.ctaBanner.description}
          onChange={(v) =>
            update("ctaBanner", { ...form.ctaBanner, description: v })
          }
        />
      </SectionCard>

      <SectionCard title="الفوتر (القسم السفلي)">
        <TextField
          label="نص الشعار"
          value={form.footer.logoText}
          onChange={(v) => update("footer", { ...form.footer, logoText: v })}
        />
        <TextField
          label="نص طرق الدفع"
          value={form.footer.paymentLabel}
          onChange={(v) =>
            update("footer", { ...form.footer, paymentLabel: v })
          }
        />
        <TextField
          label="رابط انستقرام"
          value={form.footer.instagramUrl}
          onChange={(v) =>
            update("footer", { ...form.footer, instagramUrl: v })
          }
        />
        <TextField
          label="رابط تيك توك"
          value={form.footer.tiktokUrl}
          onChange={(v) =>
            update("footer", { ...form.footer, tiktokUrl: v })
          }
        />
      </SectionCard>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 bg-[#B8862F] text-white rounded-2xl font-bold disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : "حفظ إعدادات الواجهة"}
      </button>
    </form>
  )
}
