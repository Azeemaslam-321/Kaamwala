import { createIcons, icons } from 'lucide';
import './styles.css';
import { serviceCities } from './config.js';
import { supabase } from './supabaseClient.js';
import { escapeHTML, formatDateTime, requireSupabase, showToast, toIndiaPhone } from './utils.js';

const $ = (selector) => document.querySelector(selector);
let session = null;
let adminProfile = null;

function iconsReady() {
  createIcons({ icons });
}

async function sendAdminOtp(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  const form = new FormData(event.currentTarget);
  const phone = toIndiaPhone(form.get('phone'));
  if (!phone) return showToast('Valid India phone number enter karein.', 'error');
  localStorage.setItem('kaamwala_admin_phone', phone);
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return showToast(error.message, 'error');
  $('#adminOtpForm')?.classList.remove('hidden');
  showToast('Admin OTP sent.');
}

async function verifyAdminOtp(event) {
  event.preventDefault();
  const phone = localStorage.getItem('kaamwala_admin_phone');
  const token = new FormData(event.currentTarget).get('otp');
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) return showToast(error.message, 'error');
  session = data.session;
  const allowed = await verifyAdmin();
  if (!allowed) {
    await supabase.auth.signOut();
    return showToast('Admin access nahi hai.', 'error');
  }
  window.location.href = '/admin/dashboard';
}

async function verifyAdmin() {
  const { data } = await supabase.auth.getSession();
  session = data.session;
  if (!session) return false;
  const { data: profile, error } = await supabase.from('users').select('*, admins(*)').eq('id', session.user.id).maybeSingle();
  if (error || !profile || profile.is_blocked) return false;
  adminProfile = profile;
  return profile.role === 'admin' || (profile.admins || []).length > 0;
}

async function guardDashboard() {
  if (!requireSupabase(supabase)) return;
  const allowed = await verifyAdmin();
  if (!allowed) {
    window.location.href = '/admin/login';
    return;
  }
  $('#adminName').textContent = adminProfile.name;
  await Promise.all([loadOverview(), loadPendingWorkers(), loadBookings(), loadUsers(), loadCategories()]);
}

async function loadOverview() {
  const [users, workers, bookings] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('workers').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('amount,status')
  ]);
  const revenue = (bookings.data || []).filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  $('#overviewCards').innerHTML = [
    ['Users', users.count || 0, 'users'],
    ['Workers', workers.count || 0, 'hard-hat'],
    ['Bookings', bookings.data?.length || 0, 'calendar-check'],
    ['Revenue', `Rs. ${revenue}`, 'indian-rupee']
  ].map(([label, value, icon]) => `
    <div class="card p-5">
      <i data-lucide="${icon}" class="h-6 w-6 text-brand"></i>
      <div class="mt-4 text-sm font-bold text-neutral-500">${label}</div>
      <div class="font-display text-3xl font-extrabold">${escapeHTML(value)}</div>
    </div>
  `).join('');
  iconsReady();
}

async function loadPendingWorkers() {
  const { data, error } = await supabase.from('workers').select('*').eq('status', 'pending').order('created_at');
  if (error) return showToast(error.message, 'error');
  $('#pendingWorkers').innerHTML = (data || []).length ? data.map((worker) => `
    <div class="card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="font-display text-lg font-extrabold">${escapeHTML(worker.name)}</div>
        <div class="text-sm text-neutral-500">${escapeHTML(worker.category)} - ${escapeHTML(worker.city)} - ${escapeHTML(worker.phone)}</div>
        <p class="mt-2 text-sm text-neutral-600">${escapeHTML(worker.bio)}</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-primary" data-approve="${worker.id}">Approve</button>
        <button class="btn-soft" data-reject="${worker.id}">Reject</button>
      </div>
    </div>
  `).join('') : '<div class="card p-6 text-neutral-500">No pending workers.</div>';
  document.querySelectorAll('[data-approve]').forEach((btn) => btn.addEventListener('click', () => updateWorker(btn.dataset.approve, 'approved')));
  document.querySelectorAll('[data-reject]').forEach((btn) => btn.addEventListener('click', () => updateWorker(btn.dataset.reject, 'rejected')));
}

async function updateWorker(id, status) {
  const { error } = await supabase.from('workers').update({ status, verified: status === 'approved' }).eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast(`Worker ${status}.`);
  await Promise.all([loadPendingWorkers(), loadOverview()]);
}

