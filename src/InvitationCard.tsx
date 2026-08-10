import { useState } from "react"
import { Invitation } from "./types"
import { CornerOrnament } from "./icons"

export function InvitationCard({
  inv,
  onPreview,
  onTry,
}: {
  inv: Invitation
  onPreview: (inv: Invitation) => void
  onTry: (inv: Invitation) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const ac = inv.accentColor
  const bg = `linear-gradient(180deg, ${inv.gradient[0]} 0%, ${inv.gradient[1]} 100%)`
  const showImage = Boolean(inv.coverImage) && !imgFailed

  return (
    <div
      className="group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative overflow-hidden rounded-lg cursor-pointer shadow-md transition-transform duration-300 group-hover:-translate-y-1"
        style={{ aspectRatio: "3/4" }}
        onClick={() => onPreview(inv)}
      >
        {/* الخلفية: صورة من مجلد public/mnbra إن وُجدت، وإلا التدرّج اللوني كاحتياط */}
        <div className="absolute inset-0" style={{ background: bg }} />
        {showImage && (
          <img
            src={inv.coverImage}
            alt={inv.subtitle}
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

        <div className="absolute top-3 right-3 opacity-70 scale-75">
          <CornerOrnament color={ac} />
        </div>
        <div className="absolute top-3 left-3 opacity-70 scale-75">
          <CornerOrnament color={ac} flip />
        </div>

        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-300"
          style={{
            background: "rgba(0,0,0,0.72)",
            opacity: hovered ? 1 : 0,
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold"
            style={{
              background: ac,
              color: "#1a0a00",
              fontFamily: "Cairo, sans-serif",
            }}
          >
            👁 معاينة كاملة
          </div>
        </div>
      </div>

      <div className="mt-4 text-right" dir="rtl">
        <h4
          className="text-base font-bold text-foreground"
          style={{ fontFamily: "'El Messiri', serif" }}
        >
          {inv.title.split("—")[0]?.trim()}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPreview(inv)
          }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold border border-border"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          👁 معاينة الدعوة
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTry(inv)
          }}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold bg-[#B8862F] text-white"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          ✍️ جرّب هذي الدعوة
        </button>
      </div>
    </div>
  )
}
