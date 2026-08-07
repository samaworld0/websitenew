import { createClient } from "@supabase/supabase-js"
import { Invitation } from "./types"
import { invitations } from "./data"

export const WHATSAPP_IRAQ = "9647718031245"
export const WHATSAPP_KSA = "966580690167"

// رابط سكربت Google Apps Script المسؤول عن إنشاء الشيتات وإضافة تأكيدات الحضور
export const SHEETS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyweFj9nsC81jES_PGEwDnGiKL7rxTB78D-evgZ0yisT4HptdqdHIqkyban5c39rvlN/exec"

// عميل Supabase
const SUPABASE_URL = "https://yybdncbgradywuiomyik.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_ghQkvzBNAVphFa5PJMwoHQ_2zIoeBHD"
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// تسجيل دخول الأدمن حقيقي عبر Supabase Auth
export async function isAdminLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

// جلب الدعوات من Supabase
export async function loadInvitations(): Promise<Invitation[]> {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .order("id", { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      await supabase.from("invitations").upsert(invitations)
      return invitations
    }

    return data as Invitation[]
  } catch (err) {
    console.error("Supabase loadInvitations error:", err)
    return invitations
  }
}

// تحديث وحفظ الدعوات في Supabase
export async function persistInvitations(list: Invitation[]) {
  try {
    if (list.length > 0) {
      const ids = list.map((inv) => inv.id)
      await supabase.from("invitations").delete().not("id", "in", `(${ids.join(",")})`)
    } else {
      await supabase.from("invitations").delete().neq("id", -1)
    }
    if (list.length > 0) {
      const { error } = await supabase.from("invitations").upsert(list)
      if (error) throw error
    }
  } catch (err) {
    alert("حدث خطأ أثناء الحفظ. قد يكون حجم الملفات المرفوعة كبيراً جداً على قاعدة البيانات.")
    console.error("Supabase persistInvitations error:", err)
  }
}

export function encodeInvitationForUrl(inv: Invitation): string {
  return encodeURIComponent(JSON.stringify(inv))
}

export function decodeInvitationFromUrl(raw: string): Invitation | null {
  try {
    return JSON.parse(decodeURIComponent(raw)) as Invitation
  } catch {
    return null
  }
}

const ASSET_COUNTER_KEY = "dawaati_asset_counter"

export function loadAssetCounter(): number {
  if (typeof window === "undefined") return 3
  const raw = window.localStorage.getItem(ASSET_COUNTER_KEY)
  const n = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) ? n : 3
}

export function persistAssetCounter(n: number) {
  window.localStorage.setItem(ASSET_COUNTER_KEY, String(n))
}

// ==========================================
// --- نظام إدارة وتعديل محتوى وألوان الواجهة الشامل ---
// ==========================================

export interface SiteSettings {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  primary_color: string;
  how_it_works_title: string;
  how_it_works_subtitle: string;
  footer_title: string;
  footer_subtitle: string;
  banner_badge: string;
  banner_btn_text: string;
  footer_secure_text: string;
  banner_bg_color: string;
  banner_btn_color: string;
  banner_btn_text_color: string;
}

const defaultSiteSettings: SiteSettings = {
  id: 1,
  hero_title: "دعوة إلكترونية تخطف الأنظار لمناسبتك القادمة",
  hero_subtitle: "رابط واحد أنيق ترسله لكل المعازيم — بأنميشن يفتح كالسحر، وتأكيد حضور، وكشف بالحاضرين تشوفه برابط تحكمك لحظة بلحظة.",
  primary_color: "#e11d48",
  how_it_works_title: "كيف نشتغل؟",
  how_it_works_subtitle: "أربع خطوات وتوصلك دعوتك",
  footer_title: "خلّوا فرحتكم تنفتح بأسمائكم.",
  footer_subtitle: "اختاروا القالب، اكتبوا الأسماء، وشوفوا دعوتكم الحقيقية قبل ما تطلبوها — تجربة سريعة ومجانية.",
  banner_badge: "أول خطوة علينا ✨",
  banner_btn_text: "جرّبوا دعوتكم الآن",
  footer_secure_text: "ادفع بأمان من أي مكان في العالم",
  banner_bg_color: "#e11d48",
  banner_btn_color: "#ffffff",
  banner_btn_text_color: "#e11d48"
}

// جلب إعدادات الواجهة مع إنشاء وتعبئة القيم تلقائياً لو كانت القاعدة فارغة
export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      await supabase.from("site_settings").upsert([defaultSiteSettings]);
      return defaultSiteSettings;
    }

    return {
      ...defaultSiteSettings,
      ...data,
    };
  } catch (err) {
    console.error("Error loading site settings:", err);
    return defaultSiteSettings;
  }
}

// حفظ وتحديث إعدادات الواجهة والألوان في Supabase
export async function saveSiteSettings(settings: Partial<SiteSettings>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: 1, ...settings });

    if (error) {
      console.error("Supabase saveSiteSettings error:", error);
      alert("حدث خطأ أثناء الحفظ في قاعدة البيانات: " + error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("Error saving site settings:", err);
    alert("حدث خطأ غير متوقع أثناء الحفظ.");
    return false;
  }
}
