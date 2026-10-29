/* v16.64 — Login email + password (daftar, masuk, lupa password) berdampingan dengan Google.
   Memakai `auth`, `I18N`, `applyLanguage`, `loadProfile`, `db`, `loginIntent` dari skrip utama (index.html). */
(function () {
  'use strict';

  var D = {
    id: {
      lcWelcome: 'Selamat datang kembali', lcSubIn: 'Masuk ke akunmu',
      lcSignupTitle: 'Buat akun baru', lcSubUp: 'Daftar dengan email-mu',
      lcPassTitleIn: 'Masukkan password', lcPassTitleUp: 'Buat password',
      lcEmail: 'Email', lcEmailPh: 'nama@email.com', lcPassword: 'Password', lcPasswordPh: 'Password-mu',
      lcName: 'Nama panggilan', lcNamePh: 'Contoh: Rina',
      lcChange: 'Ganti', lcForgot: 'Lupa password?', lcOr: 'atau', lcGoogle: 'Lanjutkan dengan Google',
      lcNoAcc: 'Belum punya akun?', lcSignUp: 'Daftar', lcHaveAcc: 'Sudah punya akun?', lcSignIn: 'Masuk',
      lcNote: 'Data kamu tersimpan aman di Firebase milikmu sendiri',
      lcShow: 'Tampilkan password', lcHide: 'Sembunyikan password',
      lcBtnNext: 'Lanjut', lcBtnIn: 'Masuk', lcBtnUp: 'Daftar',
      lcRuleLen: 'Minimal 6 karakter', lcRuleUp: 'Huruf besar', lcRuleLow: 'Huruf kecil', lcRuleNum: 'Angka', lcRuleSym: 'Simbol (!@#…)',
      lcErrEmail: 'Format email belum benar. Contoh: nama@email.com',
      lcErrPassEmpty: 'Isi password-mu dulu.',
      lcErrRules: 'Password belum memenuhi semua syarat di atas.',
      lcErrCred: 'Email atau password salah. Kalau dulu daftar lewat Google, pakai tombol Google.',
      lcErrExists: 'Email ini sudah terdaftar. Pilih Masuk, atau lanjutkan dengan Google.',
      lcErrWeak: 'Password terlalu lemah. Penuhi semua syarat di atas.',
      lcErrMany: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',
      lcErrNet: 'Tidak ada koneksi internet. Periksa jaringanmu lalu coba lagi.',
      lcErrDisabled: 'Akun ini dinonaktifkan. Hubungi admin komunitas.',
      lcErrDiff: 'Email ini sudah dipakai dengan cara masuk lain. Coba masuk dengan Google atau email.',
      lcErrOff: 'Login email belum diaktifkan di Firebase (Authentication → Sign-in method → Email/Password).',
      lcErrGeneric: 'Login gagal. Coba lagi sebentar lagi.',
      lcResetSent: 'Jika email terdaftar, tautan reset password sudah dikirim. Cek juga folder spam.',
      lcResetNeedEmail: 'Isi email dulu, lalu ketuk Lupa password.',
      lcVerifySent: 'Akun dibuat. Kami kirim email verifikasi ke inbox-mu.',
      lcPrivacy: 'Untuk menggunakan journal dan menyimpan data pribadi, kamu perlu login dengan Google atau email.'
    },
    en: {
      lcWelcome: 'Welcome back', lcSubIn: 'Sign in to your account',
      lcSignupTitle: 'Create your account', lcSubUp: 'Sign up with your email',
      lcPassTitleIn: 'Enter your password', lcPassTitleUp: 'Create a password',
      lcEmail: 'Email', lcEmailPh: 'name@email.com', lcPassword: 'Password', lcPasswordPh: 'Your password',
      lcName: 'Display name', lcNamePh: 'e.g. Alex',
      lcChange: 'Change', lcForgot: 'Forgot password?', lcOr: 'or', lcGoogle: 'Continue with Google',
      lcNoAcc: "Don't have an account?", lcSignUp: 'Sign up', lcHaveAcc: 'Already have an account?', lcSignIn: 'Sign in',
      lcNote: 'Your data is stored safely in your own Firebase',
      lcShow: 'Show password', lcHide: 'Hide password',
      lcBtnNext: 'Continue', lcBtnIn: 'Sign in', lcBtnUp: 'Sign up',
      lcRuleLen: 'At least 6 characters', lcRuleUp: 'Uppercase letter', lcRuleLow: 'Lowercase letter', lcRuleNum: 'Number', lcRuleSym: 'Symbol (!@#…)',
      lcErrEmail: 'That email looks incomplete. Example: name@email.com',
      lcErrPassEmpty: 'Enter your password first.',
      lcErrRules: 'Your password does not meet all the requirements above.',
      lcErrCred: 'Wrong email or password. If you signed up with Google, use the Google button.',
      lcErrExists: 'This email is already registered. Choose Sign in, or continue with Google.',
      lcErrWeak: 'Password is too weak. Meet all requirements above.',
      lcErrMany: 'Too many attempts. Wait a few minutes and try again.',
      lcErrNet: 'No internet connection. Check your network and try again.',
      lcErrDisabled: 'This account has been disabled. Contact the community admin.',
      lcErrDiff: 'This email is already used with another sign-in method. Try Google or email.',
      lcErrOff: 'Email sign-in is not enabled in Firebase (Authentication → Sign-in method → Email/Password).',
      lcErrGeneric: 'Sign-in failed. Please try again shortly.',
      lcResetSent: 'If the email is registered, a password reset link has been sent. Check spam too.',
      lcResetNeedEmail: 'Enter your email first, then tap Forgot password.',
      lcVerifySent: 'Account created. We sent a verification email to your inbox.',
      lcPrivacy: 'To use the journal and save your personal data, you need to sign in with Google or email.'
    },
    ms: {
      lcWelcome: 'Selamat kembali', lcSubIn: 'Log masuk ke akaun anda',
      lcSignupTitle: 'Cipta akaun baharu', lcSubUp: 'Daftar dengan e-mel anda',
      lcPassTitleIn: 'Masukkan kata laluan', lcPassTitleUp: 'Cipta kata laluan',
      lcEmail: 'E-mel', lcEmailPh: 'nama@email.com', lcPassword: 'Kata laluan', lcPasswordPh: 'Kata laluan anda',
      lcName: 'Nama panggilan', lcNamePh: 'Contoh: Aina',
      lcChange: 'Tukar', lcForgot: 'Lupa kata laluan?', lcOr: 'atau', lcGoogle: 'Teruskan dengan Google',
      lcNoAcc: 'Belum ada akaun?', lcSignUp: 'Daftar', lcHaveAcc: 'Sudah ada akaun?', lcSignIn: 'Log masuk',
      lcNote: 'Data anda disimpan selamat di Firebase milik anda sendiri',
      lcShow: 'Tunjukkan kata laluan', lcHide: 'Sembunyikan kata laluan',
      lcBtnNext: 'Seterusnya', lcBtnIn: 'Log masuk', lcBtnUp: 'Daftar',
      lcRuleLen: 'Sekurang-kurangnya 6 aksara', lcRuleUp: 'Huruf besar', lcRuleLow: 'Huruf kecil', lcRuleNum: 'Nombor', lcRuleSym: 'Simbol (!@#…)',
      lcErrEmail: 'Format e-mel belum betul. Contoh: nama@email.com',
      lcErrPassEmpty: 'Isi kata laluan anda dahulu.',
      lcErrRules: 'Kata laluan belum memenuhi semua syarat di atas.',
      lcErrCred: 'E-mel atau kata laluan salah. Jika dahulu mendaftar melalui Google, guna butang Google.',
      lcErrExists: 'E-mel ini sudah berdaftar. Pilih Log masuk, atau teruskan dengan Google.',
      lcErrWeak: 'Kata laluan terlalu lemah. Penuhi semua syarat di atas.',
      lcErrMany: 'Terlalu banyak percubaan. Tunggu beberapa minit dan cuba lagi.',
      lcErrNet: 'Tiada sambungan internet. Semak rangkaian anda dan cuba lagi.',
      lcErrDisabled: 'Akaun ini dinyahaktifkan. Hubungi admin komuniti.',
      lcErrDiff: 'E-mel ini sudah digunakan dengan kaedah log masuk lain. Cuba Google atau e-mel.',
      lcErrOff: 'Log masuk e-mel belum diaktifkan di Firebase (Authentication → Sign-in method → Email/Password).',
      lcErrGeneric: 'Log masuk gagal. Cuba lagi sebentar lagi.',
      lcResetSent: 'Jika e-mel berdaftar, pautan tetapan semula kata laluan telah dihantar. Semak folder spam juga.',
      lcResetNeedEmail: 'Isi e-mel dahulu, kemudian ketik Lupa kata laluan.',
      lcVerifySent: 'Akaun dicipta. Kami hantar e-mel pengesahan ke peti masuk anda.',
      lcPrivacy: 'Untuk menggunakan jurnal dan menyimpan data peribadi, anda perlu log masuk dengan Google atau e-mel.'
    },
    es: {
      lcWelcome: 'Bienvenido de nuevo', lcSubIn: 'Inicia sesión en tu cuenta',
      lcSignupTitle: 'Crea tu cuenta', lcSubUp: 'Regístrate con tu correo',
      lcPassTitleIn: 'Escribe tu contraseña', lcPassTitleUp: 'Crea una contraseña',
      lcEmail: 'Correo', lcEmailPh: 'nombre@correo.com', lcPassword: 'Contraseña', lcPasswordPh: 'Tu contraseña',
      lcName: 'Nombre para mostrar', lcNamePh: 'Ej.: Ana',
      lcChange: 'Cambiar', lcForgot: '¿Olvidaste tu contraseña?', lcOr: 'o', lcGoogle: 'Continuar con Google',
      lcNoAcc: '¿No tienes cuenta?', lcSignUp: 'Regístrate', lcHaveAcc: '¿Ya tienes cuenta?', lcSignIn: 'Inicia sesión',
      lcNote: 'Tus datos se guardan de forma segura en tu propio Firebase',
      lcShow: 'Mostrar contraseña', lcHide: 'Ocultar contraseña',
      lcBtnNext: 'Continuar', lcBtnIn: 'Iniciar sesión', lcBtnUp: 'Registrarme',
      lcRuleLen: 'Mínimo 6 caracteres', lcRuleUp: 'Letra mayúscula', lcRuleLow: 'Letra minúscula', lcRuleNum: 'Número', lcRuleSym: 'Símbolo (!@#…)',
      lcErrEmail: 'El correo parece incompleto. Ej.: nombre@correo.com',
      lcErrPassEmpty: 'Escribe tu contraseña primero.',
      lcErrRules: 'Tu contraseña no cumple todos los requisitos de arriba.',
      lcErrCred: 'Correo o contraseña incorrectos. Si te registraste con Google, usa el botón de Google.',
      lcErrExists: 'Este correo ya está registrado. Elige Iniciar sesión o continúa con Google.',
      lcErrWeak: 'La contraseña es muy débil. Cumple todos los requisitos de arriba.',
      lcErrMany: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      lcErrNet: 'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.',
      lcErrDisabled: 'Esta cuenta está deshabilitada. Contacta al administrador de la comunidad.',
      lcErrDiff: 'Este correo ya se usa con otro método de acceso. Prueba con Google o correo.',
      lcErrOff: 'El acceso por correo no está activado en Firebase (Authentication → Sign-in method → Email/Password).',
      lcErrGeneric: 'No se pudo iniciar sesión. Inténtalo de nuevo en un momento.',
      lcResetSent: 'Si el correo está registrado, enviamos un enlace para restablecer la contraseña. Revisa también el spam.',
      lcResetNeedEmail: 'Escribe tu correo primero y luego toca ¿Olvidaste tu contraseña?',
      lcVerifySent: 'Cuenta creada. Te enviamos un correo de verificación.',
      lcPrivacy: 'Para usar el diario y guardar tus datos personales, debes iniciar sesión con Google o correo.'
    }
  };

  try {
    ['id', 'en', 'ms', 'es'].forEach(function (l) { Object.assign(I18N[l], D[l]); I18N[l].privacy = D[l].lcPrivacy; });
  } catch (e) { console.error('login-card: i18n', e); return; }

  function lang() { var l = document.documentElement.lang; return D[l] ? l : 'id'; }
  function T(k) { return D[lang()][k] || D.id[k] || k; }
  function $(id) { return document.getElementById(id); }

  var card = $('lc-card'), form = $('lc-form');
  if (!card || !form) return;
  var emailIn = $('lc-email'), passIn = $('lc-pass'), nameIn = $('lc-name');
  var go = $('lc-go'), msg = $('lc-msg'), sub = $('lc-sub'), title = $('lc-title');
  var eye = $('lc-eye'), rules = $('lc-rules'), gBtn = $('btn-google-login');
  var st = { mode: 'in', step: 'email', busy: false, subMsg: null };

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.7A17 17 0 002 12s3.6 7 10 7a9.8 9.8 0 004.3-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>';

  var RULES = [
    ['lcRuleLen', function (p) { return p.length >= 6; }],
    ['lcRuleUp', function (p) { return /[A-Z]/.test(p); }],
    ['lcRuleLow', function (p) { return /[a-z]/.test(p); }],
    ['lcRuleNum', function (p) { return /[0-9]/.test(p); }],
    ['lcRuleSym', function (p) { return /[^A-Za-z0-9]/.test(p); }]
  ];

  function setMsg(text, ok) { msg.textContent = text || ''; msg.classList.toggle('is-ok', !!ok); }
  function setBad(el, bad) { el.closest('.lc-field').classList.toggle('is-bad', !!bad); el.setAttribute('aria-invalid', bad ? 'true' : 'false'); }

  function renderRules() {
    var p = passIn.value;
    rules.innerHTML = RULES.map(function (r) {
      return '<li class="' + (r[1](p) ? 'ok' : '') + '">' + T(r[0]) + '</li>';
    }).join('');
  }

  function render() {
    card.dataset.mode = st.mode; card.dataset.step = st.step;
    var up = st.mode === 'up', pass = st.step === 'pass';
    title.textContent = pass ? T(up ? 'lcPassTitleUp' : 'lcPassTitleIn') : T(up ? 'lcSignupTitle' : 'lcWelcome');
    if (pass) {
      sub.textContent = '';
      var span = document.createElement('span'); span.textContent = emailIn.value.trim();
      var b = document.createElement('button'); b.type = 'button'; b.id = 'lc-change'; b.textContent = T('lcChange');
      b.addEventListener('click', function () { st.step = 'email'; setMsg(''); render(); focusSoon(emailIn); });
      sub.appendChild(span); sub.appendChild(b);
    } else {
      sub.textContent = T(up ? 'lcSubUp' : 'lcSubIn');
    }
    passIn.autocomplete = up ? 'new-password' : 'current-password';
    go.setAttribute('aria-label', pass ? T(up ? 'lcBtnUp' : 'lcBtnIn') : T('lcBtnNext'));
    go.innerHTML = st.busy ? '<span class="lc-spin" aria-hidden="true"></span>' : ARROW;
    /* satu tombol panah bulat, ditaruh di kolom terakhir yang tampil (seperti referensi) */
    var host = $(pass ? 'lc-f-pass' : 'lc-f-email');
    if (host && go.parentNode !== host) host.appendChild(go);
    go.disabled = st.busy; gBtn.disabled = st.busy;
    var shown = passIn.type === 'text';
    eye.innerHTML = shown ? EYE_OFF : EYE_ON;
    eye.setAttribute('aria-label', T(shown ? 'lcHide' : 'lcShow'));
    eye.setAttribute('aria-pressed', shown ? 'true' : 'false');
    renderRules();
  }

  function focusSoon(el) { requestAnimationFrame(function () { try { el.focus(); } catch (e) {} }); }
  function busy(v) { st.busy = v; render(); }

  function reset() {
    st.mode = 'in'; st.step = 'email'; st.busy = false;
    emailIn.value = ''; passIn.value = ''; nameIn.value = ''; passIn.type = 'password';
    setMsg(''); setBad(emailIn, false); setBad(passIn, false); render();
  }

  function errText(e) {
    var c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return T('lcErrCred');
    if (c === 'auth/email-already-in-use') return T('lcErrExists');
    if (c === 'auth/weak-password' || c === 'auth/password-does-not-meet-requirements') return T('lcErrWeak');
    if (c === 'auth/invalid-email') return T('lcErrEmail');
    if (c === 'auth/too-many-requests') return T('lcErrMany');
    if (c === 'auth/network-request-failed') return T('lcErrNet');
    if (c === 'auth/user-disabled') return T('lcErrDisabled');
    if (c === 'auth/account-exists-with-different-credential') return T('lcErrDiff');
    if (c === 'auth/operation-not-allowed') return T('lcErrOff');
    return T('lcErrGeneric');
  }

  /* Tautan di email membawa pengguna kembali ke aplikasi ini setelah selesai. Jika domain belum ada di
     Authorized domains, Firebase menolak continueUrl; ulangi tanpa itu agar email tetap terkirim. */
  function withContinue(fn) {
    var s = { url: location.origin + '/' };
    return fn(s).catch(function (e) {
      if (e && /unauthorized-continue-uri|invalid-continue-uri|missing-continue-uri/.test(e.code || '')) return fn(null);
      throw e;
    });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function onSubmit(ev) {
    ev.preventDefault();
    if (st.busy) return;
    setMsg('');
    var email = emailIn.value.trim();

    if (st.step === 'email') {
      if (!EMAIL_RE.test(email)) { setBad(emailIn, true); setMsg(T('lcErrEmail')); focusSoon(emailIn); return; }
      setBad(emailIn, false); st.step = 'pass'; render();
      focusSoon(st.mode === 'up' ? nameIn : passIn);
      return;
    }

    var pass = passIn.value;
    if (!pass) { setBad(passIn, true); setMsg(T('lcErrPassEmpty')); focusSoon(passIn); return; }
    if (st.mode === 'up' && !RULES.every(function (r) { return r[1](pass); })) {
      setBad(passIn, true); setMsg(T('lcErrRules')); focusSoon(passIn); return;
    }
    setBad(passIn, false);
    busy(true);
    try {
      try { loginIntent = true; } catch (e) {}
      if (st.mode === 'in') {
        await auth.signInWithEmailAndPassword(email, pass);
      } else {
        var name = nameIn.value.trim();
        var cred = await auth.createUserWithEmailAndPassword(email, pass);
        var u = cred.user;
        try {
          if (name) {
            await u.updateProfile({ displayName: name });
            await db.collection('users').doc(u.uid).set({ name: name }, { merge: true });
            if (typeof loadProfile === 'function') loadProfile();
          }
          await withContinue(function (s) { return s ? u.sendEmailVerification(s) : u.sendEmailVerification(); });
          if (typeof showToast === 'function') showToast(T('lcVerifySent'), 4200);
        } catch (e2) { console.warn('login-card: profil/verifikasi', e2); }
      }
      passIn.value = '';
      /* onAuthStateChanged di index.html menyembunyikan layar login */
    } catch (e) {
      try { loginIntent = false; } catch (e3) {}
      console.warn('login-card:', e && e.code, e);
      setMsg(errText(e)); setBad(passIn, e && /credential|password|login/.test(e.code || ''));
      if (e && e.code === 'auth/invalid-email') { st.step = 'email'; setBad(emailIn, true); }
    } finally {
      busy(false);
    }
  }
  form.addEventListener('submit', onSubmit);

  eye.addEventListener('click', function () {
    passIn.type = passIn.type === 'password' ? 'text' : 'password'; render(); focusSoon(passIn);
  });
  passIn.addEventListener('input', function () { renderRules(); setBad(passIn, false); if (msg.textContent && !msg.classList.contains('is-ok')) setMsg(''); });
  emailIn.addEventListener('input', function () { setBad(emailIn, false); if (!msg.classList.contains('is-ok')) setMsg(''); });

  $('lc-toggle').addEventListener('click', function () {
    st.mode = st.mode === 'in' ? 'up' : 'in'; st.step = 'email'; passIn.value = ''; passIn.type = 'password';
    setMsg(''); setBad(emailIn, false); setBad(passIn, false); render(); focusSoon(emailIn);
  });

  $('lc-forgot').addEventListener('click', async function () {
    var email = emailIn.value.trim();
    if (!EMAIL_RE.test(email)) { st.step = 'email'; render(); setBad(emailIn, true); setMsg(T('lcResetNeedEmail')); focusSoon(emailIn); return; }
    if (st.busy) return;
    busy(true);
    try {
      await withContinue(function (s) { return s ? auth.sendPasswordResetEmail(email, s) : auth.sendPasswordResetEmail(email); });
      setMsg(T('lcResetSent'), true);
    } catch (e) {
      /* auth/user-not-found tidak dibedakan agar email terdaftar tidak bisa ditebak */
      if (e && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email')) setMsg(e.code === 'auth/invalid-email' ? T('lcErrEmail') : T('lcResetSent'), e.code !== 'auth/invalid-email');
      else setMsg(errText(e));
    } finally { busy(false); }
  });

  gBtn.addEventListener('click', async function () {
    if (st.busy) return;
    setMsg(''); busy(true);
    try {
      try { loginIntent = true; } catch (e) {}
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (e) {
      try { loginIntent = false; } catch (e3) {}
      if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) { /* dibatalkan pengguna */ }
      else setMsg(errText(e));
    } finally { busy(false); }
  });

  /* bahasa diganti → teks dinamis ikut berganti */
  ['login-language', 'landing-language', 'app-language'].forEach(function (id) {
    var s = $(id); if (s) s.addEventListener('change', function () { render(); });
  });
  /* layar login dibuka lagi (mis. setelah logout) → mulai dari awal, tanpa sisa password */
  var scr = $('login-screen');
  if (scr && window.MutationObserver) {
    new MutationObserver(function () { if (!scr.classList.contains('hidden') && (st.step !== 'email' || passIn.value)) reset(); })
      .observe(scr, { attributes: true, attributeFilter: ['class'] });
  }

  try { applyLanguage(lang()); } catch (e) {}
  render();
})();
