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
}

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
}
