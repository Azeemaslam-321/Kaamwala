import { createIcons, icons } from 'lucide';
import './styles.css';
import { serviceAreas } from './config.js';
import { supabase } from './supabaseClient.js';
import { escapeHTML, formatDateTime, requireSupabase, showToast, toIndiaPhone } from './utils.js';
import { blogPosts, brand, faqs, lucknowAreas, services, statusSteps, testimonials } from './content.js';

const state = {
  session: null,
  profile: null,
  categories: [],
  workers: [],
  myBookings: [],
  assignedJobs: [],
  myWorker: null,
  selectedService: '',
  selectedArea: 'Gomti Nagar',
  authMode: 'login',
  passwordRecovery: false,
  search: '',
  bookingWorker: null
};

const $ = (selector) => document.querySelector(selector);
const currentPath = () => window.location.pathname.replace(/\/$/, '') || '/';
const serviceBySlug = (slug) => services.find((service) => service.slug === slug || service.slug === `${slug}-lucknow`);
const areaFromSlug = (slug = '') => lucknowAreas.find((area) => area.toLowerCase().replace(/\s+/g, '-') === slug);
const iconsReady = () => createIcons({ icons });

function appLink(path, label, classes = '') {
  return `<a href="${path}" data-link class="${classes}">${label}</a>`;
}

function logo() {
  return `
    <a href="/" data-link class="flex items-center gap-2.5">
      <div class="gradient-brand flex h-10 w-10 items-center justify-center rounded-xl shadow-glow">
        <i data-lucide="home" class="h-5 w-5 text-white"></i>
      </div>
      <div class="leading-none">
        <div class="font-display text-xl font-extrabold tracking-tight">${brand.name}</div>
        <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lucknow Services</div>
      </div>
    </a>
  `;
}

function setMeta({ title, description, canonical, schema }) {
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
  $('#schemaLocalBusiness').textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: brand.name,
    description: brand.tagline,
    email: brand.email,
    telephone: brand.phone,
    areaServed: 'Lucknow',
    address: { '@type': 'PostalAddress', addressLocality: 'Lucknow', addressRegion: 'Uttar Pradesh', addressCountry: 'IN' },
    url: canonical
  });
  $('#schemaPage').textContent = JSON.stringify(schema || {});
}

function renderShell(content) {
  $('#app').innerHTML = `
    <div class="bg-ink px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
      ${brand.tagline} - Gomti Nagar, Aliganj, Indira Nagar, Hazratganj aur nearby Lucknow areas.
    </div>
    <nav class="glass sticky top-0 z-40 border-b border-line">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        ${logo()}
        <div class="hidden items-center gap-7 text-sm font-bold lg:flex">
          ${appLink('/services', 'Services', 'hover:text-brand')}
          ${appLink('/areas/gomti-nagar', 'Areas', 'hover:text-brand')}
          ${appLink('/blog', 'Blog', 'hover:text-brand')}
          ${appLink('/about', 'About', 'hover:text-brand')}
          ${appLink('/contact', 'Contact', 'hover:text-brand')}
        </div>
        <div id="authArea" class="flex items-center gap-2"></div>
      </div>
    </nav>
    <main>${content}</main>
    ${footer()}
    ${mobileNav()}
  `;
  renderAuthArea();
  bindAppLinks();
  iconsReady();
}

function footer() {
  const serviceLinks = services.slice(0, 8).map((service) => appLink(`/services/${service.slug}`, service.name, 'hover:text-brand')).join('');
  const areaLinks = lucknowAreas.slice(0, 8).map((area) => appLink(`/areas/${slugify(area)}`, area, 'hover:text-brand')).join('');
  return `
    <footer class="border-t border-line bg-white pb-20 lg:pb-0">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-14 text-sm text-slate-500 sm:px-6 lg:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr]">
        <div class="max-w-md">
          ${logo()}
          <p class="mt-4 leading-6">${brand.name} is a Lucknow-first home services platform for verified local professionals, transparent booking requests, and support-led service operations.</p>
          <div class="mt-5 flex flex-wrap gap-2">
            <span class="rounded-full bg-soft px-3 py-1 text-xs font-bold text-brand">Verified workers</span>
            <span class="rounded-full bg-soft px-3 py-1 text-xs font-bold text-brand">Cash on service</span>
            <span class="rounded-full bg-soft px-3 py-1 text-xs font-bold text-brand">Lucknow local</span>
          </div>
        </div>
        <div><div class="font-bold text-ink">Services</div><div class="mt-3 grid gap-2">${serviceLinks}</div></div>
        <div><div class="font-bold text-ink">Lucknow Areas</div><div class="mt-3 grid gap-2">${areaLinks}</div></div>
        <div>
          <div class="font-bold text-ink">Company</div>
          <div class="mt-3 grid gap-2">
            ${appLink('/about', 'About KaamNest', 'hover:text-brand')}
            ${appLink('/privacy-policy', 'Privacy Policy', 'hover:text-brand')}
            ${appLink('/terms-and-conditions', 'Terms & Conditions', 'hover:text-brand')}
            ${appLink('/refund-cancellation-policy', 'Refund & Cancellation', 'hover:text-brand')}
            <a href="mailto:${brand.email}" class="hover:text-brand">${brand.email}</a>
            <span>${brand.city}</span>
          </div>
        </div>
      </div>
      <div class="border-t border-line">
        <div class="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 ${brand.name}. All rights reserved.</span>
          <span>Admin URL is private. Public admin signup is disabled.</span>
        </div>
      </div>
    </footer>
  `;
}

function mobileNav() {
  return `
    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-2 py-2 shadow-2xl lg:hidden">
      <div class="mx-auto grid max-w-md grid-cols-5 text-center text-[11px] font-bold text-slate-500">
        ${mobileLink('/', 'home', 'Home')}
        ${mobileLink('/services', 'layout-grid', 'Services')}
        ${mobileLink('/bookings', 'calendar-check', 'Bookings')}
        ${mobileLink('/worker/dashboard', 'briefcase-business', 'Work')}
        <button id="mobileAccountBtn" class="grid justify-items-center gap-1"><i data-lucide="user-round" class="h-5 w-5"></i><span>Account</span></button>
      </div>
    </nav>
  `;
}

function mobileLink(path, icon, label) {
  return `<a href="${path}" data-link class="grid justify-items-center gap-1"><i data-lucide="${icon}" class="h-5 w-5"></i><span>${label}</span></a>`;
}

