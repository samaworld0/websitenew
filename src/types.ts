export interface Invitation {
  id: number
  category: string
  title: string
  subtitle: string
  groom: string
  bride: string
  date: string
  dateGreg: string
  time: string
  venue: string
  city: string
  groomFamily: string
  brideFamily: string
  gradient: string[]
  accentColor: string
  tag: string
  price: string
  verse: string
  // صورة غلاف الدعوة تظهر بكرت الدعوة بالصفحة الرئيسية (شبكة العرض).
  // لو فاضية، ينرجع تلقائياً للتدرج اللوني (gradient) كخلفية بدالها.
  coverImage?: string
  // رابط الموقع (خرائط جوجل أو أي رابط موقع آخر) — يظهر بزر "الموقع على
  // الخريطة" بصفحة الدعوة. لو فاضي، يترجع تلقائياً لرابط خرائط جوجل عام.
  mapUrl?: string
  // موعد المناسبة الفعلي (تاريخ ووقت بصيغة ISO مثل "2026-11-20T19:00")
  // يُستخدم لحساب العداد التنازلي الحقيقي بصفحة الدعوة. منفصل عن حقول
  // العرض النصية (date, dateGreg, time) لأنه لازم يكون بصيغة تقدر أكوّد
  // JavaScript تحسبها، بينما هذيك تبقى نصوص حرة للعرض بس.
  eventDateTime?: string
  // لو صورة الغلاف موجودة وهالخيار مفعّل، تختفي الزخارف والنصوص
  // (الزوايا الذهبية، بسم الله الرحمن الرحيم، الخط، الاسم) اللي تترسم
  // فوق الصورة بكرت الدعوة، وتظهر الصورة نظيفة بدونها.
  hideCoverOverlay?: boolean
  // حقول اختيارية خاصة بقالب "وصال" (باب متحرك) — لو الدعوة تستخدمه
  templateType?: "wisal"
  heroBg?: string
  doorBgVideo?: string
  introVideo?: string
  introPoster?: string
  musicUrl?: string
  // حقول خاصة بربط Google Sheets — لو الدعوة عندها sheetId فرسائل تأكيد
  // الحضور (RSVP) تترسل فعلياً لشيتها. بدونه تبقى معاينة محلية فقط.
  sheetId?: string
  sheetUrl?: string
  // دعوة خاصة: لا تظهر بشبكة الدعوات بالصفحة الرئيسية، توصل بس لمن عنده
  // رابط المعاينة المباشر (?preview=ID).
  isPrivate?: boolean
}

// إعدادات الواجهة العامة للموقع (اسم الموقع، الشعار، رقم واتساب، عنوان
// القسم الرئيسي...) — صف واحد بجدول site_settings بقاعدة البيانات.
export interface SiteSettings {
  siteName: string
  siteNameEn: string
  logoIcon: string
  logoImageUrl?: string
  heroTitle: string
  whatsappNumberIraq: string
  whatsappNumberSaudi: string
  topHeroBadge: string
  topHeroTitleBefore: string
  topHeroTitleAccent: string
  topHeroTitleAfter: string
  topHeroSubtitle: string
  topHeroButtonText: string
}
