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
      const seedRows = invitations.map(toDatabaseInvitation)
      const { error: seedError } = await supabase
        .from("invitations")
        .upsert(seedRows, { onConflict: "id" })

      if (seedError) {
        console.error("Supabase seed invitations error:", seedError)
      }

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

// رفع ملف (صورة أو فيديو) إلى Supabase Storage بدل تخزينه Base64 داخل
// صف الدعوة مباشرة. هذا يحل مشكلة فشل الحفظ عند رفع فيديوهات كبيرة، لأن
// قاعدة البيانات تخزن رابط الملف فقط بدل محتواه الكامل.
// ملاحظة: يتطلب وجود bucket عام اسمه "invitation-media" بمشروع Supabase
// (Storage → New bucket → فعّل Public bucket). لو الاسم مختلف عندك غيّره هنا.
const STORAGE_BUCKET = "invitation-media"

export async function uploadInvitationFile(
  file: File,
  invitationId: string | number,
  field: string,
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin"
  const path = `${invitationId}/${field}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error("تعذّر الحصول على رابط الملف بعد الرفع")

  return data.publicUrl
}

// الحقول اللي ممكن تحمل ملف (صورة/فيديو) بدل رابط
const MEDIA_FIELDS = [
  "heroBg",
  "doorBgVideo",
  "introVideo",
  "introPoster",
  "musicUrl",
  "coverImage",
  "logoUrl",
] as const

// تحويل رابط Base64 (data:...) إلى File جاهز للرفع
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",")
  const mime = header.match(/data:(.*?);base64/)?.[1] || "application/octet-stream"
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

// دعوات قديمة انحفظت قبل إضافة الرفع لـ Storage ممكن يكون لسا فيها حقل
// أو أكثر مخزّن Base64 كامل داخل الجدول. أي عملية حفظ تعيد رفع كل الدعوات
// (persistInvitations تشتغل على القائمة كاملة)، فلو دعوة وحدة قديمة فيها
// ملف Base64 ضخم، الحفظ يستمر يفشل حتى لو التعديل الحالي على دعوة ثانية.
// هذي الدالة تفحص كل دعوة قبل الحفظ، وأي حقل لسا Base64 فيه ترفعه تلقائياً
// لـ Storage وتستبدله برابط، حتى تنحل المشكلة نهائياً بدون تدخل يدوي.
async function migrateBase64Fields(inv: Invitation): Promise<Invitation> {
  const updated: Invitation = { ...inv }
  for (const field of MEDIA_FIELDS) {
    const value = updated[field] as string | undefined
    if (typeof value === "string" && value.startsWith("data:")) {
      const ext = value.slice(5, value.indexOf(";")).split("/")[1] || "bin"
      const file = dataUrlToFile(value, `${field}.${ext}`)
      const url = await uploadInvitationFile(file, inv.id, field)
      ;(updated as Record<string, unknown>)[field] = url
    }
  }
  return updated
}

// أخطاء Supabase (PostgrestError مثلاً) مو دائماً من نوع Error القياسي، فـ
// String(err) كانت تطلع "[object Object]" بدون أي فائدة. هذي الدالة تحاول
// تطلع أوضح رسالة ممكنة من أي شكل خطأ (Error عادي، أو كائن فيه message/details/hint/code).
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>
    const parts = [e.message, e.details, e.hint, e.code]
      .filter((v) => typeof v === "string" && v.length > 0)
    if (parts.length > 0) return parts.join(" | ")
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
}


// تحويل بيانات الدعوة إلى أعمدة موجودة فعلياً في public.invitations.
// لا نستخدم ...inv هنا، لأن Invitation يحتوي حقولاً إضافية مثل
// nameFontSize و programItems غير موجودة كأعمدة في جدول Supabase.
// بيانات التصميم المباشر محفوظة داخل textStyles (jsonb).
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
    coverImage: inv.coverImage ?? null,
    logoUrl: inv.logoUrl ?? null,
    unlisted: inv.unlisted ?? false,
    countdownDate: inv.countdownDate ?? null,
    mapUrl: inv.mapUrl ?? null,
    textStyles: inv.textStyles ?? null,
    heroEyebrow: inv.heroEyebrow ?? null,
    flashColor: inv.flashColor ?? null,
    skipIntroVideo: inv.skipIntroVideo ?? false,
  }
}

export async function persistInvitations(list: Invitation[]): Promise<boolean> {
  let migratedList: Invitation[]

  try {
    migratedList = await Promise.all(list.map(migrateBase64Fields))
  } catch (err) {
    console.error("Supabase migrateBase64Fields error:", err)
    alert(
      `فشل رفع أحد الملفات إلى Supabase Storage قبل الحفظ.\n\nتفاصيل الخطأ التقنية: ${describeError(err)}`,
    )
    return false
  }

  try {
    // مهم: لا نرسل Invitation كاملاً إلى Supabase.
    // هذا يمنع أخطاء الأعمدة غير الموجودة مثل programItems.
    const rows = migratedList.map(toDatabaseInvitation)

    if (rows.length > 0) {
      const ids = rows.map((row) => row.id)

      const { error: deleteError } = await supabase
        .from("invitations")
        .delete()
        .not("id", "in", `(${ids.join(",")})`)

      if (deleteError) throw deleteError
    } else {
      const { error: deleteError } = await supabase
        .from("invitations")
        .delete()
        .neq("id", -1)

      if (deleteError) throw deleteError
    }

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("invitations")
        .upsert(rows, { onConflict: "id" })

      if (upsertError) throw upsertError
    }

    return true
  } catch (err) {
    console.error("Supabase persistInvitations error:", err)
    alert(
      `حدث خطأ أثناء حفظ الدعوات بقاعدة البيانات.\n\nتفاصيل الخطأ التقنية: ${describeError(err)}`,
    )
    return false
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
// تنخزن كملف JSON واحد داخل نفس Supabase Storage bucket المستخدم للصور
// والفيديوهات (invitation-media) — بدل جدول قاعدة بيانات منفصل. هذا يعني
// ما فيه أي إعداد يدوي إضافي مطلوب بقاعدة البيانات: بما إن الـ bucket نفسه
// أصلاً لازم يكون موجود (يُستخدم لرفع صور/فيديوهات الدعوات)، إعدادات الواجهة
// تشتغل تلقائياً بدون أي خطوة يدوية زيادة.
const SITE_SETTINGS_STORAGE_PATH = "site-settings/settings.json"

export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(SITE_SETTINGS_STORAGE_PATH)

    if (error) throw error

    const text = await data.text()
    const parsed = JSON.parse(text) as SiteSettings
    // ندمج مع الافتراضي حتى لو انضافت حقول جديدة لاحقاً بالكود ما تكسر
    // الإعدادات القديمة المخزّنة (تحديثات مستقبلية على الموقع)
    return { ...DEFAULT_SITE_SETTINGS, ...parsed }
  } catch (err) {
    // أول مرة (الملف مو موجود بعد) أو أي خطأ ثاني — نرجع للإعدادات
    // الافتراضية حتى الموقع يضل يشتغل بدون مشاكل
    console.error("Supabase loadSiteSettings error:", err)
    return DEFAULT_SITE_SETTINGS
  }
}

export async function persistSiteSettings(
  settings: SiteSettings,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const blob = new Blob([JSON.stringify(settings)], {
      type: "application/json",
    })
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(SITE_SETTINGS_STORAGE_PATH, blob, {
        cacheControl: "60",
        upsert: true,
        contentType: "application/json",
      })
    if (error) throw error
    return { ok: true }
  } catch (err) {
    // نرجّع رسالة الخطأ بدل استخدام alert() فقط — بعض بيئات المعاينة
    // (مثال: نوافذ iframe المعزولة) تمنع نوافذ alert()/confirm() تماماً،
    // فيبدو للمستخدم إن "ولا شي صار" رغم إن الحفظ فشل فعليًا. الحين
    // الخطأ يظهر بشكل مضمون داخل الصفحة نفسها (Toast أحمر بلوحة التحكم).
    const message = `تعذّر حفظ إعدادات الواجهة.\n\nالسبب الأرجح: bucket باسم "invitation-media" غير موجود، أو غير مفعّل كـ Public، أو صلاحيات (RLS Policies) الخاصة به بـ Supabase Storage ما تسمح بالرفع.\n\nتفاصيل الخطأ التقنية: ${describeError(err)}`
    console.error("Supabase persistSiteSettings error:", err)
    return { ok: false, error: message }
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

// يطبّق خط الواجهة العام فعلياً عن طريق تغيير متغيّر --font-body بجذر
// الصفحة — نفس المتغيّر اللي يعتمد عليه body{} بـ index.css، فيتغيّر خط
// كل نصوص الواجهة العادية فوراً بدون إعادة تحميل (بدون ما يمس خطوط
// قوالب الدعوات نفسها، تلك ثابتة بتصميم كل قالب على حدة). لو الخط مرفوع
// من الجهاز (customFontUrl موجود) نحقن قاعدة @font-face أول شي حتى
// يشتغل حتى بعد تحديث الصفحة أو من جهاز ثاني.
const injectedSiteFonts = new Set<string>()

export function applySiteFont(typography: SiteSettings["typography"]) {
  if (typeof document === "undefined" || !typography?.fontFamily) return
  const { fontFamily, customFontUrl } = typography

  if (customFontUrl && !injectedSiteFonts.has(fontFamily)) {
    injectedSiteFonts.add(fontFamily)
    const styleEl = document.createElement("style")
    styleEl.setAttribute("data-uploaded-site-font", fontFamily)
    styleEl.textContent = `@font-face { font-family: '${fontFamily}'; src: url('${customFontUrl}'); font-display: swap; }`
    document.head.appendChild(styleEl)
  }

  document.documentElement.style.setProperty(
    "--font-body",
    customFontUrl ? `'${fontFamily}'` : fontFamily,
  )
}

// يطبّق اسم النافذة (Tab) والأيقونة (Favicon) فعلياً على الصفحة —
// يغيّر document.title مباشرة، ويحقن/يحدّث وسم <link rel="icon"> بجذر
// الصفحة حتى تتغيّر أيقونة المتصفح بدون الحاجة لتعديل index.html يدوياً.
export function applySiteMeta(meta: SiteSettings["meta"]) {
  if (typeof document === "undefined" || !meta) return

  if (meta.siteTitle) {
    document.title = meta.siteTitle
  }

  if (meta.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>(
      "link[rel~='icon']",
    )
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = meta.faviconUrl
  }
}