function renderHome() {
  setMeta({
    title: 'KaamNest - Trusted Home Services in Lucknow',
    description: 'Book trusted professionals in Lucknow for electrician, plumber, AC repair, RO service, cleaning, appliance repair, painter, CCTV and pest control.',
    canonical: 'https://kaamnest.in/',
    schema: faqSchema()
  });
  renderShell(`
    <section class="relative overflow-hidden bg-white">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
        <div class="lg:col-span-7">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-soft px-3 py-1.5 text-xs font-bold text-brand">
            <span class="h-2 w-2 rounded-full bg-green"></span>${brand.tagline}
          </div>
          <h1 class="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Book Trusted Home Services in Lucknow
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Electrician, plumber, AC repair, RO service, cleaning, painter, CCTV, pest control aur appliance repair ke liye verified local professionals book karein.
          </p>
          <div class="mt-8 flex max-w-3xl flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-xl shadow-slate-200/70 sm:flex-row">
            <div class="flex flex-1 items-center gap-2 px-3">
              <i data-lucide="search" class="h-5 w-5 text-slate-500"></i>
              <input id="heroSearch" type="text" placeholder="Search services like electrician, plumber, AC repair..." class="w-full bg-transparent py-3 text-sm outline-none" />
            </div>
            <div class="flex items-center gap-2 border-line px-3 sm:border-l">
              <i data-lucide="map-pin" class="h-5 w-5 text-slate-500"></i>
              <select id="heroArea" class="bg-transparent py-3 text-sm font-bold outline-none">${areaOptions()}</select>
            </div>
            <button id="heroSearchBtn" class="btn-primary rounded-xl">Book Now<i data-lucide="arrow-right" class="h-4 w-4"></i></button>
          </div>
          <div class="mt-6 flex flex-wrap gap-3">
            <button class="btn-dark" data-open-booking><i data-lucide="calendar-plus" class="h-4 w-4"></i>Book Now</button>
            <button class="btn-soft" data-open-signup-worker><i data-lucide="briefcase-business" class="h-4 w-4"></i>Join as Professional</button>
          </div>
          <div class="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            ${statCard('10+', 'Services')}
            ${statCard('10', 'Lucknow Areas')}
            ${statCard('24h', 'Request Follow-up')}
          </div>
        </div>
        <div class="lg:col-span-5">
          <div class="card overflow-hidden">
            <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1000&h=680&fit=crop" alt="KaamNest home service professional" class="h-72 w-full object-cover sm:h-80" loading="lazy" />
            <div class="p-5">
              <div class="flex items-center justify-between gap-4">
                <div><div class="font-display text-xl font-extrabold">Verified visit request</div><p class="text-sm text-slate-500">Gomti Nagar - AC Repair</p></div>
                <span class="rounded-full bg-green/10 px-3 py-1 text-xs font-bold text-green">Pending assign</span>
              </div>
              <div class="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500">
                <div class="rounded-xl bg-shell p-3"><i data-lucide="badge-check" class="mx-auto mb-1 h-5 w-5 text-brand"></i>Verified</div>
                <div class="rounded-xl bg-shell p-3"><i data-lucide="wallet" class="mx-auto mb-1 h-5 w-5 text-brand"></i>Fair range</div>
                <div class="rounded-xl bg-shell p-3"><i data-lucide="headphones" class="mx-auto mb-1 h-5 w-5 text-brand"></i>Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    ${servicesSection()}
    ${popularSection()}
    ${howItWorksSection()}
    ${whyChooseSection()}
    ${workersSection()}
    ${reviewsSection()}
    ${faqSection()}
    ${partnerCtaSection()}
  `);
  bindHome();
  loadLiveData();
}

function statCard(value, label) {
  return `<div class="rounded-2xl border border-line bg-shell p-4"><div class="font-display text-3xl font-extrabold">${value}</div><div class="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">${label}</div></div>`;
}

function servicesSection() {
  return `
    <section class="section-pad" id="services">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p class="kicker">Services</p><h2 class="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Choose a service category</h2></div>
          ${appLink('/services', 'View all services', 'btn-soft')}
        </div>
        <div id="serviceGrid" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          ${services.map(serviceCard).join('')}
        </div>
      </div>
    </section>
  `;
}

function serviceCard(service) {
  return `
    <article class="link-card">
      <a href="/services/${service.slug}" data-link class="block">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-brand"><i data-lucide="${service.icon}" class="h-6 w-6"></i></div>
        <h3 class="font-display text-lg font-extrabold">${service.name}</h3>
        <p class="mt-1 text-sm font-semibold text-green">${service.price}</p>
        <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">${service.description}</p>
      </a>
      <button class="btn-primary mt-4 w-full py-2.5" data-book-service="${service.name}">Book</button>
    </article>
  `;
}

