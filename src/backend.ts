import { createClient } from "@supabase/supabase-js"
import { Invitation } from "./types"
import { invitations } from "./data"

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
