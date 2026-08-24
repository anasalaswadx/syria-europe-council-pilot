const menu = document.querySelector('.menu');
const nav = document.querySelector('.nav');

menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', open);
});

document.querySelectorAll('.nav a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
}));

document.getElementById('year').textContent = new Date().getFullYear();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const form = document.getElementById('contact-form');
const status = form.querySelector('.form-status');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.classList.remove('error');

  if (!form.checkValidity()) {
    status.textContent = 'يرجى إكمال الحقول المطلوبة والتأكد من صحة البريد الإلكتروني.';
    status.classList.add('error');
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const subject = `[Syria Europe Council] ${data.get('topic')}`;
  const body = [
    `الاسم: ${data.get('name')}`,
    `البريد الإلكتروني: ${data.get('email')}`,
    `الجهة أو مجال الخبرة: ${data.get('organization') || 'غير مذكور'}`,
    `الموضوع: ${data.get('topic')}`,
    '',
    'الرسالة:',
    data.get('message')
  ].join('\n');

  status.textContent = 'سيُفتح تطبيق البريد على جهازك. راجع الرسالة ثم اضغط إرسال.';
  window.location.href = `mailto:hello@syriaeuropecouncil.eu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