function popularSection() {
  return `
    <section class="bg-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <p class="kicker">Popular in Lucknow</p>
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          ${services.slice(0, 6).map((service) => `
            <a href="/services/${service.slug}" data-link class="card flex gap-4 overflow-hidden p-4 transition hover:-translate-y-1 hover:shadow-glow">
              <img src="${service.image}" alt="${service.name} in Lucknow" class="h-24 w-24 rounded-xl object-cover" loading="lazy" />
              <div><h3 class="font-display font-extrabold">${service.name}</h3><p class="mt-1 text-sm text-slate-600">${service.price}</p><p class="mt-2 text-xs font-bold text-brand">Book in ${state.selectedArea}</p></div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function howItWorksSection() {
  return `
    <section class="section-pad">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <p class="kicker">How it works</p>
        <div class="mt-6 grid gap-4 md:grid-cols-4">
          ${[
            ['layout-grid', 'Select Service', 'Service choose karein aur locality set karein.'],
            ['clock', 'Choose Time', 'Preferred date/time aur issue details add karein.'],
            ['badge-check', 'Verified Professional Arrives', 'Admin verified professional assign hota hai.'],
            ['wallet-cards', 'Pay Securely', 'Abhi cash on service; online placeholder ready hai.']
          ].map(([icon, title, text]) => `<div class="card p-5"><i data-lucide="${icon}" class="h-7 w-7 text-brand"></i><h3 class="mt-4 font-display text-lg font-extrabold">${title}</h3><p class="mt-2 text-sm leading-6 text-slate-600">${text}</p></div>`).join('')}
        </div>
      </div>
    </section>
  `;
}

function whyChooseSection() {
  return `
    <section class="bg-ink py-16 text-white">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div><p class="kicker text-green">Why choose KaamNest</p><h2 class="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Built for Lucknow homes, not generic listings.</h2><p class="mt-4 leading-7 text-white/70">Transparent pricing ranges, verified worker status, local area matching, and support-ready workflows keep the booking experience clear.</p></div>
        <div class="grid gap-4 sm:grid-cols-2">
          ${[
            ['shield-check', 'Verified workers'], ['receipt-text', 'Transparent pricing'], ['calendar-check', 'Fast booking'], ['map-pinned', 'Local experts'], ['headphones', 'Support'], ['badge-indian-rupee', 'Payment-ready structure']
          ].map(([icon, label]) => `<div class="rounded-2xl border border-white/10 bg-white/5 p-5"><i data-lucide="${icon}" class="h-6 w-6 text-green"></i><div class="mt-3 font-bold">${label}</div></div>`).join('')}
        </div>
      </div>
    </section>
  `;
}

function workersSection() {
  return `
    <section class="section-pad" id="workers">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p class="kicker">Professionals</p><h2 class="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Verified workers, real service profiles</h2></div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <select id="areaFilter" class="input-field sm:w-48">${areaOptions()}</select>
            <input id="workerSearch" class="input-field sm:w-80" placeholder="Search name, category, service" />
            <button id="resetFilters" class="btn-soft"><i data-lucide="rotate-ccw" class="h-4 w-4"></i>Reset</button>
          </div>
        </div>
        <div id="workerGrid" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">${workerSkeletons()}</div>
        <div id="workerEmpty" class="hidden rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <i data-lucide="search-x" class="mx-auto h-10 w-10 text-brand"></i>
          <h3 class="mt-4 font-display text-xl font-extrabold">Koi professional nahi mila</h3>
          <p class="mt-2 text-slate-500">Search ya area filter change karke try karein.</p>
        </div>
      </div>
    </section>
  `;
}

function reviewsSection() {
  return `
    <section class="bg-white py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <p class="kicker">Customer reviews</p>
        <div class="mt-6 grid gap-4 md:grid-cols-3">
          ${testimonials.map((item) => `<article class="card p-5"><div class="flex text-gold">${'★'.repeat(5)}</div><p class="mt-4 leading-7 text-slate-600">"${item.text}"</p><div class="mt-5 font-bold">${item.name}</div><div class="text-sm text-slate-500">${item.area}, Lucknow</div></article>`).join('')}
        </div>
      </div>
    </section>
  `;
}

function faqSection() {
  return `
    <section class="section-pad">
      <div class="mx-auto max-w-4xl px-4 sm:px-6">
        <p class="kicker">FAQ</p>
        <h2 class="mt-2 font-display text-3xl font-extrabold">Common questions</h2>
        <div class="mt-6 grid gap-3">
          ${faqs.map(([q, a]) => `<details class="card p-5"><summary class="cursor-pointer font-bold">${q}</summary><p class="mt-3 leading-7 text-slate-600">${a}</p></details>`).join('')}
        </div>
      </div>
    </section>
  `;
}

function partnerCtaSection() {
  return `
    <section class="px-4 py-16 sm:px-6">
      <div class="mx-auto max-w-7xl rounded-3xl bg-brand p-6 text-white sm:p-10 lg:flex lg:items-center lg:justify-between">
        <div><p class="text-sm font-bold uppercase tracking-widest text-white/70">Partner with KaamNest</p><h2 class="mt-2 font-display text-3xl font-extrabold">Join as a verified professional in Lucknow.</h2><p class="mt-3 max-w-2xl text-white/75">Electrician, plumber, carpenter, cleaner, AC/RO technician ya appliance repair expert hain? Profile create karein, admin verification ke baad jobs receive karein.</p></div>
        <button class="btn-primary mt-6 bg-white text-brand lg:mt-0" data-open-signup-worker><i data-lucide="user-plus" class="h-4 w-4"></i>Apply now</button>
      </div>
    </section>
  `;
}

function renderServicesPage() {
  setMeta({
    title: 'Home Services in Lucknow - KaamNest',
    description: 'Explore electrician, plumber, AC repair, RO service, cleaning, painter, CCTV, appliance repair and pest control services in Lucknow.',
    canonical: 'https://kaamnest.in/services',
    schema: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Home Services in Lucknow' }
  });
  renderShell(`
    <section class="bg-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        ${breadcrumb(['Home', 'Services'])}
        <p class="kicker mt-8">All services</p>
        <h1 class="mt-2 font-display text-4xl font-extrabold">Home services in Lucknow</h1>
        <p class="mt-4 max-w-3xl leading-7 text-slate-600">Professional booking flows for common home needs, with estimated price ranges and area-based assignment support.</p>
        <div class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">${services.map(serviceDetailCard).join('')}</div>
      </div>
    </section>
  `);
  bindBookingButtons();
}

function renderServiceDetail(slug) {
  const service = serviceBySlug(slug) || services[0];
  setMeta({
    title: `${service.name} in Lucknow - KaamNest`,
    description: `${service.description} Book ${service.name.toLowerCase()} near you in Lucknow with KaamNest.`,
    canonical: `https://kaamnest.in/services/${service.slug}`,
    schema: serviceSchema(service)
  });
  renderShell(`
    <section class="bg-white py-12">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:items-start">
        <div>
          ${breadcrumb(['Home', 'Services', service.name])}
          <p class="kicker mt-8">${service.category}</p>
          <h1 class="mt-2 font-display text-4xl font-extrabold">${service.name} in Lucknow</h1>
          <p class="mt-4 text-lg leading-8 text-slate-600">${service.description}</p>
          <div class="mt-6 flex flex-wrap gap-3"><span class="rounded-full bg-soft px-4 py-2 text-sm font-bold text-brand">${service.price}</span><span class="rounded-full bg-green/10 px-4 py-2 text-sm font-bold text-green">Verified worker assignment</span></div>
          <button class="btn-primary mt-8" data-book-service="${service.name}"><i data-lucide="calendar-plus" class="h-4 w-4"></i>Book ${service.name}</button>
        </div>
        <img src="${service.image}" alt="${service.name} service in Lucknow" class="h-80 w-full rounded-3xl object-cover shadow-sm" loading="lazy" />
      </div>
    </section>
    <section class="section-pad"><div class="mx-auto max-w-7xl px-4 sm:px-6"><h2 class="font-display text-3xl font-extrabold">Available in popular areas</h2><div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">${lucknowAreas.map((area) => appLink(`/services/${slugify(service.name)}/${slugify(area)}`, area, 'chip')).join('')}</div></div></section>
    ${faqSection()}
  `);
  bindBookingButtons();
}

function serviceDetailCard(service) {
  return `
    <article class="card overflow-hidden">
      <img src="${service.image}" alt="${service.name} in Lucknow" class="h-48 w-full object-cover" loading="lazy" />
      <div class="p-5">
        <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand"><i data-lucide="${service.icon}" class="h-5 w-5"></i></div>
        <h2 class="font-display text-xl font-extrabold">${service.name}</h2>
        <p class="mt-1 text-sm font-bold text-green">${service.price}</p>
        <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">${service.description}</p>
        <div class="mt-5 grid grid-cols-2 gap-2">${appLink(`/services/${service.slug}`, 'Details', 'btn-soft')}<button class="btn-primary" data-book-service="${service.name}">Book</button></div>
      </div>
    </article>
  `;
}

function renderAreaPage(slug) {
  const area = areaFromSlug(slug) || 'Gomti Nagar';
  setMeta({
    title: `Home Services in ${area}, Lucknow - KaamNest`,
    description: `Book trusted electrician, plumber, AC repair, cleaning, RO service and appliance repair professionals in ${area}, Lucknow.`,
    canonical: `https://kaamnest.in/areas/${slugify(area)}`,
    schema: { '@context': 'https://schema.org', '@type': 'Service', name: `Home Services in ${area}` }
  });
  renderShell(`
    <section class="bg-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        ${breadcrumb(['Home', 'Areas', area])}
        <p class="kicker mt-8">Lucknow locality</p>
        <h1 class="mt-2 font-display text-4xl font-extrabold">Home Services in ${area}</h1>
        <p class="mt-4 max-w-3xl leading-7 text-slate-600">${area} me electrician, plumber, AC repair, cleaning, RO service, CCTV, pest control and appliance repair requests create karein.</p>
        <div class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">${services.slice(0, 9).map(serviceDetailCard).join('')}</div>
      </div>
    </section>
  `);
  state.selectedArea = area;
  bindBookingButtons();
}

function renderServiceAreaPage(serviceSlug, areaSlug) {
  const service = services.find((item) => slugify(item.name) === serviceSlug) || services[0];
  const area = areaFromSlug(areaSlug) || 'Gomti Nagar';
  setMeta({
    title: `${service.name} in ${area}, Lucknow - KaamNest`,
    description: `Book ${service.name.toLowerCase()} professionals in ${area}, Lucknow. ${service.description}`,
    canonical: `https://kaamnest.in/services/${slugify(service.name)}/${slugify(area)}`,
    schema: serviceSchema(service)
  });
  renderShell(`
    <section class="bg-white py-12">
      <div class="mx-auto max-w-5xl px-4 sm:px-6">
        ${breadcrumb(['Home', 'Services', service.name, area])}
        <p class="kicker mt-8">Local service page</p>
        <h1 class="mt-2 font-display text-4xl font-extrabold">${service.name} in ${area}, Lucknow</h1>
        <p class="mt-4 text-lg leading-8 text-slate-600">KaamNest par ${area} ke liye ${service.name.toLowerCase()} booking request create karein. Estimated range: ${service.price}. Admin verified worker assignment and tracking flow available.</p>
        <button class="btn-primary mt-8" data-book-service="${service.name}"><i data-lucide="calendar-plus" class="h-4 w-4"></i>Book ${service.name} in ${area}</button>
      </div>
    </section>
    ${howItWorksSection()}
  `);
  state.selectedArea = area;
  bindBookingButtons();
}

function renderDashboardPage(role = 'customer') {
  const roleTitle = role === 'worker' ? 'Professional Dashboard' : 'Customer Dashboard';
  setMeta({
    title: `${roleTitle} - KaamNest`,
    description: `Manage your ${role === 'worker' ? 'assigned jobs and profile' : 'bookings and profile'} on KaamNest.`,
    canonical: `https://kaamnest.in/${role === 'worker' ? 'worker/dashboard' : 'dashboard'}`,
    schema: {}
  });
  renderShell(`
    <section class="py-10">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p class="kicker">${role === 'worker' ? 'Professional' : 'Customer'}</p><h1 class="font-display text-3xl font-extrabold">${roleTitle}</h1></div>
          <button class="btn-primary" data-open-booking><i data-lucide="calendar-plus" class="h-4 w-4"></i>Book service</button>
        </div>
        <div id="dashboardContent">${authGateHtml(role)}</div>
      </div>
    </section>
  `);
  bindBookingButtons();
  if (state.session) loadAccountData().then(() => renderInlineDashboard(role));
}

function authGateHtml(role) {
  if (state.session) return '<div class="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div class="card p-5 skeleton h-52"></div><div class="card p-5 skeleton h-52"></div></div>';
  return `<div class="card p-8 text-center"><i data-lucide="lock-keyhole" class="mx-auto h-10 w-10 text-brand"></i><h2 class="mt-4 font-display text-2xl font-extrabold">Login required</h2><p class="mt-2 text-slate-600">${role === 'worker' ? 'Professional dashboard ke liye worker account se login karein.' : 'Bookings manage karne ke liye customer account se login karein.'}</p><button class="btn-primary mt-5" data-open-login>Login</button></div>`;
}

function renderInlineDashboard(role) {
  const allowed = role === 'worker' ? state.profile?.role === 'worker' || state.profile?.role === 'admin' : Boolean(state.profile);
  if (!allowed) {
    $('#dashboardContent').innerHTML = `<div class="card p-8 text-center"><h2 class="font-display text-2xl font-extrabold">Access restricted</h2><p class="mt-2 text-slate-600">Is page ke liye ${role} role zaroori hai.</p></div>`;
    return iconsReady();
  }
  $('#dashboardContent').innerHTML = role === 'worker' ? workerDashboardHtml() : customerDashboardHtml();
  bindProfileActions();
  iconsReady();
}

function customerDashboardHtml() {
  return `
    <div class="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      ${profileCard()}
      <div class="card p-5">
        <div class="mb-4 flex items-center justify-between"><h2 class="font-display text-xl font-extrabold">My bookings</h2><span class="text-xs font-bold uppercase tracking-widest text-slate-500">${state.myBookings.length} total</span></div>
        <div class="grid gap-3">${bookingList(state.myBookings)}</div>
      </div>
    </div>
  `;
}

function workerDashboardHtml() {
  return `
    <div class="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      ${profileCard()}
      <div class="card p-5">
        <div class="mb-4 flex items-center justify-between"><h2 class="font-display text-xl font-extrabold">Assigned jobs</h2><span class="text-xs font-bold uppercase tracking-widest text-slate-500">${state.assignedJobs.length} active</span></div>
        <div class="grid gap-3">${bookingList(state.assignedJobs, true)}</div>
      </div>
    </div>
  `;
}

function profileCard() {
  return `
    <div class="card p-5">
      <div class="flex items-start gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-soft font-display text-xl font-extrabold text-brand">${escapeHTML(getInitials(state.profile?.name))}</div>
        <div><h2 class="font-display text-2xl font-extrabold">${escapeHTML(state.profile?.name || 'KaamNest User')}</h2><p class="text-sm text-slate-500">${escapeHTML(state.profile?.email || '')}</p><span class="mt-2 inline-flex rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">${escapeHTML(state.profile?.role || 'customer')}</span></div>
      </div>
      <div class="mt-5 grid gap-2 text-sm text-slate-600">
        <span><b>Phone:</b> ${escapeHTML(state.profile?.phone || 'Not added')}</span>
        <span><b>Area:</b> ${escapeHTML(state.profile?.area || state.profile?.city || 'Lucknow')}</span>
        <span><b>Address:</b> ${escapeHTML(state.profile?.address || 'Not added')}</span>
      </div>
      <button class="btn-soft mt-5 w-full" data-open-account><i data-lucide="settings" class="h-4 w-4"></i>Edit profile</button>
    </div>
  `;
}

function renderBookingsPage() {
  setMeta({
    title: 'My Bookings - KaamNest',
    description: 'Track KaamNest booking status, worker assignment and service progress.',
    canonical: 'https://kaamnest.in/bookings',
    schema: {}
  });
  renderShell(`
    <section class="py-10">
      <div class="mx-auto max-w-5xl px-4 sm:px-6">
        <p class="kicker">Tracking</p><h1 class="mt-2 font-display text-3xl font-extrabold">My bookings</h1>
        <div id="bookingsContent" class="mt-6">${authGateHtml('customer')}</div>
      </div>
    </section>
  `);
  if (state.session) loadAccountData().then(() => {
    $('#bookingsContent').innerHTML = `<div class="grid gap-4">${bookingList(state.myBookings)}</div>`;
    bindBookingStatusActions();
    iconsReady();
  });
}

function bookingList(bookings, workerMode = false) {
  if (!bookings.length) return '<div class="rounded-xl border border-dashed border-line bg-shell p-6 text-center text-sm text-slate-500">Abhi koi booking nahi hai.</div>';
  return bookings.map((booking) => `
    <article class="rounded-2xl border border-line bg-white p-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><h3 class="font-display text-lg font-extrabold">${escapeHTML(booking.workers?.name || booking.categories?.name || booking.service_name || booking.service || 'Service request')}</h3><p class="text-sm text-slate-500">${escapeHTML(booking.area || booking.city || 'Lucknow')} - ${escapeHTML(formatDateTime(booking.scheduled_date || booking.booking_date))}</p></div>
        <span class="rounded-full bg-soft px-3 py-1 text-xs font-bold text-brand">${escapeHTML(booking.status || 'pending')}</span>
      </div>
      ${trackingHtml(booking.status || 'pending')}
      <p class="mt-3 text-sm text-slate-600">${escapeHTML(booking.notes || booking.issue_description || 'Request received. Assignment update will appear here.')}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        ${!workerMode && !['in_progress', 'completed', 'cancelled'].includes(booking.status) ? `<button class="btn-soft py-2" data-cancel-booking="${booking.id}">Cancel</button>` : ''}
        ${workerMode ? `<button class="btn-primary py-2" data-worker-status="${booking.id}" data-status="accepted">Accept</button><button class="btn-soft py-2" data-worker-status="${booking.id}" data-status="in_progress">Start</button><button class="btn-soft py-2" data-worker-status="${booking.id}" data-status="completed">Complete</button>` : ''}
      </div>
    </article>
  `).join('');
}

function trackingHtml(status) {
  const index = Math.max(0, statusSteps.indexOf(status));
  return `<div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">${statusSteps.map((step, idx) => `<div class="rounded-xl ${idx <= index ? 'bg-brand text-white' : 'bg-shell text-slate-400'} px-2 py-2 text-center text-[11px] font-bold">${step.replaceAll('_', ' ')}</div>`).join('')}</div>`;
}

function renderTextPage(type) {
  const map = {
    about: ['About KaamNest', 'KaamNest is a Lucknow-first home services platform connecting customers with verified local professionals.', aboutContent()],
    contact: ['Contact KaamNest', 'Contact KaamNest support for booking, partner onboarding and service questions.', contactContent()],
    'privacy-policy': ['Privacy Policy', 'KaamNest privacy policy for customers and professionals.', policyContent('Privacy Policy')],
    'terms-and-conditions': ['Terms & Conditions', 'KaamNest terms and conditions for using the platform.', policyContent('Terms & Conditions')],
    'refund-cancellation-policy': ['Refund & Cancellation Policy', 'KaamNest refund and cancellation policy placeholder for service bookings.', policyContent('Refund & Cancellation Policy')],
    blog: ['KaamNest Blog', 'Guides and tips for home services in Lucknow.', blogContent()]
  };
  const [title, description, content] = map[type] || map.about;
  setMeta({ title: `${title} - KaamNest`, description, canonical: `https://kaamnest.in/${type}`, schema: {} });
  renderShell(content);
}

function aboutContent() {
  return `<section class="bg-white py-12"><div class="mx-auto max-w-4xl px-4 sm:px-6"><p class="kicker">About</p><h1 class="mt-2 font-display text-4xl font-extrabold">A serious startup product for Lucknow home services.</h1><p class="mt-5 leading-8 text-slate-600">KaamNest helps customers create structured home-service booking requests and helps admins manage verification, assignment, status tracking, and local service operations. We avoid fake claims and focus on verified local professionals, transparent pricing ranges, easy booking, and fast support.</p>${whyChooseSection()}</div></section>`;
}

function contactContent() {
  return `<section class="bg-white py-12"><div class="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]"><div><p class="kicker">Contact</p><h1 class="mt-2 font-display text-4xl font-extrabold">Need help with a booking?</h1><p class="mt-4 leading-7 text-slate-600">Support placeholder: WhatsApp, email and contact query collection are ready. Replace placeholder phone before production launch.</p><div class="mt-6 grid gap-2 text-sm"><a class="font-bold text-brand" href="mailto:${brand.email}">${brand.email}</a><span>${brand.phone}</span><span>${brand.city}</span></div></div><form id="contactForm" class="card grid gap-3 p-5"><input name="name" class="input-field" placeholder="Full name" required><input name="email" type="email" class="input-field" placeholder="Email" required><input name="mobile" class="input-field" placeholder="Mobile number"><textarea name="message" class="input-field min-h-32" placeholder="How can we help?" required></textarea><button class="btn-primary">Send query</button></form></div></section>`;
}

function policyContent(title) {
  return `<section class="bg-white py-12"><div class="mx-auto max-w-4xl px-4 sm:px-6"><p class="kicker">Legal</p><h1 class="mt-2 font-display text-4xl font-extrabold">${title}</h1><div class="mt-6 space-y-5 leading-8 text-slate-600"><p>This page is a production placeholder and should be reviewed by a legal professional before public launch.</p><p>KaamNest stores account, booking, worker verification, contact and service data only for operating the platform. Online payment and refund workflows will be finalized when the payment gateway is activated.</p><p>Customers may request cancellation before work starts. Final charges, refunds, warranty and service liability terms must be confirmed in the final business policy.</p></div></div></section>`;
}

function blogContent() {
  return `<section class="bg-white py-12"><div class="mx-auto max-w-7xl px-4 sm:px-6"><p class="kicker">Blog</p><h1 class="mt-2 font-display text-4xl font-extrabold">Home service guides for Lucknow</h1><div class="mt-8 grid gap-5 md:grid-cols-3">${blogPosts.map((post) => `<article class="card p-5"><h2 class="font-display text-xl font-extrabold">${post.title}</h2><p class="mt-3 leading-6 text-slate-600">${post.excerpt}</p><span class="mt-5 inline-flex text-sm font-bold text-brand">Publishing soon</span></article>`).join('')}</div></div></section>`;
}

async function loadLiveData() {
  if (!supabase) {
    renderWorkers(fallbackWorkers());
    return;
  }
  await Promise.all([loadCategories(), loadWorkers()]);
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
}

async function loadProfile() {
  const { data, error } = await supabase.from('users').select('*').eq('id', state.session.user.id).maybeSingle();
  if (error) showToast(error.message, 'error');
  state.profile = data || null;
}

async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('name');
  state.categories = data || services.map((service) => ({ name: service.name, icon: service.icon }));
}

