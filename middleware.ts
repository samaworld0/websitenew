// middleware.ts
//
// هذا الملف يشتغل على Vercel Edge (قبل ما يوصل الطلب لموقعك الأصلي).
// وظيفته: لما يجي روبوت معاينة روابط (واتساب/فيسبوك/تليجرام/تويتر...)
// لرابط دعوة (?preview=ID)، نرجّع له صفحة HTML بسيطة فيها صورة وعنوان
// ووصف الدعوة الصحيحة (Open Graph tags). المستخدم العادي (متصفح حقيقي)
// يمر عادي ويوصله موقع React الطبيعي بدون أي تغيير.
//
// السبب: هذا المشروع React/Vite (Single Page App) — الروبوتات ما تشغّل
// جافاسكربت، فتشوف بس وسوم <head> الثابتة بملف index.html، فكل الروابط
// كانت تطلع بنفس الصورة/العنوان. هذا الميدلوير يحل المشكلة بدون ما يأثر
// على أداء أو تصميم الموقع نفسه للزوار العاديين.

export const config = {
  matcher: "/",
}

// عميل Supabase (نفس المفتاح العام الموجود أصلاً بـ src/backend.ts —
// مفتاح "anon/publishable" آمن يكون هنا لأنه نفسه المستخدم بالواجهة).
const SUPABASE_URL = "https://yybdncbgradywuiomyik.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_ghQkvzBNAVphFa5PJMwoHQ_2zIoeBHD"

// رابط الصورة الافتراضية (تظهر لما تشارك الصفحة الرئيسية، أو لو دعوة
// معينة ما عندها صورة غلاف). عدّل هذا الرابط لصورة الشعار/الغلاف العام
// حقّك إذا تحب.
const DEFAULT_IMAGE = "https://samainvitation.vercel.app/images/hero-bg.jpg"
const SITE_NAME = "سما | للدعوات الألكترونية"

// قائمة الروبوتات (User-Agent) المسؤولة عن توليد معاينة الروابط بمختلف
// التطبيقات. نتعامل معهم فقط بهذا الميدلوير — أي زائر عادي (متصفح حقيقي)
// يمر بدون أي تدخل ويوصله موقع React الطبيعي كامل.
const BOT_UA_REGEX =
  /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|skypeuripreview|pinterest|redditbot|googlebot|bingbot|embedly|quora|outbrain|vkshare|w3c_validator|iframely/i

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const userAgent = request.headers.get("user-agent") || ""
  const isBot = BOT_UA_REGEX.test(userAgent)
  const previewId = url.searchParams.get("preview")

  // مو روبوت معاينة → نخلي الطلب يمر عادي (يوصله موقع React كامل).
  if (!isBot) {
    return
  }

  // روبوت بس بدون ?preview=ID (يعني الصفحة الرئيسية) → نبني معاينة
  // عامة بسيطة باسم/شعار الموقع.
  if (!previewId) {
    const html = buildHtml({
      title: SITE_NAME,
      description: "أنشئ دعوتك الإلكترونية الفاخرة بدقائق",
      image: DEFAULT_IMAGE,
      pageUrl: url.toString(),
    })
    return htmlResponse(html)
  }

  // روبوت + فيه ?preview=ID → نجيب بيانات هالدعوة بالذات من Supabase.
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invitations?id=eq.${encodeURIComponent(
        previewId,
      )}&select=title,subtitle,groom,bride,dateGreg,time,venue,coverImage,heroBg,introPoster`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    )

    if (!res.ok) throw new Error("supabase fetch failed")
    const rows = await res.json()
    const inv = Array.isArray(rows) ? rows[0] : null

    if (!inv) {
      // ما لقينا الدعوة (ID غلط أو محذوفة) → معاينة عامة بدل ما نفشل.
      const html = buildHtml({
        title: SITE_NAME,
        description: "أنشئ دعوتك الإلكترونية الفاخرة بدقائق",
        image: DEFAULT_IMAGE,
        pageUrl: url.toString(),
      })
      return htmlResponse(html)
    }

    const title =
      inv.groom && inv.bride
        ? `دعوة زفاف ${inv.groom} & ${inv.bride}`
        : inv.title || SITE_NAME

    const description =
      [inv.dateGreg, inv.venue].filter(Boolean).join(" • ") ||
      inv.subtitle ||
      "أنت مدعو لحضور مناسبتنا"

    const image = inv.introPoster || inv.heroBg || inv.coverImage || DEFAULT_IMAGE

    const html = buildHtml({
      title,
      description,
      image,
      pageUrl: url.toString(),
    })

    return htmlResponse(html)
  } catch (err) {
    // أي خطأ (شبكة، Supabase واقف...) → نرجّع معاينة عامة بدل ما تنكسر
    // الصفحة كلياً عند الروبوت.
    const html = buildHtml({
      title: SITE_NAME,
      description: "أنشئ دعوتك الإلكترونية الفاخرة بدقائق",
      image: DEFAULT_IMAGE,
      pageUrl: url.toString(),
    })
    return htmlResponse(html)
  }
}

function buildHtml(params: {
  title: string
  description: string
  image: string
  pageUrl: string
}) {
  const title = escapeHtml(params.title)
  const description = escapeHtml(params.description)
  const image = escapeHtml(params.image)
  const pageUrl = escapeHtml(params.pageUrl)

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${pageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <p>${title}</p>
  </body>
</html>`
}

// نبني الاستجابة بهيدر Content-Length صريح — كروالر واتساب (بعكس أداة
// فحص فيسبوك) لا يتعامل بشكل موثوق مع الاستجابات المُرسلة بترميز
// "chunked" (الافتراضي بـ Vercel Edge Functions)، فيفشل بصمت ويعرض
// اسم الدومين فقط بدون صورة أو عنوان. تحديد الطول صراحة يحل المشكلة.
function htmlResponse(html: string): Response {
  const bytes = new TextEncoder().encode(html)
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-length": String(bytes.byteLength),
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  })
}
