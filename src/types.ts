export const categories = [
  { id: "all", label: "الكل" },
  { id: "wedding", label: "زفاف" },
  { id: "engagement", label: "خطوبة" },
  { id: "baby", label: "مولود" },
  { id: "graduation", label: "تخرج" },
  { id: "birthday", label: "عيد ميلاد" },
]

export interface Invitation {
  id: number
  category: string
  title: string
  subtitle: string
  groom: string
  bride: string
  dateGreg: string
  time: string
  venue: string
  gradient: string[]
  accentColor: string
  tag: string
  price: string
  verse: string
  sheetId?: string
  sheetUrl?: string
  // حقول اختيارية خاصة بقالب "وصال" (باب متحرك) — لو الدعوة تستخدمه
  // أو قالب "لمسة" (خطوبة بدون فيديو، تصميم CSS فقط)
  templateType?: "wisal" | "lamsa"
  heroBg?: string
  doorBgVideo?: string
  introVideo?: string
  introPoster?: string
  musicUrl?: string
  // صورة الغلاف تُستخدم في بطاقة العرض بالصفحة الرئيسية
  // ضع الملفات داخل مجلد public/mnbra وسمّها بنفس القيم أدناه
  coverImage?: string
  // دعوة خاصة: ما تظهر بشبكة الدعوات بالصفحة الرئيسية، بس تنفتح عبر رابطها المباشر فقط
  unlisted?: boolean
  // تاريخ ووقت الهدف لحساب العداد التنازلي "باقي على فرحنا"، بصيغة
  // datetime-local (مثلاً 2026-11-20T19:00). لو ما محدد، يعتبر العد منتهي.
  countdownDate?: string
  // رابط خرائط جوجل الدقيق (تُنسخ من كوكل ماب مباشرة) — لو محدد يُستخدم بدل
  // البحث التلقائي باسم القاعة والمدينة، لأنه أدق ويوصل لنفس البناية بالضبط.
  mapUrl?: string
}

// نموذج تفاصيل الدعوة الخاصة — يُستخدم بين AdminCreateForm و AdminPanel
export interface CreateDetailsDraft {
  groom: string
  bride: string
  dateGreg: string
  time: string
  venue: string
  verse: string
  countdownDate: string
  mapUrl: string
}
