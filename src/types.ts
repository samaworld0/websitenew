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
  heroTitle: string
  whatsappNumberIraq: string
  whatsappNumberSaudi: string
}