async function loadWorkers() {
  const grid = $('#workerGrid');
  if (!grid) return;
  $('#workerEmpty')?.classList.add('hidden');
  grid.innerHTML = workerSkeletons();
  let query = supabase.from('workers').select('*, reviews:bookings(reviews(rating, comment, created_at))').eq('status', 'approved').eq('city', 'Lucknow').order('rating', { ascending: false });
  if (state.search) {
    const term = `%${state.search}%`;
    query = query.or(`name.ilike.${term},category.ilike.${term},bio.ilike.${term},area.ilike.${term}`);
  }
  const { data, error } = await query;
  if (error) {
    renderWorkers(fallbackWorkers());
    return;
  }
  renderWorkers(data?.length ? data : fallbackWorkers());
}

function renderWorkers(workers) {
  state.workers = workers || [];
  const grid = $('#workerGrid');
  if (!grid) return;
  const filtered = state.workers.filter((worker) => {
    const areaMatch = !state.selectedArea || worker.area === state.selectedArea || String(worker.service_areas || '').includes(state.selectedArea) || !worker.area;
    const search = `${worker.name} ${worker.category} ${worker.bio}`.toLowerCase();
    return areaMatch && (!state.search || search.includes(state.search.toLowerCase()));
  });
  if (!filtered.length) {
    grid.innerHTML = '';
    $('#workerEmpty')?.classList.remove('hidden');
    return;
  }
  grid.innerHTML = filtered.map(workerCard).join('');
  bindWorkerButtons();
  iconsReady();
}

