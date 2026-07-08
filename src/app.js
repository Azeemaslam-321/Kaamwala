import { createIcons, icons } from 'lucide';
import './styles.css';
import { serviceCities } from './config.js';
import { supabase } from './supabaseClient.js';
import { escapeHTML, formatDateTime, requireSupabase, showToast, toIndiaPhone } from './utils.js';

const state = {
  session: null,
  profile: null,
  categories: [],
  workers: [],
  myBookings: [],
  myWorker: null,
  selectedCategory: '',
  selectedCity: 'Lucknow',
  authMode: 'login',
  passwordRecovery: false,
  search: '',
  bookingWorker: null
};

const $ = (selector) => document.querySelector(selector);

function iconsReady() {
  createIcons({ icons });
}

async function loadSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  if (state.session) {
    await completePendingSignup();
    await ensureProfileFromMetadata();
    await loadProfile();
  }
  renderAuthArea();
}

async function loadProfile() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', state.session.user.id)
    .maybeSingle();
  if (error) showToast(error.message, 'error');
  state.profile = data || null;
}

async function loadCategories() {
  if (!requireSupabase(supabase)) return;
  const wrap = $('#categoryGrid');
  wrap.innerHTML = '<div class="col-span-full flex justify-center py-8"><div class="spinner"></div></div>';
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) {
    wrap.innerHTML = `<p class="col-span-full text-red-600">${escapeHTML(error.message)}</p>`;
    return;
  }
  state.categories = data || [];
  renderCategories();
}

