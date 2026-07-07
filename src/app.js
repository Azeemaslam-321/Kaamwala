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
  selectedCategory: '',
  selectedCity: 'Lucknow',
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
  if (state.session) await loadProfile();
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
      <span class="hidden text-sm font-bold sm:inline">${escapeHTML(state.profile.name)}</span>
      <button id="logoutBtn" class="btn-soft py-2"><i data-lucide="log-out" class="h-4 w-4"></i>Logout</button>
    `;
    $('#logoutBtn').addEventListener('click', logout);
  } else {
    area.innerHTML = `<button id="openAuthBtn" class="btn-soft py-2"><i data-lucide="phone" class="h-4 w-4"></i>Login</button>`;
    $('#openAuthBtn').addEventListener('click', () => $('#authModal').showModal());
  }
  iconsReady();
}

async function sendOtp(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  const form = new FormData(event.currentTarget);
  const phone = toIndiaPhone(form.get('phone'));
  const name = String(form.get('name') || '').trim();
  const role = String(form.get('role') || 'customer');
  const category = String(form.get('category') || '').trim();
  const city = String(form.get('city') || state.selectedCity).trim();
  if (!phone || name.length < 2) return showToast('Name aur valid India phone number zaroori hai.', 'error');
  if (!serviceCities.includes(city)) return showToast('Valid service city select karein.', 'error');
  localStorage.setItem('kaamwala_signup', JSON.stringify({ phone, name, role, category, city }));
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return showToast(error.message, 'error');
  $('#otpForm').classList.remove('hidden');
  showToast('OTP sent. Supabase phone provider configured hona chahiye.');
}

async function verifyOtp(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  const otp = new FormData(event.currentTarget).get('otp');
  const pending = JSON.parse(localStorage.getItem('kaamwala_signup') || '{}');
  const { data, error } = await supabase.auth.verifyOtp({ phone: pending.phone, token: otp, type: 'sms' });
  if (error) return showToast(error.message, 'error');
  state.session = data.session;
  await ensureProfile(pending);
  await loadProfile();
  $('#authModal').close();
  renderAuthArea();
  showToast('Login successful.');
}

async function ensureProfile(pending) {
  const userId = state.session.user.id;
  await supabase.from('users').upsert({
    id: userId,
    name: pending.name,
    phone: pending.phone,
    role: pending.role === 'worker' ? 'worker' : 'customer'
  }, { onConflict: 'id' });

  if (pending.role === 'worker') {
    await supabase.from('workers').upsert({
      user_id: userId,
      name: pending.name,
      phone: pending.phone,
      category: pending.category || 'General',
      city: pending.city || 'Lucknow',
      bio: `${pending.city || 'Lucknow'} me new worker profile. Admin verification pending.`,
      status: 'pending',
      verified: false
    }, { onConflict: 'user_id' });
  }
}

async function logout() {
  await supabase?.auth.signOut();
  state.session = null;
  state.profile = null;
  renderAuthArea();
  showToast('Logged out.');
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
  $('#authForm').addEventListener('submit', sendOtp);
  $('#otpForm').addEventListener('submit', verifyOtp);
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
    if (session) await loadProfile();
    renderAuthArea();
  });
}

init();