function workerCard(worker) {
  return `
    <article class="card overflow-hidden">
      <div class="p-5">
        <div class="flex gap-4">
          <img src="${escapeHTML(worker.photo_url || worker.profile_photo || 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=240&h=240&fit=crop')}" alt="${escapeHTML(worker.name)}" class="h-16 w-16 rounded-2xl object-cover" loading="lazy">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2"><h3 class="truncate font-display text-lg font-extrabold">${escapeHTML(worker.name)}</h3><i data-lucide="badge-check" class="h-4 w-4 text-green"></i></div>
            <p class="text-sm font-semibold text-slate-500">${escapeHTML(worker.category)} - ${escapeHTML(worker.area || worker.city || 'Lucknow')}</p>
            <div class="mt-2 flex items-center gap-1 text-sm"><i data-lucide="star" class="h-4 w-4 fill-gold text-gold"></i><span class="font-bold">${Number(worker.rating || worker.average_rating || 4.7).toFixed(1)}</span><span class="text-slate-500">rating</span></div>
          </div>
        </div>
        <p class="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">${escapeHTML(worker.bio || 'Verified local professional for Lucknow home-service requests.')}</p>
        <div class="mt-5 grid grid-cols-2 gap-2"><button class="btn-soft" data-profile="${worker.id}"><i data-lucide="user-round" class="h-4 w-4"></i>Profile</button><button class="btn-primary" data-book="${worker.id}"><i data-lucide="calendar-check" class="h-4 w-4"></i>Book</button></div>
      </div>
    </article>
  `;
}

