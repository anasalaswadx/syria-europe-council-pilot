const HEADERS = [
  'التاريخ',
  'الاسم الكامل',
  'البريد الإلكتروني',
  'الجهة أو مجال الخبرة',
  'موضوع الرسالة',
  'الرسالة',
  'الموافقة',
  'المصدر'
];

const NOTIFICATION_EMAIL = 'hello@syriaeuropecouncil.eu';
const MINIMUM_FILL_TIME_MS = 3000;
const MAXIMUM_FORM_AGE_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_SECONDS = 60;

function doPost(e) {
  const data = (e && e.parameter) || {};

  // A hidden field that legitimate visitors never fill.
  if (data.website) {
    return jsonResponse({ ok: true });
  }

  const startedAt = Number(data.form_started_at || 0);
  const elapsed = Date.now() - startedAt;
  if (!startedAt || elapsed < MINIMUM_FILL_TIME_MS || elapsed > MAXIMUM_FORM_AGE_MS) {
    return jsonResponse({ ok: false, error: 'Invalid submission timing' });
  }

  const name = clean(data.name, 120);
  const email = clean(data.email, 200).toLowerCase();
  const organization = clean(data.organization, 200);
  const topic = clean(data.topic, 160);
  const message = clean(data.message, 5000);
  const consent = data.consent === 'yes' ? 'نعم' : 'لا';
  const source = clean(data.source || 'syriaeuropecouncil.eu', 200);

  if (!name || !isValidEmail(email) || !topic || message.length < 20 || consent !== 'نعم') {
    return jsonResponse({ ok: false, error: 'Missing or invalid fields' });
  }

  const cache = CacheService.getScriptCache();
  const rateLimitKey = 'contact-' + digest(email);
  if (cache.get(rateLimitKey)) {
    return jsonResponse({ ok: false, error: 'Please wait before sending another message' });
  }
  cache.put(rateLimitKey, '1', RATE_LIMIT_SECONDS);

  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#124c51')
      .setFontColor('#ffffff');
    sheet.appendRow([
      new Date(),
      safeCell(name),
      safeCell(email),
      safeCell(organization),
      safeCell(topic),
      safeCell(message),
      consent,
      safeCell(source)
    ]);
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'Unable to save message' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  try {
    sendNotification({ name, email, organization, topic, message, source });
  } catch (error) {
    // Keep the form successful if the sheet was saved but the email quota is temporarily unavailable.
    console.error('Notification email failed', error);
  }

  return jsonResponse({ ok: true });
}

function doGet() {
  return jsonResponse({ ok: true, service: 'Syria Europe Council form receiver' });
}

function sendNotification(data) {
  const subject = '[Syria Europe Council] رسالة جديدة: ' + data.topic;
  const plainText = [
    'تم استلام رسالة جديدة من الموقع.',
    '',
    'الاسم: ' + data.name,
    'البريد الإلكتروني: ' + data.email,
    'الجهة أو مجال الخبرة: ' + (data.organization || 'غير مذكور'),
    'الموضوع: ' + data.topic,
    'المصدر: ' + data.source,
    '',
    'الرسالة:',
    data.message
  ].join('\n');

  const html = '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">' +
    '<h2 style="color:#124c51">رسالة جديدة من موقع Syria Europe Council</h2>' +
    '<p><strong>الاسم:</strong> ' + escapeHtml(data.name) + '</p>' +
    '<p><strong>البريد الإلكتروني:</strong> <a href="mailto:' + escapeHtml(data.email) + '">' + escapeHtml(data.email) + '</a></p>' +
    '<p><strong>الجهة أو مجال الخبرة:</strong> ' + escapeHtml(data.organization || 'غير مذكور') + '</p>' +
    '<p><strong>الموضوع:</strong> ' + escapeHtml(data.topic) + '</p>' +
    '<p><strong>الرسالة:</strong></p><div style="white-space:pre-wrap;background:#f4f7f6;padding:16px;border-right:3px solid #ef8451">' + escapeHtml(data.message) + '</div>' +
    '<p style="color:#667; font-size:12px">المصدر: ' + escapeHtml(data.source) + '</p></div>';

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: subject,
    body: plainText,
    htmlBody: html,
    replyTo: data.email,
    name: 'Syria Europe Council Website'
  });
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeCell(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function digest(value) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
  ).slice(0, 32);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
  });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
