import { useState } from "react"
import { Invitation, TextStyle } from "./types"
import { saveInvitation } from "./backend"
import InvitationFullView from "./InvitationView"

// عمود قاعدة البيانات المطلوب لحفظ تخصيصات التصميم — لو ناقص نعرض
// تنبيه وتعليمات إضافته بدل ما تختفي التخصيصات بصمت.
const ADD_TEXT_STYLES_COLUMN_SQL = `alter table public.invitations
  add column if not exists "textStyles" jsonb;`

// نافذة "تعديل التصميم مباشر" — تفتح نفس المعاينة الحقيقية اللي يشوفها
// الضيف (InvitationFullView) بوضع تعديل مفعّل، مع شريط علوي للحفظ/الإغلاق.
// كل التعديلات تتجمع بكائن inv.textStyles وتنحفظ بزر "حفظ" عبر saveInvitation
// (نفس دالة حفظ الدعوة العادية، بدون أي Backend أو Cache إضافي).
export default function DesignPanel({
  invitation,
  onClose,
  onSaved,
}: {
  invitation: Invitation
  onClose: () => void
  onSaved: () => void
}) {
  const stylesRef = useState<Record<string, TextStyle>>(
    invitation.textStyles || {},
  )
  const [styles, setStyles] = stylesRef
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [missingColumnSql, setMissingColumnSql] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMissingColumnSql(null)
    const result = await saveInvitation({ ...invitation, textStyles: styles })
    setSaving(false)

    if (!result.success) {
      console.error("فشل حفظ التصميم:", result.error)
      return
    }
    if (!result.savedTextStyles) {
      // عمود textStyles غير موجود بعد بقاعدة البيانات — نعرض أمر الـ SQL
      // اللازم إضافته حتى تنحفظ تعديلات التصميم فعلياً بالمرة الجاية.
      setMissingColumnSql(ADD_TEXT_STYLES_COLUMN_SQL)
      return
    }

    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col w-full h-full bg-[#0D0706]">
      <div className="absolute top-3 z-[530] flex items-center gap-2 inset-inline-end-4">
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
        <div className="absolute top-16 inset-inline-end-4 z-[530] max-w-sm rounded-xl bg-[#2A1B12] border border-[#B8862F] p-4 text-[11px] text-[#F1D989] leading-relaxed">
          <p className="mb-2 font-bold">
            ⚠️ عمود "textStyles" غير موجود بقاعدة البيانات بعد — التعديل
            انحفظ محلياً بس مو بالقاعدة. أضف هذا العمود بمحرر SQL بلوحة
            Supabase ثم احفظ مرة ثانية:
          </p>
          <pre className="whitespace-pre-wrap bg-black/40 rounded-lg p-2 text-[10px] dir-ltr text-left">
            {missingColumnSql}
          </pre>
        </div>
      )}

      <InvitationFullView
        inv={{ ...invitation, textStyles: styles }}
        onClose={onClose}
        editable
        onStylesChange={setStyles}
      />
    </div>
  )
}