function fallbackWorkers() {
  return [
    { id: 'demo-1', name: 'Amit Verma', category: 'Electrician', area: 'Gomti Nagar', city: 'Lucknow', rating: 4.8, bio: 'Switchboard, fan fitting, MCB and wiring checks for residential flats.', photo_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=240&h=240&fit=crop' },
    { id: 'demo-2', name: 'Shoaib Khan', category: 'Plumber', area: 'Aliganj', city: 'Lucknow', rating: 4.7, bio: 'Leakage, tap fitting, bathroom plumbing and kitchen sink service.', photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=240&h=240&fit=crop' },
    { id: 'demo-3', name: 'Ramesh Yadav', category: 'AC Repair', area: 'Indira Nagar', city: 'Lucknow', rating: 4.9, bio: 'AC servicing, cooling issue diagnosis and installation support.', photo_url: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=240&h=240&fit=crop' }
  ];
}

function renderAuthArea() {
  const area = $('#authArea');
  if (!area) return;
  if (state.profile) {
    area.innerHTML = `<button id="accountBtn" class="btn-soft py-2"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-soft text-xs font-extrabold text-brand">${escapeHTML(getInitials(state.profile.name))}</span><span class="hidden sm:inline">${escapeHTML(state.profile.name)}</span></button><button id="logoutBtn" class="btn-soft py-2"><i data-lucide="log-out" class="h-4 w-4"></i><span class="hidden sm:inline">Logout</span></button>`;
    $('#accountBtn').addEventListener('click', openAccountProfile);
    $('#logoutBtn').addEventListener('click', logout);
  } else {
    area.innerHTML = `<button id="openLoginBtn" class="btn-soft py-2"><i data-lucide="log-in" class="h-4 w-4"></i>Login</button><button id="openSignupBtn" class="btn-primary py-2"><i data-lucide="user-plus" class="h-4 w-4"></i><span class="hidden sm:inline">Sign up</span></button>`;
    $('#openLoginBtn').addEventListener('click', () => openAuth('login'));
    $('#openSignupBtn').addEventListener('click', () => openAuth('signup'));
  }
  $('#mobileAccountBtn')?.addEventListener('click', () => state.profile ? openAccountProfile() : openAuth('login'));
  iconsReady();
}

function openAuth(mode = 'login', role = '') {
  setAuthMode(mode);
  if (role) {
    const input = document.querySelector(`input[name="role"][value="${role}"]`);
    if (input) input.checked = true;
    syncRoleDetails();
  }
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
  $('#roleChooser').classList.toggle('hidden', !isSignup);
  $('#roleChooser').classList.toggle('grid', isSignup);
  $('#authName').classList.toggle('hidden', !isSignup);
  $('#authPhone').classList.toggle('hidden', !isSignup);
  $('#authConfirmPassword').classList.toggle('hidden', !isSignup);
  $('#signupDetails').classList.toggle('hidden', !isSignup);
  $('#authPassword').classList.toggle('hidden', isForgot || isReset);
  $('#resetOtp').classList.toggle('hidden', !isReset || state.passwordRecovery);
  $('#newPassword').classList.toggle('hidden', !isReset);
  $('#newPasswordConfirm').classList.toggle('hidden', !isReset);
  $('#forgotPasswordBtn').classList.toggle('hidden', isSignup || isForgot || isReset);
  $('#authEyebrow').textContent = isSignup ? 'Create account' : isForgot ? 'Reset password' : isReset ? 'New password' : 'Welcome back';
  $('#authTitle').textContent = isSignup ? 'Create your KaamNest account' : isForgot ? 'Recover your account' : isReset ? 'Update your password' : 'Login to KaamNest';
  $('#authSubmitBtn').innerHTML = isSignup ? '<i data-lucide="user-plus" class="h-4 w-4"></i>Create account' : isForgot ? '<i data-lucide="mail" class="h-4 w-4"></i>Send reset email' : isReset ? '<i data-lucide="key-round" class="h-4 w-4"></i>Update password' : '<i data-lucide="log-in" class="h-4 w-4"></i>Login';
  $('#authName').required = isSignup;
  $('#authPhone').required = isSignup;
  $('#authPassword').required = !isForgot && !isReset;
  $('#authConfirmPassword').required = isSignup;
  $('#newPassword').required = isReset;
  $('#newPasswordConfirm').required = isReset;
  $('#authHint').textContent = isSignup ? 'Signup ke baad email verification link aayega. Worker profiles Pending Verification me rahenge.' : isForgot ? 'Email address enter karein. Hum password reset link/code bhejenge.' : isReset ? 'Reset link/code verify karke new password set karein.' : 'Use the email and password you created during signup.';
  $('#authMessage').classList.add('hidden');
  syncRoleDetails();
  iconsReady();
}

function syncRoleDetails() {
  const role = document.querySelector('input[name="role"]:checked')?.value || 'customer';
  $('#workerDetails').classList.toggle('hidden', state.authMode !== 'signup' || role !== 'worker');
}

function setAuthMessage(message, type = 'info') {
  const box = $('#authMessage');
  box.textContent = message;
  box.className = `rounded-xl px-4 py-3 text-sm font-semibold ${type === 'error' ? 'bg-red-50 text-red-700' : type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-soft text-brand'}`;
  box.classList.remove('hidden');
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const confirmPassword = String(form.get('confirm_password') || '');
  const name = String(form.get('name') || '').trim();
  const rawPhone = String(form.get('phone') || '').trim();
  const phone = toIndiaPhone(rawPhone);
  const role = String(form.get('role') || 'customer');
  const area = String(form.get('area') || state.selectedArea);
  const category = String(form.get('category') || '').trim();
  if (!isValidEmail(email)) return authError('Valid email zaroori hai.');
  if (state.authMode === 'forgot') return sendPasswordReset(email);
  if (state.authMode === 'reset') return updatePasswordFromReset(form, email);
  const passwordError = validatePassword(password);
  if (passwordError) return authError(passwordError);
  if (state.authMode === 'signup') {
    if (name.length < 2) return authError('Full name zaroori hai.');
    if (!phone) return authError('Valid 10 digit mobile number zaroori hai.');
    if (password !== confirmPassword) return authError('Password aur confirm password match nahi kar rahe.');
    if (!lucknowAreas.includes(area)) return authError('Valid Lucknow area select karein.');
    if (role === 'worker' && !category) return authError('Professional signup ke liye service category zaroori hai.');
    return signUpWithPassword({
      email, password, phone, name, role, area, category,
      address: String(form.get('address') || '').trim(),
      experience: Number(form.get('experience') || 0),
      service_areas: String(form.get('service_areas') || area),
      availability: String(form.get('availability') || 'Mon-Sat 9 AM-7 PM'),
      upi: String(form.get('upi') || '')
    });
  }
  return loginWithPassword(email, password);
}

function authError(message) {
  setAuthMessage(message, 'error');
  showToast(message, 'error');
}

async function signUpWithPassword(profile) {
  const { password: _password, ...safeProfile } = profile;
  const profileDraft = { ...safeProfile, city: 'Lucknow' };
  localStorage.setItem('kaamnest_signup', JSON.stringify(profileDraft));
  const { data, error } = await supabase.auth.signUp({
    email: profile.email,
    password: profile.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: profile.name, phone: profile.phone, role: profile.role, category: profile.category, city: 'Lucknow', area: profile.area }
    }
  });
  if (error) return authError(error.message);
  if (data.session) {
    state.session = data.session;
    await ensureProfile(profileDraft);
    await loadProfile();
    renderAuthArea();
  }
  setAuthMessage('Signup successful. Email verification link inbox/spam me check karein, phir login karein.', 'success');
  showToast('Signup successful. Email verify karein.');
}

async function loginWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return authError(error.message.includes('Email not confirmed') ? 'Email verify nahi hua. Inbox/spam me verification link check karein.' : error.message);
  state.session = data.session;
  await completePendingSignup();
  await ensureProfileFromMetadata();
  await loadProfile();
  $('#authModal').close();
  renderAuthArea();
  route();
  showToast('Login successful.');
}

async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) return authError(error.message);
  localStorage.setItem('kaamnest_reset_email', email);
  state.passwordRecovery = false;
  setAuthMode('reset');
  setAuthMessage('Reset email bhej diya hai. Link click karein, ya OTP code mila hai to code enter karein.', 'success');
}

async function updatePasswordFromReset(form, emailInput) {
  const newPasswordValue = String(form.get('new_password') || '');
  const confirm = String(form.get('new_password_confirm') || '');
  const token = String(form.get('otp') || '').trim();
  const passwordError = validatePassword(newPasswordValue);
  if (passwordError) return authError(passwordError);
  if (newPasswordValue !== confirm) return authError('New password aur confirm password match nahi kar rahe.');
  if (!state.passwordRecovery && token) {
    const email = emailInput || localStorage.getItem('kaamnest_reset_email');
    const verified = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
    if (verified.error) return authError(verified.error.message);
    state.session = verified.data.session;
  }
  const { error } = await supabase.auth.updateUser({ password: newPasswordValue });
  if (error) return authError(error.message);
  localStorage.removeItem('kaamnest_reset_email');
  await supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  setAuthMode('login');
  setAuthMessage('Password updated. Ab new password se login karein.', 'success');
  renderAuthArea();
}

async function ensureProfile(pending) {
  const userId = state.session.user.id;
  await supabase.from('users').upsert({
    id: userId,
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    city: 'Lucknow',
    area: pending.area || null,
    address: pending.address || null,
    role: pending.role === 'worker' ? 'worker' : 'customer'
  }, { onConflict: 'id' });
  if (pending.role === 'worker') {
    await supabase.from('workers').upsert({
      user_id: userId,
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      category: pending.category,
      city: 'Lucknow',
      area: pending.area,
      bio: `${pending.category} professional in ${pending.area}, Lucknow. Verification pending.`,
      status: 'pending',
      verified: false,
      experience_years: pending.experience || 0,
      availability_status: pending.availability || 'Mon-Sat 9 AM-7 PM',
      service_areas: pending.service_areas || pending.area
    }, { onConflict: 'user_id' });
  }
}

async function completePendingSignup() {
  const pending = JSON.parse(localStorage.getItem('kaamnest_signup') || localStorage.getItem('kaamwala_signup') || '{}');
  if (!pending.email || !state.session) return;
  await ensureProfile(pending);
  localStorage.removeItem('kaamnest_signup');
  localStorage.removeItem('kaamwala_signup');
}

async function ensureProfileFromMetadata() {
  if (!state.session?.user) return;
  const { data } = await supabase.from('users').select('id').eq('id', state.session.user.id).maybeSingle();
  if (data) return;
  const meta = state.session.user.user_metadata || {};
  await ensureProfile({
    email: state.session.user.email,
    name: meta.full_name || state.session.user.email?.split('@')[0] || 'KaamNest User',
    phone: meta.phone || null,
    role: meta.role || 'customer',
    category: meta.category || '',
    city: 'Lucknow',
    area: meta.area || 'Gomti Nagar'
  });
}

