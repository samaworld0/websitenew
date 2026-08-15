import { createClient } from "@supabase/supabase-js"
import { Invitation, SiteSettings } from "./types"
import { invitations as seedInvitations, defaultSiteSettings } from "./data"

// رابط سكربت Google Apps Script المسؤول عن إضافة تأكيدات الحضور (RSVP) للشيت
export const SHEETS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyweFj9nsC81jES_PGEwDnGiKL7rxTB78D-evgZ0yisT4HptdqdHIqkyban5c39rvlN/exec"

// عميل Supabase — المفتاح هذا "publishable/anon" وآمن يكون بكود الواجهة
// (مو المفتاح السري secret/service_role، هذا ما يصير يكون بالفرونت اند أبداً)
const SUPABASE_URL = "https://yybdncbgradywuiomyik.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_ghQkvzBNAVphFa5PJMwoHQ_2zIoeBHD"
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// تحويل بيانات الدعوة إلى أعمدة موجودة فعلياً بجدول public.invitations.
// ملاحظة مهمة: هذا المشروع عنده حقول (date, city, groomFamily, brideFamily)
// غير موجودة كأعمدة بالجدول الحالي (شوف ملاحظة README المرفقة)، فهذي
// الحقول ما تترسل ولا تترجع من القاعدة — تبقى فقط بالبيانات المحلية
// (data.ts) لحد ما تُضاف أعمدة لها بقاعدة البيانات.
function toDatabaseInvitation(inv: Invitation) {
  return {
    id: inv.id,
    category: inv.category,
    title: inv.title,
    subtitle: inv.subtitle,
    groom: inv.groom,
    bride: inv.bride,
    dateGreg: inv.dateGreg,
    time: inv.time,
    venue: inv.venue,
    gradient: inv.gradient ?? [],
    accentColor: inv.accentColor,
    tag: inv.tag,
    price: inv.price,
    verse: inv.verse,
    sheetId: inv.sheetId ?? null,
    sheetUrl: inv.sheetUrl ?? null,
    templateType: inv.templateType ?? null,
    heroBg: inv.heroBg ?? null,
    doorBgVideo: inv.doorBgVideo ?? null,
    introVideo: inv.introVideo ?? null,
    introPoster: inv.introPoster ?? null,
    musicUrl: inv.musicUrl ?? null,
  }
}

// نكمّل بيانات الصف الراجع من القاعدة بالحقول المحلية (date, city,
// groomFamily, brideFamily) من data.ts (لو كان نفس id موجود محلياً)، حتى
// التصميم يستمر يعرضها كما هي بدون أي نقص، بانتظار إضافة أعمدتها بالقاعدة.
function mergeWithLocalFields(row: any): Invitation {
  const local = seedInvitations.find((s) => s.id === row.id)
  return {
    ...row,
    date: row.date ?? local?.date ?? "",
    city: row.city ?? local?.city ?? "",
    groomFamily: row.groomFamily ?? local?.groomFamily ?? "",
    brideFamily: row.brideFamily ?? local?.brideFamily ?? "",
    isPrivate: row.isPrivate ?? local?.isPrivate ?? false,
  } as Invitation
}

// تحميل الدعوات من Supabase. أول مرة (لو الجدول فاضي) نزرعه بالبيانات
// المحلية بـ data.ts.
export async function loadInvitations(): Promise<Invitation[]> {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .order("id", { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      const seedRows = seedInvitations.map(toDatabaseInvitation)
      const { error: seedError } = await supabase
        .from("invitations")
        .upsert(seedRows, { onConflict: "id" })

      if (seedError) {
        console.error("Supabase seed invitations error:", seedError)
      }

      return seedInvitations
    }

    return data.map(mergeWithLocalFields)
  } catch (err) {
    console.error("Supabase loadInvitations error:", err)
    return seedInvitations
  }
}

// نفس أعمدة toDatabaseInvitation بس مع إضافة خاصية "دعوة خاصة" (isPrivate)
// لو انضاف عمودها بالجدول.
function toDatabaseInvitationWithPrivacy(inv: Invitation) {
  return {
    ...toDatabaseInvitation(inv),
    isPrivate: inv.isPrivate ?? false,
  }
}

// نفس الشي بس مع إضافة الحقول المحلية (date, city, groomFamily,
// brideFamily) لو انضافت أعمدتها بالجدول لاحقاً.
function toDatabaseInvitationFull(inv: Invitation) {
  return {
    ...toDatabaseInvitationWithPrivacy(inv),
    date: inv.date ?? null,
    city: inv.city ?? null,
    groomFamily: inv.groomFamily ?? null,
    brideFamily: inv.brideFamily ?? null,
  }
}

function isMissingColumnError(error: any) {
  const msg = (error?.message || "").toLowerCase()
  return (
    error?.code === "42703" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("could not find") && msg.includes("column"))
  )
}

// لو جدول site_settings نفسه غير موجود بعد بقاعدة البيانات (لسه ما انسوّى).
function isMissingTableError(error: any) {
  const msg = (error?.message || "").toLowerCase()
  return (
    error?.code === "42P01" ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("could not find") && msg.includes("table"))
  )
}

// إعدادات الواجهة العامة تنحفظ بصف واحد ثابت (id = 1) بجدول site_settings.
const SITE_SETTINGS_ROW_ID = 1

