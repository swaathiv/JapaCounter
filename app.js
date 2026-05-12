// =============================================
// Japa Tracker - App Logic (Multi-Japa)
// =============================================

// -------- SUPABASE CONFIG --------
const SUPABASE_URL = 'https://lpchdzhgtvmplhzyoies.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2WI_B0OkGgK8yGAeoYJEjQ_nADe_EX-';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------- STATE --------
let currentUser = null;
let profile = null;
let japas = [];            // all japa types for this user
let selectedJapaId = null; // currently selected japa
let allEntries = [];       // entries for selected japa
let entriesPage = 0;
const ENTRIES_PER_PAGE = 20;

// -------- DOM REFS --------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {
  loading: $('#loading'),
  auth: $('#auth-screen'),
  setup: $('#setup-screen'),
  dashboard: $('#dashboard'),
};

// -------- SCREEN MANAGEMENT --------
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// -------- BOTTOM NAV TAB SWITCHING --------
$$('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.nav-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.tab-content').forEach((tc) => tc.classList.remove('active'));
    $('#' + tab.dataset.tab).classList.add('active');
  });
});

// -------- AUTH --------
$$('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    $('#login-form').style.display = isLogin ? 'flex' : 'none';
    $('#signup-form').style.display = isLogin ? 'none' : 'flex';
    $('#auth-message').textContent = '';
  });
});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  $('#auth-message').textContent = '';

  const { error } = await db.auth.signInWithPassword({
    email: $('#login-email').value.trim(),
    password: $('#login-password').value,
  });

  btn.disabled = false;
  if (error) {
    $('#auth-message').textContent = error.message;
  }
});

$('#signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  $('#auth-message').textContent = '';

  const { error } = await db.auth.signUp({
    email: $('#signup-email').value.trim(),
    password: $('#signup-password').value,
  });

  btn.disabled = false;
  if (error) {
    $('#auth-message').textContent = error.message;
  } else {
    $('#auth-message').textContent = 'Check your email to confirm your account!';
    $('#auth-message').classList.add('success');
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await db.auth.signOut();
});

// ======================================================
// SETUP (first login — creates profile + first japa)
// ======================================================
$('#setup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  $('#setup-message').textContent = '';

  const name = $('#setup-name').value.trim();
  const japaName = $('#setup-japa-name').value.trim();
  const target = parseInt($('#setup-target').value, 10);

  // Create profile
  const { error: profileErr } = await db.from('profiles').insert({
    id: currentUser.id,
    name,
  });

  if (profileErr) {
    btn.disabled = false;
    $('#setup-message').textContent = profileErr.message;
    return;
  }

  // Create first japa
  const { data: japaData, error: japaErr } = await db
    .from('japas')
    .insert({ user_id: currentUser.id, name: japaName, target })
    .select()
    .single();

  btn.disabled = false;
  if (japaErr) {
    $('#setup-message').textContent = japaErr.message;
    return;
  }

  profile = { name };
  japas = [japaData];
  selectedJapaId = japaData.id;
  initDashboard();
});

// ======================================================
// JAPA SELECTOR
// ======================================================
function renderJapaSelector() {
  const sel = $('#japa-select');
  sel.innerHTML = japas
    .map((j) => `<option value="${j.id}" ${j.id === selectedJapaId ? 'selected' : ''}>${j.name}</option>`)
    .join('');
}

$('#japa-select').addEventListener('change', async (e) => {
  selectedJapaId = e.target.value;
  await loadEntriesForSelectedJapa();
  entriesPage = 0;
  renderDashboard();
});

// ======================================================
// SETTINGS
// ======================================================
$('#settings-btn').addEventListener('click', () => {
  $('#settings-name').value = profile.name;
  renderJapasList();
  $('#settings-modal').classList.add('active');
});

$('#settings-close').addEventListener('click', () => {
  $('#settings-modal').classList.remove('active');
});

// Save profile name
$('#settings-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#settings-name').value.trim();

  const { error } = await db
    .from('profiles')
    .update({ name })
    .eq('id', currentUser.id);

  if (error) {
    alert('Error updating name: ' + error.message);
  } else {
    profile.name = name;
    $('#user-name').textContent = name;
    $('#greeting-name').textContent = name;
  }
});