async function logout() {
  await supabase?.auth.signOut();
  state.session = null;
  state.profile = null;
  state.myBookings = [];
  state.assignedJobs = [];
  state.myWorker = null;
  route();
  showToast('Logged out successfully.');
}

async function openAccountProfile() {
  if (!state.session || !state.profile) return openAuth('login');
  $('#accountModal').showModal();
  await loadAccountData();
  renderAccountProfile();
}

async function loadAccountData() {
  const [bookings, worker] = await Promise.all([
    supabase.from('bookings').select('*, workers(name, category), categories(name)').eq('user_id', state.session.user.id).order('created_at', { ascending: false }).limit(12),
    supabase.from('workers').select('*').eq('user_id', state.session.user.id).maybeSingle()
  ]);
  state.myBookings = bookings.data || [];
  state.myWorker = worker.data || null;
  if (state.myWorker) {
    const assigned = await supabase.from('bookings').select('*, users(name, email, phone), workers(name, category), categories(name)').eq('worker_id', state.myWorker.id).order('created_at', { ascending: false }).limit(12);
    state.assignedJobs = assigned.data || [];
  }
}

function renderAccountProfile() {
  const workerStatus = state.myWorker ? `<div class="rounded-xl border border-line bg-shell p-4"><div class="text-xs font-extrabold uppercase tracking-widest text-slate-500">Professional profile</div><div class="mt-2 flex flex-wrap items-center gap-2"><span class="font-bold">${escapeHTML(state.myWorker.category)}</span><span class="rounded-full bg-soft px-3 py-1 text-xs font-bold text-brand">${escapeHTML(state.myWorker.status)}</span><span class="text-sm text-slate-500">${escapeHTML(state.myWorker.area || 'Lucknow')}</span></div><p class="mt-2 text-sm leading-6 text-slate-600">${escapeHTML(state.myWorker.bio || 'Verification pending.')}</p></div>` : '';
  $('#accountContent').innerHTML = `
    <div class="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div>${profileCard()}${workerStatus ? `<div class="mt-4">${workerStatus}</div>` : ''}</div>
      <div class="card p-5">
        <h3 class="font-display text-lg font-extrabold">Update profile</h3>
        <form id="accountForm" class="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="name" class="input-field" value="${escapeHTML(state.profile.name || '')}" required minlength="2">
          <input class="input-field" value="${escapeHTML(state.profile.email || '')}" disabled>
          <input name="phone" class="input-field" value="${escapeHTML(state.profile.phone || '')}" placeholder="9876543210">
          <select name="area" class="input-field">${areaOptions(state.profile.area || state.selectedArea)}</select>
          <textarea name="address" class="input-field min-h-24 sm:col-span-2" placeholder="House number, locality, landmark">${escapeHTML(state.profile.address || '')}</textarea>
          <button class="btn-primary sm:col-span-2" type="submit"><i data-lucide="save" class="h-4 w-4"></i>Save profile</button>
        </form>
        <div class="mt-6"><h3 class="font-display text-lg font-extrabold">Recent bookings</h3><div class="mt-3 grid gap-3">${bookingList(state.myBookings)}</div></div>
      </div>
    </div>
  `;
  bindProfileActions();
  iconsReady();
}

