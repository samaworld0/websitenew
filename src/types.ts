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
  // حقل اختياري خاص بقالب "وصال" (باب متحرك) — لو الدعوة تستخدمه
  templateType?: "wisal"
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
  // حجم خط أسماء العروسين بالشاشة الأولى — لو ما محدد يستخدم الحجم
  // الافتراضي لكل قالب (نفس الحجم اللي كان بالتصميم الأصلي)
  nameFontSize?: "sm" | "md" | "lg" | "xl"
  // برنامج الحفل (3 فقرات: الاسم + الوقت) — يظهر بقسم "برنامج الحفل" داخل
  // الدعوة. لو ما محدد يستخدم البرنامج الافتراضي لكل قالب.
  programItems?: { label: string; time: string }[]
  // أحجام ومواضع مخصّصة لنصوص معيّنة داخل الدعوة — يعبّيها محرر التصميم
  // المباشر (شبيه فيغما) لما الأدمن يكبّر/يصغّر نص أو يسحبه لمكان ثاني.
  // المفتاح هو معرّف النص (مثل groomName)، والقيمة حجم الخط بالبكسل
  // ومقدار الإزاحة الأفقية/العمودية بالبكسل عن موضعه الأصلي بالتصميم.
  textStyles?: Record<string, { size?: number; x?: number; y?: number }>
  // النص الصغير اللي يطلع فوق الوردة بأعلى الشاشة الأولى (افتراضياً "دعوة
  // زفاف") — قابل للتعديل من نموذج "تعديل الدعوة"
  heroEyebrow?: string
  // لون اللمعة (الوميض) اللي تطلع لحظة الضغط لفتح الدعوة — لو ما محدد
  // تستخدم اللون الأبيض الافتراضي
  flashColor?: string
  // لو مفعّل: الضغطة على "افتح الدعوة" تدخل الضيف مباشرة لمحتوى الدعوة
  // مع ومضة خفيفة بس (بدون تشغيل فيديو فتح الباب/الظرف). يشتغل فقط مع
  // قالب "وصال" (اللي فيه فيديو فتح أصلاً) — قالب "لمسة" أصلاً بدون فيديو.
  skipIntroVideo?: boolean
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
