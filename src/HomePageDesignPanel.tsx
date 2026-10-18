import { useState } from "react"
import { Invitation, SiteSettings, TextStyle } from "./types"
import { saveSiteSettings } from "./backend"
import HomePage from "./HomePage"

// عمود قاعدة البيانات المطلوب لحفظ تخصيصات تصميم الواجهة الرئيسية — لو
// ناقص نعرض تنبيه وتعليمات إضافته بدل ما تختفي التخصيصات بصمت (نفس فكرة
// DesignPanel.tsx بالضبط، بس لعمود homeTextStyles بجدول site_settings).
const ADD_HOME_TEXT_STYLES_COLUMN_SQL = `alter table public.site_settings
  add column if not exists "homeTextStyles" jsonb;`

// نافذة "تصميم الواجهة مباشر" — تفتح نفس الصفحة الرئيسية الحقيقية اللي
// يشوفها الزائر (HomePage) بوضع تعديل مفعّل، مع شريط علوي للحفظ/الإغلاق.
// نفس آلية DesignPanel.tsx تماماً (اللي تفتح دعوة معينة بوضع تعديل) بس
// هذي المرة للواجهة الرئيسية نفسها (الشريط العلوي + القسم الرئيسي +
// الفوتر). كل التعديلات تتجمع بكائن siteSettings.homeTextStyles وتنحفظ
// بزر "حفظ" عبر saveSiteSettings (نفس دالة حفظ إعدادات الواجهة العادية).
export default function HomePageDesignPanel({
  invitations,
  siteSettings,
  onClose,
  onSaved,
}: {
  invitations: Invitation[]
  siteSettings: SiteSettings
  onClose: () => void
  onSaved: () => void
}) {
  const stylesRef = useState<Record<string, TextStyle>>(
    siteSettings.homeTextStyles || {},
  )
  const [styles, setStyles] = stylesRef
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [missingColumnSql, setMissingColumnSql] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMissingColumnSql(null)
    const result = await saveSiteSettings({ ...siteSettings, homeTextStyles: styles })
    setSaving(false)

    if (!result.success) {
      console.error("فشل حفظ تصميم الواجهة:", result.error)
      return
    }
    if (!result.savedHomeTextStyles) {
      // عمود homeTextStyles غير موجود بعد بقاعدة البيانات — نعرض أمر الـ
      // SQL اللازم إضافته حتى تنحفظ تعديلات التصميم فعلياً بالمرة الجاية.
      setMissingColumnSql(ADD_HOME_TEXT_STYLES_COLUMN_SQL)
      return
    }

    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col w-full h-full overflow-y-auto bg-[#fefcf8]">
      <div className="sticky top-3 z-[530] flex items-center justify-end gap-2 px-4">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-black/60 text-white border border-white/20"
        >
          إغلاق
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-full text-[11px] font-bold bg-[#B8862F] text-white shadow-lg disabled:opacity-60"
        >
          {saving ? "جارِ الحفظ..." : saved ? "✅ تم الحفظ" : "💾 حفظ التصميم"}
        </button>
      </div>

      {missingColumnSql && (
        <div className="sticky top-16 z-[530] mx-4 max-w-sm self-end rounded-xl bg-[#2A1B12] border border-[#B8862F] p-4 text-[11px] text-[#F1D989] leading-relaxed">
          <p className="mb-2 font-bold">
            ⚠️ عمود "homeTextStyles" غير موجود بقاعدة البيانات بعد — التعديل
            انحفظ محلياً بس مو بالقاعدة. أضف هذا العمود بمحرر SQL بلوحة
            Supabase ثم احفظ مرة ثانية:
          </p>
          <pre className="whitespace-pre-wrap bg-black/40 rounded-lg p-2 text-[10px] dir-ltr text-left">
            {missingColumnSql}
          </pre>
        </div>
      )}

      <HomePage
        invitations={invitations}
        siteSettings={{ ...siteSettings, homeTextStyles: styles }}
        onPreview={() => {}}
        editable
        onStylesChange={setStyles}
        customFonts={siteSettings.customFonts || []}
      />
    </div>
  )
}