async function saveAccountProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const raw = String(form.get('phone') || '').trim();
  const phone = raw ? toIndiaPhone(raw) : null;
  if (raw && !phone) return showToast('Valid Indian mobile number enter karein.', 'error');
  const update = {
    name: String(form.get('name') || '').trim(),
    phone,
    city: 'Lucknow',
    area: String(form.get('area') || state.selectedArea),
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
      <img src="${escapeHTML(worker.photo_url || 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=240&h=240&fit=crop')}" class="h-20 w-20 rounded-2xl object-cover" alt="${escapeHTML(worker.name)}">
      <div><h3 class="font-display text-2xl font-extrabold">${escapeHTML(worker.name)}</h3><p class="font-semibold text-brand">${escapeHTML(worker.category)} - ${escapeHTML(worker.area || worker.city || 'Lucknow')}</p><p class="mt-2 text-sm leading-6 text-slate-600">${escapeHTML(worker.bio)}</p></div>
    </div>
    <div class="mt-6 grid gap-3 sm:grid-cols-3"><div class="rounded-xl bg-soft p-4"><b>${Number(worker.rating || 4.7).toFixed(1)}</b><p class="text-xs text-slate-500">Average rating</p></div><div class="rounded-xl bg-soft p-4"><b>${escapeHTML(worker.status || 'approved')}</b><p class="text-xs text-slate-500">Verification</p></div><div class="rounded-xl bg-soft p-4"><b>${escapeHTML(worker.availability_status || 'Flexible')}</b><p class="text-xs text-slate-500">Availability</p></div></div>
    <div class="mt-6 rounded-xl bg-shell p-4"><div class="text-sm font-bold">Reviews</div>${reviews.length ? reviews.map((review) => `<div class="mt-3 border-t border-line pt-3 text-sm"><div class="font-bold">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div><p class="text-slate-600">${escapeHTML(review.comment || 'No comment')}</p></div>`).join('') : '<p class="mt-2 text-sm text-slate-500">Reviews launch ke baad yahan dikhenge.</p>'}</div>
    <button class="btn-primary mt-6 w-full" data-book="${worker.id}"><i data-lucide="calendar-check" class="h-4 w-4"></i>Book this professional</button>
  `;
  $('#profileContent [data-book]').addEventListener('click', () => {
    $('#profileModal').close();
    openBooking(worker.id);
  });
  $('#profileModal').showModal();
  iconsReady();
}

function openBooking(workerId = '') {
  const worker = state.workers.find((item) => item.id === workerId) || null;
  state.bookingWorker = worker;
  $('#bookingWorkerId').value = worker?.id || '';
  $('#bookingTitle').textContent = worker ? `Book ${worker.name}` : 'Book a service';
  $('#bookingService').value = worker?.category || state.selectedService || services[0].name;
  $('#bookingArea').value = worker?.area || state.selectedArea || 'Gomti Nagar';
  updateBookingPriceHint();
  $('#bookingModal').showModal();
}

async function submitBooking(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  if (!state.session) {
    $('#bookingModal').close();
    openAuth('login');
    return showToast('Booking ke liye login zaroori hai.', 'error');
  }
  const form = new FormData(event.currentTarget);
  const serviceName = String(form.get('service') || '').trim();
  const area = String(form.get('area') || '').trim();
  const address = String(form.get('address') || '').trim();
  const scheduledDate = String(form.get('scheduled_date') || '');
  const notes = String(form.get('notes') || '').trim();
  if (!serviceName || !area || !address || !scheduledDate) return showToast('Service, area, address aur date/time required hai.', 'error');
  const category = state.categories.find((item) => item.name === serviceName);
  const autoWorker = state.bookingWorker || state.workers.find((worker) => worker.category === serviceName && (worker.area === area || String(worker.service_areas || '').includes(area)));
  const estimated = priceNumber(serviceName);
  const payload = {
    user_id: state.session.user.id,
    worker_id: autoWorker?.id || null,
    category_id: category?.id || null,
    status: autoWorker ? 'assigned' : 'pending',
    amount: estimated,
    scheduled_date: new Date(scheduledDate).toISOString(),
    city: 'Lucknow',
    area,
    address,
    notes,
    service_name: serviceName,
    payment_status: 'cash_on_service'
  };
  const { error } = await supabase.from('bookings').insert(payload);
  if (error) return showToast(error.message, 'error');
  $('#bookingModal').close();
  event.currentTarget.reset();
  showToast(autoWorker ? 'Booking created and worker assigned.' : 'Booking request created. Admin assignment pending.');
}

async function updateBookingStatus(id, status) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast(`Booking ${status.replaceAll('_', ' ')}.`);
  await loadAccountData();
  route();
}

async function cancelBooking(id) {
  await updateBookingStatus(id, 'cancelled');
}

function bindHome() {
  $('#heroSearchBtn')?.addEventListener('click', () => {
    const term = $('#heroSearch').value.trim();
    state.selectedArea = $('#heroArea').value;
    state.selectedService = services.find((service) => service.name.toLowerCase().includes(term.toLowerCase()))?.name || term || '';
    openBooking();
  });
  $('#heroArea')?.addEventListener('change', (event) => {
    state.selectedArea = event.target.value;
  });
  $('#areaFilter')?.addEventListener('change', (event) => {
    state.selectedArea = event.target.value;
    renderWorkers(state.workers);
  });
  $('#workerSearch')?.addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    loadWorkers();
  });
  $('#resetFilters')?.addEventListener('click', () => {
    state.search = '';
    state.selectedArea = 'Gomti Nagar';
    $('#workerSearch').value = '';
    $('#areaFilter').value = state.selectedArea;
    loadWorkers();
  });
  bindBookingButtons();
}

function bindAppLinks() {
  document.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      history.pushState(null, '', link.getAttribute('href'));
      route();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  document.querySelectorAll('[data-open-login]').forEach((button) => button.addEventListener('click', () => openAuth('login')));
  document.querySelectorAll('[data-open-account]').forEach((button) => button.addEventListener('click', openAccountProfile));
  document.querySelectorAll('[data-open-signup-worker]').forEach((button) => button.addEventListener('click', () => openAuth('signup', 'worker')));
  bindBookingButtons();
}

function bindBookingButtons() {
  document.querySelectorAll('[data-open-booking]').forEach((button) => button.addEventListener('click', () => openBooking()));
  document.querySelectorAll('[data-book-service]').forEach((button) => button.addEventListener('click', () => {
    state.selectedService = button.dataset.bookService;
    openBooking();
  }));
}

function bindWorkerButtons() {
  document.querySelectorAll('[data-profile]').forEach((btn) => btn.addEventListener('click', () => openWorkerProfile(btn.dataset.profile)));
  document.querySelectorAll('[data-book]').forEach((btn) => btn.addEventListener('click', () => openBooking(btn.dataset.book)));
}

function bindProfileActions() {
  $('#accountForm')?.addEventListener('submit', saveAccountProfile);
  document.querySelectorAll('[data-open-account]').forEach((button) => button.addEventListener('click', openAccountProfile));
  bindBookingStatusActions();
}

function bindBookingStatusActions() {
  document.querySelectorAll('[data-cancel-booking]').forEach((button) => button.addEventListener('click', () => cancelBooking(button.dataset.cancelBooking)));
  document.querySelectorAll('[data-worker-status]').forEach((button) => button.addEventListener('click', () => updateBookingStatus(button.dataset.workerStatus, button.dataset.status)));
}

function bindGlobal() {
  $('#authForm')?.addEventListener('submit', handleAuthSubmit);
  $('#loginTab')?.addEventListener('click', () => setAuthMode('login'));
  $('#signupTab')?.addEventListener('click', () => setAuthMode('signup'));
  $('#forgotPasswordBtn')?.addEventListener('click', () => setAuthMode('forgot'));
  document.querySelectorAll('input[name="role"]').forEach((input) => input.addEventListener('change', syncRoleDetails));
  $('#bookingForm')?.addEventListener('submit', submitBooking);
  $('#bookingService')?.addEventListener('change', updateBookingPriceHint);
  document.addEventListener('submit', (event) => {
    if (event.target?.id === 'contactForm') submitContact(event);
  });
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(button.dataset.close)?.close()));
  window.addEventListener('popstate', route);
  supabase?.auth.onAuthStateChange((event, session) => {
    state.passwordRecovery = event === 'PASSWORD_RECOVERY';
    state.session = session;
    if (event === 'PASSWORD_RECOVERY') {
      openAuth('reset');
    }
  });
}

function route() {
  const path = currentPath();
  const parts = path.split('/').filter(Boolean);
  if (path === '/') return renderHome();
  if (path === '/services') return renderServicesPage();
  if (parts[0] === 'services' && parts.length === 2) return renderServiceDetail(parts[1]);
  if (parts[0] === 'services' && parts.length === 3) return renderServiceAreaPage(parts[1], parts[2]);
  if (parts[0] === 'areas') return renderAreaPage(parts[1]);
  if (path === '/dashboard') return renderDashboardPage('customer');
  if (path === '/worker/dashboard') return renderDashboardPage('worker');
  if (path === '/bookings') return renderBookingsPage();
  if (['about', 'contact', 'privacy-policy', 'terms-and-conditions', 'refund-cancellation-policy', 'blog'].includes(parts[0])) return renderTextPage(parts[0]);
  renderHome();
}

function areaOptions(selected = state.selectedArea) {
  return lucknowAreas.map((area) => `<option value="${escapeHTML(area)}" ${area === selected ? 'selected' : ''}>${escapeHTML(area)}</option>`).join('');
}

function serviceOptions() {
  return services.map((service) => `<option value="${escapeHTML(service.name)}">${escapeHTML(service.name)} - ${escapeHTML(service.price)}</option>`).join('');
}

function populateStaticOptions() {
  $('#authLocality').innerHTML = areaOptions();
  $('#authCategory').innerHTML = '<option value="">Select service category</option>' + services.map((service) => `<option value="${escapeHTML(service.name)}">${escapeHTML(service.name)}</option>`).join('');
  $('#bookingArea').innerHTML = areaOptions();
  $('#bookingService').innerHTML = serviceOptions();
}

function updateBookingPriceHint() {
  const service = services.find((item) => item.name === $('#bookingService')?.value);
  $('#bookingPriceHint').textContent = service ? `${service.price}. Payment status: Cash on service. Online Razorpay placeholder available for future integration.` : 'Cash on service / unpaid request for now.';
}

function slugify(value = '') {
  return String(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getInitials(name = '') {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'KN';
}

function validatePassword(password) {
  if (password.length < 8) return 'Password kam se kam 8 characters ka hona chahiye.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password me letters aur numbers dono hone chahiye.';
  return '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function workerSkeletons() {
  return Array.from({ length: 3 }, () => `<div class="card p-5"><div class="skeleton h-16 w-16 rounded-2xl"></div><div class="mt-4 skeleton h-5 w-2/3 rounded"></div><div class="mt-2 skeleton h-4 w-full rounded"></div><div class="mt-4 skeleton h-10 w-full rounded-xl"></div></div>`).join('');
}

function priceNumber(serviceName) {
  const text = services.find((item) => item.name === serviceName)?.price || 'Rs. 499';
  return Number((text.match(/\d+/) || ['499'])[0]);
}

function breadcrumb(items) {
  return `<nav class="text-sm font-semibold text-slate-500">${items.map((item, index) => index === items.length - 1 ? `<span class="text-ink">${item}</span>` : `<span>${item}</span><span class="mx-2">/</span>`).join('')}</nav>`;
}

function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } }))
  };
}

function serviceSchema(service) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${service.name} in Lucknow`,
    description: service.description,
    areaServed: 'Lucknow',
    provider: { '@type': 'LocalBusiness', name: brand.name }
  };
}

async function init() {
  bindGlobal();
  populateStaticOptions();
  await loadSession();
  route();
}

async function submitContact(event) {
  event.preventDefault();
  if (!requireSupabase(supabase)) return;
  const form = new FormData(event.currentTarget);
  const payload = {
    name: String(form.get('name') || '').trim(),
    email: String(form.get('email') || '').trim().toLowerCase(),
    mobile: String(form.get('mobile') || '').trim() || null,
    message: String(form.get('message') || '').trim()
  };
  if (payload.name.length < 2 || !isValidEmail(payload.email) || payload.message.length < 10) {
    return showToast('Name, valid email aur message required hai.', 'error');
  }
  const { error } = await supabase.from('contact_queries').insert(payload);
  if (error) return showToast(error.message, 'error');
  event.currentTarget.reset();
  showToast('Query received. Support team follow up karegi.');
}

init();
