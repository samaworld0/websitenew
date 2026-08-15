import { useState } from "react"
import { Invitation, CreateDetailsDraft } from "./types"

export function AdminCreateForm({
  template,
  onCreate,
  onBack,
  onCancel,
}: {
  template: Invitation
  onCreate: (draft: CreateDetailsDraft) => void
  onBack: () => void
  onCancel: () => void
}) {
  const [groom, setGroom] = useState("")
  const [bride, setBride] = useState("")
  const [dateGreg, setDateGreg] = useState(template.dateGreg)
  const [time, setTime] = useState(template.time)
  const [venue, setVenue] = useState(template.venue)
  const [verse, setVerse] = useState(template.verse)
  const [countdownDate, setCountdownDate] = useState(
    template.countdownDate || "",
  )
  const [mapUrl, setMapUrl] = useState(template.mapUrl || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groom || !bride) return
    onCreate({
      groom,
      bride,
      dateGreg,
      time,
      venue,
      verse,
      countdownDate,
      mapUrl,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#FFF8E8] border border-[#D4AF37]/40 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4"
    >
      <div className="md:col-span-2 flex items-center justify-between gap-4 flex-wrap -mt-1 mb-1">
        <div>
          <h3 className="text-lg font-bold">٢) تفاصيل الدعوة</h3>
          <p className="text-xs text-[#B8862F] font-bold mt-1">
            التصميم المختار: {template.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-full text-xs font-bold border border-border"
        >
          ← رجوع لاختيار التصميم
        </button>
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">اسم العريس</label>
        <input
          value={groom}
          onChange={(e) => setGroom(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-2">اسم العروس</label>
        <input
          value={bride}
          onChange={(e) => setBride(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">
          التاريخ (يظهر تحت الاسمين بأعلى الدعوة)
        </label>
        <input
          value={dateGreg}
          onChange={(e) => setDateGreg(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-2">الوقت</label>
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">القاعة</label>
        <input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>
      <div />

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          رابط خرائط جوجل (اختياري — انسخه من كوكل ماب مباشرة)
        </label>
        <input
          value={mapUrl}
          onChange={(e) => setMapUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
          dir="ltr"
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
        />
      </div>

      <div className="md:col-span-2 bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4">
        <label className="block text-sm font-bold mb-2">
          تاريخ ووقت العد التنازلي "باقي على فرحنا"
        </label>
        <input
          type="datetime-local"
          value={countdownDate}
          onChange={(e) => setCountdownDate(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white"
          dir="ltr"
        />
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          هذا التاريخ يتحكم بأرقام العداد بصفحة الدعوة — يفضل يكون نفس موعد
          الحفل الفعلي.
        </p>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold mb-2">
          الآية / العبارة الافتتاحية
        </label>
        <textarea
          rows={2}
          value={verse}
          onChange={(e) => setVerse(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2.5 bg-white resize-none"
        />
      </div>

      <div className="md:col-span-2 flex items-center gap-3 mt-2">
        <button
          type="submit"
          className="px-8 py-3 bg-[#B8862F] text-white rounded-2xl font-bold"
        >
          إنشاء الدعوة الخاصة
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
