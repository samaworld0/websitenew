import { useState } from "react"
import { Invitation } from "./types"

export function TryInvitationForm({
  base,
  onLaunch,
  onCancel,
}: {
  base: Invitation
  onLaunch: (inv: Invitation) => void
  onCancel: () => void
}) {
  const [groom, setGroom] = useState("")
  const [bride, setBride] = useState("")
  const [venue, setVenue] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groom || !bride) return
    const trialInv: Invitation = {
      ...base,
      id: -1,
      groom,
      bride,
      subtitle: `${groom} و${bride}`,
      venue: venue || base.venue,
      // نتأكد إن دعوة التجربة ما عندها sheetId أبداً، حتى لو كان القالب
      // الأصلي (اللي بنيت عليه) دعوة خاصة عندها شيت — عشان RSVP بوضع
      // التجربة يضل محلي بس وما ينرسل لأي شيت
      sheetId: undefined,
      sheetUrl: undefined,
    }
    onLaunch(trialInv)
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-[#0D0706] px-6"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=El+Messiri:wght@600;700&family=Cairo:wght@400;500;700&display=swap');
      `}</style>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl"
      >
        <h2
          className="text-xl font-bold mb-1 text-center"
          style={{ fontFamily: "'El Messiri', serif" }}
        >
          جرّب دعوتك بمعلوماتك
        </h2>
        <p className="text-xs text-center text-[#B8862F] font-bold mb-4">
          القالب المختار: {base.subtitle}
        </p>
        <p className="text-sm text-muted-foreground text-center mb-6">
          عبّي أسماءكم وشوفوا شكل الدعوة فوراً — معاينة فقط، ما تنحفظ ولا تنرسل
          لأي شخص
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5">اسم العريس</label>
            <input
              required
              value={groom}
              onChange={(e) => setGroom(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">اسم العروس</label>
            <input
              required
              value={bride}
              onChange={(e) => setBride(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">القاعة</label>
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder={base.venue}
              className="w-full border border-border rounded-xl px-4 py-2.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-7">
          <button
            type="submit"
            className="flex-1 py-3 bg-[#B8862F] text-white rounded-2xl font-bold"
          >
            شاهد الدعوة
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-2xl font-bold"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
