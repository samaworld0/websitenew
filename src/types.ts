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
