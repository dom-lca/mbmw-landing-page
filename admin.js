import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.__SUPABASE_URL__ || '';
// Publishable key — safe to expose. RLS restricts SELECT on coverage_leads
// to users with role='sysAdmin' in public.users.
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mbmw-admin-auth' }
});

const authScreen = document.getElementById('auth-screen');
const dashScreen = document.getElementById('dash-screen');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const dashEmail = document.getElementById('dash-email');
const leadsBody = document.getElementById('leads-body');

function showAuth() {
  authScreen.hidden = false;
  dashScreen.hidden = true;
}
function showDash(user) {
  authScreen.hidden = true;
  dashScreen.hidden = false;
  dashEmail.textContent = user?.email || '';
  loadLeads();
}

async function loadLeads() {
  leadsBody.innerHTML = '<tr><td colspan="5" class="dash-empty">Loading…</td></tr>';
  const { data, error } = await supabase
    .from('coverage_leads')
    .select('id, created_at, full_name, email, phone, insurance_provider')
    .order('created_at', { ascending: false });

  if (error) {
    leadsBody.innerHTML = `<tr><td colspan="5" class="dash-empty">Couldn't load leads: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data || data.length === 0) {
    leadsBody.innerHTML = '<tr><td colspan="5" class="dash-empty">No submissions yet.</td></tr>';
    return;
  }
  leadsBody.innerHTML = data.map(row => `
    <tr>
      <td>${formatDate(row.created_at)}</td>
      <td>${escapeHtml(row.full_name || '')}</td>
      <td>${escapeHtml(row.email || '')}</td>
      <td>${escapeHtml(row.phone || '')}</td>
      <td>${escapeHtml(row.insurance_provider || '')}</td>
    </tr>
  `).join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  const fd = new FormData(loginForm);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: fd.get('email'),
    password: fd.get('password')
  });
  loginBtn.disabled = false;
  loginBtn.textContent = 'Sign in';
  if (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
    return;
  }
  showDash(data.user);
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showAuth();
});

// Boot
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) showDash(data.session.user);
  else showAuth();
})();