// Render japas list in settings
function renderJapasList() {
  const container = $('#japas-list');
  container.innerHTML = japas
    .map(
      (j) => `
    <div class="japa-item" data-id="${j.id}">
      <div class="japa-item-info">
        <div class="japa-item-name">${j.name}</div>
        <div class="japa-item-target">Target: ${j.target.toLocaleString()}</div>
      </div>
      <button class="japa-edit-btn" title="Edit">&#9998;</button>
    </div>`
    )
    .join('');

  container.querySelectorAll('.japa-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.japa-item').dataset.id;
      const japa = japas.find((j) => j.id === id);
      if (japa) openEditJapaModal(japa);
    });
  });
}

// Add new japa
$('#add-new-japa-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#new-japa-name').value.trim();
  const target = parseInt($('#new-japa-target').value, 10);

  const { data, error } = await db
    .from('japas')
    .insert({ user_id: currentUser.id, name, target })
    .select()
    .single();

  if (error) {
    alert('Error adding japa: ' + error.message);
  } else {
    japas.push(data);
    $('#new-japa-name').value = '';
    $('#new-japa-target').value = '';
    renderJapasList();
    renderJapaSelector();
  }
});

// ======================================================
// EDIT JAPA MODAL
// ======================================================
function openEditJapaModal(japa) {
  $('#edit-japa-id').value = japa.id;
  $('#edit-japa-name').value = japa.name;
  $('#edit-japa-target').value = japa.target;
  // Only allow delete if more than 1 japa
  $('#edit-japa-delete').style.display = japas.length > 1 ? 'inline-block' : 'none';
  $('#edit-japa-modal').classList.add('active');
}

$('#edit-japa-cancel').addEventListener('click', () => {
  $('#edit-japa-modal').classList.remove('active');
});

$('#edit-japa-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#edit-japa-id').value;
  const name = $('#edit-japa-name').value.trim();
  const target = parseInt($('#edit-japa-target').value, 10);

  const { error } = await db
    .from('japas')
    .update({ name, target })
    .eq('id', id);

  if (error) {
    alert('Error updating japa: ' + error.message);
  } else {
    const idx = japas.findIndex((j) => j.id === id);
    if (idx !== -1) {
      japas[idx].name = name;
      japas[idx].target = target;
    }
    $('#edit-japa-modal').classList.remove('active');
    renderJapasList();
    renderJapaSelector();
    renderDashboard();
  }
});

$('#edit-japa-delete').addEventListener('click', async () => {
  const id = $('#edit-japa-id').value;
  if (japas.length <= 1) {
    alert('You must have at least one japa.');
    return;
  }
  if (!confirm('Delete this japa and all its entries? This cannot be undone.')) return;

  const { error } = await db.from('japas').delete().eq('id', id);

  if (error) {
    alert('Error deleting japa: ' + error.message);
  } else {
    japas = japas.filter((j) => j.id !== id);
    if (selectedJapaId === id) {
      selectedJapaId = japas[0].id;
      await loadEntriesForSelectedJapa();
    }
    $('#edit-japa-modal').classList.remove('active');
    renderJapasList();
    renderJapaSelector();
    renderDashboard();
  }
});

// ======================================================
// ADD JAPA ENTRY
// ======================================================
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  $('#japa-date').value = today;
}

$('#add-japa-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const count = parseInt($('#japa-input').value, 10);
  const entryDate = $('#japa-date').value;
  if (!count || count < 1) return;

  const btn = e.target.querySelector('button');
  btn.disabled = true;

  const { data, error } = await db
    .from('japa_entries')
    .insert({
      user_id: currentUser.id,
      japa_id: selectedJapaId,
      count,
      entry_date: entryDate,
    })
    .select()
    .single();

  btn.disabled = false;
  if (error) {
    alert('Error adding entry: ' + error.message);
  } else {
    allEntries.unshift(data);
    $('#japa-input').value = '';
    renderDashboard();
  }
});

// ======================================================
// EDIT ENTRY
// ======================================================
function openEditModal(entry) {
  $('#edit-id').value = entry.id;
  $('#edit-count').value = entry.count;
  $('#edit-date').value = entry.entry_date;
  $('#edit-modal').classList.add('active');
}

$('#edit-cancel').addEventListener('click', () => {
  $('#edit-modal').classList.remove('active');
});

$('#edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#edit-id').value;
  const count = parseInt($('#edit-count').value, 10);
  const entryDate = $('#edit-date').value;

  const { error } = await db
    .from('japa_entries')
    .update({ count, entry_date: entryDate })
    .eq('id', id);

  if (error) {
    alert('Error updating entry: ' + error.message);
  } else {
    const idx = allEntries.findIndex((e) => e.id === id);
    if (idx !== -1) {
      allEntries[idx].count = count;
      allEntries[idx].entry_date = entryDate;
    }
    $('#edit-modal').classList.remove('active');
    renderDashboard();
  }
});

