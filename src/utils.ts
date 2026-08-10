// يحسب الأيام/الساعات/الدقائق/الثواني المتبقية بشكل حقيقي حتى تاريخ الهدف
// (countdownDate). لو ما فيه تاريخ محدد أو التاريخ فات، يرجّع كلها أصفار.
export function getTimeLeft(targetIso?: string) {
  if (!targetIso) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const target = new Date(targetIso).getTime()
  if (Number.isNaN(target)) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const diff = Math.max(0, target - Date.now())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

// يفتّح أو يغمّق أي لون Hex بنسبة معيّنة — نستخدمها حتى نولّد درجات لون
// كاملة (فاتح/غامق) من لون واحد يختاره الأدمن من لوحة التحكم، بدل ما نطلب
// منه يحدد كل درجة يدوياً.
// percent موجب = تفتيح، سالب = تغميق (مثلاً -20 تعني أغمق بنسبة 20%)
export function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace("#", "")
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return hex

  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff

  const amt = Math.round(2.55 * percent)
  r = Math.max(0, Math.min(255, r + amt))
  g = Math.max(0, Math.min(255, g + amt))
  b = Math.max(0, Math.min(255, b + amt))

  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  )
}

// خيارات حجم خط أسماء العروسين — تُستخدم بلوحة التحكم (اختيار) وبقوالب
// العرض (تطبيق الكلاس المطابق فعلياً بالشاشة الأولى)
export const NAME_FONT_SIZE_OPTIONS: { value: "sm" | "md" | "lg" | "xl"; label: string }[] = [
  { value: "sm", label: "صغير" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "كبير" },
  { value: "xl", label: "كبير جداً" },
]

const NAME_FONT_SIZE_CLASSES: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "text-5xl md:text-7xl",
  md: "text-6xl md:text-8xl",
  lg: "text-7xl md:text-9xl",
  xl: "text-8xl md:text-[10rem]",
}

// يرجّع كلاس Tailwind المطابق لحجم اسم العروسين. لو الدعوة ما محدد فيها
// حجم، نرجع الحجم الافتراضي حسب القالب (defaultSize) حتى الدعوات
// القديمة تضل بنفس شكلها الأصلي بالضبط.
export function getNameFontSizeClass(
  size: "sm" | "md" | "lg" | "xl" | undefined,
  defaultSize: "sm" | "md" | "lg" | "xl",
): string {
  return NAME_FONT_SIZE_CLASSES[size || defaultSize]
}

// برنامج الحفل الافتراضي لكل قالب — تستخدمه القوالب نفسها (Wisal/Lamsa)
// ولوحة تحكم التعديل (AdminEditForm) حتى تبتدي بنفس القيم لو الدعوة
// ما فيها برنامج مخصص بعد
export const DEFAULT_WISAL_PROGRAM = [
  { label: "استقبال الضيوف", time: "٧:٠٠ مساءً" },
  { label: "عقد القران", time: "٧:٣٠ مساءً" },
  { label: "العشاء", time: "٩:٠٠ مساءً" },
]

export const DEFAULT_LAMSA_PROGRAM = [
  { label: "استقبال الضيوف", time: "٦:٠٠ مساءً" },
  { label: "حفل الخطوبة وتقديم الشبكة", time: "٦:٣٠ مساءً" },
  { label: "الحلوى والتهنئة", time: "٨:٠٠ مساءً" },
]

export function getDefaultProgramItems(templateType: "wisal" | "lamsa" | undefined) {
  return templateType === "lamsa" ? DEFAULT_LAMSA_PROGRAM : DEFAULT_WISAL_PROGRAM
}
