import { useState } from "react"
import { Invitation, TextStyle } from "./types"
import { saveInvitation } from "./backend"
import {
  WisalTemplateView,
  DefaultTemplateView,
  WISAL_TEXT_ELEMENTS,
  DEFAULT_TEXT_ELEMENTS,
  AVAILABLE_FONT_FAMILIES,
} from "./InvitationView"

// عمود قاعدة البيانات المطلوب لحفظ تخصيصات التصميم — لو ناقص نعرض
// تعليمات إضافته بدل ما تختفي التخصيصات بصمت.
const ADD_TEXT_STYLES_COLUMN_SQL = `alter table public.invitations
  add column if not exists "textStyles" jsonb;`

// حقل رقمي صغير بنفس روح لوحة فيكما (أيقونة + رقم)
function NumberField({
  icon,
  label,
  value,
  placeholder,
  onChange,
  min,
  step = 1,
}: {
  icon: string
  label: string
  value: number | undefined
  placeholder: string
  onChange: (v: number | undefined) => void
  min?: number
  step?: number
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-[#8a7561]">{label}</span>
      <div className="flex items-center gap-1.5 rounded-lg border border-[#e5d9c3] bg-white px-2.5 py-2">
        <span className="text-xs text-[#b8a88f] w-3.5 text-center shrink-0">
          {icon}
        </span>
        <input
          type="number"
          min={min}
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          className="w-full text-sm outline-none bg-transparent text-[#2C1810]"
        />
      </div>
    </label>
  )
}

export default function DesignPanel({
  invitation,
  onCancel,
  onSaved,
}: {
  invitation: Invitation
  onCancel: () => void
  onSaved: (inv: Invitation) => void
}) {
  const isWisal = invitation.templateType === "wisal"
  const elements = isWisal ? WISAL_TEXT_ELEMENTS : DEFAULT_TEXT_ELEMENTS

  const [textStyles, setTextStyles] = useState<Record<string, TextStyle>>(
    invitation.textStyles ?? {},
  )
  const [selectedId, setSelectedId] = useState<string>(elements[0]?.id ?? "")
  const [filter, setFilter] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const current: TextStyle = textStyles[selectedId] ?? {}
  const selectedLabel =
    elements.find((el) => el.id === selectedId)?.label ?? selectedId

  const updateCurrent = (patch: Partial<TextStyle>) => {
    setTextStyles((prev) => {
      const merged: TextStyle = { ...prev[selectedId], ...patch }
      // نشيل الحقول الفاضية (undefined) حتى ما يتراكم كائن فاضي بلا فايدة
      Object.keys(merged).forEach((k) => {
        if ((merged as any)[k] === undefined) delete (merged as any)[k]
      })
      const next = { ...prev }
      if (Object.keys(merged).length === 0) {
        delete next[selectedId]
      } else {
        next[selectedId] = merged
      }
      return next
    })
  }

  const resetCurrent = () => {
    setTextStyles((prev) => {
      const next = { ...prev }
      delete next[selectedId]
      return next
    })
  }

  const hasOverride = Object.keys(current).length > 0

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setNotice("")
    const updated: Invitation = { ...invitation, textStyles }
    const result = await saveInvitation(updated)
    setSaving(false)
    if (!result.success) {
      setError(result.error || "صار خطأ أثناء الحفظ، حاول مرة ثانية")
      return
    }
    if (!result.savedTextStyles) {
      setNotice(
        "⚠️ مهم: تخصيصات التصميم ما انحفظت لأن عمود textStyles غير موجود بجدول invitations بعد. أضف العمود بالقاعدة أولاً (انسخ أمر SQL تحت) وحاول تحفظ مرة ثانية.",
      )
      return
    }
    onSaved(updated)
  }

  const previewInv: Invitation = { ...invitation, textStyles }
  const filteredElements = elements.filter((el) =>
    el.label.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">تصميم نصوص الدعوة</h2>
          <p className="text-xs text-[#8a7561]">
            اختر عنصر نصي من المعاينة أو من القائمة تحت، وعدّل خطه وحجمه
            ولونه من اللوحة على اليمين — التغييرات تنعكس مباشرة بالمعاينة.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-xs font-bold text-[#8a7561] border border-[#e5d9c3]"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-full text-xs font-bold bg-[#D4AF37] text-[#2C1810] disabled:opacity-60"
          >
            {saving ? "جارِ الحفظ..." : "حفظ التصميم"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 space-y-2">
          <p>{notice}</p>
          <div className="relative">
            <pre className="bg-[#2C1810] text-[#F1D989] text-[11px] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap" dir="ltr">
              {ADD_TEXT_STYLES_COLUMN_SQL}
            </pre>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard?.writeText(ADD_TEXT_STYLES_COLUMN_SQL)
              }
              className="absolute top-2 left-2 text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
            >
              نسخ
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* المعاينة الحية */}
        <div className="flex justify-center">
          <div
            className="relative rounded-[2rem] border-[10px] border-[#2C1810] shadow-xl overflow-hidden bg-black"
            style={{ width: 360, height: 680 }}
          >
            {isWisal ? (
              <WisalTemplateView
                inv={previewInv}
                designMode
                selectedElementId={selectedId}
                onSelectElement={setSelectedId}
              />
            ) : (
              <DefaultTemplateView
                inv={previewInv}
                designMode
                selectedElementId={selectedId}
                onSelectElement={setSelectedId}
              />
            )}
          </div>
        </div>

        {/* لوحة الخصائص (شبيهة بفيكما) */}
        <div className="rounded-2xl border border-[#e5d9c3] bg-white overflow-hidden flex flex-col max-h-[680px]">
          <div className="px-4 py-3 border-b border-[#f0e8d8] bg-[#faf5e8]">
            <span className="text-[10px] text-[#8a7561] block mb-0.5">
              العنصر المحدد
            </span>
            <span className="text-sm font-bold text-[#2C1810]">
              {selectedLabel}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#2C1810]">
                  Typography
                </span>
                {hasOverride && (
                  <button
                    onClick={resetCurrent}
                    className="text-[10px] text-[#8a7561] hover:text-red-600 underline"
                  >
                    رجوع للافتراضي
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#8a7561]">الخط</span>
                  <select
                    value={current.fontFamily ?? ""}
                    onChange={(e) =>
                      updateCurrent({
                        fontFamily: e.target.value || undefined,
                      })
                    }
                    className="w-full rounded-lg border border-[#e5d9c3] bg-white px-2.5 py-2 text-sm text-[#2C1810] outline-none"
                  >
                    {AVAILABLE_FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#8a7561]">الوزن</span>
                    <select
                      value={current.fontWeight ?? ""}
                      onChange={(e) =>
                        updateCurrent({
                          fontWeight: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full rounded-lg border border-[#e5d9c3] bg-white px-2.5 py-2 text-sm text-[#2C1810] outline-none"
                    >
                      <option value="">افتراضي</option>
                      <option value="400">Regular 400</option>
                      <option value="500">Medium 500</option>
                      <option value="700">Bold 700</option>
                      <option value="900">Black 900</option>
                    </select>
                  </label>
                  <NumberField
                    icon="Aa"
                    label="الحجم (px)"
                    value={current.fontSize}
                    placeholder="افتراضي"
                    min={4}
                    onChange={(v) => updateCurrent({ fontSize: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <NumberField
                    icon="↕"
                    label="ارتفاع السطر (px)"
                    value={current.lineHeight}
                    placeholder="افتراضي"
                    min={0}
                    onChange={(v) => updateCurrent({ lineHeight: v })}
                  />
                  <NumberField
                    icon="↔"
                    label="تباعد الأحرف (px)"
                    value={current.letterSpacing}
                    placeholder="0"
                    step={0.1}
                    onChange={(v) => updateCurrent({ letterSpacing: v })}
                  />
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#8a7561]">اللون</span>
                  <div className="flex items-center gap-2 rounded-lg border border-[#e5d9c3] bg-white px-2.5 py-1.5">
                    <input
                      type="color"
                      value={current.color ?? "#2C1810"}
                      onChange={(e) =>
                        updateCurrent({ color: e.target.value })
                      }
                      className="w-7 h-7 rounded border border-[#e5d9c3] cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={current.color ?? ""}
                      placeholder="افتراضي"
                      onChange={(e) =>
                        updateCurrent({ color: e.target.value || undefined })
                      }
                      className="w-full text-sm outline-none bg-transparent text-[#2C1810]"
                      dir="ltr"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-[#2C1810] block mb-2">
                Appearance
              </span>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-[#8a7561]">الشفافية %</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={current.opacity ?? 100}
                    onChange={(e) =>
                      updateCurrent({ opacity: Number(e.target.value) })
                    }
                    className="w-full accent-[#D4AF37]"
                  />
                  <span className="text-xs text-[#2C1810] w-9 text-left shrink-0">
                    {current.opacity ?? 100}%
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-[#f0e8d8]">
            <div className="px-4 pt-3 pb-2">
              <span className="text-xs font-bold text-[#2C1810]">
                Elements
              </span>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="فلترة العناصر..."
                className="mt-2 w-full rounded-lg border border-[#e5d9c3] bg-[#faf5e8] px-2.5 py-1.5 text-xs outline-none"
              />
            </div>
            <div className="max-h-40 overflow-y-auto pb-2">
              {filteredElements.map((el) => (
                <button
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={`w-full text-right px-4 py-1.5 text-xs transition ${
                    selectedId === el.id
                      ? "bg-[#D4AF37]/15 text-[#2C1810] font-bold"
                      : "text-[#5c4a3a] hover:bg-[#faf5e8]"
                  }`}
                >
                  {el.label}
                  {textStyles[el.id] && (
                    <span className="text-[#D4AF37] mr-1">●</span>
                  )}
                </button>
              ))}
              {filteredElements.length === 0 && (
                <p className="text-center text-[10px] text-[#8a7561] py-3">
                  ما أكو نتائج
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