async function loadWorkers() {
  if (!requireSupabase(supabase)) return;
  const grid = $('#workerGrid');
  $('#workerEmpty').classList.add('hidden');
  grid.innerHTML = '<div class="col-span-full flex justify-center py-10"><div class="spinner"></div></div>';

  let query = supabase
    .from('workers')
    .select('*, reviews:bookings(reviews(rating, comment, created_at))')
    .eq('status', 'approved')
    .eq('city', state.selectedCity)
    .order('rating', { ascending: false });

  if (state.selectedCategory) query = query.eq('category', state.selectedCategory);
  if (state.search) {
    const term = `%${state.search}%`;
    query = query.or(`name.ilike.${term},category.ilike.${term},bio.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    grid.innerHTML = `<div class="col-span-full rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">${escapeHTML(error.message)}</div>`;
    return;
  }

  state.workers = data || [];
  renderWorkers();
}

function renderCategories() {
  $('#categoryGrid').innerHTML = state.categories.map((cat) => `
    <button class="card group p-5 text-left transition hover:-translate-y-1 hover:shadow-glow" data-category="${escapeHTML(cat.name)}">
      <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-brand transition group-hover:bg-brand group-hover:text-white">
        <i data-lucide="${escapeHTML(cat.icon || 'wrench')}" class="h-6 w-6"></i>
      </div>
      <div class="font-display text-lg font-extrabold">${escapeHTML(cat.name)}</div>
      <div class="mt-1 text-sm text-neutral-500">${escapeHTML(state.selectedCity)} ke verified experts</div>
    </button>
  `).join('');
  document.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedCategory = button.dataset.category;
      $('#workerSearch').value = '';
      state.search = '';
      loadWorkers();
      $('#workers').scrollIntoView({ behavior: 'smooth' });
    });
  });
  iconsReady();
}

function renderWorkers() {
  const grid = $('#workerGrid');
  if (!state.workers.length) {
    grid.innerHTML = '';
    $('#workerEmpty').classList.remove('hidden');
    return;
  }
  grid.innerHTML = state.workers.map((worker) => `
    <article class="card overflow-hidden">
      <div class="p-5">
        <div class="flex gap-4">
          <img src="${escapeHTML(worker.photo_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=240&h=240&fit=crop')}" alt="" class="h-16 w-16 rounded-2xl object-cover">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="truncate font-display text-lg font-extrabold">${escapeHTML(worker.name)}</h3>
              ${worker.verified ? '<i data-lucide="badge-check" class="h-4 w-4 text-brand"></i>' : ''}
            </div>
            <p class="text-sm font-semibold text-neutral-500">${escapeHTML(worker.category)} - ${escapeHTML(worker.city)}</p>
            <div class="mt-2 flex items-center gap-1 text-sm">
              <i data-lucide="star" class="h-4 w-4 fill-gold text-gold"></i>
              <span class="font-bold">${Number(worker.rating || 0).toFixed(1)}</span>
              <span class="text-neutral-500">rating</span>
            </div>
          </div>
        </div>
        <p class="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">${escapeHTML(worker.bio || 'Experienced and available for local jobs.')}</p>
        <div class="mt-5 grid grid-cols-2 gap-2">
          <button class="btn-soft" data-profile="${worker.id}"><i data-lucide="user-round" class="h-4 w-4"></i>Profile</button>
          <button class="btn-primary" data-book="${worker.id}"><i data-lucide="calendar-check" class="h-4 w-4"></i>Book</button>
        </div>
      </div>
    </article>
  `).join('');
  document.querySelectorAll('[data-profile]').forEach((btn) => btn.addEventListener('click', () => openWorkerProfile(btn.dataset.profile)));
  document.querySelectorAll('[data-book]').forEach((btn) => btn.addEventListener('click', () => openBooking(btn.dataset.book)));
  iconsReady();
}

function renderAuthArea() {
  const area = $('#authArea');
  if (state.profile) {
    area.innerHTML = `
      <button id="accountBtn" class="btn-soft py-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-soft text-xs font-extrabold text-brand">${escapeHTML(getInitials(state.profile.name))}</span>
        <span class="hidden sm:inline">${escapeHTML(state.profile.name)}</span>
      </button>
      <button id="logoutBtn" class="btn-soft py-2"><i data-lucide="log-out" class="h-4 w-4"></i><span class="hidden sm:inline">Logout</span></button>
    `;
    $('#accountBtn').addEventListener('click', openAccountProfile);
    $('#logoutBtn').addEventListener('click', logout);
  } else {
    area.innerHTML = `
      <button id="openLoginBtn" class="btn-soft py-2"><i data-lucide="log-in" class="h-4 w-4"></i>Login</button>
      <button id="openSignupBtn" class="btn-primary py-2"><i data-lucide="user-plus" class="h-4 w-4"></i><span class="hidden sm:inline">Sign up</span></button>
    `;
    $('#openLoginBtn').addEventListener('click', () => openAuth('login'));
    $('#openSignupBtn').addEventListener('click', () => openAuth('signup'));
  }
  iconsReady();
}

function openAuth(mode = 'login') {
  setAuthMode(mode);
  $('#authModal').showModal();
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  $('#loginTab').classList.toggle('active', !isSignup);
  $('#signupTab').classList.toggle('active', isSignup);
  $('#authTabs').classList.toggle('hidden', isForgot || isReset);
  $('#authEyebrow').textContent = isSignup ? 'Create account' : isForgot ? 'Reset password' : isReset ? 'New password' : 'Welcome back';
  $('#authTitle').textContent = isSignup ? 'Create your KaamWala account' : isForgot ? 'Recover your account' : isReset ? 'Update your password' : 'Login to KaamWala';
  $('#authSubmitBtn').innerHTML = isSignup
    ? '<i data-lucide="user-plus" class="h-4 w-4"></i>Create account'
    : isForgot
      ? '<i data-lucide="mail" class="h-4 w-4"></i>Send reset email'
      : isReset
        ? '<i data-lucide="key-round" class="h-4 w-4"></i>Update password'
        : '<i data-lucide="log-in" class="h-4 w-4"></i>Login';
  ['#authName', '#authPhone', '#authRole', '#authCategory', '#authCity', '#authConfirmPassword'].forEach((selector) => {
    $(selector).classList.toggle('hidden', !isSignup);
  });
  $('#authPassword').classList.toggle('hidden', isForgot || isReset);
  $('#resetOtp').classList.toggle('hidden', !isReset || state.passwordRecovery);
  $('#newPassword').classList.toggle('hidden', !isReset);
  $('#newPasswordConfirm').classList.toggle('hidden', !isReset);
  $('#forgotPasswordBtn').classList.toggle('hidden', isSignup || isForgot || isReset);
  $('#authName').required = isSignup;
  $('#authCity').required = isSignup;
  $('#authPassword').required = !isForgot && !isReset;
  $('#authConfirmPassword').required = isSignup;
  $('#newPassword').required = isReset;
  $('#newPasswordConfirm').required = isReset;
  $('#authHint').textContent = isSignup
    ? 'Signup ke baad email verification link aayega. Verify karke email/password se login karein.'
    : isForgot
      ? 'Email address enter karein. Hum password reset link/code bhejenge.'
      : isReset
        ? 'Reset link se aaye hain to new password set karein. Agar code mila hai to OTP bhi enter karein.'
        : 'Use the email and password you created during signup.';
  $('#authMessage').classList.add('hidden');
  iconsReady();
}

function getInitials(name = '') {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'KW';
}

function setAuthMessage(message, type = 'info') {
  const box = $('#authMessage');
  if (!box) return;
  box.textContent = message;
  box.className = `rounded-xl px-4 py-3 text-sm font-semibold ${type === 'error' ? 'bg-red-50 text-red-700' : type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-soft text-brand'}`;
  box.classList.remove('hidden');
}

function validatePassword(password) {
  if (password.length < 8) return 'Password kam se kam 8 characters ka hona chahiye.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password me letters aur numbers dono hone chahiye.';
  return '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const confirmPassword = String(form.get('confirm_password') || '');
  const rawPhone = String(form.get('phone') || '').trim();
  const phone = rawPhone ? toIndiaPhone(rawPhone) : null;
  const name = String(form.get('name') || '').trim();
  const role = String(form.get('role') || 'customer');
  const category = String(form.get('category') || '').trim();
  const city = String(form.get('city') || state.selectedCity).trim();
  if (!isValidEmail(email)) {
    setAuthMessage('Valid email zaroori hai.', 'error');
    return showToast('Valid email zaroori hai.', 'error');
  }
  if (state.authMode === 'forgot') return sendPasswordReset(email);
  if (state.authMode === 'reset') return updatePasswordFromReset(form, email);

  const passwordError = validatePassword(password);
  if (passwordError) {
    setAuthMessage(passwordError, 'error');
    return showToast(passwordError, 'error');
  }
  if (state.authMode === 'signup' && name.length < 2) {
    setAuthMessage('Signup ke liye full name zaroori hai.', 'error');
    return showToast('Signup ke liye full name zaroori hai.', 'error');
  }
  if (state.authMode === 'signup' && rawPhone && !phone) {
    setAuthMessage('Phone number valid nahi hai. 10 digit Indian number enter karein ya blank chhod dein.', 'error');
    return showToast('Phone number valid nahi hai.', 'error');
  }
  if (state.authMode === 'signup' && password !== confirmPassword) {
    setAuthMessage('Password aur confirm password match nahi kar rahe.', 'error');
    return showToast('Password aur confirm password match nahi kar rahe.', 'error');
  }
  if (state.authMode === 'signup' && role === 'worker' && !category) {
    setAuthMessage('Worker signup ke liye category select karna zaroori hai.', 'error');
    return showToast('Worker category zaroori hai.', 'error');
  }
  if (state.authMode === 'signup' && !serviceCities.includes(city)) {
    setAuthMessage('Valid service city select karein.', 'error');
    return showToast('Valid service city select karein.', 'error');
  }

  if (state.authMode === 'signup') return signUpWithPassword({ email, password, phone, name, role, category, city });
  return loginWithPassword(email, password);
}

async function signUpWithPassword(profile) {
  const profileDraft = {
    email: profile.email,
    phone: profile.phone,
    name: profile.name,
    role: profile.role,
    category: profile.category,
    city: profile.city
  };
  localStorage.setItem('kaamwala_signup', JSON.stringify(profileDraft));
  const { data, error } = await supabase.auth.signUp({
    email: profile.email,
    password: profile.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: profile.name,
        phone: profile.phone,
        role: profile.role,
        category: profile.category,
        city: profile.city
      }
    }
  });
  if (error) {
    setAuthMessage(error.message, 'error');
    return showToast(error.message, 'error');
  }
  if (data.session) {
    state.session = data.session;
    await ensureProfile(profileDraft);
    await loadProfile();
    renderAuthArea();
  }
  setAuthMessage('Signup successful. Email verification link inbox/spam me check karein, phir email/password se login karein.', 'success');
  showToast('Signup successful. Email verify karein.');
}

async function loginWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = error.message.includes('Email not confirmed') ? 'Email verify nahi hua. Inbox/spam me verification link check karein.' : error.message;
    setAuthMessage(message, 'error');
    return showToast(message, 'error');
  }
  state.session = data.session;
  await completePendingSignup();
  await ensureProfileFromMetadata();
  await loadProfile();
  $('#authModal').close();
  renderAuthArea();
  showToast('Login successful.');
}

