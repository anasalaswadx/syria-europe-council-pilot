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

if (typeof window.IntersectionObserver === 'function') {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
}

const form = document.getElementById('contact-form');
const status = form.querySelector('.form-status');
const submitButton = form.querySelector('.submit');
const successDialog = document.getElementById('success-dialog');
const formStartedAt = form.querySelector('[name="form_started_at"]');
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycby7Wc9omf7Iwf0QUBg6e_aYx4feJn9R4scnP1zIqyoqlB9BHpCYkAt3Cnb0RO92R4Xw/exec';

formStartedAt.value = Date.now().toString();

const closeSuccessDialog = () => {
  successDialog.hidden = true;
  document.body.classList.remove('dialog-open');
};

successDialog.querySelectorAll('.success-close, .success-done').forEach((button) => {
  button.addEventListener('click', closeSuccessDialog);
});

successDialog.addEventListener('click', (event) => {
  if (event.target === successDialog) closeSuccessDialog();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !successDialog.hidden) closeSuccessDialog();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.classList.remove('error');

  if (!form.checkValidity()) {
    status.textContent = 'يرجى إكمال الحقول المطلوبة والتأكد من صحة البريد الإلكتروني.';
    status.classList.add('error');
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const params = new URLSearchParams();
  ['name', 'email', 'organization', 'topic', 'message', 'website', 'form_started_at'].forEach((field) => {
    params.set(field, data.get(field) || '');
  });
  params.set('consent', 'yes');
  params.set('source', window.location.origin);

  submitButton.disabled = true;
  submitButton.innerHTML = 'جارٍ إرسال الرسالة…';
  status.textContent = '';

  try {
    await fetch(FORM_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    });
    form.reset();
    formStartedAt.value = Date.now().toString();
    successDialog.hidden = false;
    document.body.classList.add('dialog-open');
    successDialog.querySelector('.success-done').focus();
  } catch (error) {
    status.textContent = 'تعذّر إرسال الرسالة الآن. يرجى المحاولة مجدداً أو مراسلتنا عبر البريد الإلكتروني.';
    status.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'إرسال الرسالة <span>←</span>';
  }
});