$('#edit-delete').addEventListener('click', async () => {
  const id = $('#edit-id').value;
  if (!confirm('Delete this entry?')) return;

  const { error } = await db.from('japa_entries').delete().eq('id', id);

  if (error) {
    alert('Error deleting entry: ' + error.message);
  } else {
    allEntries = allEntries.filter((e) => e.id !== id);
    $('#edit-modal').classList.remove('active');
    renderDashboard();
  }
});

// ======================================================
// LOAD DATA
// ======================================================
async function loadJapas() {
  const { data, error } = await db
    .from('japas')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading japas:', error);
    return;
  }
  japas = data || [];
  if (japas.length > 0 && !selectedJapaId) {
    selectedJapaId = japas[0].id;
  }
}

async function loadEntriesForSelectedJapa() {
  const { data, error } = await db
    .from('japa_entries')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('japa_id', selectedJapaId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading entries:', error);
    return;
  }
  allEntries = data || [];
}

// ======================================================
// STATS CALCULATIONS
// ======================================================
function getSelectedJapa() {
  return japas.find((j) => j.id === selectedJapaId);
}

function calcStats() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const byDate = {};
  let grandTotal = 0;

  allEntries.forEach((e) => {
    byDate[e.entry_date] = (byDate[e.entry_date] || 0) + e.count;
    grandTotal += e.count;
  });

  const todayTotal = byDate[todayStr] || 0;

  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const mondayStr = monday.toISOString().split('T')[0];

  let weekTotal = 0;
  Object.entries(byDate).forEach(([date, total]) => {
    if (date >= mondayStr && date <= todayStr) weekTotal += total;
  });

  const monthStart = todayStr.slice(0, 7) + '-01';
  let monthTotal = 0;
  Object.entries(byDate).forEach(([date, total]) => {
    if (date >= monthStart && date <= todayStr) monthTotal += total;
  });

  const datesWithEntries = Object.keys(byDate);
  const avgPerDay =
    datesWithEntries.length > 0
      ? Math.round(grandTotal / datesWithEntries.length)
      : 0;

  let bestDay = { date: '-', total: 0 };
  Object.entries(byDate).forEach(([date, total]) => {
    if (total > bestDay.total) bestDay = { date, total };
  });

  const sortedDates = datesWithEntries.sort().reverse();
  let streak = 0;
  const checkDate = new Date(today);
  if (sortedDates.length > 0 && sortedDates[0] !== todayStr) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (sortedDates[0] !== yesterdayStr) {
      streak = 0;
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
      streak = calcStreak(sortedDates, checkDate);
    }
  } else if (sortedDates.length > 0) {
    streak = calcStreak(sortedDates, checkDate);
  }

  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  Object.entries(byDate).forEach(([date, total]) => {
    const d = new Date(date + 'T00:00:00');
    const dow = d.getDay();
    dowTotals[dow] += total;
    dowCounts[dow] += 1;
  });

  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let bestDow = '-';
  let bestDowAvg = 0;
  dowTotals.forEach((total, i) => {
    if (dowCounts[i] > 0) {
      const avg = total / dowCounts[i];
      if (avg > bestDowAvg) {
        bestDowAvg = avg;
        bestDow = dowNames[i];
      }
    }
  });

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    last7.push({
      label: dowNames[d.getDay()],
      date: ds,
      total: byDate[ds] || 0,
    });
  }

  const monthlyTotals = [];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const prefix = d.toISOString().split('T')[0].slice(0, 7);
    let mTotal = 0;
    Object.entries(byDate).forEach(([date, total]) => {
      if (date.startsWith(prefix)) mTotal += total;
    });
    monthlyTotals.push({
      label: monthNames[d.getMonth()],
      total: mTotal,
    });
  }

  return {
    grandTotal, todayTotal, weekTotal, monthTotal,
    avgPerDay, bestDay, streak, bestDow, last7, monthlyTotals,
  };
}

