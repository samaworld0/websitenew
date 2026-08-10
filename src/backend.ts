import { createClient } from "@supabase/supabase-js"
import { Invitation } from "./types"
import { invitations } from "./data"
import { SiteSettings, DEFAULT_SITE_SETTINGS } from "./siteSettings"
import { shadeColor } from "./utils"

export const WHATSAPP_IRAQ = "9647718031245"
export const WHATSAPP_KSA = "966580690167"

// رابط سكربت Google Apps Script المسؤول عن إنشاء الشيتات وإضافة تأكيدات الحضور
export const SHEETS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyweFj9nsC81jES_PGEwDnGiKL7rxTB78D-evgZ0yisT4HptdqdHIqkyban5c39rvlN/exec"

// عميل Supabase — المفتاح هذا "publishable/anon" وآمن يكون بكود الواجهة
// (مو المفتاح السري secret/service_role، هذا ما يصير يكون بالفرونت اند أبداً)
const SUPABASE_URL = "https://yybdncbgradywuiomyik.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_ghQkvzBNAVphFa5PJMwoHQ_2zIoeBHD"
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// تسجيل دخول الأدمن الآن حقيقي عبر Supabase Auth (إيميل + باسورد) بدل
// اليوزر/الباسورد الثابتين بالكود. الجلسة تنحفظ وتتدار تلقائياً من مكتبة supabase.
export async function isAdminLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

// كل الدعوات (الافتراضية + أي إضافة/تعديل من لوحة التحكم) تنخزن هلأ بجدول
// "invitations" على Supabase بدل localStorage، حتى تكون نفس البيانات
// ظاهرة لكل زوار الموقع من أي جهاز، مو بس بمتصفح الأدمن اللي أضافها.
export async function loadInvitations(): Promise<Invitation[]> {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .order("id", { ascending: true })

    if (error) throw error

    // أول مرة يكون الجدول فاضي — نزرع فيه الدعوات الافتراضية
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

// نتعامل مع القائمة الكاملة كمصدر الحقيقة: أي دعوة انحذفت من القائمة تنحذف
// من الجدول، وأي دعوة موجودة تنعمل لها upsert (تحديث لو موجودة، إضافة لو جديدة).
// هذا يخلي استدعاء persistInvitations(list) يشتغل بنفس الطريقة القديمة
// بالضبط بدون ما نغيّر منطق باقي الكود (حذف/تعديل/تكرار/إضافة).
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
    alert("حدث خطأ أثناء الحفظ. قد يكون حجم الملفات المرفوعة (مثل الفيديوهات) كبيراً جداً على قاعدة البيانات. يُفضل تقليل حجمها أو استخدام روابط مباشرة.")
    console.error("Supabase persistInvitations error:", err)
  }
}

// ترميز/فك ترميز دعوة كاملة داخل رابط URL — هذا يخلي رابط الدعوة الخاصة
// يشتغل من أي جهاز أو متصفح، لأنه يحمل بيانات الدعوة بنفسه بدل ما يدور
// عليها بـ localStorage (اللي يكون فاضي عند أي شخص ثاني يفتح الرابط).
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

// عداد أسماء الملفات الخاصة بكل دعوة مكرَّرة — يبدأ من 3 لأن hero-bg و hero-bg-2
// (وما يقابلهما) مستخدمين أصلاً بالدعوتين الافتراضيتين. كل تكرار ياخذ رقم جديد
// حتى ما تتشابك ملفات دعوة مع ثانية.
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

// ============ إعدادات الواجهة (نصوص الصفحة الرئيسية + الألوان) ============
// تنخزن بجدول "landing_page_settings" على Supabase — صف وحيد رقمه ثابت (id = 1)
// يحمل كل الإعدادات كـ JSON بعمود "data". لازم يكون الجدول موجود مسبقاً
// (شوف ملف SITE_SETTINGS_SETUP.md لتعليمات إنشائه)، ولو ما كان موجود أو
// صار أي خطأ، نرجع للإعدادات الافتراضية حتى الموقع يضل يشتغل بدون مشاكل.
const SITE_SETTINGS_ROW_ID = 1

export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from("landing_page_settings")
      .select("data")
      .eq("id", SITE_SETTINGS_ROW_ID)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      // أول مرة — نزرع الصف بالإعدادات الافتراضية
      await supabase
        .from("landing_page_settings")
        .upsert({ id: SITE_SETTINGS_ROW_ID, data: DEFAULT_SITE_SETTINGS })
      return DEFAULT_SITE_SETTINGS
    }

    // ندمج مع الافتراضي حتى لو انضافت حقول جديدة لاحقاً بالكود ما تكسر
    // الإعدادات القديمة المخزّنة (تحديثات مستقبلية على الموقع)
    return { ...DEFAULT_SITE_SETTINGS, ...(data.data as SiteSettings) }
  } catch (err) {
    console.error("Supabase loadSiteSettings error:", err)
    return DEFAULT_SITE_SETTINGS
  }
}

export async function persistSiteSettings(settings: SiteSettings) {
  try {
    const { error } = await supabase
      .from("landing_page_settings")
      .upsert({ id: SITE_SETTINGS_ROW_ID, data: settings })
    if (error) throw error
    return true
  } catch (err) {
    alert("حدث خطأ أثناء حفظ إعدادات الواجهة. تأكد إن جدول landing_page_settings موجود بقاعدة البيانات.")
    console.error("Supabase persistSiteSettings error:", err)
    return false
  }
}

// يطبّق ألوان الإعدادات فعلياً على الموقع عن طريق تغيير متغيرات CSS
// بجذر الصفحة لحظياً (بدون إعادة تحميل) — كل الأزرار والشارات والتدرجات
// اللي تعتمد على هالمتغيرات بتتغيّر تلقائياً بكل مكان بالموقع.
export function applyThemeColors(colors: SiteSettings["colors"]) {
  if (typeof document === "undefined") return
  const root = document.documentElement.style

  const { primary, secondary, footerBg } = colors

  // الدرجة الذهبية (الأساسية) — نولّد فاتح/غامق من اللون المختار
  root.setProperty("--color-gold-300", shadeColor(primary, 25))
  root.setProperty("--color-gold-400", primary)
  root.setProperty("--color-gold-500", shadeColor(primary, -12))
  root.setProperty("--color-gold-600", shadeColor(primary, -25))

  // الدرجة الوردية/الحمراء (الثانوية)
  root.setProperty("--color-rose-400", shadeColor(secondary, 20))
  root.setProperty("--color-rose-500", secondary)
  root.setProperty("--color-rose-600", shadeColor(secondary, -15))

  // متغيرات مخصصة لأماكن ما تعتمد على درجات gold/rose مباشرة
  root.setProperty("--cta-grad-from", shadeColor(secondary, -20))
  root.setProperty("--cta-grad-to", shadeColor(secondary, 25))
  root.setProperty("--footer-bg", footerBg)
}
