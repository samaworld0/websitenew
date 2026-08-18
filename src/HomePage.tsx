import { useState } from "react"
import { Invitation, SiteSettings } from "./types"
import { WhatsAppIcon } from "./icons"
import Reveal from "./Reveal"
import Footer from "./Footer"

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
        {inv.coverImage || inv.heroBg ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${inv.coverImage || inv.heroBg}")`,
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

function TopHero({
  siteSettings,
  onShowTemplates,
}: {
  siteSettings: SiteSettings
  onShowTemplates: () => void
}) {
  const floatingDots = [
    { top: "10%", right: "50%", size: 9, color: "var(--color-rose-300)", delay: 0 },
    { top: "18%", right: "8%", size: 7, color: "var(--color-gold-400)", delay: 1.4 },
    { top: "48%", right: "3%", size: 6, color: "var(--color-rose-400)", delay: 0.6 },
    { top: "6%", left: "6%", size: 8, color: "var(--color-rose-400)", delay: 2 },
    { top: "60%", left: "9%", size: 7, color: "var(--color-gold-300)", delay: 1 },
  ]

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* خلفية منقّطة خفيفة + توهج علوي دافئ */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(rgba(180,130,40,0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 20%, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 20%, black 40%, transparent 90%)",
        }}
      />

      {floatingDots.map((dot, i) => (
        <span
          key={i}
          className="hidden sm:block absolute rounded-full animate-float"
          style={{
            top: dot.top,
            right: (dot as any).right,
            left: (dot as any).left,
            width: dot.size,
            height: dot.size,
            background: dot.color,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}

      <div className="max-w-4xl mx-auto px-6 text-center">
        <Reveal duration={600}>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-200 bg-gold-50 px-4 py-1.5 text-xs sm:text-sm font-bold text-gold-700">
            {siteSettings.topHeroBadge}
          </span>
        </Reveal>

        <Reveal duration={700} delay={100}>
          <h1
            className="mt-6 font-display font-bold leading-[1.3] text-3xl sm:text-5xl text-warm-900"
          >
            {siteSettings.topHeroTitleBefore}{" "}
            <span className="shimmer-text">
              {siteSettings.topHeroTitleAccent}
            </span>
            <br />
            {siteSettings.topHeroTitleAfter}
          </h1>
        </Reveal>

        <Reveal duration={700} delay={200}>
          <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-warm-700 leading-relaxed">
            {siteSettings.topHeroSubtitle}
          </p>
        </Reveal>

        <Reveal duration={700} delay={300}>
          <button
            onClick={onShowTemplates}
            className="mt-8 inline-flex items-center gap-2 btn-gold text-white font-bold px-7 py-3.5 rounded-full text-sm sm:text-base"
          >
            <span aria-hidden>🎨</span>
            {siteSettings.topHeroButtonText}
          </button>
        </Reveal>

        <Reveal duration={800} delay={400} className="mt-16">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {/* بطاقة 1: مغلّف بختم شمعي — أو صورة مرفوعة من إعدادات الواجهة */}
            <div
              className="w-24 sm:w-32 aspect-[3/5] rounded-2xl shadow-xl -rotate-6 flex items-center justify-center overflow-hidden"
              style={
                siteSettings.heroCard1Image
                  ? {
                      backgroundImage: `url("${siteSettings.heroCard1Image}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: "1px solid var(--color-gold-200)",
                    }
                  : {
                      background:
                        "linear-gradient(160deg, var(--color-cream-100) 0%, var(--color-gold-100) 100%)",
                      border: "1px solid var(--color-gold-200)",
                    }
              }
            >
              {!siteSettings.heroCard1Image && (
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shadow-md"
                  style={{ background: "var(--color-rose-500)" }}
                >
                  س و ن
                </div>
              )}
            </div>

            {/* بطاقة 2: قالب "وصال" — باب الفرح الذهبي — أو صورة مرفوعة */}
            <div
              className="w-28 sm:w-36 aspect-[3/5] rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-2 relative z-10 overflow-hidden"
              style={
                siteSettings.heroCard2Image
                  ? {
                      backgroundImage: `url("${siteSettings.heroCard2Image}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: "1px solid var(--color-gold-500)",
                    }
                  : {
                      background:
                        "linear-gradient(160deg, #1a0a00 0%, #2d1200 60%, #1a0a00 100%)",
                      border: "1px solid var(--color-gold-500)",
                    }
              }
            >
              {!siteSettings.heroCard2Image && (
                <>
                  <div
                    className="w-10 h-14 sm:w-12 sm:h-16 rounded-t-full flex items-center justify-center text-gold-300 text-[10px] font-bold"
                    style={{ border: "2px solid var(--color-gold-400)" }}
                  >
                    و ل
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-gold-300 font-bold">
                    وصال
                  </span>
                </>
              )}
            </div>

            {/* بطاقة 3: قالب زهور — أو صورة مرفوعة */}
            <div
              className="w-24 sm:w-32 aspect-[3/5] rounded-2xl shadow-xl rotate-6 flex flex-col items-center justify-center gap-1.5 overflow-hidden"
              style={
                siteSettings.heroCard3Image
                  ? {
                      backgroundImage: `url("${siteSettings.heroCard3Image}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: "1px solid var(--color-rose-200)",
                    }
                  : {
                      background:
                        "linear-gradient(160deg, var(--color-rose-50) 0%, var(--color-cream-200) 100%)",
                      border: "1px solid var(--color-rose-200)",
                    }
              }
            >
              {!siteSettings.heroCard3Image && (
                <>
                  <span className="text-lg sm:text-xl">🌸</span>
                  <span className="text-[9px] sm:text-[10px] text-rose-600 font-bold">
                    لمسة
                  </span>
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
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

  const scrollToTemplates = () => {
    document
      .getElementById("templates-grid")
      ?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div
      className="min-h-screen bg-background"
      dir="rtl"
      style={{ fontFamily: "Tajawal, sans-serif" }}
    >
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Reveal className="flex items-center gap-3" duration={600}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-[#2C1810] overflow-hidden shrink-0">
              {siteSettings.logoImageUrl ? (
                <img
                  src={siteSettings.logoImageUrl}
                  alt={siteSettings.siteName}
                  className="w-full h-full object-cover"
                />
              ) : (
                siteSettings.logoIcon
              )}
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
          </Reveal>
          <Reveal
            className="flex items-center gap-2"
            duration={600}
            delay={100}
          >
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
          </Reveal>
        </div>
      </nav>

      <TopHero siteSettings={siteSettings} onShowTemplates={scrollToTemplates} />

      <section id="templates-grid" className="max-w-7xl mx-auto px-6 py-24">
        <Reveal className="text-center mb-16" as="div">
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "Amiri, serif" }}
          >
            {siteSettings.heroTitle}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {filtered.map((inv, index) => (
            <Reveal key={inv.id} delay={(index % 4) * 90}>
              <InvitationCard inv={inv} onPreview={onPreview} />
            </Reveal>
          ))}
        </div>
      </section>

      <Footer siteSettings={siteSettings} onShowTemplates={scrollToTemplates} />
    </div>
  )
}