async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) {
    setAuthMessage(error.message, 'error');
    return showToast(error.message, 'error');
  }
  localStorage.setItem('kaamwala_reset_email', email);
  state.passwordRecovery = false;
  setAuthMode('reset');
  setAuthMessage('Reset email bhej diya hai. Link click karein, ya agar OTP code mila hai to code enter karke new password set karein.', 'success');
}

async function updatePasswordFromReset(form, emailInput) {
  const newPasswordValue = String(form.get('new_password') || '');
  const confirm = String(form.get('new_password_confirm') || '');
  const token = String(form.get('otp') || '').trim();
  const passwordError = validatePassword(newPasswordValue);
  if (passwordError) return setAuthMessage(passwordError, 'error');
  if (newPasswordValue !== confirm) return setAuthMessage('New password aur confirm password match nahi kar rahe.', 'error');
  if (!state.passwordRecovery && token) {
    const email = emailInput || localStorage.getItem('kaamwala_reset_email');
    const verified = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
    if (verified.error) {
      setAuthMessage(verified.error.message, 'error');
      return showToast(verified.error.message, 'error');
    }
    state.session = verified.data.session;
  }
  const { error } = await supabase.auth.updateUser({ password: newPasswordValue });
  if (error) {
    setAuthMessage(error.message, 'error');
    return showToast(error.message, 'error');
  }
  localStorage.removeItem('kaamwala_reset_email');
  await supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  setAuthMode('login');
  setAuthMessage('Password updated. Ab new password se login karein.', 'success');
  renderAuthArea();
  showToast('Password updated.');
}

