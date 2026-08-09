# ربط RSVP بجوجل شيت — دليل الإعداد

الكود بالمشروع صار جاهز ومعدّل (`src/App.tsx`). الباقي عليك 4 خطوات بحسابك
بجوجل، تاخذ 5 دقائق:

## 1. أنشئ Google Sheet جديد

- روح لـ sheets.google.com → شيت فارغ جديد.
- سمّي الشيت الأول (Tab) بالأسفل: `RSVP` بالضبط (حساس لحالة الأحرف).
- بالصف الأول، حط هذي العناوين (اختياري لكن مفيد):
  `Timestamp | Invitation ID | Invitation Title | Guest Name | Attendance | Companions | Note`

## 2. أضف Apps Script

- من قائمة **الإضافات (Extensions) → Apps Script**.
- امسح أي كود موجود، والصق هذا الكود:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RSVP");
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.invitationId,
    data.invitationTitle,
    data.guestName,
    data.attendance,
    data.companions,
    data.guestNote,
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- احفظ (Ctrl+S)، وسمّي المشروع أي اسم (مثلاً "RSVP Handler").

## 3. انشره كـ Web App

- زر **Deploy → New deployment**.
- بالأيقونة ⚙️ جنب "Select type" اختر **Web app**.
- Execute as: **Me**
- Who has access: **Anyone**
- اضغط **Deploy**، وافق على الصلاحيات (Authorize access) بحسابك.
- انسخ الرابط اللي يطلع (يبدأ بـ `https://script.google.com/macros/s/.../exec`).

⚠️ **مهم**: لما تعدّل الكود لاحقاً، لازم تسوي **New deployment** جديد
(مو نفس الرابط ينحدث تلقائياً) — أو تختار "Manage deployments" وتحدّث
نفس الإصدار.

## 4. ضيف الرابط لمشروعك

- بجذر المشروع، سوّي نسخة من `.env.example` وسمّيها `.env`.
- الصق الرابط اللي نسخته:
  ```
  VITE_RSVP_SCRIPT_URL=https://script.google.com/macros/s/xxxxx/exec
  ```
- `.env` ما ينرفع لـ git عادةً — لو رح تنشر على Vercel/Netlify، ضيف نفس
  المتغير من إعدادات المشروع هناك (Environment Variables) مو بس محلياً.

## اختبار

```bash
npm install
npm run dev
```

افتح أي دعوة، عبّي فورم RSVP وأرسله، ثم روح شوف الشيت — لازم يظهر صف جديد
خلال ثوانٍ.

## قيد مهم تعرفه

الكود يستخدم `mode: "no-cors"` بالـ fetch لأن Apps Script ما يرجع هيدرز
CORS بشكل يسمح بقراءة الاستجابة من متصفح مباشرة. هذا يعني الموقع
**يفترض النجاح** إذا الطلب انرسل بدون خطأ شبكة — ما يقدر يتأكد فعلياً
إن الصف انكتب بالشيت (Google ممكن يرفضه بصمت لو، مثلاً، الرابط غلط أو
الصلاحيات انسحبت). لو تبي تأكيد أدق، الحل الأقوى لاحقاً هو نقل هذا
المنطق لـ Serverless Function (Vercel/Netlify) تتحدث مع Google عبر
Service Account، ويصير فيه قراءة حقيقية لكود الاستجابة.

## إذا عندك أكثر من دعوة على نفس الموقع

كل صف بالشيت فيه عمود `Invitation ID` — فلترة الردود حسب دعوة معينة
تصير بفلتر عادي بجوجل شيت (Data → Create a filter) على هذا العمود.
