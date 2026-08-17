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

// اسم الـ bucket بـ Supabase Storage اللي نرفع فيه ملفات الوسائط (صور
// الدعوات، الفيديوهات، الموسيقى). لازم يكون "Public bucket" مفعّل حتى
// الروابط تشتغل مباشرة بدون تسجيل دخول (شوف تعليمات الإعداد بالمحادثة).
const MEDIA_BUCKET = "invitation-media"

function isMissingBucketError(error: any) {
  const msg = (error?.message || "").toLowerCase()
  return msg.includes("bucket not found")
}

// رفع ملف وسائط (صورة/فيديو/صوت) لـ Supabase Storage وإرجاع رابطه
// العام. folder ينظم الملفات داخل الـ bucket (مثلاً "hero-bg"،
// "intro-video"...) بس ما يأثر على الرابط النهائي.
export async function uploadMedia(
  file: File,
  folder: string,
): Promise<{
  success: boolean
  url?: string
  error?: string
  bucketMissing?: boolean
}> {
  try {
    const safeName = file.name
      .replace(/[^a-zA-Z0-9.\-_]/g, "-")
      .toLowerCase()
    const path = `${folder}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { upsert: false })

    if (uploadError) {
      if (isMissingBucketError(uploadError)) {
        return { success: false, bucketMissing: true }
      }
      console.error("Supabase uploadMedia error:", uploadError)
      return { success: false, error: uploadError.message }
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
    return { success: true, url: data.publicUrl }
  } catch (err: any) {
    console.error("Supabase uploadMedia exception:", err)
    return { success: false, error: err?.message ?? "خطأ غير متوقع" }
  }
}

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

// أضيق نسخة ممكنة — بدون sheetId/sheetUrl. هذي آخر محاولة احتياطية
// لو عمود الشيت نفسه غير موجود بجدول invitations، حتى أقل شي باقي
// بيانات الدعوة (العنوان، الأسماء، التاريخ...) تنحفظ بدل ما يفشل كل شي.
function toDatabaseInvitationCore(inv: Invitation) {
  const { sheetId, sheetUrl, ...rest } = toDatabaseInvitation(inv)
  return rest
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
    mapUrl: row.mapUrl ?? local?.mapUrl ?? "",
    eventDateTime: row.eventDateTime ?? local?.eventDateTime ?? "",
    isPrivate: row.isPrivate ?? local?.isPrivate ?? false,
    coverImage: row.coverImage ?? local?.coverImage ?? "",
    hideCoverOverlay: row.hideCoverOverlay ?? local?.hideCoverOverlay ?? false,
    schedule: row.schedule ?? local?.schedule ?? [],
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

// الحقول الاختيارية اللي ممكن أعمدتها ما تكون مضافة بعد بجدول
// invitations (يختلف حسب كل مشروع أي أعمدة أضافها المستخدم فعلياً).
// نجمعها كلها بصف وحد ونعتمد على saveInvitation تحت حتى تحاول تحفظها
// كلها دفعة وحدة، وتشيل بس العمود المسبب فعلياً لو صار خطأ — بدل ما
// نجمّعها بمجموعات ثابتة مسبقاً زي قبل (وهذا بالضبط سبب علة سابقة: كان
// mapUrl مجمّع مع eventDateTime بنفس المحاولة، فلما عمود eventDateTime
// ما كان موجود بقاعدة بيانات المستخدم، فشلت المحاولة كاملة وسقط رابط
// الموقع بالصمت رغم إن عموده mapUrl نفسه كان موجود).
function toDatabaseInvitationAllFields(inv: Invitation): Record<string, any> {
  return {
    ...toDatabaseInvitation(inv),
    isPrivate: inv.isPrivate ?? false,
    mapUrl: inv.mapUrl ?? null,
    eventDateTime: inv.eventDateTime ?? null,
    date: inv.date ?? null,
    city: inv.city ?? null,
    groomFamily: inv.groomFamily ?? null,
    brideFamily: inv.brideFamily ?? null,
    coverImage: inv.coverImage ?? null,
    hideCoverOverlay: inv.hideCoverOverlay ?? false,
    schedule: inv.schedule && inv.schedule.length > 0 ? inv.schedule : null,
    textStyles:
      inv.textStyles && Object.keys(inv.textStyles).length > 0
        ? inv.textStyles
        : null,
  }
}

// نستخرج اسم العمود المسبب بالضبط من رسالة خطأ Supabase/Postgres، حتى
// نقدر نشيله لحاله من صف الحفظ ونعيد المحاولة، بدل ما نشيل مجموعة حقول
// مع بعض بناءً على تخمين مسبق.
function extractMissingColumnName(error: any): string | null {
  const msg: string = error?.message || ""
  let m = msg.match(/'([^']+)'\s*column/i)
  if (m) return m[1]
  m = msg.match(/column\s+"([^"]+)"/i)
  if (m) return m[1]
  return null
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
      logoImageUrl: data.logoImageUrl ?? defaultSiteSettings.logoImageUrl,
      heroTitle: data.heroTitle ?? defaultSiteSettings.heroTitle,
      whatsappNumberIraq:
        data.whatsappNumberIraq ?? defaultSiteSettings.whatsappNumberIraq,
      whatsappNumberSaudi:
        data.whatsappNumberSaudi ?? defaultSiteSettings.whatsappNumberSaudi,
      topHeroBadge: data.topHeroBadge ?? defaultSiteSettings.topHeroBadge,
      topHeroTitleBefore:
        data.topHeroTitleBefore ?? defaultSiteSettings.topHeroTitleBefore,
      topHeroTitleAccent:
        data.topHeroTitleAccent ?? defaultSiteSettings.topHeroTitleAccent,
      topHeroTitleAfter:
        data.topHeroTitleAfter ?? defaultSiteSettings.topHeroTitleAfter,
      topHeroSubtitle:
        data.topHeroSubtitle ?? defaultSiteSettings.topHeroSubtitle,
      topHeroButtonText:
        data.topHeroButtonText ?? defaultSiteSettings.topHeroButtonText,
      heroCard1Image:
        data.heroCard1Image ?? defaultSiteSettings.heroCard1Image,
      heroCard2Image:
        data.heroCard2Image ?? defaultSiteSettings.heroCard2Image,
      heroCard3Image:
        data.heroCard3Image ?? defaultSiteSettings.heroCard3Image,
      customFonts: data.customFonts ?? defaultSiteSettings.customFonts,
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
// نجرب من الأشمل للأبسط: (1) كل الحقول حتى الإضافية والخصوصية ورابط
// الشيت، (2) بدون الحقول الإضافية بس مع الخصوصية ورابط الشيت،
// (3) الحقول الأساسية + رابط الشيت بس (بدون خصوصية)، (4) الحقول
// الأساسية فقط بدون رابط الشيت. هذا حتى عمود ناقص وحد (مثلاً sheetId)
// ما يفشّل حفظ باقي الدعوة. savedPrivacy مهم لأنه لو ما انحفظ يعني
// الدعوة "الخاصة" راح تظهر بالصفحة الرئيسية بالعامة رغم كل شي.
// savedSheetLink مهم لأنه لو ما انحفظ يعني sheetId/sheetUrl ما وصلوا
// للقاعدة وزر "شيت الحضور" رح يظل رمادي حتى لو عبّيتهم بالنموذج.
export async function saveInvitation(inv: Invitation): Promise<{
  success: boolean
  savedExtraFields: boolean
  savedPrivacy: boolean
  savedSheetLink: boolean
  savedMapUrl: boolean
  savedEventDateTime: boolean
  savedCoverImage: boolean
  savedSchedule: boolean
  savedTextStyles: boolean
  error?: string
}> {
  try {
    // نحاول نحفظ كل الحقول دفعة وحدة أول شي. لو صار خطأ "عمود غير
    // موجود"، نستخرج اسم العمود المسبب بالضبط ونشيله هو بس من صف
    // الحفظ ونعيد المحاولة — فيضل أي حقل عموده موجود فعلاً بالقاعدة
    // ينحفظ طبيعي، حتى لو حقل ثاني (غير مرتبط) عموده ناقص.
    const row = toDatabaseInvitationAllFields(inv)
    const dropped = new Set<string>()
    let lastError: any = null

    for (let i = 0; i < 12; i++) {
      const { error } = await supabase
        .from("invitations")
        .upsert(row, { onConflict: "id" })

      if (!error) {
        return {
          success: true,
          savedExtraFields:
            !dropped.has("date") &&
            !dropped.has("city") &&
            !dropped.has("groomFamily") &&
            !dropped.has("brideFamily"),
          savedPrivacy: !dropped.has("isPrivate"),
          savedSheetLink: !dropped.has("sheetId") && !dropped.has("sheetUrl"),
          savedMapUrl: !dropped.has("mapUrl"),
          savedEventDateTime: !dropped.has("eventDateTime"),
          savedCoverImage: !dropped.has("coverImage"),
          savedSchedule: !dropped.has("schedule"),
          savedTextStyles: !dropped.has("textStyles"),
        }
      }

      lastError = error
      if (!isMissingColumnError(error)) {
        console.error("Supabase saveInvitation error:", error)
        return {
          success: false,
          savedExtraFields: false,
          savedPrivacy: false,
          savedSheetLink: false,
          savedMapUrl: false,
          savedEventDateTime: false,
          savedCoverImage: false,
          savedSchedule: false,
          savedTextStyles: false,
        }
      }

      const badColumn = extractMissingColumnName(error)
      if (!badColumn || !(badColumn in row) || dropped.has(badColumn)) {
        // ما قدرنا نحدد بالضبط شنو العمود المسبب (أو خلصت الحقول
        // اللي نقدر نشيلها) — نوقف هنا بدل ما نلف بلا نهاية.
        break
      }
      delete row[badColumn]
      dropped.add(badColumn)
    }

    console.error("Supabase saveInvitation error:", lastError)
    return {
      success: false,
      savedExtraFields: false,
      savedPrivacy: false,
      savedSheetLink: false,
      savedMapUrl: false,
      savedEventDateTime: false,
      savedCoverImage: false,
      savedSchedule: false,
      savedTextStyles: false,
      error: lastError?.message ?? "خطأ غير متوقع",
    }
  } catch (err: any) {
    console.error("Supabase saveInvitation exception:", err)
    return {
      success: false,
      savedExtraFields: false,
      savedPrivacy: false,
      savedSheetLink: false,
      savedMapUrl: false,
      savedEventDateTime: false,
      savedCoverImage: false,
      savedSchedule: false,
      savedTextStyles: false,
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

// إنشاء شيت جوجل جديد تلقائياً لدعوة معينة (بدل ما المستخدم يسوّي شيت
// يدوياً وينسخ معرّفه). يعتمد على أكشن "createSheet" الموجود فعلياً بنفس
// Google Apps Script المستخدم لإرسال RSVP (SHEETS_SCRIPT_URL) — نفس
// الأكشن اللي كان مستخدم بالمشروع القديم لإنشاء شيت لكل دعوة خاصة.
export async function createSheetForInvitation(params: {
  title: string
}): Promise<{
  success: boolean
  sheetId?: string
  sheetUrl?: string
  error?: string
}> {
  try {
    const res = await fetch(SHEETS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "createSheet",
        title: params.title,
      }),
    })
    const result = await res.json().catch(() => null)
    if (!result || result.success === false || !result.sheetId) {
      return { success: false, error: result?.error ?? "استجابة غير متوقعة" }
    }
    return {
      success: true,
      sheetId: String(result.sheetId),
      sheetUrl: result.sheetUrl ?? undefined,
    }
  } catch (err: any) {
    console.error("createSheetForInvitation error:", err)
    return { success: false, error: err?.message ?? "خطأ غير متوقع" }
  }
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