async function ensureProfile(pending) {
  const userId = state.session.user.id;
  await supabase.from('users').upsert({
    id: userId,
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    city: pending.city || 'Lucknow',
    role: pending.role === 'worker' ? 'worker' : 'customer'
  }, { onConflict: 'id' });

  if (pending.role === 'worker') {
    await supabase.from('workers').upsert({
      user_id: userId,
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      category: pending.category || 'General',
      city: pending.city || 'Lucknow',
      bio: `${pending.city || 'Lucknow'} me new worker profile. Admin verification pending.`,
      status: 'pending',
      verified: false
    }, { onConflict: 'user_id' });
  }
}

async function completePendingSignup() {
  const pending = JSON.parse(localStorage.getItem('kaamwala_signup') || '{}');
  if (!pending.email || !state.session) return;
  await ensureProfile(pending);
  localStorage.removeItem('kaamwala_signup');
}

async function ensureProfileFromMetadata() {
  if (!state.session?.user) return;
  const { data } = await supabase.from('users').select('id').eq('id', state.session.user.id).maybeSingle();
  if (data) return;
  const meta = state.session.user.user_metadata || {};
  const pending = {
    email: state.session.user.email,
    name: meta.full_name || state.session.user.email?.split('@')[0] || 'KaamWala User',
    phone: meta.phone || null,
    role: meta.role || 'customer',
    category: meta.category || '',
    city: meta.city || 'Lucknow'
  };
  await ensureProfile(pending);
}

async function logout() {
  await supabase?.auth.signOut();
  state.session = null;
  state.profile = null;
  state.myBookings = [];
  state.myWorker = null;
  renderAuthArea();
  showToast('Logged out successfully.');
}

async function openAccountProfile() {
  if (!state.session || !state.profile) return;
  $('#accountModal').showModal();
  await loadAccountData();
  renderAccountProfile();
}

async function loadAccountData() {
  const [bookings, worker] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, workers(name, category), categories(name)')
      .eq('user_id', state.session.user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('workers')
      .select('*')
      .eq('user_id', state.session.user.id)
      .maybeSingle()
  ]);
  if (bookings.error) showToast(bookings.error.message, 'error');
  if (worker.error && worker.error.code !== 'PGRST116') showToast(worker.error.message, 'error');
  state.myBookings = bookings.data || [];
  state.myWorker = worker.data || null;
}

