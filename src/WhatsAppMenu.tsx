import { useState } from "react"
import { WhatsAppIcon } from "./icons"
import { WHATSAPP_IRAQ, WHATSAPP_KSA } from "./backend"

export function WhatsAppMenu() {
  const [open, setOpen] = useState(false)
  const generalMsg = encodeURIComponent(
    "السلام عليكم، أود الاستفسار عن الدعوات الإلكترونية",
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-[#25D366] text-white"
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        <WhatsAppIcon size={16} />
        <span>تواصل واتساب</span>
      </button>

      {open && (
        <>
          {/* طبقة لإغلاق القائمة عند الضغط خارجها */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-2 z-50 w-56 rounded-2xl border border-border bg-background shadow-xl overflow-hidden"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            <a
              href={`https://wa.me/${WHATSAPP_IRAQ}?text=${generalMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-[#25D366]/10 border-b border-border"
            >
              <WhatsAppIcon size={16} />
              <span>واتساب العراق</span>
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_KSA}?text=${generalMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-[#25D366]/10"
            >
              <WhatsAppIcon size={16} />
              <span>واتساب السعودية</span>
            </a>
          </div>
        </>
      )}
    </div>
  )
}

