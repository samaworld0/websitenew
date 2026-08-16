import { Invitation, SiteSettings } from "./types"

// القيم الافتراضية لإعدادات الواجهة — تُستخدم لو قاعدة البيانات فاضية أو
// جدول site_settings غير موجود بعد (شوف backend.ts -> loadSiteSettings).
export const defaultSiteSettings: SiteSettings = {
  siteName: "سما",
  siteNameEn: "SAMA",
  logoIcon: "✨",
  heroTitle: "اختر دعوتك المثالية",
  whatsappNumberIraq: "9647718031245",
  whatsappNumberSaudi: "966580690167",
}

// هذي البيانات تُستخدم فقط "لزرع" قاعدة بيانات Supabase أول مرة لو كانت
// فاضية (شوف backend.ts -> loadInvitations). بعد أول تحميل، البيانات
// الحقيقية تصير تجي من القاعدة مباشرة.
export const invitations: Invitation[] = [
  {
    id: 7,
    category: "wedding",
    title: "دعوة زواج — ملكي (وصال)",
    subtitle: "محمد وزينب",
    groom: "محمد",
    bride: "زينب",
    date: "٦ تشرين الثاني ٢٠٢٦",
    dateGreg: "٢٠ نوفمبر ٢٠٢٦",
    time: "٧:٠٠ مساءً",
    venue: "قاعة بابل الكبرى",
    city: "بغداد - المنصور",
    groomFamily: "كريمة السيد سامي حسن و السيدة رنا",
    brideFamily: "نجل السيد كريم عبد الله و السيدة هدى",
    gradient: ["#1A0E10", "#2A161A", "#1A0E10"],
    accentColor: "#D4AF37",
    tag: "مميز",
    price: "١١٠ ريال",
    verse:
      "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً",
    templateType: "wisal",
    heroBg: "/images/hero-bg.jpg",
    doorBgVideo: "/videos/door-bg.mp4",
    introVideo: "/videos/intro.mp4",
    introPoster: "/videos/intro-poster.jpg",
    musicUrl: "/music/background.mp3",
  },
  {
    id: 9,
    category: "wedding",
    title: "دعوة زواج — ملكي (وصال)",
    subtitle: "علي وهبة",
    groom: "علي",
    bride: "هبة",
    date: "٦ تشرين الثاني ٢٠٢٦",
    dateGreg: "٢٠ نوفمبر ٢٠٢٦",
    time: "٧:٠٠ مساءً",
    venue: "قاعة بابل الكبرى",
    city: "بغداد - المنصور",
    groomFamily: "عائلة العريس",
    brideFamily: "عائلة العروس",
    gradient: ["#1A0E10", "#2A161A", "#1A0E10"],
    accentColor: "#D4AF37",
    tag: "جديد",
    price: "١١٠ ريال",
    verse:
      "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً",
    templateType: "wisal",
    heroBg: "/images/hero-bg-2.jpg",
    doorBgVideo: "/videos/door-bg-2.mp4",
    introVideo: "/videos/intro-2.mp4",
    introPoster: "/videos/intro-poster-2.jpg",
    musicUrl: "/music/background-2.mp3",
  },
]