function renderAccountProfile() {
  const roleLabel = state.profile.role === 'worker' ? 'Worker partner' : state.profile.role === 'admin' ? 'Administrator' : 'Customer';
  const workerStatus = state.myWorker ? `
    <div class="rounded-xl border border-line bg-shell p-4">
      <div class="text-xs font-extrabold uppercase tracking-widest text-neutral-500">Worker profile</div>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <span class="font-bold">${escapeHTML(state.myWorker.category)}</span>
        <span class="rounded-full bg-soft px-3 py-1 text-xs font-bold text-brand">${escapeHTML(state.myWorker.status)}</span>
        <span class="text-sm text-neutral-500">${escapeHTML(state.myWorker.city)}</span>
      </div>
      <p class="mt-2 text-sm leading-6 text-neutral-600">${escapeHTML(state.myWorker.bio || 'Profile verification pending.')}</p>
    </div>
  ` : '';

  $('#accountContent').innerHTML = `
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-4">
        <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-soft font-display text-xl font-extrabold text-brand">
          ${escapeHTML(getInitials(state.profile.name))}
        </div>
        <div class="min-w-0">
          <h2 class="font-display text-2xl font-extrabold">${escapeHTML(state.profile.name)}</h2>
          <p class="truncate text-sm text-neutral-500">${escapeHTML(state.profile.email || '')}</p>
          <div class="mt-2 inline-flex rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">${escapeHTML(roleLabel)}</div>
        </div>
      </div>

      <form id="accountForm" class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1 text-xs font-bold uppercase tracking-widest text-neutral-500">Full name
          <input name="name" class="input-field normal-case tracking-normal" value="${escapeHTML(state.profile.name || '')}" required minlength="2">
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-widest text-neutral-500">Email
          <input class="input-field normal-case tracking-normal" value="${escapeHTML(state.profile.email || '')}" disabled>
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-widest text-neutral-500">Phone
          <input name="phone" class="input-field normal-case tracking-normal" value="${escapeHTML(state.profile.phone || '')}" placeholder="9876543210">
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-widest text-neutral-500">City
          <select name="city" class="input-field normal-case tracking-normal">
            ${serviceCities.map((city) => `<option value="${escapeHTML(city)}" ${city === (state.profile.city || state.selectedCity) ? 'selected' : ''}>${escapeHTML(city)}</option>`).join('')}
          </select>
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-widest text-neutral-500 sm:col-span-2">Address / landmark
          <textarea name="address" class="input-field min-h-24 normal-case tracking-normal" placeholder="House number, mohalla, landmark">${escapeHTML(state.profile.address || '')}</textarea>
        </label>
        <button class="btn-primary sm:col-span-2" type="submit"><i data-lucide="save" class="h-4 w-4"></i>Save profile</button>
      </form>

      ${workerStatus}

      <div>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-display text-lg font-extrabold">Recent bookings</h3>
          <span class="text-xs font-bold uppercase tracking-widest text-neutral-500">${state.myBookings.length} shown</span>
        </div>
        <div class="grid gap-2">
          ${state.myBookings.length ? state.myBookings.map((booking) => `
            <div class="rounded-xl border border-line bg-white p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="font-bold">${escapeHTML(booking.workers?.name || booking.categories?.name || 'Service request')}</div>
                <span class="rounded-full bg-soft px-3 py-1 text-xs font-bold text-brand">${escapeHTML(booking.status)}</span>
              </div>
              <div class="mt-1 text-sm text-neutral-500">${escapeHTML(booking.city)} - ${escapeHTML(formatDateTime(booking.scheduled_date))}</div>
            </div>
          `).join('') : '<div class="rounded-xl border border-dashed border-line bg-shell p-5 text-center text-sm text-neutral-500">Abhi koi booking nahi hai. Worker choose karke first request create karein.</div>'}
        </div>
      </div>
    </div>
  `;
  $('#accountForm').addEventListener('submit', saveAccountProfile);
  iconsReady();
}

async function saveAccountProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const phone = toIndiaPhone(form.get('phone')) || null;
  const update = {
    name: String(form.get('name') || '').trim(),
    phone,
    city: String(form.get('city') || state.selectedCity),
    address: String(form.get('address') || '').trim() || null
  };
  if (update.name.length < 2) return showToast('Name kam se kam 2 characters ka hona chahiye.', 'error');
  const { error } = await supabase.from('users').update(update).eq('id', state.session.user.id);
  if (error) return showToast(error.message, 'error');
  await loadProfile();
  renderAuthArea();
  renderAccountProfile();
  showToast('Profile updated successfully.');
}

function openWorkerProfile(id) {
  const worker = state.workers.find((item) => item.id === id);
  if (!worker) return;
  const reviews = (worker.reviews || []).flatMap((booking) => booking.reviews || []).slice(0, 4);
  $('#profileContent').innerHTML = `
    <div class="flex items-start gap-4">
      <img src="${escapeHTML(worker.photo_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=240&h=240&fit=crop')}" class="h-20 w-20 rounded-2xl object-cover" alt="">
      <div>
        <h3 class="font-display text-2xl font-extrabold">${escapeHTML(worker.name)}</h3>
        <p class="font-semibold text-brand">${escapeHTML(worker.category)} - ${escapeHTML(worker.city)}</p>
        <p class="mt-2 text-sm text-neutral-600">${escapeHTML(worker.bio)}</p>
      </div>
    </div>
    <div class="mt-6 rounded-xl bg-soft p-4">
      <div class="text-sm font-bold">Reviews</div>
      ${reviews.length ? reviews.map((review) => `
        <div class="mt-3 border-t border-line pt-3 text-sm">
          <div class="font-bold">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
          <p class="text-neutral-600">${escapeHTML(review.comment || 'No comment')}</p>
        </div>
      `).join('') : '<p class="mt-2 text-sm text-neutral-500">Abhi reviews available nahi hain.</p>'}
    </div>
    <button class="btn-primary mt-6 w-full" data-book="${worker.id}"><i data-lucide="calendar-check" class="h-4 w-4"></i>Book this worker</button>
  `;
  $('#profileContent [data-book]').addEventListener('click', () => {
    $('#profileModal').close();
    openBooking(worker.id);
  });
  $('#profileModal').showModal();
  iconsReady();
}

