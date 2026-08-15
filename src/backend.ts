import { createClient } from "@supabase/supabase-js"
import { Invitation } from "./types"
import { invitations as seedInvitations } from "./data"

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
