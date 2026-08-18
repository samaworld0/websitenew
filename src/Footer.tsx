import { SiteSettings } from "./types"
import { WhatsAppIcon, InstagramIcon, TikTokIcon } from "./icons"

// أيقونة بطاقة دفع عامة (تُستخدم لبادج "بطاقة دفع" — دفع بأي بطاقة بشكل عام)
function CardIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2 9.5H22" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 14.5H9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function PaymentBadge({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-border shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

// فوتر الصفحة الرئيسية: الشعار، روابط سريعة، أيقونات التواصل الاجتماعي +
// واتساب مباشر، وطرق الدفع. مبني بنفس هوية الموقع (ذهبي/كريمي).
export default function Footer({
  siteSettings,
  onShowTemplates,
}: {
  siteSettings: SiteSettings
  onShowTemplates: () => void
}) {
  const generalMsg = encodeURIComponent(
    "السلام عليكم، أود الاستفسار عن الدعوات الإلكترونية",
  )

  // كل القيم تحت اختيارية بالإعدادات — لو المشرف ما خصّص شي، ترجع تلقائياً
  // لنفس التصميم الافتراضي الأصلي (شوف defaultSiteSettings بـ data.ts).
  const bgColor = siteSettings.footerBgColor || "#FBF7EF"
  const textColor = siteSettings.footerTextColor || "#4A3B2C"
  const linkColor = siteSettings.footerLinkColor || textColor
  const logoText = siteSettings.footerLogoText || siteSettings.siteName
  const logoBg1 = siteSettings.footerLogoBgColor1 || "#e8487a"
  const logoBg2 = siteSettings.footerLogoBgColor2 || "#ff94b0"
  const logoTextColor = siteSettings.footerLogoTextColor || "#ffffff"
  const link1Text = siteSettings.footerLink1Text || "جهّز دعوتك"
  const link2Text = siteSettings.footerLink2Text || "السعر"
  const paymentText =
    siteSettings.footerPaymentText || "ادفع بأمان من أي مكان في العالم"
  const whatsappText = siteSettings.footerWhatsappText || "واتساب مباشر"

  return (
    <footer
      className="border-t border-border mt-8"
      style={{ backgroundColor: bgColor }}
    >
      <div className="max-w-4xl mx-auto px-6 py-14 flex flex-col items-center text-center gap-8">
        {/* الشعار */}
        <div
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-lg"
          style={{
            background: `linear-gradient(135deg, ${logoBg1} 0%, ${logoBg2} 100%)`,
            color: logoTextColor,
            fontFamily: "Amiri, serif",
          }}
        >
          {logoText}
        </div>

        {/* روابط سريعة */}
        <nav
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-bold"
          style={{ color: linkColor }}
        >
          <button
            type="button"
            onClick={onShowTemplates}
            className="hover:text-gold-600 transition"
          >
            {link1Text}
          </button>
          <button
            type="button"
            onClick={onShowTemplates}
            className="hover:text-gold-600 transition"
          >
            {link2Text}
          </button>
        </nav>

        {/* التواصل الاجتماعي */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {siteSettings.footerSocialHandle && (
            <span
              className="text-sm font-bold"
              style={{ color: textColor }}
            >
              {siteSettings.footerSocialHandle}
            </span>
          )}
          {siteSettings.footerInstagramUrl && (
            <a
              href={siteSettings.footerInstagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="إنستغرام"
              className="text-warm-700 hover:text-rose-500 transition"
            >
              <InstagramIcon size={20} />
            </a>
          )}
          {siteSettings.footerTiktokUrl && (
            <a
              href={siteSettings.footerTiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="تيك توك"
              className="text-warm-700 hover:text-warm-900 transition"
            >
              <TikTokIcon size={20} />
            </a>
          )}
          <a
            href={`https://wa.me/${siteSettings.whatsappNumberIraq}?text=${generalMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-[#25D366] text-white"
          >
            <WhatsAppIcon size={15} />
            <span>{whatsappText}</span>
          </a>
        </div>

        {/* طرق الدفع */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs" style={{ color: textColor, opacity: 0.75 }}>
            {paymentText}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PaymentBadge>
              <span className="flex -space-x-2" aria-hidden>
                <span className="w-4 h-4 rounded-full bg-[#EB001B]" />
                <span className="w-4 h-4 rounded-full bg-[#F79E1B] opacity-90" />
              </span>
              <span className="text-xs font-bold" style={{ color: textColor }}>
                mastercard
              </span>
            </PaymentBadge>
            <PaymentBadge>
              <span
                className="text-sm font-black italic"
                style={{ color: "#1A1F71" }}
              >
                VISA
              </span>
            </PaymentBadge>
            <PaymentBadge>
              <CardIcon size={16} />
              <span className="text-xs font-bold" style={{ color: textColor }}>
                بطاقة دفع
              </span>
            </PaymentBadge>
          </div>
        </div>
      </div>
    </footer>
  )
}
