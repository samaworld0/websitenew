import { useState } from "react"
import { Invitation, SiteSettings } from "./types"
import { WhatsAppIcon } from "./icons"

const categories = [
  { id: "all", label: "الكل" },
  { id: "wedding", label: "زفاف" },
  { id: "engagement", label: "خطوبة" },
  { id: "baby", label: "مولود" },
  { id: "graduation", label: "تخرج" },
  { id: "birthday", label: "عيد ميلاد" },
]

function InvitationCard({
  inv,
  onPreview,
}: {
  inv: Invitation
  onPreview: (inv: Invitation) => void
}) {
  const [hovered, setHovered] = useState(false)
  const ac = inv.accentColor
  const bg = `linear-gradient(180deg, ${inv.gradient[0]} 0%, ${inv.gradient[1]} 100%)`

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
        {inv.heroBg ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${inv.heroBg}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: bg }} />
        )}

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
            style={{ background: ac, color: "#1a0a00" }}
          >
            👁 معاينة كاملة
          </div>
        </div>
      </div>

      <div className="mt-4 text-right" dir="rtl">
        <h4 className="text-base font-bold text-foreground">
          {inv.title.split("—")[0]?.trim()}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPreview(inv)
          }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold border border-border"
        >
          👁 معاينة الدعوة
        </button>
      </div>
    </div>
  )
}

function WhatsAppContactButton({
  numberIraq,
  numberSaudi,
  message,
}: {
  numberIraq: string
  numberSaudi: string
  message: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-[#25D366] text-white"
      >
        <WhatsAppIcon size={16} />
        <span>تواصل</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 mt-2 z-50 w-48 rounded-xl border border-border bg-background shadow-lg overflow-hidden"
            dir="rtl"
          >
            <a
              href={`https://wa.me/${numberIraq}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-accent/10 transition"
            >
              <WhatsAppIcon size={16} />
              <span>واتساب — العراق</span>
            </a>
            <a
              href={`https://wa.me/${numberSaudi}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-bold border-t border-border hover:bg-accent/10 transition"
            >
              <WhatsAppIcon size={16} />
              <span>واتساب — السعودية</span>
            </a>
          </div>
        </>
      )}
    </div>
  )
}

// الواجهة الرئيسية للموقع: الشريط العلوي + شبكة عرض الدعوات مع الفلترة
// حسب التصنيف. هذا الملف مستقل تماماً ويستقبل بياناته عبر props من App.tsx
export default function HomePage({
  invitations,
  siteSettings,
  onPreview,
}: {
  invitations: Invitation[]
  siteSettings: SiteSettings
  onPreview: (inv: Invitation) => void
}) {
  const [activeCategory, setActiveCategory] = useState("all")

  // الدعوات الخاصة (isPrivate) ما تنعرض بشبكة الدعوات بالصفحة الرئيسية،
  // توصل بس لمن عنده رابط المعاينة المباشر (?preview=ID).
  const publiclyListedInvitations = invitations.filter((inv) => !inv.isPrivate)

  const filtered =
    activeCategory === "all"
      ? publiclyListedInvitations
      : publiclyListedInvitations.filter(
          (inv) => inv.category === activeCategory,
        )

  const generalMsg = encodeURIComponent(
    "السلام عليكم، أود الاستفسار عن الدعوات الإلكترونية",
  )

  return (
    <div
      className="min-h-screen bg-background"
      dir="rtl"
      style={{ fontFamily: "Tajawal, sans-serif" }}
    >
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-[#2C1810]">
              {siteSettings.logoIcon}
            </div>
            <div>
              <h1
                className="text-lg font-bold leading-none"
                style={{ fontFamily: "Amiri, serif" }}
              >
                {siteSettings.siteName}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {siteSettings.siteNameEn}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="?admin=1"
              title="لوحة التحكم"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border border-border text-[#2C1810] hover:bg-accent/10 transition"
            >
              <span aria-hidden>⚙️</span>
              <span className="hidden sm:inline">لوحة التحكم</span>
            </a>
            <WhatsAppContactButton
              numberIraq={siteSettings.whatsappNumberIraq}
              numberSaudi={siteSettings.whatsappNumberSaudi}
              message={generalMsg}
            />
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "Amiri, serif" }}
          >
            {siteSettings.heroTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {filtered.map((inv) => (
            <InvitationCard key={inv.id} inv={inv} onPreview={onPreview} />
          ))}
        </div>
      </section>
    </div>
  )
}
