// نموذج بيانات "التعديل المباشر" (Live Editor) — مستورد من مكتبة LiveEditor
// المستقلة (src/LiveEditor.tsx). كل عنصر قابل للتعديل بالدعوة (اسم، تاريخ،
// قاعة...) يخزّن تعديلاته هنا بمفتاح معرّفه.
export type { TextStyle } from "./LiveEditor"
import type { TextStyle } from "./LiveEditor"

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
  // برنامج الحفل (الجدول الزمني) اللي يظهر بخط ذهبي بصفحة الدعوة — كل
  // عنصر له نص (مثلاً "عقد القران") ووقت (مثلاً "٧:٣٠ مساءً"). لو فاضي
  // أو غير موجود، تترجع الدعوة تلقائياً لبرنامج افتراضي ثابت (استقبال
  // الضيوف، عقد القران، العشاء) حتى ما ينكسر عرض الدعوات القديمة.
  schedule?: { label: string; time: string }[]
  // تعديلات "التصميم المباشر" (نص/لون/حجم/موضع مخصص لكل عنصر) — يتخزن
  // بعمود jsonb واحد بقاعدة البيانات (شوف backend.ts). لو فاضي، تُعرض
  // الدعوة بتصميمها الأصلي بدون أي تعديل.
  textStyles?: Record<string, TextStyle>
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
  // صور البطاقات الثلاث الزخرفية اللي تظهر تحت القسم الرئيسي العلوي
  // (Hero). كل وحدة اختيارية — لو فاضية، تترجع تلقائياً للتصميم
  // الافتراضي (الأيقونة/الإيموجي المرسوم بالكود) بدالها.
  heroCard1Image?: string
  heroCard2Image?: string
  heroCard3Image?: string
  // إعدادات الفوتر (أسفل الصفحة الرئيسية): المعرّف اللي يظهر جنب أيقونات
  // التواصل، ورابطي إنستغرام وتيك توك. كل حقل اختياري — لو فاضي ما تظهر
  // أيقونته بالفوتر.
  footerSocialHandle?: string
  footerInstagramUrl?: string
  footerTiktokUrl?: string
  // مكتبة الخطوط المخصصة اللي يضيفها المشرف (ملف خط مرفوع أو رابط خط) —
  // تنحفظ مرة وحدة هنا وتظهر تلقائياً بقائمة اختيار الخط بكل الدعوات
  // (شوف LiveEditor.tsx -> EditModeProvider customFonts + EditPanel).
  customFonts?: CustomFont[]
}

// خط مخصص واحد أضافه المشرف: اسم يظهر بقائمة الاختيار + رابط ملف
// الخط الفعلي (مرفوع لـ Supabase Storage أو رابط خارجي مباشر لملف
// woff/woff2/ttf/otf).
export interface CustomFont {
  name: string
  url: string
}