function calcStreak(sortedDates, startDate) {
  let streak = 0;
  const dateSet = new Set(sortedDates);
  const d = new Date(startDate);
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (dateSet.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ======================================================
// RENDER
// ======================================================
function renderDashboard() {
  const stats = calcStats();
  const japa = getSelectedJapa();
  const target = japa ? japa.target : 1;

  $('#total-count').textContent = stats.grandTotal.toLocaleString();
  $('#target-count').textContent = target.toLocaleString();
  const pct = Math.min(100, (stats.grandTotal / target) * 100);
  $('#progress-bar').style.width = pct + '%';
  $('#progress-percent').textContent = pct.toFixed(1) + '%';

  $('#today-count').textContent = stats.todayTotal.toLocaleString();
  $('#greeting-name').textContent = profile.name;

  $('#stat-week').textContent = stats.weekTotal.toLocaleString();
  $('#stat-month').textContent = stats.monthTotal.toLocaleString();
  $('#stat-avg').textContent = stats.avgPerDay.toLocaleString();
  $('#stat-best').textContent = stats.bestDay.total.toLocaleString();
  $('#stat-best-date').textContent =
    stats.bestDay.date !== '-' ? formatDate(stats.bestDay.date) : '';
  $('#stat-streak').textContent = stats.streak;
  $('#stat-best-dow').textContent = stats.bestDow;

  renderBarChart('#weekly-chart', stats.last7);
  renderBarChart('#monthly-chart', stats.monthlyTotals);
  renderEntries();
}

function renderBarChart(selector, data) {
  const container = $(selector);
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  container.innerHTML = data
    .map(
      (d) => `
    <div class="bar-col">
      <span class="bar-value">${d.total > 0 ? d.total.toLocaleString() : ''}</span>
      <div class="bar" style="height: ${(d.total / maxVal) * 100}%"></div>
      <span class="bar-label">${d.label}</span>
    </div>`
    )
    .join('');
}

function renderEntries() {
  const byDate = {};
  allEntries.forEach((e) => {
    if (!byDate[e.entry_date]) {
      byDate[e.entry_date] = { total: 0, entries: [] };
    }
    byDate[e.entry_date].total += e.count;
    byDate[e.entry_date].entries.push(e);
  });

  const sortedDates = Object.keys(byDate).sort().reverse();
  const paginated = sortedDates.slice(0, (entriesPage + 1) * ENTRIES_PER_PAGE);

  const tbody = $('#entries-body');
  tbody.innerHTML = '';

  paginated.forEach((date) => {
    const group = byDate[date];
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <td style="font-weight:600; padding-top:14px">${formatDate(date)}</td>
      <td style="font-weight:600; padding-top:14px; color:var(--primary)">${group.total.toLocaleString()} total</td>
      <td style="padding-top:14px"></td>`;
    tbody.appendChild(headerRow);

    group.entries.forEach((entry) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="color:var(--text-light); font-size:0.85rem; padding-left:16px">
          ${formatTime(entry.created_at)}
        </td>
        <td>${entry.count.toLocaleString()}</td>
        <td class="entry-actions">
          <button class="btn-edit" title="Edit">&#9998;</button>
          <button class="btn-del" title="Delete">&times;</button>
        </td>`;

      row.querySelector('.btn-edit').addEventListener('click', () => openEditModal(entry));
      row.querySelector('.btn-del').addEventListener('click', async () => {
        if (!confirm('Delete this entry?')) return;
        const { error } = await db.from('japa_entries').delete().eq('id', entry.id);
        if (!error) {
          allEntries = allEntries.filter((e) => e.id !== entry.id);
          renderDashboard();
        }
      });

      tbody.appendChild(row);
    });
  });

  const loadMoreBtn = $('#load-more-btn');
  if (sortedDates.length > (entriesPage + 1) * ENTRIES_PER_PAGE) {
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.onclick = () => {
      entriesPage++;
      renderEntries();
    };
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// ======================================================
// HELPERS
// ======================================================
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timestampStr) {
  const d = new Date(timestampStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ======================================================
// INIT
// ======================================================
async function initDashboard() {
  showScreen('dashboard');
  $('#user-name').textContent = profile.name;
  setDefaultDate();
  renderJapaSelector();
  await loadEntriesForSelectedJapa();
  entriesPage = 0;
  renderDashboard();
}

async function handleAuthChange(session) {
  if (!session) {
    currentUser = null;
    profile = null;
    japas = [];
    selectedJapaId = null;
    showScreen('auth');
    return;
  }

  currentUser = session.user;

  // Check if profile exists
  const { data: profileData } = await db
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (profileData) {
    profile = profileData;
    await loadJapas();
    initDashboard();
  } else {
    showScreen('setup');
  }
}

db.auth.onAuthStateChange((_event, session) => {
  handleAuthChange(session);
});

db.auth.getSession().then(({ data: { session } }) => {
  handleAuthChange(session);
});
