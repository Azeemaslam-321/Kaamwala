import { createIcons, icons } from 'lucide';
import './styles.css';
import { serviceCities } from './config.js';
import { supabase } from './supabaseClient.js';
import { escapeHTML, formatDateTime, requireSupabase, showToast } from './utils.js';

const $ = (selector) => document.querySelector(selector);
let session = null;
let adminProfile = null;

function iconsReady() {
  createIcons({ icons });
}

async function loginAdmin(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!email || !email.includes('@')) return showToast('Valid admin email enter karein.', 'error');
  if (password.length < 8) return showToast('Password kam se kam 8 characters ka hona chahiye.', 'error');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showToast(error.message, 'error');
  session = data.session;
  const allowed = await verifyAdmin();
  if (!allowed) {
    await supabase.auth.signOut();
    return showToast('Login sahi hai, lekin is email ko admin role nahi mila hai.', 'error');
  }
  window.location.href = '/admin/dashboard';
}

async function resetAdminPassword() {
  const email = document.querySelector('[name="email"]')?.value?.trim().toLowerCase();
  if (!email || !email.includes('@')) return showToast('Pehle admin email enter karein.', 'error');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) return showToast(error.message, 'error');
  showToast('Password reset email sent.');
}

async function verifyAdmin() {
  const { data } = await supabase.auth.getSession();
  session = data.session;
  if (!session) return false;
  const { data: profile, error } = await supabase.from('users').select('*, admins(*)').eq('id', session.user.id).maybeSingle();
  if (error) return false;
  if (!profile) {
    showToast('Auth login sahi hai, lekin admin profile row missing hai. 007_make_azeem_admin.sql run karein.', 'error');
    return false;
  }
  if (profile.is_blocked) return false;
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
  const rows = bookings.data || [];
  const revenue = rows.filter((item) => item.status === 'completed' || item.payment_status === 'paid').reduce((sum, item) => sum + Number(item.final_price || item.amount || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  $('#overviewCards').innerHTML = [
    ['Customers', users.count || 0, 'users'],
    ['Workers', workers.count || 0, 'hard-hat'],
    ['Total bookings', rows.length, 'calendar-check'],
    ['Today bookings', rows.filter((item) => String(item.created_at || '').startsWith(today)).length, 'calendar-days'],
    ['Revenue', `Rs. ${revenue}`, 'indian-rupee'],
    ['Completed', rows.filter((item) => item.status === 'completed').length, 'circle-check'],
    ['Cancelled', rows.filter((item) => item.status === 'cancelled').length, 'circle-x'],
    ['Pending', rows.filter((item) => item.status === 'pending').length, 'hourglass']
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
        <div class="text-sm text-neutral-500">${escapeHTML(worker.category)} - ${escapeHTML(worker.city)} - ${escapeHTML(worker.email || worker.phone || '')}</div>
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
    .select('*, users(name, email, phone), workers(name, category), categories(name)')
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
      <td class="px-4 py-3">${escapeHTML(booking.area || booking.city || '-')}</td>
      <td class="px-4 py-3">${escapeHTML(booking.status)}</td>
      <td class="px-4 py-3">${escapeHTML(booking.payment_status || 'unpaid')} · Rs. ${escapeHTML(booking.final_price || booking.amount || booking.estimated_price || 0)}</td>
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
      <td class="px-4 py-3">${escapeHTML(user.email || user.phone || '-')}</td>
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
  $('#adminLoginForm')?.addEventListener('submit', loginAdmin);
  $('#adminResetBtn')?.addEventListener('click', resetAdminPassword);
  if ($('#dashboardShell')) {
    bindDashboard();
    guardDashboard();
  }
}

init();