function openBooking(id) {
  const worker = state.workers.find((item) => item.id === id) || null;
  state.bookingWorker = worker;
  $('#bookingWorkerId').value = worker?.id || '';
  $('#bookingTitle').textContent = worker ? `Book ${worker.name}` : 'Book a service';
  $('#bookingCity').value = worker?.city || state.selectedCity;
  $('#bookingModal').showModal();
}

async function submitBooking(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  if (!state.session) {
    $('#bookingModal').close();
    $('#authModal').showModal();
    return showToast('Booking ke liye login zaroori hai.', 'error');
  }
  const form = new FormData(event.currentTarget);
  const scheduledDate = form.get('scheduled_date');
  const categoryName = state.bookingWorker?.category || form.get('category');
  const city = state.bookingWorker?.city || String(form.get('city') || state.selectedCity);
  if (!scheduledDate || !categoryName || !serviceCities.includes(city)) return showToast('Service, city aur date select karein.', 'error');

  const category = state.categories.find((item) => item.name === categoryName);
  const { error } = await supabase.from('bookings').insert({
    user_id: state.session.user.id,
    worker_id: state.bookingWorker?.id || null,
    category_id: category?.id || null,
    city,
    status: 'confirmed',
    amount: 0,
    scheduled_date: new Date(scheduledDate).toISOString()
  });
  if (error) return showToast(error.message, 'error');

  $('#bookingModal').close();
  event.currentTarget.reset();
  showToast('Booking confirmed. Worker/admin dashboard me request dikh jayegi.');
}

function bindEvents() {
  $('#authForm').addEventListener('submit', handleAuthSubmit);
  $('#loginTab').addEventListener('click', () => setAuthMode('login'));
  $('#signupTab').addEventListener('click', () => setAuthMode('signup'));
  $('#forgotPasswordBtn').addEventListener('click', () => setAuthMode('forgot'));
  $('#footerLoginBtn')?.addEventListener('click', () => openAuth('login'));
  $('#bookingForm').addEventListener('submit', submitBooking);
  $('#workerSearch').addEventListener('input', (event) => {
    clearTimeout(window.__searchTimer);
    window.__searchTimer = setTimeout(() => {
      state.search = event.target.value.trim();
      loadWorkers();
    }, 350);
  });
  $('#cityFilter').addEventListener('change', (event) => {
    state.selectedCity = event.target.value;
    $('#heroCity').value = state.selectedCity;
    loadWorkers();
    renderCategories();
  });
  $('#resetFilters').addEventListener('click', () => {
    state.selectedCategory = '';
    state.search = '';
    $('#workerSearch').value = '';
    loadWorkers();
  });
  $('#heroSearchBtn').addEventListener('click', () => {
    state.search = $('#heroSearch').value.trim();
    state.selectedCity = $('#heroCity').value;
    $('#cityFilter').value = state.selectedCity;
    $('#workerSearch').value = state.search;
    loadWorkers();
    $('#workers').scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => $(button.dataset.close).close());
  });
}

async function init() {
  iconsReady();
  bindEvents();
  document.querySelectorAll('[data-city-options]').forEach((select) => {
    select.innerHTML = serviceCities.map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join('');
    select.value = state.selectedCity;
  });
  renderAuthArea();
  await loadSession();
  await loadCategories();
  await loadWorkers();
  supabase?.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (_event === 'PASSWORD_RECOVERY') {
      state.passwordRecovery = true;
      openAuth('reset');
      setAuthMessage('New password set karein.', 'success');
      return;
    }
    if (session) {
      await completePendingSignup();
      await ensureProfileFromMetadata();
      await loadProfile();
    }
    renderAuthArea();
  });
}

init();
