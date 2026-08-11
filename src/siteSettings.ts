// كل النصوص والألوان القابلة للتعديل من لوحة التحكم (إعدادات الواجهة)،
// بعيداً عن بيانات الدعوات نفسها. أي نص أو لون هنا يظهر بالصفحة الرئيسية
// وقابل للتعديل بدون لمس الكود.

export interface SiteSettings {
  hero: {
    badge: string
    titleLine1: string
    titleLine2: string
    subtitle: string
    ctaButton: string
    // صورتا المعاينة الجانبيتان بأعلى الصفحة الرئيسية (اليمنى واليسرى) —
    // لو فاضيتين نستخدم الصورتين الافتراضيتين بمجلد public/mnbra
    imageLeftUrl?: string
    imageRightUrl?: string
  }
  templatesSection: {
    title: string
  }
  howItWorks: {
    title: string
    subtitle: string
    steps: {
      title: string
      description: string
    }[]
  }
  ctaBanner: {
    eyebrow: string
    title: string
    description: string
    buttonText: string
  }
  footer: {
    logoText: string
    paymentLabel: string
    instagramUrl: string
    tiktokUrl: string
  }
  colors: {
    // اللون الأساسي (الذهبي) — يُستخدم بالأزرار الرئيسية والشارات وتأثير اللمعان
    primary: string
    // اللون الثانوي (الوردي/الأحمر) — يُستخدم بنافذة الدعوة بالأسفل والشعار
    secondary: string
    // خلفية الفوتر الغامقة بالأسفل
    footerBg: string
  }
  // الخط العام المستخدم بنصوص الواجهة (الصفحة الرئيسية ولوحة التحكم) — لا
  // يشمل خطوط قوالب الدعوات نفسها (وصال/لمسة)، تلك ثابتة بتصميم كل قالب
  typography: {
    fontFamily: string
    // رابط ملف خط مرفوع من الجهاز (لو الأدمن رفع خط بدل ما يختار من
    // القائمة الجاهزة) — لازم يكون موجود مع fontFamily حتى نقدر نعيد حقن
    // قاعدة @font-face بالصفحة من جديد بعد أي تحديث (F5) أو بأي جهاز ثاني
    customFontUrl?: string
  }
}

// قائمة الخطوط الجاهزة لاختيار خط الواجهة — كلها محمّلة مسبقًا من Google
// Fonts بـ src/index.css فتشتغل فورًا بدون إعداد إضافي. لإضافة خط جديد:
// 1) ضيفه بسطر @import بأول index.css، 2) ضيف عنصر جديد هنا بنفس اسم
// عائلة الخط (family) بالضبط.
export const SITE_FONT_OPTIONS: { label: string; family: string }[] = [
  { label: "نسخ سنس (افتراضي)", family: "'Noto Sans Arabic', sans-serif" },
  { label: "نسخ نسخي", family: "'Noto Naskh Arabic', serif" },
  { label: "قاهرة", family: "'Cairo', sans-serif" },
  { label: "عارف رقعة", family: "'Aref Ruqaa', serif" },
  { label: "أميري", family: "'Amiri', serif" },
  { label: "المسيري", family: "'El Messiri', sans-serif" },
  { label: "ريم كوفي", family: "'Reem Kufi', sans-serif" },
  { label: "IBM بلكس", family: "'IBM Plex Sans', sans-serif" },
]

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  hero: {
    badge: "🎁 جرّب دعوتك مجاناً قبل ما تدفع أي فلس",
    titleLine1: "دعوة إلكترونية تخطف الأنظار",
    titleLine2: "لمناسبتك القادمة",
    subtitle:
      "رابط واحد أنيق ترسله لكل المعازيم — بأنميشن يفتح كالسحر، وتأكيد حضور، وكشف بالحاضرين تشوفه برابط تحكمك لحظة بلحظة.",
    ctaButton: "✨ شاهد القوالب",
  },
  templatesSection: {
    title: "اختر دعوتك المثالية",
  },
  howItWorks: {
    title: "كيف نشتغل؟",
    subtitle: "أربع خطوات وتوصلك دعوتك",
    steps: [
      {
        title: "جهّز بنفسك",
        description: "اختر قالبك واكتب أسماءكم وموعدكم بثلاث خطوات.",
      },
      {
        title: "شاهدها بأسماءكم",
        description: "تفتح دعوتك حيّة بأنميشنها الكامل قبل أي دفع.",
      },
      {
        title: "ادفع",
        description: "وحال الدفع يفتح رابط دعوتك ورابط التحكم فوراً.",
      },
      {
        title: "شارك الرابط",
        description: "رابط واحد لكل المعازيم، وكشف الحضور يتحدّث برابطك لحظياً.",
      },
    ],
  },
  ctaBanner: {
    eyebrow: "✨ أول خطوة علينا",
    title: "خلّوا فرحتكم تنفتح بأسمائكم.",
    description:
      "اختاروا القالب، اكتبوا الأسماء، وشوفوا دعوتكم الحقيقية قبل ما تطلبوها — تجربة سريعة ومجانية.",
    buttonText: "جرّبوا دعوتكم الآن",
  },
  footer: {
    logoText: "سما",
    paymentLabel: "ادفع بأمان من أي مكان في العالم",
    instagramUrl: "https://instagram.com/samaworld_sa",
    tiktokUrl: "https://tiktok.com/@isama.est",
  },
  colors: {
    primary: "#d4a035",
    secondary: "#e8487a",
    footerBg: "#241b2e",
  },
  typography: {
    fontFamily: "'Noto Sans Arabic', sans-serif",
  },
}