// تحميل إعدادات الواجهة من Supabase. لو الجدول غير موجود أو فاضي، نرجع
// القيم الافتراضية (defaultSiteSettings) بدون ما نوقف الموقع عن الشغل.
export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", SITE_SETTINGS_ROW_ID)
      .maybeSingle()

    if (error) throw error
    if (!data) return defaultSiteSettings

    return {
      siteName: data.siteName ?? defaultSiteSettings.siteName,
      siteNameEn: data.siteNameEn ?? defaultSiteSettings.siteNameEn,
      logoIcon: data.logoIcon ?? defaultSiteSettings.logoIcon,
      heroTitle: data.heroTitle ?? defaultSiteSettings.heroTitle,
      whatsappNumber:
        data.whatsappNumber ?? defaultSiteSettings.whatsappNumber,
    }
  } catch (err) {
    console.error("Supabase loadSiteSettings error:", err)
    return defaultSiteSettings
  }
}

// حفظ إعدادات الواجهة بقاعدة Supabase (صف واحد ثابت id=1، upsert).
// لو جدول site_settings غير موجود بعد نرجّع tableMissing:true، ولو الجدول
// موجود بس ناقصه عمود (أو أكثر) نرجّع columnMissing:true — حتى نعرض
// تنبيه واضح بلوحة التحكم يشرح للمشرف بالضبط شنو يسوّي.
export async function saveSiteSettings(settings: SiteSettings): Promise<{
  success: boolean
  tableMissing?: boolean
  columnMissing?: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: SITE_SETTINGS_ROW_ID, ...settings }, { onConflict: "id" })

    if (error) {
      if (isMissingTableError(error)) {
        return { success: false, tableMissing: true, error: error.message }
      }
      if (isMissingColumnError(error)) {
        return { success: false, columnMissing: true, error: error.message }
      }
      console.error("Supabase saveSiteSettings error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    console.error("Supabase saveSiteSettings exception:", err)
    return { success: false, error: err?.message ?? "خطأ غير متوقع" }
  }
}

// حفظ دعوة (إنشاء جديدة أو تعديل موجودة) بقاعدة Supabase.
// نجرب من الأشمل للأبسط: (1) كل الحقول حتى الإضافية والخصوصية،
// (2) الحقول الأساسية + خاصية الخصوصية (isPrivate)، (3) الحقول الأساسية
// بس. هذا حتى عمود ناقص وحد (مثلاً isPrivate) ما يفشّل حفظ باقي الدعوة.
// savedPrivacy مهم لأنه لو ما انحفظ يعني الدعوة "الخاصة" راح تظهر
// بالصفحة الرئيسية بالعامة رغم كل شي.
export async function saveInvitation(inv: Invitation): Promise<{
  success: boolean
  savedExtraFields: boolean
  savedPrivacy: boolean
  error?: string
}> {
  try {
    const attempts: Array<{
      row: Record<string, any>
      savedExtraFields: boolean
      savedPrivacy: boolean
    }> = [
      {
        row: toDatabaseInvitationFull(inv),
        savedExtraFields: true,
        savedPrivacy: true,
      },
      {
        row: toDatabaseInvitationWithPrivacy(inv),
        savedExtraFields: false,
        savedPrivacy: true,
      },
      {
        row: toDatabaseInvitation(inv),
        savedExtraFields: false,
        savedPrivacy: false,
      },
    ]

    let lastError: any = null
    for (const attempt of attempts) {
      const { error } = await supabase
        .from("invitations")
        .upsert(attempt.row, { onConflict: "id" })

      if (!error) {
        return {
          success: true,
          savedExtraFields: attempt.savedExtraFields,
          savedPrivacy: attempt.savedPrivacy,
        }
      }

      lastError = error
      if (!isMissingColumnError(error)) {
        console.error("Supabase saveInvitation error:", error)
        return {
          success: false,
          savedExtraFields: false,
          savedPrivacy: false,
          error: error.message,
        }
      }
    }

    console.error("Supabase saveInvitation error:", lastError)
    return {
      success: false,
      savedExtraFields: false,
      savedPrivacy: false,
      error: lastError?.message ?? "خطأ غير متوقع",
    }
  } catch (err: any) {
    console.error("Supabase saveInvitation exception:", err)
    return {
      success: false,
      savedExtraFields: false,
      savedPrivacy: false,
      error: err?.message ?? "خطأ غير متوقع",
    }
  }
}

// حذف دعوة نهائياً من القاعدة.
export async function deleteInvitation(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("invitations").delete().eq("id", id)
    if (error) {
      console.error("Supabase deleteInvitation error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    console.error("Supabase deleteInvitation exception:", err)
    return { success: false, error: err?.message ?? "خطأ غير متوقع" }
  }
}

// تسجيل الدخول بإيميل وباسورد (Supabase Auth). المستخدم لازم يكون
// متسوّي مسبقاً من لوحة Supabase (Authentication > Users > Add user).
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, session: data.session }
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// إرسال تأكيد حضور (RSVP) لشيت جوجل الخاص بالدعوة. يترسل فعلياً بس لو
// الدعوة عندها sheetId (دعوة خاصة اتنشأت من لوحة تحكم). بدون sheetId
// تبقى معاينة محلية فقط بدون إرسال حقيقي.
export async function submitRSVP(params: {
  sheetId: string
  name: string
  attendance: string
  companions: number
  message: string
}): Promise<{ success: boolean }> {
  try {
    const res = await fetch(SHEETS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "addGuest",
        sheetId: params.sheetId,
        name: params.name,
        attendance: params.attendance,
        companions: params.companions,
        message: params.message,
      }),
    })
    const result = await res.json().catch(() => null)
    if (result && result.success === false) {
      return { success: false }
    }
    return { success: true }
  } catch (err) {
    console.error("RSVP submit error:", err)
    return { success: false }
  }
}