async function loadBookings() {
  const status = $('#bookingStatus')?.value || '';
  const city = $('#bookingCityFilter')?.value || '';
  const from = $('#bookingFrom')?.value || '';
  const to = $('#bookingTo')?.value || '';
  let query = supabase
    .from('bookings')
    .select('*, users(name, phone), workers(name, category), categories(name)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (city) query = query.eq('city', city);
  if (from) query = query.gte('scheduled_date', new Date(from).toISOString());
  if (to) query = query.lte('scheduled_date', new Date(`${to}T23:59:59`).toISOString());
  const { data, error } = await query;
  if (error) return showToast(error.message, 'error');
  $('#bookingRows').innerHTML = (data || []).map((booking) => `
    <tr class="border-b border-line">
      <td class="px-4 py-3">${escapeHTML(booking.users?.name || '-')}</td>
      <td class="px-4 py-3">${escapeHTML(booking.workers?.name || booking.categories?.name || '-')}</td>
      <td class="px-4 py-3">${escapeHTML(booking.city || '-')}</td>
      <td class="px-4 py-3">${escapeHTML(booking.status)}</td>
      <td class="px-4 py-3">Rs. ${escapeHTML(booking.amount)}</td>
      <td class="px-4 py-3">${escapeHTML(formatDateTime(booking.scheduled_date))}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="px-4 py-6 text-center text-neutral-500">No bookings found.</td></tr>';
}

async function loadUsers() {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) return showToast(error.message, 'error');
  $('#userRows').innerHTML = (data || []).map((user) => `
    <tr class="border-b border-line">
      <td class="px-4 py-3">${escapeHTML(user.name)}</td>
      <td class="px-4 py-3">${escapeHTML(user.phone)}</td>
      <td class="px-4 py-3">${escapeHTML(user.role)}</td>
      <td class="px-4 py-3">${user.is_blocked ? 'Blocked' : 'Active'}</td>
      <td class="px-4 py-3"><button class="btn-soft py-2" data-block="${user.id}" data-value="${!user.is_blocked}">${user.is_blocked ? 'Unblock' : 'Block'}</button></td>
    </tr>
  `).join('');
  document.querySelectorAll('[data-block]').forEach((btn) => btn.addEventListener('click', () => toggleBlock(btn.dataset.block, btn.dataset.value === 'true')));
}

async function toggleBlock(id, isBlocked) {
  const { error } = await supabase.from('users').update({ is_blocked: isBlocked }).eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast(isBlocked ? 'User blocked.' : 'User unblocked.');
  await loadUsers();
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) return showToast(error.message, 'error');
  $('#categoryRows').innerHTML = (data || []).map((cat) => `
    <tr class="border-b border-line">
      <td class="px-4 py-3">${escapeHTML(cat.name)}</td>
      <td class="px-4 py-3">${escapeHTML(cat.icon)}</td>
      <td class="px-4 py-3"><button class="btn-soft py-2" data-delete-category="${cat.id}">Delete</button></td>
    </tr>
  `).join('');
  document.querySelectorAll('[data-delete-category]').forEach((btn) => btn.addEventListener('click', () => deleteCategory(btn.dataset.deleteCategory)));
}

async function saveCategory(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get('name') || '').trim();
  const icon = String(form.get('icon') || 'wrench').trim();
  if (name.length < 2) return showToast('Category name required.', 'error');
  const { error } = await supabase.from('categories').upsert({ name, icon }, { onConflict: 'name' });
  if (error) return showToast(error.message, 'error');
  event.currentTarget.reset();
  showToast('Category saved.');
  await loadCategories();
}

async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast('Category deleted.');
  await loadCategories();
}

function bindDashboard() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('[data-panel]').forEach((item) => item.classList.add('hidden'));
      button.classList.add('active');
      $(`[data-panel="${button.dataset.tab}"]`).classList.remove('hidden');
    });
  });
  $('#bookingStatus')?.addEventListener('change', loadBookings);
  $('#bookingCityFilter')?.addEventListener('change', loadBookings);
  $('#bookingFrom')?.addEventListener('change', loadBookings);
  $('#bookingTo')?.addEventListener('change', loadBookings);
  $('#categoryForm')?.addEventListener('submit', saveCategory);
  $('#logoutAdmin')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  });
}

function init() {
  iconsReady();
  document.querySelectorAll('[data-city-options]').forEach((select) => {
    select.innerHTML = '<option value="">All cities</option>' + serviceCities.map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join('');
  });
  $('#adminLoginForm')?.addEventListener('submit', sendAdminOtp);
  $('#adminOtpForm')?.addEventListener('submit', verifyAdminOtp);
  if ($('#dashboardShell')) {
    bindDashboard();
    guardDashboard();
  }
}

init();
