import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    writeBatch,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getFunctions, 
    httpsCallable 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

const firebaseConfig = {
    apiKey: "AIzaSyBR74UHgCmayg_0WKmoCD_lqACU2GRu3Ak",
    authDomain: "global-email-script.firebaseapp.com",
    projectId: "global-email-script",
    storageBucket: "global-email-script.firebasestorage.app",
    messagingSenderId: "868325182303",
    appId: "1:868325182303:web:936828c9461c3f9839c4ea"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const dashboardTab = document.getElementById('dashboardTab');
const kontaktyTab = document.getElementById('kontaktyTab');
const settingsTab = document.getElementById('settingsTab');
const radyTab = document.getElementById('radyTab');
const blacklistTab = document.getElementById('blacklistTab');
const dashboardSection = document.getElementById('dashboardSection');
const kontaktySection = document.getElementById('kontaktySection');
const settingsSection = document.getElementById('settingsSection');
const radySection = document.getElementById('radySection');
const blacklistSection = document.getElementById('blacklistSection');

const statSentToday = document.getElementById('statSentToday');
const statRemaining = document.getElementById('statRemaining');
const statErrors = document.getElementById('statErrors');
const statTotal = document.getElementById('statTotal');
const dailyLimit = document.getElementById('dailyLimit');

const contactsTable = document.getElementById('contactsTable');
const addContactForm = document.getElementById('addContactForm');
const csvFile = document.getElementById('csvFile');
const csvFileName = document.getElementById('csvFileName');
const importBtn = document.getElementById('importBtn');
const refreshContacts = document.getElementById('refreshContacts');



const smtpForm = document.getElementById('smtpForm');
const settingsSuccess = document.getElementById('settingsSuccess');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        loadDashboard();
        loadReporting();
        loadResendStatus();
        loadContacts();
        loadSettings();
    } else {
        currentUser = null;
        loginScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.classList.add('hidden');
    } catch (error) {
        loginError.textContent = 'Nesprávne prihlasovacie údaje';
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

// Campaign control
const startCampaignBtn = document.getElementById('startCampaignBtn');
const stopCampaignBtn = document.getElementById('stopCampaignBtn');
const campaignStatusText = document.getElementById('campaignStatusText');
const campaignMessage = document.getElementById('campaignMessage');

// Load campaign status
async function loadCampaignStatus() {
    try {
        const getCampaignStatus = httpsCallable(functions, 'getCampaignStatus');
        const result = await getCampaignStatus();
        const status = result.data;
        
        updateCampaignUI(status.active);
    } catch (error) {
        console.error('Error loading campaign status:', error);
        // If error, assume campaign is not active (show as paused)
        updateCampaignUI(false);
    }
}

function updateCampaignUI(active) {
    if (active) {
        campaignStatusText.innerHTML = '<span class="text-green-300 font-bold">🟢 AKTÍVNA</span>';
        startCampaignBtn.classList.add('hidden');
        stopCampaignBtn.classList.remove('hidden');
    } else {
        campaignStatusText.innerHTML = '<span class="text-yellow-300 font-bold">⏸️ POZASTAVENÁ</span>';
        startCampaignBtn.classList.remove('hidden');
        stopCampaignBtn.classList.add('hidden');
    }
}

startCampaignBtn.addEventListener('click', async () => {
    if (!confirm('Naozaj chcete spustiť kampaň? Emaily sa začnú automaticky odosielať podľa nastaveného schedulera.')) {
        return;
    }
    
    startCampaignBtn.disabled = true;
    startCampaignBtn.innerHTML = '<div class="loader"></div><span>Spúšťam...</span>';
    
    try {
        const toggleCampaign = httpsCallable(functions, 'toggleCampaign');
        const result = await toggleCampaign({ action: 'start' });
        const data = result.data;
        
        updateCampaignUI(true);

        // Reset end-notification flag so it fires again for the new campaign run
        try {
            await updateDoc(doc(db, 'settings', 'campaign'), { endNotificationSent: false });
        } catch (_) { /* ignore if field doesn't exist yet */ }

        campaignMessage.className = 'mt-4 p-3 rounded-lg text-sm bg-green-500/90 text-white';
        campaignMessage.innerHTML = `
            <div class="flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>Úspech!</strong> ${data.message}</span>
            </div>
        `;
        campaignMessage.classList.remove('hidden');
        
        setTimeout(() => campaignMessage.classList.add('hidden'), 5000);
        
    } catch (error) {
        console.error('Error starting campaign:', error);
        showCampaignError(error.message);
    } finally {
        startCampaignBtn.disabled = false;
        startCampaignBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Začať kampaň</span>
        `;
    }
});

stopCampaignBtn.addEventListener('click', async () => {
    if (!confirm('Naozaj chcete zastaviť kampaň? Žiadne emaily sa nebudú odosielať, kým kampaň znova nespustíte.')) {
        return;
    }
    
    stopCampaignBtn.disabled = true;
    stopCampaignBtn.innerHTML = '<div class="loader"></div><span>Zastavujem...</span>';
    
    try {
        const toggleCampaign = httpsCallable(functions, 'toggleCampaign');
        const result = await toggleCampaign({ action: 'stop' });
        const data = result.data;
        
        updateCampaignUI(false);
        
        campaignMessage.className = 'mt-4 p-3 rounded-lg text-sm bg-yellow-500/90 text-white';
        campaignMessage.innerHTML = `
            <div class="flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span><strong>Zastavené!</strong> ${data.message}</span>
            </div>
        `;
        campaignMessage.classList.remove('hidden');
        
        setTimeout(() => campaignMessage.classList.add('hidden'), 5000);
        
    } catch (error) {
        console.error('Error stopping campaign:', error);
        showCampaignError(error.message);
    } finally {
        stopCampaignBtn.disabled = false;
        stopCampaignBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
            </svg>
            <span>Zastaviť kampaň</span>
        `;
    }
});

function showCampaignError(message) {
    campaignMessage.className = 'mt-4 p-3 rounded-lg text-sm bg-red-500/90 text-white';
    campaignMessage.innerHTML = `
        <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span><strong>Chyba:</strong> ${message}</span>
        </div>
    `;
    campaignMessage.classList.remove('hidden');
    setTimeout(() => campaignMessage.classList.add('hidden'), 5000);
}

dashboardTab.addEventListener('click', () => {
    switchTab('dashboard');
});

settingsTab.addEventListener('click', () => {
    switchTab('settings');
});

radyTab.addEventListener('click', () => {
    switchTab('rady');
});

blacklistTab.addEventListener('click', () => {
    switchTab('blacklist');
});

kontaktyTab.addEventListener('click', () => {
    switchTab('kontakty');
});

window.switchTab = function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('border-b-2', 'border-primary', 'text-gray-900');
        btn.classList.add('text-gray-500');
    });

    dashboardSection.classList.add('hidden');
    kontaktySection.classList.add('hidden');
    settingsSection.classList.add('hidden');
    radySection.classList.add('hidden');
    blacklistSection.classList.add('hidden');

    if (tab === 'dashboard') {
        dashboardTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        dashboardTab.classList.remove('text-gray-500');
        dashboardSection.classList.remove('hidden');
        loadDashboard();
        loadReporting();
        loadResendStatus();
    } else if (tab === 'kontakty') {
        kontaktyTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        kontaktyTab.classList.remove('text-gray-500');
        kontaktySection.classList.remove('hidden');
        loadContacts();
    } else if (tab === 'settings') {
        settingsTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        settingsTab.classList.remove('text-gray-500');
        settingsSection.classList.remove('hidden');
    } else if (tab === 'rady') {
        radyTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        radyTab.classList.remove('text-gray-500');
        radySection.classList.remove('hidden');
    } else if (tab === 'blacklist') {
        blacklistTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        blacklistTab.classList.remove('text-gray-500');
        blacklistSection.classList.remove('hidden');
        loadBlacklist();
    }
}

async function loadResendStatus() {
    try {
        const getResendStatus = httpsCallable(functions, 'getResendStatus');
        const result = await getResendStatus();
        const { domain, credit } = result.data;

        // Domain health
        const badge = document.getElementById('domainStatusBadge');
        const nameEl = document.getElementById('domainName');
        const statusText = document.getElementById('domainStatusText');
        if (nameEl) nameEl.textContent = domain.name || '—';
        const rep = (domain.reputation || '').toLowerCase();
        const statusMap = {
            healthy:  { label: '🟢 Healthy',  cls: 'bg-green-100 text-green-700' },
            low:      { label: '🟡 Low',       cls: 'bg-yellow-100 text-yellow-700' },
            critical: { label: '🔴 Critical',  cls: 'bg-red-100 text-red-700' },
        };
        const s = statusMap[rep] || { label: domain.reputation || '—', cls: 'bg-gray-100 text-gray-500' };
        if (badge) { badge.textContent = s.label; badge.className = `text-xs font-semibold px-2 py-1 rounded-full ${s.cls}`; }
        if (statusText) {
            const verified = domain.status === 'verified' ? 'Verified' : domain.status;
            statusText.textContent = `${verified} · Resend`;
        }

        // Monthly credit
        const sentMonth = credit.sentThisMonth || 0;
        const sentToday = credit.sentToday || 0;
        const monthlyLimit = credit.monthlyLimit || 3000;
        const remaining = monthlyLimit - sentMonth;
        const pct = Math.min(100, Math.round((sentMonth / monthlyLimit) * 100));

        const sentMonthEl = document.getElementById('creditSentMonth');
        const sentTodayEl = document.getElementById('creditSentToday');
        const remainingEl = document.getElementById('creditRemaining');
        const bar = document.getElementById('creditBar');

        if (sentMonthEl) sentMonthEl.textContent = sentMonth;
        if (sentTodayEl) sentTodayEl.textContent = sentToday;
        if (remainingEl) remainingEl.textContent = remaining;
        if (bar) {
            bar.style.width = pct + '%';
            bar.className = `h-2 rounded-full transition-all duration-500 ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'}`;
        }
    } catch (e) {
        console.error('loadResendStatus error:', e);
    }
}

async function loadReporting() {
    try {
        const getReportingStats = httpsCallable(functions, 'getReportingStats');
        const result = await getReportingStats();
        const s = result.data;

        // Summary cards
        document.getElementById('repTotalSent').textContent = s.totalSent;
        document.getElementById('repDelivered').textContent = s.delivered;

        const bounceEl = document.getElementById('repBounceRate');
        bounceEl.textContent = s.bounceRate !== null ? s.bounceRate + '%' : '—';
        bounceEl.className = 'text-3xl font-bold ' + (s.bounceRate > 2 ? 'text-red-600' : s.bounceRate > 0 ? 'text-yellow-500' : 'text-green-600');

        const delivEl = document.getElementById('repDeliveryRate');
        delivEl.textContent = s.deliveryRate !== null ? s.deliveryRate + '%' : '—';
        delivEl.className = 'text-3xl font-bold ' + (s.deliveryRate >= 95 ? 'text-green-600' : s.deliveryRate >= 85 ? 'text-yellow-500' : 'text-red-600');

        // Blacklist
        document.getElementById('repBlBounce').textContent = s.blacklist.bounce;
        document.getElementById('repBlComplaint').textContent = s.blacklist.complaint;
        document.getElementById('repBlManual').textContent = s.blacklist.manual;

        // 30-day chart
        const chartEl = document.getElementById('rep30DayChart');
        const labelsEl = document.getElementById('rep30DayLabels');
        chartEl.innerHTML = '';
        labelsEl.innerHTML = '';
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().slice(0, 10));
        }
        const maxVal = Math.max(...days.map(d => s.dailyActivity[d] || 0), 1);
        days.forEach((d, idx) => {
            const val = s.dailyActivity[d] || 0;
            const heightPct = Math.round((val / maxVal) * 100);
            const bar = document.createElement('div');
            bar.className = 'flex-1 rounded-t transition-all';
            bar.style.height = heightPct + '%';
            bar.style.minHeight = val > 0 ? '4px' : '2px';
            bar.style.backgroundColor = val > 0 ? '#6366f1' : '#e5e7eb';
            bar.title = `${d}: ${val} emailov`;
            chartEl.appendChild(bar);

            // Label každý 5. deň
            const lbl = document.createElement('div');
            lbl.className = 'flex-1 text-center overflow-hidden';
            lbl.style.fontSize = '9px';
            lbl.textContent = (idx % 5 === 0) ? d.slice(5) : '';
            labelsEl.appendChild(lbl);
        });

        // Reputation Watchdog table
        const tbody = document.getElementById('repSubjectTable');
        tbody.innerHTML = '';
        if (!s.subjects.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-xs text-gray-400">Žiadne dáta</td></tr>';
        } else {
            const avgSuccess = s.subjects.reduce((a, b) => a + (b.successRate || 0), 0) / s.subjects.length;
            s.subjects.forEach(sub => {
                const isWarning = sub.successRate !== null && sub.successRate < avgSuccess * 0.8 && sub.sent >= 3;
                const row = document.createElement('tr');
                row.className = isWarning ? 'bg-red-50' : '';
                const rateColor = sub.successRate === null ? 'text-gray-400' : sub.successRate >= 90 ? 'text-green-600' : sub.successRate >= 70 ? 'text-yellow-600' : 'text-red-600';
                row.innerHTML = `
                    <td class="py-2 pr-4 text-xs text-gray-700 max-w-xs truncate" title="${sub.subject}">
                        ${isWarning ? '⚠️ ' : ''}${sub.subject}
                    </td>
                    <td class="py-2 px-2 text-xs text-right text-gray-600">${sub.sent}</td>
                    <td class="py-2 px-2 text-xs text-right text-green-600">${sub.delivered}</td>
                    <td class="py-2 px-2 text-xs text-right text-red-500">${sub.bounced}</td>
                    <td class="py-2 pl-2 text-xs text-right font-semibold ${rateColor}">
                        ${sub.successRate !== null ? sub.successRate + '%' : '—'}
                    </td>`;
                tbody.appendChild(row);
            });
        }
    } catch (err) {
        console.error('Reporting error:', err);
    }
}

async function loadDashboard() {
    try {
        const getDashboardStats = httpsCallable(functions, 'getDashboardStats');
        const result = await getDashboardStats();
        const stats = result.data;
        
        statSentToday.textContent = stats.sentToday;
        statRemaining.textContent = stats.remainingContacts;
        statErrors.textContent = stats.errorsToday;
        statTotal.textContent = stats.totalContacts;
        dailyLimit.textContent = stats.dailyLimit;
        
        // Load campaign status
        await loadCampaignStatus();
        
        // Load total emails sent
        await loadTotalEmailsSent();

        // Load success rate
        await loadSuccessRate();
        
        // Load 7-day chart
        await load7DayChart();

        // Campaign ETA
        updateCampaignEta(stats.remainingContacts, stats.dailyLimit);

        // Scheduler health
        await loadSchedulerHealth();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadSchedulerHealth() {
    const dot = document.getElementById('schedulerHealthDot');
    const label = document.getElementById('schedulerHealthLabel');
    if (!dot || !label) return;
    try {
        const snap = await getDoc(doc(db, 'settings', 'schedulerHealth'));
        if (!snap.exists()) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0';
            label.textContent = 'Ešte nebežal';
            return;
        }
        const lastRun = snap.data().lastRun?.toDate();
        if (!lastRun) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0';
            label.textContent = 'Neznáme';
            return;
        }
        const now = new Date();
        const diffMin = Math.round((now - lastRun) / 60000);
        const timeStr = lastRun.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
        const isToday = lastRun.toDateString() === now.toDateString();
        const dateStr = isToday ? `dnes ${timeStr}` : lastRun.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' }) + ` ${timeStr}`;

        if (diffMin <= 35) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0';
            label.textContent = `Posledné spustenie: ${dateStr}`;
        } else if (diffMin <= 120) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0';
            label.textContent = `Posledné spustenie: ${dateStr} (${diffMin} min)`;
        } else {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0';
            label.textContent = `Posledné spustenie: ${dateStr} — možný problém`;
        }
    } catch (e) {
        console.error('schedulerHealth error', e);
    }
}

function updateCampaignEta(remaining, dailyLimit) {
    const el = document.getElementById('campaignEta');
    if (!el) return;
    const rem = parseInt(remaining) || 0;
    const lim = parseInt(dailyLimit) || 10;
    if (rem <= 0) {
        el.innerHTML = '🏁 Všetky kontakty odoslané';
        return;
    }
    const avgPerDay = Math.max(1, Math.round(lim / 2));
    const days = Math.ceil(rem / avgPerDay);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const dateStr = endDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' });
    el.innerHTML = `📅 Zostatok <strong>${rem}</strong> kontaktov — odhadovaný koniec okolo <strong>${dateStr}</strong> (~${days} dní)`;
}

async function loadTotalEmailsSent() {
    try {
        const sentContactsSnapshot = await getDocs(
            query(collection(db, 'contacts'), where('sent', '==', true))
        );
        const totalSent = sentContactsSnapshot.size;
        document.getElementById('totalEmailsSent').textContent = totalSent;
    } catch (error) {
        console.error('Error loading total emails:', error);
    }
}

async function loadSuccessRate() {
    try {
        const logsSnap = await getDocs(collection(db, 'email_logs'));
        const total = logsSnap.size;
        const successful = logsSnap.docs.filter(d => d.data().success === true).length;
        const el = document.getElementById('statSuccessRate');
        if (total === 0) {
            el.textContent = '—';
        } else {
            const pct = Math.round((successful / total) * 100);
            el.textContent = `${pct}%`;
            el.className = `text-3xl font-bold mt-2 ${pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : 'text-red-600'}`;
        }
    } catch (error) {
        console.error('Error loading success rate:', error);
    }
}

async function load7DayChart() {
    try {
        const days = [];
        const today = new Date();
        
        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            days.push({ date: dateStr, count: 0, label: date.getDate() });
        }
        
        // Get email logs
        const logsSnapshot = await getDocs(collection(db, 'email_logs'));
        logsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.success && data.date) {
                const dayIndex = days.findIndex(d => d.date === data.date);
                if (dayIndex !== -1) {
                    days[dayIndex].count++;
                }
            }
        });
        
        // Find max for scaling
        const maxCount = Math.max(...days.map(d => d.count), 5);
        
        // Update chart bars
        days.forEach((day, index) => {
            const bar = document.getElementById(`day${index}`);
            const label = document.getElementById(`day${index}Label`);
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            if (bar) {
                bar.style.height = height + '%';
                bar.title = `${day.count} emailov`;
            }
            
            if (label && index !== 6) {
                label.textContent = day.label;
            }
        });
    } catch (error) {
        console.error('Error loading 7-day chart:', error);
    }
}

// ─── Contacts filter + bulk state ─────────────────────────────────────────────
let allContactsCache = [];
let contactFilterState = 'all';
let contactSearchState = '';
let selectedContactIds = new Set();

function updateBulkBar() {
    const bar = document.getElementById('bulkActionBar');
    const countEl = document.getElementById('bulkCount');
    if (selectedContactIds.size > 0) {
        bar.classList.remove('hidden');
        countEl.textContent = `Vybraných: ${selectedContactIds.size}`;
    } else {
        bar.classList.add('hidden');
    }
    // Sync select-all checkbox state
    const allVisible = contactsTable.querySelectorAll('.contact-checkbox');
    const allChecked = allVisible.length > 0 && [...allVisible].every(cb => cb.checked);
    const selectAll = document.getElementById('selectAllContacts');
    if (selectAll) selectAll.checked = allChecked;
}

function renderContacts() {
    const search = contactSearchState.toLowerCase();
    const filter = contactFilterState;

    const filtered = allContactsCache.filter(({ contact }) => {
        const matchSearch = !search ||
            contact.name.toLowerCase().includes(search) ||
            contact.email.toLowerCase().includes(search);
        const matchFilter =
            filter === 'all' ||
            (filter === 'waiting'  && !contact.sent && !contact.handoff) ||
            (filter === 'sent'     && contact.sent && !contact.handoff) ||
            (filter === 'handoff'  && contact.handoff);
        return matchSearch && matchFilter;
    });

    const badge = document.getElementById('contactsCountBadge');
    badge.textContent = filtered.length < allContactsCache.length
        ? `(${filtered.length} z ${allContactsCache.length})`
        : `(${allContactsCache.length})`;

    contactsTable.innerHTML = '';
    if (filtered.length === 0) {
        contactsTable.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Žiadne kontakty nezodpovedajú filtru.</td></tr>`;
        return;
    }

    filtered.forEach(({ id, contact }) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition';

        let statusBadge;
        if (contact.handoff) {
            statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">✋ Riešim osobne</span>';
        } else if (contact.sent) {
            statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Odoslané</span>';
        } else {
            statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Čaká</span>';
        }

        const sentDate = contact.sentAt
            ? new Date(contact.sentAt.toDate()).toLocaleString('sk-SK')
            : '-';

        const handoffBtn = contact.handoff
            ? `<button onclick="releaseContact('${id}')" title="Vrátiť do automatickej fronty"
                       class="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition">
                   ↩️ Späť do fronty
               </button>`
            : `<button onclick="handoffContact('${id}', '${contact.email}')" title="EMIL prestane posielať automatické maily"
                       class="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition">
                   ✋ Riešim osobne
               </button>`;

        const noteEscaped = (contact.note || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const isChecked = selectedContactIds.has(id);
        row.innerHTML = `
            <td class="px-4 py-4 w-10">
                <input type="checkbox" data-id="${id}" data-email="${contact.email}"
                       class="contact-checkbox rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                       ${isChecked ? 'checked' : ''}>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">${contact.name}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${contact.email}</td>
            <td class="px-6 py-4 text-sm">${statusBadge}</td>
            <td class="px-4 py-3 text-sm min-w-48">
                <div class="flex items-center gap-1.5 group">
                    <input type="text"
                           value="${noteEscaped}"
                           placeholder="Pridať poznámku…"
                           onblur="saveNote('${id}', this.value)"
                           onkeydown="if(event.key==='Enter'){this.blur()}"
                           class="w-full px-2 py-1 text-xs text-gray-600 placeholder-gray-300 border border-transparent rounded-md
                                  hover:border-gray-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 focus:outline-none
                                  bg-transparent focus:bg-white transition">
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
                ${sentDate}
                ${contact.sent && contact.lastEmailBody
                    ? `<button onclick="showSentEmail('${id}')"
                               class="ml-1 text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2">
                           👁 zobraziť
                       </button>`
                    : ''}
            </td>
            <td class="px-6 py-4 text-sm">
                <div class="flex items-center gap-2">
                    ${handoffBtn}
                    <button onclick="blacklistContact('${id}', '${contact.email}')"
                            title="Pridať na blacklist a odstrániť z fronty"
                            class="px-2.5 py-1 text-xs font-medium rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition">
                        🚫 Blokovať
                    </button>
                    <button onclick="deleteContact('${id}')"
                            title="Odstrániť z fronty"
                            class="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">
                        🗑 Zmazať
                    </button>
                </div>
            </td>
        `;
        contactsTable.appendChild(row);
    });
}

async function loadContacts() {
    try {
        const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
        onSnapshot(q, (snapshot) => {
            allContactsCache = snapshot.docs.map(d => ({ id: d.id, contact: d.data() }));

            const total = snapshot.size;
            const remaining = snapshot.docs.filter(d => !d.data().sent).length;
            statTotal.textContent = total;
            statRemaining.textContent = remaining;

            if (snapshot.empty) {
                contactsTable.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Žiadne kontakty. Pridajte nový kontakt alebo importujte CSV.</td></tr>`;
                document.getElementById('contactsCountBadge').textContent = '(0)';
                loadDashboard();
                return;
            }

            renderContacts();
            loadDashboard();
        });
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// ─── Sent Email Detail Modal ──────────────────────────────────────────────────
window.showSentEmail = function(contactId) {
    const entry = allContactsCache.find(e => e.id === contactId);
    if (!entry) return;
    const c = entry.contact;

    const modal = document.getElementById('sentEmailModal');
    document.getElementById('sentEmailSubject').textContent = c.subject || '(bez predmetu)';
    document.getElementById('sentEmailBody').textContent = c.lastEmailBody || '';

    const sentDate = c.sentAt
        ? new Date(c.sentAt.toDate()).toLocaleString('sk-SK')
        : '';
    document.getElementById('sentEmailMeta').textContent =
        `${c.name} <${c.email}>` + (sentDate ? `  ·  ${sentDate}` : '');

    modal.classList.remove('hidden');
};

document.getElementById('sentEmailClose').addEventListener('click', () => {
    document.getElementById('sentEmailModal').classList.add('hidden');
});
document.getElementById('sentEmailBackdrop').addEventListener('click', () => {
    document.getElementById('sentEmailModal').classList.add('hidden');
});

// ─── Export CSV ───────────────────────────────────────────────────────────────
document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (allContactsCache.length === 0) {
        alert('Žiadne kontakty na export.');
        return;
    }

    const rows = [
        ['Meno', 'Email', 'Stav', 'Dátum odoslania', 'Poznámka'],
        ...allContactsCache.map(({ contact }) => {
            let stav = 'Čaká';
            if (contact.handoff) stav = 'Riešim osobne';
            else if (contact.sent) stav = 'Odoslané';

            const datum = contact.sentAt
                ? new Date(contact.sentAt.toDate()).toLocaleString('sk-SK')
                : '';

            const poznamka = (contact.note || '').replace(/"/g, '""');

            return [
                `"${(contact.name || '').replace(/"/g, '""')}"`,
                `"${contact.email}"`,
                `"${stav}"`,
                `"${datum}"`,
                `"${poznamka}"`,
            ];
        })
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emil-kontakty-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// Filter buttons
document.querySelectorAll('.contact-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.contact-filter-btn').forEach(b => {
            b.className = 'contact-filter-btn px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition';
        });
        btn.className = 'contact-filter-btn px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white transition';
        contactFilterState = btn.dataset.filter;
        renderContacts();
    });
});

// Search input
document.getElementById('contactSearch').addEventListener('input', (e) => {
    contactSearchState = e.target.value;
    renderContacts();
});

// Checkbox delegation — jednotlivé riadky
contactsTable.addEventListener('change', (e) => {
    if (!e.target.classList.contains('contact-checkbox')) return;
    const id = e.target.dataset.id;
    if (e.target.checked) selectedContactIds.add(id);
    else selectedContactIds.delete(id);
    updateBulkBar();
});

// Select all
document.getElementById('selectAllContacts').addEventListener('change', (e) => {
    const checkboxes = contactsTable.querySelectorAll('.contact-checkbox');
    checkboxes.forEach(cb => {
        if (e.target.checked) selectedContactIds.add(cb.dataset.id);
        else selectedContactIds.delete(cb.dataset.id);
        cb.checked = e.target.checked;
    });
    updateBulkBar();
});

// Bulk zrušiť
document.getElementById('bulkCancelBtn').addEventListener('click', () => {
    selectedContactIds.clear();
    contactsTable.querySelectorAll('.contact-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllContacts').checked = false;
    updateBulkBar();
});

// Bulk zmazať
document.getElementById('bulkDeleteBtn').addEventListener('click', async () => {
    const count = selectedContactIds.size;
    if (!confirm(`Zmazať ${count} kontaktov? Táto akcia sa nedá vrátiť.`)) return;
    try {
        const batch = writeBatch(db);
        selectedContactIds.forEach(id => batch.delete(doc(db, 'contacts', id)));
        await batch.commit();
        selectedContactIds.clear();
        updateBulkBar();
    } catch (err) {
        console.error('Bulk delete error:', err);
        alert('Chyba pri mazaní kontaktov.');
    }
});

// Bulk blacklist
document.getElementById('bulkBlacklistBtn').addEventListener('click', async () => {
    const count = selectedContactIds.size;
    if (!confirm(`Pridať ${count} kontaktov na blacklist a zmazať ich z fronty?`)) return;
    try {
        const batch = writeBatch(db);
        // Collect emails from cache
        const toProcess = allContactsCache.filter(({ id }) => selectedContactIds.has(id));
        toProcess.forEach(({ id, contact }) => {
            const emailLower = normalizeEmail(contact.email);
            batch.set(doc(db, 'blacklist', emailLower), {
                value: emailLower,
                type: 'email',
                reason: 'Manuálne (bulk)',
                addedAt: serverTimestamp(),
            });
            batch.delete(doc(db, 'contacts', id));
        });
        await batch.commit();
        selectedContactIds.clear();
        updateBulkBar();
    } catch (err) {
        console.error('Bulk blacklist error:', err);
        alert('Chyba pri blacklistovaní kontaktov.');
    }
});

window.deleteContact = async (contactId) => {
    if (confirm('Naozaj chcete zmazať tento kontakt?')) {
        try {
            await deleteDoc(doc(db, 'contacts', contactId));
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Chyba pri mazaní kontaktu');
        }
    }
};

window.handoffContact = async (contactId, email) => {
    if (!confirm(`Riešiš ${email} osobne?\n\nEMIL prestane posielať tomuto kontaktu automatické maily. Kontakt zostane v zozname a môžeš ho kedykoľvek vrátiť späť do fronty.`)) return;
    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            handoff: true,
            handoffAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Handoff error:', error);
        alert('Chyba pri prebratí kontaktu.');
    }
};

window.releaseContact = async (contactId) => {
    if (!confirm('Vrátiť kontakt do automatickej fronty? EMIL začne znova posielať emaily tomuto kontaktu.')) return;
    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            handoff: false,
            handoffAt: null,
        });
    } catch (error) {
        console.error('Release error:', error);
        alert('Chyba pri uvoľnení kontaktu.');
    }

};

window.saveNote = async (contactId, note) => {
    try {
        await updateDoc(doc(db, 'contacts', contactId), { note: note.trim() });
    } catch (error) {
        console.error('Save note error:', error);
    }
};

window.blacklistContact = async (contactId, email) => {
    if (!confirm(`Pridať ${email} na blacklist a zmazať z kontaktov?`)) return;
    try {
        const emailLower = normalizeEmail(email);
        // WriteBatch = atomická operácia — blacklist + zmazanie v jedinom write
        // Scheduler nemôže stihnúť odoslať email medzi týmito dvoma krokmi
        const batch = writeBatch(db);
        batch.set(doc(db, 'blacklist', emailLower), {
            value: emailLower,
            type: 'email',
            reason: 'Manuálne',
            addedAt: serverTimestamp(),
        });
        batch.delete(doc(db, 'contacts', contactId));
        await batch.commit();
    } catch (error) {
        console.error('Blacklist contact error:', error);
        alert('Chyba pri pridávaní na blacklist.');
    }
};

addContactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName').value;
    const email = normalizeEmail(document.getElementById('contactEmail').value);

    if (isToxicDomain(email)) {
        alert(`⚠️ Tento email nemožno pridať.\n\n"${email}" patrí k jednorazovým/dočasným emailovým službám. Za takýmito adresami nestojí reálna osoba.`);
        return;
    }

    try {
        // Deduplikácia — skontroluj či email už existuje
        const existing = await getDocs(query(collection(db, 'contacts'), where('email', '==', email)));
        if (!existing.empty) {
            alert(`⚠️ Kontakt "${email}" už je v zozname.`);
            return;
        }

        await addDoc(collection(db, 'contacts'), {
            email,
            name,
            sent: false,
            createdAt: serverTimestamp()
        });
        
        document.getElementById('contactName').value = '';
        document.getElementById('contactEmail').value = '';
        
        alert('Kontakt pridaný!');
    } catch (error) {
        console.error('Error adding contact:', error);
        alert('Chyba pri pridávaní kontaktu');
    }
});

csvFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        csvFileName.textContent = `Vybraný súbor: ${file.name}`;
    }
});

// ─── CSV Preview & Import ─────────────────────────────────────────────────────
let csvPreviewData = []; // contacts ready to import after preview

importBtn.addEventListener('click', async () => {
    const file = csvFile.files[0];
    if (!file) { alert('Vyberte CSV súbor'); return; }

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        const existingSnap = await getDocs(collection(db, 'contacts'));
        const existingEmails = new Set(existingSnap.docs.map(d => normalizeEmail(d.data().email || '')));

        csvPreviewData = [];
        let skippedToxic = 0, skippedDupe = 0, skippedInvalid = 0;

        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',').map(s => s.trim());
            const name = parts[0], email = parts[1];
            if (!email || !name) { skippedInvalid++; continue; }
            const emailNorm = normalizeEmail(email);
            if (isToxicDomain(emailNorm)) { skippedToxic++; continue; }
            if (existingEmails.has(emailNorm)) { skippedDupe++; continue; }
            csvPreviewData.push({ name, email: emailNorm });
            existingEmails.add(emailNorm); // prevent intra-file dupes
        }

        // Build preview modal content
        const statsEl = document.getElementById('csvPreviewStats');
        statsEl.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-green-700">${csvPreviewData.length}</p>
                <p class="text-green-600 text-xs mt-0.5">Nových kontaktov</p>
            </div>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-gray-500">${skippedDupe}</p>
                <p class="text-gray-400 text-xs mt-0.5">Duplikátov</p>
            </div>
            ${skippedToxic ? `<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-red-500">${skippedToxic}</p>
                <p class="text-red-400 text-xs mt-0.5">Jednorazových emailov</p>
            </div>` : ''}
            ${skippedInvalid ? `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-yellow-500">${skippedInvalid}</p>
                <p class="text-yellow-400 text-xs mt-0.5">Neplatných riadkov</p>
            </div>` : ''}
        `;

        const tableEl = document.getElementById('csvPreviewTable');
        if (csvPreviewData.length > 0) {
            tableEl.innerHTML = `<table class="w-full">
                <thead class="bg-gray-50 sticky top-0"><tr>
                    <th class="px-3 py-2 text-left text-gray-500 font-medium">Meno</th>
                    <th class="px-3 py-2 text-left text-gray-500 font-medium">Email</th>
                </tr></thead>
                <tbody class="divide-y divide-gray-100">
                    ${csvPreviewData.slice(0, 20).map(c => `<tr>
                        <td class="px-3 py-1.5 text-gray-700">${c.name}</td>
                        <td class="px-3 py-1.5 text-gray-500">${c.email}</td>
                    </tr>`).join('')}
                    ${csvPreviewData.length > 20 ? `<tr><td colspan="2" class="px-3 py-2 text-gray-400 text-center">... a ďalších ${csvPreviewData.length - 20}</td></tr>` : ''}
                </tbody>
            </table>`;
        } else {
            tableEl.innerHTML = '<p class="px-4 py-6 text-center text-gray-400">Žiadne nové kontakty na import.</p>';
        }

        document.getElementById('csvPreviewConfirmBtn').disabled = csvPreviewData.length === 0;
        document.getElementById('csvPreviewModal').classList.remove('hidden');

    } catch (err) {
        console.error('CSV parse error:', err);
        alert('Chyba pri čítaní CSV súboru.');
    }
});

async function doImport() {
    document.getElementById('csvPreviewModal').classList.add('hidden');
    const btn = document.getElementById('csvPreviewConfirmBtn');
    btn.disabled = true;
    try {
        for (const c of csvPreviewData) {
            await addDoc(collection(db, 'contacts'), {
                email: c.email, name: c.name,
                sent: false, createdAt: serverTimestamp()
            });
        }
        // New contacts added — reset end-notification so it fires when this batch finishes
        try {
            await updateDoc(doc(db, 'settings', 'campaign'), { endNotificationSent: false });
        } catch (_) { /* field may not exist yet, that's fine */ }

        alert(`✅ Importovaných ${csvPreviewData.length} kontaktov.`);
    } catch (err) {
        console.error('Import error:', err);
        alert('Chyba pri importe.');
    } finally {
        csvFile.value = '';
        csvFileName.textContent = '';
        csvPreviewData = [];
        btn.disabled = false;
    }
}

document.getElementById('csvPreviewConfirmBtn').addEventListener('click', doImport);
document.getElementById('csvPreviewCancelBtn').addEventListener('click', () => {
    document.getElementById('csvPreviewModal').classList.add('hidden');
    csvPreviewData = [];
});
document.getElementById('csvPreviewBackdrop').addEventListener('click', () => {
    document.getElementById('csvPreviewModal').classList.add('hidden');
    csvPreviewData = [];
});

refreshContacts.addEventListener('click', () => {
    loadContacts();
    loadDashboard();
});

async function loadSettings() {
    try {
        const smtpDoc = await getDocs(collection(db, 'settings'));
        const settingsData = smtpDoc.docs.find(doc => doc.id === 'smtp');

        if (settingsData) {
            const data = settingsData.data();
            document.getElementById('resendApiKey').value = data.resendApiKey || '';
            const resendFromRaw = data.resendFrom || '';
            const fromMatch = resendFromRaw.match(/^(.*?)\s*<([^>]+)>$/);
            if (fromMatch) {
                document.getElementById('resendFromName').value = fromMatch[1].trim();
                document.getElementById('resendFromEmail').value = fromMatch[2].trim();
            } else {
                document.getElementById('resendFromName').value = '';
                document.getElementById('resendFromEmail').value = resendFromRaw;
            }
            document.getElementById('resendNotifyEmail').value = data.user || '';
            document.getElementById('resendReplyTo').value = data.resendReplyTo || '';
            document.getElementById('dailyLimitInput').value = data.dailyLimit || 10;
        }
        
        const emailDoc = smtpDoc.docs.find(doc => doc.id === 'email');
        if (emailDoc) {
            const data = emailDoc.data();
            if (data.subjects) {
                document.getElementById('emailSubjects').value = data.subjects.join('\n\n');
            }
            if (data.greetings) {
                document.getElementById('emailGreetings').value = data.greetings.join('\n\n');
            }
            if (data.closings) {
                document.getElementById('emailClosings').value = data.closings.join('\n\n');
            }
            if (data.devices) {
                document.getElementById('emailDevice').value = data.devices.filter(s => s).join('\n\n');
            } else {
                document.getElementById('emailDevice').value = [
                    'Odoslané z iPhone',
                    'Odoslané z iPhonu',
                    'Sent from my iPhone',
                    'Odoslané z iPadu',
                    'Odoslané z môjho iPhonu cez 5G',
                    'Odoslané zo Samsungu',
                    'Odoslané z telefónu Galaxy',
                    'Odoslané z môjho telefónu Samsung Galaxy',
                    'Odoslané zo zariadenia Huawei',
                    'Odoslané zo zariadenia Android',
                    'Odoslané z mobilu',
                    'Z mobilu',
                    'Sent from my mobile',
                ].join('\n\n');
            }
            document.getElementById('emailBody').value = data.emailBody || '';
            document.getElementById('emailOptOut').value = data.optOut !== undefined
                ? data.optOut
                : 'P.S. {Ak už o ďalšiu spoluprácu nemáte záujem|Ak o spoluprácu záujem nemáte|V prípade, že o ďalší kontakt nestojíte}, {stačí odpísať|jednoducho odpíšte|napíšte nám} „nie" a {vašu adresu|váš e-mail} {hneď|okamžite|automaticky} {vyradíme zo zoznamu|vymažeme z databázy|odstránime zo zoznamu}, {aby sme vás viac nerušili|a viac vás kontaktovať nebudeme|a nebudeme vás ďalej obťažovať}.';
        }
        updateVariantCounter();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function splitEntries(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.includes('\n\n')) {
        return trimmed.split(/\n\s*\n/).map(s => s.trim()).filter(s => s);
    }
    return trimmed.split('\n').map(s => s.trim()).filter(s => s);
}

function validateSpintax(text) {
    let depth = 0;
    for (const ch of text) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth < 0) return false;
    }
    return depth === 0;
}

smtpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resendApiKey = document.getElementById('resendApiKey').value.trim();
    const resendFromName = document.getElementById('resendFromName').value.trim();
    const resendFromEmail = document.getElementById('resendFromEmail').value.trim();
    const resendFrom = resendFromName ? `${resendFromName} <${resendFromEmail}>` : resendFromEmail;
    const user = document.getElementById('resendNotifyEmail').value.trim();
    const resendReplyTo = document.getElementById('resendReplyTo').value.trim();
    const dailyLimit = Math.min(50, Math.max(1, parseInt(document.getElementById('dailyLimitInput').value) || 10));
    const subjects = splitEntries(document.getElementById('emailSubjects').value);
    const greetings = splitEntries(document.getElementById('emailGreetings').value);
    const closings = splitEntries(document.getElementById('emailClosings').value);
    const devices = [...splitEntries(document.getElementById('emailDevice').value), ''];
    const emailBody = document.getElementById('emailBody').value;
    const optOut = document.getElementById('emailOptOut').value.trim();

    if (!resendApiKey) {
        alert('⚠️ Zadajte Resend API kľúč!');
        return;
    }
    if (!resendFromName) {
        alert('⚠️ Zadajte zobrazené meno odosielateľa!');
        return;
    }
    if (resendFromName.length > 50) {
        alert('⚠️ Meno odosielateľa je príliš dlhé (max 50 znakov).');
        return;
    }
    if (/[<>"@]/.test(resendFromName)) {
        alert('⚠️ Meno odosielateľa obsahuje nepovolené znaky (<, >, ", @).');
        return;
    }
    if (/[^\x00-\x7FÀ-žÁ-žáäčďéěíľĺňóôŕšťúůýžÄČĎÉÍĽĹŇÓÔŔŠŤÚŮÝŽ\s\-\.]/.test(resendFromName)) {
        alert('⚠️ Meno odosielateľa obsahuje nepovolené znaky alebo emoji.');
        return;
    }
    if (resendFromName === resendFromName.toUpperCase() && resendFromName.length > 3) {
        alert('⚠️ Meno odosielateľa je celé veľkými písmenami (Caps Lock). Použite normálny zápis.');
        return;
    }
    const SPAM_WORDS_FROM = [
        'akcia', 'zdarma', 'free', 'promo', 'výhra', 'výherca', 'vyhral', 'vyhraj',
        'zľava', 'sleva', 'výpredaj', 'výprodej', 'bonus', 'odmena', 'cashback',
        'klikni', 'neklikaj', 'urgentné', 'urgentne', 'dôležité', 'pozor',
        'win', 'winner', 'offer', 'deal', 'sale', 'discount',
    ];
    const fromNameLower = resendFromName.toLowerCase();
    const spamWordInName = SPAM_WORDS_FROM.find(w => fromNameLower.includes(w));
    if (spamWordInName) {
        alert(`⚠️ Meno odosielateľa obsahuje spam slovo: "${spamWordInName}".\n\nPoužite bežné meno a priezvisko.`);
        return;
    }
    if (!resendFromEmail) {
        alert('⚠️ Zadajte email odosielateľa!');
        return;
    }
    if (!user) {
        alert('⚠️ Zadajte váš email pre notifikácie!');
        return;
    }

    // Validate subjects
    if (subjects.length === 0) {
        alert('⚠️ Musíte zadať aspoň 1 predmet emailu!\n\nOdporúčame 3-10 rôznych predmetov pre lepšiu variabilitu.');
        return;
    }

    // Spintax validation
    const allSubjects = subjects.join('\n');
    if (!validateSpintax(allSubjects)) {
        alert('⚠️ Chyba v Spintax syntaxi v predmetoch!\n\nSkontrolujte nezavreté { zátvorky.\nPríklad správneho Spintax: {variant1|variant2}');
        return;
    }
    if (!validateSpintax(emailBody)) {
        alert('⚠️ Chyba v Spintax syntaxi v tele emailu!\n\nSkontrolujte nezavreté { zátvorky.\nPríklad správneho Spintax: {variant1|variant2}');
        return;
    }
    
    try {
        await setDoc(doc(db, 'settings', 'smtp'), {
            provider: 'resend',
            user,
            resendApiKey,
            resendFrom,
            dailyLimit,
            ...(resendReplyTo ? { resendReplyTo } : {}),
        });
        
        await setDoc(doc(db, 'settings', 'email'), {
            subjects,
            greetings,
            closings,
            devices,
            emailBody,
            optOut
        });
        
        settingsSuccess.innerHTML = `✅ Nastavenia úspešne uložené!<br><small>Predmetov: ${subjects.length} | Oslovení: ${greetings.length} | Ukončení: ${closings.length} | Zariadení: ${devices.length}</small>`;
        settingsSuccess.classList.remove('hidden');
        setTimeout(() => {
            settingsSuccess.classList.add('hidden');
        }, 3000);
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Chyba pri ukladaní nastavení');
    }
});

// ─── Test Email ───────────────────────────────────────────────────────────────

document.getElementById('testEmailBtn').addEventListener('click', async () => {
    const btn = document.getElementById('testEmailBtn');
    const resultEl = document.getElementById('testEmailResult');
    btn.disabled = true;
    btn.textContent = '⏳ Odosielam...';
    resultEl.className = 'mt-4 p-3 rounded-lg text-sm bg-blue-50 border border-blue-200 text-blue-700';
    resultEl.textContent = 'Odosielam testovací email...';
    resultEl.classList.remove('hidden');
    try {
        const sendTestEmail = httpsCallable(functions, 'sendTestEmail');
        const result = await sendTestEmail();
        resultEl.className = 'mt-4 p-3 rounded-lg text-sm bg-green-50 border border-green-200 text-green-700';
        resultEl.textContent = `✅ Testovací email odoslaný na ${result.data.to}`;
    } catch (err) {
        resultEl.className = 'mt-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700';
        resultEl.textContent = `❌ Chyba: ${err.message}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📧 Testovací email';
        setTimeout(() => resultEl.classList.add('hidden'), 6000);
    }
});

// ─── Spam Score Checker ───────────────────────────────────────────────────────

const SPAM_WORDS = [
    // S diakritikou
    'zadarmo', 'akcia', 'zľava', 'zarábajte', 'zarobíte', 'zarobte',
    'investícia', 'cashback', 'výhra', 'vyhraj', 'výherca', 'cena zadarmo',
    'bezplatný', 'bezplatne', 'gratis', 'ušetríte', 'ušetrite',
    'súrne', 'ihneď', 'nezmeškajte', 'garantované', 'garantovaný',
    'limitovaná ponuka', 'len dnes', 'iba dnes', 'posledná šanca',
    'zostáva posledných', 'časovo obmedzené', 'okamžite', 'neodkladajte',
    'nečakajte', 'konajte teraz', 'rýchlo', 'rýchla akcia',
    'posledná možnosť', 'posledné kusy', 'vypredané čoskoro',
    'iba obmedzený počet', 'iba pre prvých', 'exkluzívna ponuka',
    'špeciálna ponuka vyprší', 'ponuka platí do', 'nestihli ste',
    'využite hneď', 'využite teraz', 'zaregistrujte sa ihneď',
    'obmedzená dostupnosť', 'zostatok na sklade', 'vypredaj',
    '100% úspešnosť', 'zázračné', 'bez námahy', 'bez rizika',
    'zaručený výsledok', 'najlacnejší', 'najlepší na trhu',
    'kliknite sem', 'kliknite tu', 'kupte', 'kúpte',
    'objednajte teraz', 'objednajte hneď', 'zavolajte teraz',
    // Varianty bez diakritiky (preklepy v spintaxe)
    'zlava', 'zarabajte', 'zarobite', 'investicia', 'vyhra', 'vyherca',
    'bezplatny', 'usetrите', 'usетrite', 'surne', 'ihned', 'nezmeškajte',
    'garantovane', 'garantovany', 'limitovana ponuka', 'posledna sanca',
    'casovo obmedzene', 'okamzite', 'neodkladajte',
    'posledna moznost', 'posledne kusy', 'exkluzivna ponuka',
    'vyuzite hned', 'vyuzite teraz', 'obmedzena dostupnost', 'vypredaj',
    'zaruceny vysledok', 'najlacnejsi', 'najlepsi na trhu',
    'kliknite sem', 'kupte', 'objednajte teraz', 'zavolajte teraz',
    // Anglické
    'free', 'click here', 'buy now', 'limited offer', 'guaranteed',
    'act now', 'winner', 'cash prize', 'no risk', 'order now',
];

// NALY'S ANTI-TOXIC ENGINE v1.0
const VULGAR_LIST = {
    // HARD: +20 penalizácia — email s týmto slovom by nemal nikdy odísť
    HARD: [
        // Slovenské
        'jebať', 'jebem', 'jebe', 'jebo', 'vyjebať', 'zajebať', 'zjebať', 'pojebať', 'ojebať', 'ojeb',
        'picsa', 'piča', 'pičovina', 'pičku', 'kurva', 'kurvy', 'kurvin', 'kurvička',
        'kokot', 'kokotina', 'kokoti', 'chuj', 'chujna', 'zmrd', 'zmrdi', 'hajzel',
        'vyhoniť', 'honiť', 'buzerant', 'buzerovať',
        // České
        'hujovina', 'píča', 'píčovina', 'zkurvit', 'zkurvený', 'vykurvit', 'kunda', 'kundička',
        'čurák', 'mrdka', 'mrdat', 'retard', 'retardi', 'retardovaný',
        // Anglické
        'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker', 'nigger', 'faggot', 'fag',
        'bitch', 'pussy', 'cunt', 'whore', 'slut', 'cock', 'dickhead', 'asshole',
    ],
    // SOFT: +3 penalizácia — neprofesionálne, zhoršuje skóre
    SOFT: [
        // Slovenské & České
        'sračka', 'srať', 'posrať', 'zasrať', 'vyserať', 'hovno', 'hovnivý', 'hovniváč',
        'debil', 'debilný', 'debilizmus', 'kretén', 'kreténstvo', 'idiot', 'idioti', 'idiotský',
        'vole', 'vůl', 'prdel', 'odrbať', 'odrb', 'sakra', 'do prdele',
        // Anglické
        'shit', 'bullshit', 'crap', 'bastard', 'dumbass', 'jackass',
    ],
};

const TECHNICAL_CAPS = [
    'PDF', 'HTML', 'SMTP', 'CSS', 'API', 'URL', 'IT', 'SR', 'ČR',
    'EÚ', 'EU', 'NALY', 'GPS', 'DIČ', 'IČO', 'DPH', 'GDPR', 'SRO',
    'IČ', 'DPH', 'IČ DPH', 'IČDPH', 'SK', 'CZ', 'MBA', 'PhD', 'MSc',
    'PS', 'IBAN', 'BIC', 'SWIFT',
];

const SPECIAL_SYMBOLS = /[€]{2,}|[$]{2,}|[★▶▷►◄☆✓✔✗✘♦♠♣♥]{1,}|[#]{3,}/g;

function stripSpintax(text) {
    return text.replace(/\{[^}]*\}/g, 'varianta');
}

function wordCount(text) {
    return text.split(/\s+/).filter(w => w.length > 1).length;
}

function extractUrls(text) {
    return text.match(/https?:\/\/[^\s]+/gi) || [];
}

function subjectBodyOverlap(subject, body) {
    if (!subject || !body) return 0;
    const subWords = new Set(subject.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const bodyPreview = body.toLowerCase().slice(0, 150);
    if (subWords.size === 0) return 0;
    let matches = 0;
    subWords.forEach(w => { if (bodyPreview.includes(w)) matches++; });
    return matches / subWords.size;
}

function analyzeText(text, label, subjectForOverlap = null, checkEmoji = false, checkLength = true) {
    const original = stripSpintax(text);
    const lower = original.toLowerCase();
    const issues = [];
    const warnings = [];
    const good = [];
    let penalty = 0;

    // ── SPOLOČNÉ KONTROLY ──────────────────────────

    // 1. Vulgárne slová
    const foundHard = VULGAR_LIST.HARD.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(original));
    const foundSoft = VULGAR_LIST.SOFT.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(original));
    if (foundHard.length > 0) {
        issues.push(`🚨 Vulgárne slová (kritické): <strong>${foundHard.join(', ')}</strong> — email nesmie odísť`);
        penalty += 20;
    }
    if (foundSoft.length > 0) {
        warnings.push(`Neprofesionálne výrazy: <strong>${foundSoft.join(', ')}</strong> — zvážte preformulovanie`);
        penalty += 3;
    }
    if (foundHard.length === 0 && foundSoft.length === 0) {
        good.push('Bez vulgárnych slov');
    }

    // 2. Spamové slová
    const totalWords = wordCount(original);
    const foundSpam = [...new Set(SPAM_WORDS.filter(w => lower.includes(w.toLowerCase())))];
    if (foundSpam.length > 0) {
        const density = foundSpam.length / Math.max(totalWords, 1);
        if (density > 0.05 || foundSpam.length >= 3) {
            issues.push(`Vysoká hustota spamových slov (${foundSpam.length} z ${totalWords}): <strong>${foundSpam.slice(0, 5).join(', ')}</strong>`);
            penalty += 3;
        } else if (foundSpam.length >= 1) {
            warnings.push(`Spamové slovo: <strong>${foundSpam.join(', ')}</strong> — zvážte nahradenie`);
            penalty += 1;
        }
    } else {
        good.push('Žiadne spamové slová');
    }

    // 3. ALL CAPS (ignoruj technické skratky)
    let capsText = original;
    TECHNICAL_CAPS.forEach(abbr => {
        capsText = capsText.replace(new RegExp(`\\b${abbr}\\b`, 'g'), '');
    });
    const capsMatches = (capsText.match(/[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]{3,}/g) || []);
    if (capsMatches.length > 0) {
        issues.push(`ALL CAPS pasáže: <strong>${capsMatches.join(', ')}</strong>`);
        penalty += 2;
    } else {
        good.push('Žiadne ALL CAPS (veľké písmená)');
    }

    // 4. Výkričníky
    const exclamations = (original.match(/!/g) || []).length;
    if (exclamations > 2) {
        issues.push(`Príliš veľa výkričníkov: <strong>${exclamations}×</strong> — max 1`);
        penalty += 2;
    } else if (exclamations === 2) {
        warnings.push('Dva výkričníky — odporúčame max 1');
        penalty += 1;
    } else {
        good.push('Výkričníky v poriadku');
    }

    // 5. Skrátené URL
    if (/bit\.ly|tinyurl|goo\.gl|t\.co/i.test(original)) {
        issues.push('Skrátená URL: <strong>bit.ly / tinyurl</strong> — použite plnú adresu webu');
        penalty += 3;
    } else {
        good.push('Žiadne skrátené URL');
    }

    // 6. Špeciálne symboly
    const symbols = original.match(SPECIAL_SYMBOLS) || [];
    if (symbols.length > 0) {
        issues.push(`Špeciálne symboly: <strong>${symbols.join(' ')}</strong>`);
        penalty += 2;
    } else {
        good.push('Žiadne problematické symboly (€€, $$...)');
    }

    // ── UNIKÁTNE KONTROLY ──────────────────────────

    // 7. Emoji (len pre sekcie s checkEmoji)
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    if (checkEmoji === true) {
        if (emojiRegex.test(original)) {
            issues.push(`Emoji v predmete — spam filtre to penalizujú (+2 body)`);
            penalty += 2;
        } else {
            good.push('Bez emoji');
        }
    } else if (checkEmoji === 'limited') {
        const emojiMatches = original.match(emojiRegex) || [];
        if (emojiMatches.length > 2) {
            issues.push(`Príliš veľa emoji: <strong>${emojiMatches.length}×</strong> — max 2 (+1 bod)`);
            penalty += 1;
        } else if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]{2}/u.test(original)) {
            warnings.push(`Emoji za sebou — oddeľte ich textom`);
        } else if (emojiMatches.length > 0) {
            good.push(`Emoji v poriadku (${emojiMatches.length}×, max 2)`);
        } else {
            good.push('Bez emoji');
        }
    }

    // 8. Kombinovaná interpunkcia
    if (/[?!]{2,}/.test(original)) {
        issues.push('Kombinovaná interpunkcia: <strong>?! alebo !?</strong>');
        penalty += 1;
    }

    // 9. Mena + výkričník (100 €!, 50%!, 9.99$!)
    const moneyExclaim = original.match(/[\d,.]+\s*[€$£%]\s*!|[€$£]\s*[\d,.]+\s*!/g) || [];
    if (moneyExclaim.length > 0) {
        issues.push(`Mena + výkričník: <strong>${moneyExclaim.join(', ')}</strong> — typický znak agresívneho marketingu`);
        penalty += 2;
    } else {
        good.push('Žiadne agresívne cenové výrazy (100€!, 50%!...)');
    }

    // 10. Počet URL (max 1 v plain texte)
    const urls = extractUrls(original);
    const uniqueUrls = [...new Set(urls)];
    if (uniqueUrls.length > 1) {
        issues.push(`Príliš veľa odkazov: <strong>${uniqueUrls.length} URL</strong> — v prvom kontakte max 1`);
        penalty += 2;
    } else if (uniqueUrls.length === 1) {
        good.push(`1 URL odkaz — v poriadku`);
    }

    // 11. IP adresa v URL
    if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(original)) {
        issues.push('IP adresa v odkaze: <strong>http://192.168...</strong> — použite doménu (napr. naly.sk)');
        penalty += 3;
    } else {
        good.push('Žiadne IP adresy v odkazoch');
    }

    // 12. Tracking parametre
    if (/utm_source|utm_medium|utm_campaign|fbclid|gclid/i.test(original)) {
        issues.push('Tracking parametre v URL: <strong>utm_source / fbclid</strong> — odstrániť');
        penalty += 2;
    }

    // 13. Subject-body overlap (len pre body)
    if (subjectForOverlap) {
        const overlap = subjectBodyOverlap(subjectForOverlap, original);
        if (overlap > 0.7) {
            warnings.push(`Predmet a telo emailu sú príliš podobné (<strong>${Math.round(overlap * 100)}% zhoda</strong>) — typický znak bota`);
            penalty += 2;
        } else if (overlap > 0.5) {
            warnings.push(`Predmet a telo emailu sa čiastočne opakujú (<strong>${Math.round(overlap * 100)}% zhoda</strong>)`);
            penalty += 1;
        }
    }

    // ── DĹŽKA (vždy na konci) ──────────────────────

    // 14. Dĺžka textu
    if (checkLength) {
        const len = original.replace(/\s+/g, ' ').trim().length;
        if (len < 100) {
            warnings.push(`Príliš krátky text: <strong>${len} znakov</strong> — odporúčame 200–800`);
            penalty += 1;
        } else if (len > 1500) {
            warnings.push(`Príliš dlhý text: <strong>${len} znakov</strong> — odporúčame max 800`);
            penalty += 1;
        } else if (len >= 200 && len <= 800) {
            good.push(`Ideálna dĺžka: ${len} znakov`);
        } else {
            good.push(`Dĺžka textu: ${len} znakov`);
        }
    }

    const score = Math.max(0, 10 - penalty);
    const scoreColor = score >= 8 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-600';
    const scoreBg   = score >= 8 ? 'bg-green-50 border-green-200' : score >= 5 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
    const scoreBorder = score >= 8 ? 'border-green-200' : score >= 5 ? 'border-yellow-200' : 'border-red-200';
    const scoreLabel = score >= 8 ? '✅ Nízke riziko' : score >= 5 ? '⚠️ Stredné riziko' : '🛑 Vysoké riziko';

    let html = `
        <div class="border ${scoreBorder} rounded-xl overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 ${scoreBg} border-b ${scoreBorder}">
                <span class="text-sm font-bold text-gray-700">${label}</span>
                <div class="flex items-center gap-2">
                    <span class="text-lg font-bold ${scoreColor}">${score}/10</span>
                    <span class="text-xs font-semibold ${scoreColor}">${scoreLabel}</span>
                </div>
            </div>
            <div class="px-4 py-3 space-y-1 bg-white">
    `;
    issues.forEach(i  => { html += `<p class="text-xs text-red-700">❌ ${i}</p>`; });
    warnings.forEach(w => { html += `<p class="text-xs text-yellow-700">⚠️ ${w}</p>`; });
    good.forEach(g    => { html += `<p class="text-xs text-green-700">✅ ${g}</p>`; });
    html += `</div></div>`;
    return { html, score };
}

function analyzeFromName(name) {
    const issues = [];
    const warnings = [];
    const good = [];
    let penalty = 0;

    if (!name || !name.trim()) {
        const html = `
            <div class="border border-gray-200 rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span class="text-sm font-bold text-gray-700">👤 Meno odosielateľa</span>
                    <span class="text-xs text-gray-400">— nevyplnené, preskočené</span>
                </div>
            </div>`;
        return { html, score: 10 };
    }

    // ── SPOLOČNÉ KONTROLY ──────────────────────────

    // 1. Vulgárne slová
    const foundHardFrom = VULGAR_LIST.HARD.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(name));
    const foundSoftFrom = VULGAR_LIST.SOFT.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(name));
    if (foundHardFrom.length > 0) {
        issues.push(`🚨 Vulgárne slová (kritické): <strong>${foundHardFrom.join(', ')}</strong> — email nesmie odísť`);
        penalty += 20;
    }
    if (foundSoftFrom.length > 0) {
        warnings.push(`Neprofesionálne výrazy: <strong>${foundSoftFrom.join(', ')}</strong>`);
        penalty += 3;
    }
    if (foundHardFrom.length === 0 && foundSoftFrom.length === 0) {
        good.push('Bez vulgárnych slov');
    }

    // 2. Spamové slová
    const FROM_SPAM = [
        'akcia', 'zdarma', 'free', 'výhra', 'súrne', 'surne', 'urgentné', 'urgentne',
        'zľava', 'sleva', 'promo', 'bonus', 'win', 'offer', 'sale', 'discount',
        'výpredaj', 'vypredaj', 'official', 'ofické',
    ];
    const nameLower = name.toLowerCase();
    const foundSpam = FROM_SPAM.filter(w => nameLower.includes(w));
    if (foundSpam.length > 0) {
        foundSpam.forEach(w => {
            issues.push(`Spam slovo v mene: <strong>${w}</strong> — +2 body`);
            penalty += 2;
        });
    } else {
        good.push('Žiadne spamové slová');
    }

    // 3. ALL CAPS — celé slovo veľkými, ignoruj skratky do 4 znakov
    const words = name.trim().split(/\s+/);
    const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase() && /[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(w));
    if (capsWords.length > 0) {
        issues.push(`Caps Lock v mene: <strong>${capsWords.join(', ')}</strong> — +2 body spamu`);
        penalty += 2;
    } else {
        good.push('Žiadne ALL CAPS (veľké písmená)');
    }

    // 4. Výkričníky
    const fromExclamations = (name.match(/!/g) || []).length;
    if (fromExclamations > 0) {
        issues.push(`Výkričník v mene odosielateľa — +2 body spamu`);
        penalty += 2;
    } else {
        good.push('Výkričníky v poriadku');
    }

    // 5. Skrátené URL
    if (/bit\.ly|tinyurl|goo\.gl|t\.co/i.test(name)) {
        issues.push('Skrátená URL v mene odosielateľa — použite plnú adresu');
        penalty += 2;
    } else {
        good.push('Žiadne skrátené URL');
    }

    // 6. Špeciálne znaky: $, %, [, *, # (+2) — ! je pokryté výkričníkmi
    const specialMatch = name.match(/[$%[\]*#@<>"]/g);
    if (specialMatch) {
        const unique = [...new Set(specialMatch)];
        issues.push(`Špeciálne znaky v mene: <strong>${unique.join(' ')}</strong> — +2 body`);
        penalty += 2;
    } else {
        good.push('Bez špeciálnych znakov');
    }

    // ── UNIKÁTNE KONTROLY ──────────────────────────

    // 7. Emoji
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(name)) {
        issues.push(`Emoji v mene odosielateľa — +2 body spamu`);
        penalty += 2;
    } else {
        good.push('Bez emoji');
    }

    // ── DĹŽKA (vždy na konci) ──────────────────────

    // 8. Dĺžka mena
    if (name.length > 50) {
        warnings.push(`Meno je príliš dlhé: <strong>${name.length} znakov</strong> — max 50`);
        penalty += 1;
    } else {
        good.push(`Dĺžka mena v poriadku (${name.length} znakov)`);
    }

    // 9. Doporučenie formátu mena
    const fromEmailVal = document.getElementById('resendFromEmail')?.value.trim() || '';
    const domain = fromEmailVal.split('@')[1] || '';
    const hasFirstName = /^[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][a-záäčďéíľĺňóôŕšťúýž]+/.test(name.trim());
    if (domain && !name.toLowerCase().includes(domain.toLowerCase())) {
        const exampleName = name.trim().split(/\s+/)[0];
        good.push(`💡 Tip: Skús formát "<strong>${exampleName} z ${domain}</strong>" — osobnejšie a dôveryhodnejšie`);
    } else if (hasFirstName && domain) {
        good.push(`Formát mena vyzerá dobre`);
    }


    const score = Math.max(0, 10 - penalty);
    const scoreColor  = score >= 8 ? 'text-green-600'  : score >= 5 ? 'text-yellow-600'  : 'text-red-600';
    const scoreBg     = score >= 8 ? 'bg-green-50 border-green-200'  : score >= 5 ? 'bg-yellow-50 border-yellow-200'  : 'bg-red-50 border-red-200';
    const scoreBorder = score >= 8 ? 'border-green-200' : score >= 5 ? 'border-yellow-200' : 'border-red-200';
    const scoreLabel  = score >= 8 ? '✅ Nízke riziko'  : score >= 5 ? '⚠️ Stredné riziko' : '🛑 Vysoké riziko';

    let html = `
        <div class="border ${scoreBorder} rounded-xl overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 ${scoreBg} border-b ${scoreBorder}">
                <span class="text-sm font-bold text-gray-700">👤 Meno odosielateľa</span>
                <div class="flex items-center gap-2">
                    <span class="text-lg font-bold ${scoreColor}">${score}/10</span>
                    <span class="text-xs font-semibold ${scoreColor}">${scoreLabel}</span>
                </div>
            </div>
            <div class="px-4 py-3 space-y-1 bg-white">`;
    issues.forEach(i  => { html += `<p class="text-xs text-red-700">❌ ${i}</p>`; });
    warnings.forEach(w => { html += `<p class="text-xs text-yellow-700">⚠️ ${w}</p>`; });
    good.forEach(g    => { html += `<p class="text-xs text-green-700">✅ ${g}</p>`; });
    html += `</div></div>`;
    return { html, score };
}

let spamCheckPassed = true;

function updateSaveButton() {
    const saveBtn = document.querySelector('#smtpForm button[type="submit"]');
    const existingWarning = document.getElementById('spamSaveWarning');
    if (existingWarning) existingWarning.remove();

    if (!spamCheckPassed) {
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
        const warning = document.createElement('p');
        warning.id = 'spamSaveWarning';
        warning.className = 'text-center text-sm text-red-600 font-medium';
        warning.textContent = '🛑 Email obsahuje zakázané slová. Oprav ho pred uložením.';
        saveBtn.parentNode.insertBefore(warning, saveBtn);
    } else {
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

document.getElementById('spamCheckBtn').addEventListener('click', () => {
    const btn = document.getElementById('spamCheckBtn');
    const resultsEl = document.getElementById('spamResults');

    if (!resultsEl.classList.contains('hidden')) {
        resultsEl.classList.add('hidden');
        btn.textContent = '🔍 Skontrolovať';
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const fromName = document.getElementById('resendFromName')?.value.trim() || '';
    const subjects = splitEntries(document.getElementById('emailSubjects').value);
    const body = document.getElementById('emailBody').value.trim();
    const closings = splitEntries(document.getElementById('emailClosings').value);
    const devices = splitEntries(document.getElementById('emailDevice').value);

    if (!fromName && !subjects.length && !body && !closings.length) {
        alert('Najprv vyplňte aspoň jedno pole.');
        return;
    }

    const fromResult = analyzeFromName(fromName);

    const subjectText = subjects.join(' | ');
    const subjectResult = subjectText
        ? analyzeText(subjectText, '📋 Predmety emailov', null, true)
        : { html: '<p class="text-xs text-gray-400 px-2">Žiadne predmety na kontrolu.</p>', score: 10 };

    const bodyResult = body
        ? analyzeText(body, '✉️ Telo emailu', subjectText, 'limited')
        : { html: '<p class="text-xs text-gray-400 px-2">Žiadne telo emailu na kontrolu.</p>', score: 10 };

    const closingText = closings.join(' | ');
    const closingResult = closingText
        ? analyzeText(closingText, '✌️ Ukončenia emailu')
        : { html: '<p class="text-xs text-gray-400 px-2">Žiadne ukončenia na kontrolu.</p>', score: 10 };

    const optOutText = document.getElementById('emailOptOut').value.trim();
    const optOutResult = optOutText
        ? analyzeText(optOutText, '⚖️ Opt-out veta', null, false, false)
        : { html: '<p class="text-xs text-gray-400 px-2">Žiadna opt-out veta na kontrolu.</p>', score: 10 };

    const deviceText = devices.join(' | ');
    const deviceResult = deviceText
        ? analyzeText(deviceText, '📱 Odoslané z')
        : { html: '<p class="text-xs text-gray-400 px-2">Žiadny podpis zariadenia na kontrolu.</p>', score: 10 };

    document.getElementById('spamFromResult').innerHTML = fromResult.html;
    document.getElementById('spamSubjectResult').innerHTML = subjectResult.html;
    document.getElementById('spamBodyResult').innerHTML = bodyResult.html;
    document.getElementById('spamClosingResult').innerHTML = closingResult.html;
    document.getElementById('spamOptOutResult').innerHTML = optOutResult.html;
    document.getElementById('spamDeviceResult').innerHTML = deviceResult.html;
    resultsEl.classList.remove('hidden');
    btn.textContent = '✕ Zavrieť';

    spamCheckPassed = fromResult.score > 0 && subjectResult.score > 0 && bodyResult.score > 0 && closingResult.score > 0 && optOutResult.score > 0 && deviceResult.score > 0;
    updateSaveButton();
});


// ─────────────────────────────────────────────
// EMAIL PREVIEW
// ─────────────────────────────────────────────

function clientParseSpintax(text) {
    const process = (input) => {
        const regex = /\{([^{}]*)\}/;
        let match = input.match(regex);
        while (match) {
            const options = match[1].split('|');
            const picked = options[Math.floor(Math.random() * options.length)];
            input = input.replace(match[0], picked);
            match = input.match(regex);
        }
        return input;
    };
    return process(text);
}

function getRandomItem(arr) {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
}

function generatePreview() {
    const subjects = splitEntries(document.getElementById('emailSubjects').value);
    const greetings = splitEntries(document.getElementById('emailGreetings').value);
    const body = document.getElementById('emailBody').value.trim();
    const closings = splitEntries(document.getElementById('emailClosings').value);
    const devices = splitEntries(document.getElementById('emailDevice').value);

    // Počítadlo variant — devices vždy +1 pre prázdny podpis
    const cntS = Math.max(subjects.length, 1);
    const cntG = Math.max(greetings.length, 1);
    const cntC = Math.max(closings.length, 1);
    const cntD = devices.length + 1; // +1 = prázdny podpis
    const cntO = countSpintaxVariants(document.getElementById('emailOptOut').value.trim());
    const total = cntS * cntG * cntO * cntC * cntD;

    document.getElementById('cntSubjects').textContent = cntS;
    document.getElementById('cntGreetings').textContent = cntG;
    document.getElementById('cntClosings').textContent = cntC;
    document.getElementById('cntDevices').textContent = cntD;
    document.getElementById('cntTotal').textContent = total.toLocaleString('sk-SK');

    if (!body) {
        alert('Najprv vyplňte telo emailu.');
        return;
    }

    const subject = clientParseSpintax(getRandomItem(subjects) || '(bez predmetu)');
    const greeting = clientParseSpintax(getRandomItem(greetings));
    const now = new Date();
    const skDays = ['nedeľa','pondelok','utorok','streda','štvrtok','piatok','sobota'];
    const skMonths = ['januára','februára','marca','apríla','mája','júna','júla','augusta','septembra','októbra','novembra','decembra'];
    const dayName = skDays[now.getDay()];
    const monthName = skMonths[now.getMonth()];
    const weekNum = Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
    const previewSender = (document.getElementById('resendFromName')?.value.trim() || 'Odosielateľ');
    const previewDomain = (document.getElementById('resendFromEmail')?.value.trim() || '').split('@')[1] || 'domena.sk';
    const previewVars = {
        name: 'Ján Novák',
        email: 'jan.novak@firma.sk',
        date: `${dayName} ${now.getDate()}. ${monthName}`,
        day: dayName,
        month: monthName,
        year: String(now.getFullYear()),
        week: `${weekNum}. týždeň`,
        sender: previewSender,
        domain: previewDomain,
    };
    let resolvedBody = clientParseSpintax(body);
    for (const [key, val] of Object.entries(previewVars)) {
        resolvedBody = resolvedBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
    const closing = clientParseSpintax(getRandomItem(closings));
    const device = clientParseSpintax(getRandomItem([...devices, ''])).trim();
    const optOut = clientParseSpintax(document.getElementById('emailOptOut').value.trim());

    const parts = [
        ...(greeting.trim() ? [greeting.trim()] : []),
        resolvedBody.trim(),
        ...(optOut ? [optOut] : []),
        ...(closing.trim() ? [closing.trim()] : []),
        ...(device.trim() ? [device.trim()] : []),
    ];

    const fromName = document.getElementById('resendFromName')?.value.trim() || '';
    const fromEmail = document.getElementById('resendFromEmail')?.value.trim() || '';
    const fromDisplay = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    document.getElementById('previewFrom').textContent = fromDisplay || '(nenastavený odosielateľ)';
    document.getElementById('previewSubject').textContent = subject;

    // Zobraziť telo — podpis (device) vizuálne odlíšený kurzívou
    const bodyEl = document.getElementById('previewBody');
    bodyEl.innerHTML = '';

    const mainParts = [
        ...(greeting.trim() ? [greeting.trim()] : []),
        resolvedBody.trim(),
        ...(optOut ? [optOut] : []),
        ...(closing.trim() ? [closing.trim()] : []),
    ];

    const mainNode = document.createElement('span');
    mainNode.textContent = mainParts.join('\n\n');
    bodyEl.appendChild(mainNode);

    if (device) {
        const sep = document.createElement('span');
        sep.textContent = '\n\n';
        bodyEl.appendChild(sep);

        const deviceNode = document.createElement('em');
        deviceNode.textContent = device;
        deviceNode.style.fontSize = '12px';
        deviceNode.style.color = '#6b7280';
        bodyEl.appendChild(deviceNode);
    }

    document.getElementById('previewModal').classList.remove('hidden');
}

// Mesačný max: 10 emailov/deň × 26 pracovných dní = 260
const MONTHLY_MAX_EMAILS = 260;

function countSpintaxVariants(text) {
    if (!text || !text.trim()) return 1;
    let count = 1;
    const regex = /\{([^{}]*)\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        count *= match[1].split('|').length;
    }
    return count;
}

function updateVariantCounter() {
    const subjects  = splitEntries(document.getElementById('emailSubjects').value);
    const greetings = splitEntries(document.getElementById('emailGreetings').value);
    const closings  = splitEntries(document.getElementById('emailClosings').value);
    const devices   = splitEntries(document.getElementById('emailDevice').value);
    const optOutText = document.getElementById('emailOptOut').value.trim();

    const cntS = Math.max(subjects.length, 1);
    const cntG = Math.max(greetings.length, 1);
    const cntC = Math.max(closings.length, 1);
    const cntD = devices.length + 1; // +1 prázdny podpis
    const cntO = countSpintaxVariants(optOutText);
    const total = cntS * cntG * cntO * cntC * cntD;

    document.getElementById('liveSubjects').textContent = cntS;
    document.getElementById('liveGreetings').textContent = cntG;
    document.getElementById('liveOptOut').textContent = cntO;
    document.getElementById('liveClosings').textContent = cntC;
    document.getElementById('liveDevices').textContent = cntD;
    document.getElementById('liveTotal').textContent = total.toLocaleString('sk-SK');

    const badge = document.getElementById('liveVariantBadge');
    const msg   = document.getElementById('liveVariantMsg');

    const daysBeforeRepeat = Math.floor(total / 5); // priemer 5 emailov/deň (systém posiela 1–10 náhodne)

    const repeatLabel = daysBeforeRepeat >= 365
        ? `~${daysBeforeRepeat} dní (~${Math.round(daysBeforeRepeat / 365)} rokov)`
        : `~${daysBeforeRepeat} dní`;

    if (total >= MONTHLY_MAX_EMAILS) {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-green-50 text-green-700';
        msg.className   = 'text-xs mt-1.5 text-green-600';
        msg.textContent = `✅ V poriadku — ${total.toLocaleString('sk-SK')} variant · email sa zopakuje raz za ${repeatLabel}.`;
    } else if (total >= 50) {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-yellow-50 text-yellow-700';
        msg.className   = 'text-xs mt-1.5 text-yellow-600';
        msg.textContent = `⚠️ Môže sa opakovať — email sa zopakuje raz za ${repeatLabel}. Odporúčame aspoň ${MONTHLY_MAX_EMAILS} variant.`;
    } else {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-600';
        msg.className   = 'text-xs mt-1.5 text-red-600';
        msg.textContent = `🛑 Príliš málo variant — email sa zopakuje raz za ${repeatLabel}. Odporúčame aspoň ${MONTHLY_MAX_EMAILS} variant.`;
    }
}

['emailSubjects', 'emailGreetings', 'emailClosings', 'emailDevice', 'emailOptOut'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateVariantCounter);
});

document.getElementById('previewEmailBtn').addEventListener('click', generatePreview);
document.getElementById('previewRefreshBtn').addEventListener('click', generatePreview);
document.getElementById('previewCloseBtn').addEventListener('click', () => {
    document.getElementById('previewModal').classList.add('hidden');
});
document.getElementById('previewBackdrop').addEventListener('click', () => {
    document.getElementById('previewModal').classList.add('hidden');
});

// Desktop / Mobile preview toggle
const previewDesktopBtn = document.getElementById('previewDesktopBtn');
const previewMobileBtn  = document.getElementById('previewMobileBtn');
const previewBodyWrap   = document.getElementById('previewBodyWrap');
const previewBodyEl     = document.getElementById('previewBody');

const BTN_ACTIVE   = 'px-3 py-1 text-xs font-medium rounded-lg bg-gray-900 text-white transition';
const BTN_INACTIVE = 'px-3 py-1 text-xs font-medium rounded-lg text-gray-500 hover:bg-gray-200 transition';

function setPreviewMode(mode) {
    if (mode === 'mobile') {
        previewMobileBtn.className  = BTN_ACTIVE;
        previewDesktopBtn.className = BTN_INACTIVE;
        // overflow-y-auto + items-start = scroll funguje, obsah začína zhora
        previewBodyWrap.className   = 'flex-1 overflow-y-auto bg-gray-100';
        previewBodyWrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; padding: 20px 12px;';
        Object.assign(previewBodyEl.style, {
            maxWidth: '375px', width: '100%', boxSizing: 'border-box',
            background: '#fff', borderRadius: '12px', padding: '16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb',
            fontSize: '13px', wordBreak: 'break-word', overflowWrap: 'break-word',
            flexShrink: '0',
        });
    } else {
        previewDesktopBtn.className   = BTN_ACTIVE;
        previewMobileBtn.className    = BTN_INACTIVE;
        previewBodyWrap.className     = 'flex-1 overflow-y-auto py-5 px-6';
        previewBodyWrap.style.cssText = '';
        Object.assign(previewBodyEl.style, {
            maxWidth: '', width: '', boxSizing: '',
            background: '', borderRadius: '', padding: '',
            boxShadow: '', border: '', flexShrink: '',
            fontSize: '14px', wordBreak: 'break-word', overflowWrap: 'break-word',
        });
    }
}

previewDesktopBtn.addEventListener('click', () => setPreviewMode('desktop'));
previewMobileBtn.addEventListener('click',  () => setPreviewMode('mobile'));

// ─────────────────────────────────────────────
// BLACKLIST
// ─────────────────────────────────────────────

let allBlacklistEntries = [];
let currentFilter = 'all';

async function loadBlacklist() {
    const tbody = document.getElementById('blacklistTable');
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">
        <div class="loader mx-auto"></div><p class="mt-2">Načítavam...</p></td></tr>`;

    try {
        const snap = await getDocs(query(collection(db, 'blacklist'), orderBy('addedAt', 'desc')));
        allBlacklistEntries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderBlacklist();
    } catch (err) {
        console.error('Blacklist load error:', err);
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Chyba pri načítaní blacklistu.</td></tr>`;
    }
}

function renderBlacklist() {
    const tbody = document.getElementById('blacklistTable');
    const countEl = document.getElementById('blacklistCount');

    let entries = allBlacklistEntries;
    if (currentFilter === 'email') {
        entries = entries.filter(e => e.type === 'email');
    } else if (currentFilter === 'domain') {
        entries = entries.filter(e => e.type === 'domain');
    } else if (currentFilter === 'hard_bounce') {
        entries = entries.filter(e => e.type === 'hard_bounce');
    }

    countEl.textContent = `(${entries.length})`;

    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-400 text-sm">
            Žiadne záznamy v tejto kategórii.</td></tr>`;
        return;
    }

    tbody.innerHTML = entries.map(e => {
        const date = e.addedAt ? new Date(e.addedAt.seconds * 1000).toLocaleDateString('sk-SK') : '—';
        const typeBadge = e.type === 'hard_bounce'
            ? '<span class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Neplatná adresa</span>'
            : e.type === 'domain'
                ? '<span class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Doména</span>'
                : '<span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Email</span>';
        return `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-3 text-sm font-medium text-gray-900">${e.value}</td>
            <td class="px-6 py-3">${typeBadge}</td>
            <td class="px-6 py-3 text-sm text-gray-600">${e.reason || '—'}</td>
            <td class="px-6 py-3 text-sm text-gray-500">${date}</td>
            <td class="px-6 py-3">
                <button onclick="deleteBlacklistEntry('${e.id}')"
                    class="text-red-500 hover:text-red-700 text-xs font-medium transition">
                    Zmazať
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.filterBlacklist = function(type) {
    currentFilter = type;

    document.querySelectorAll('.blacklist-filter').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });
    const activeBtn = document.getElementById(
        type === 'all' ? 'filterAll' :
        type === 'email' ? 'filterEmail' :
        type === 'domain' ? 'filterDomain' : 'filterBounce'
    );
    if (activeBtn) {
        activeBtn.classList.add('bg-primary', 'text-white');
        activeBtn.classList.remove('bg-gray-100', 'text-gray-600');
    }

    renderBlacklist();
};

window.deleteBlacklistEntry = async function(id) {
    if (!confirm('Naozaj chceš odstrániť tento záznam z blacklistu?')) return;
    try {
        await deleteDoc(doc(db, 'blacklist', id));
        allBlacklistEntries = allBlacklistEntries.filter(e => e.id !== id);
        renderBlacklist();
    } catch (err) {
        console.error('Delete blacklist error:', err);
        alert('Chyba pri mazaní záznamu.');
    }
};

// Jednorazové/dočasné emaily — nikdy za nimi nestojí reálna osoba
const TOXIC_DOMAINS = [
    'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'temp-mail.org',
    'trashmail.com', 'sharklasers.com', 'getairmail.com', 'yopmail.com',
    'dispostable.com', 'spam4.me', 'maildrop.cc', 'mail-tester.com',
    'throwam.com', 'spamgourmet.com', 'fakeinbox.com', 'mailnull.com',
    'spamherelots.com', 'trashmail.me', 'tempmail.com', 'throwam.com',
];

function normalizeEmail(email) {
    const lower = email.trim().toLowerCase();
    const atIdx = lower.lastIndexOf('@');
    if (atIdx === -1) return lower;
    const local = lower.slice(0, atIdx);
    const domain = lower.slice(atIdx + 1);
    // Gmail treats dots in local part as insignificant
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        return local.replace(/\./g, '') + '@' + domain;
    }
    return lower;
}

function isToxicDomain(email) {
    const domain = (email.split('@')[1] || '').toLowerCase().trim();
    return TOXIC_DOMAINS.includes(domain);
}

const PROTECTED_DOMAINS = [
    // Globálni giganti
    '@gmail.com', '@googlemail.com',
    '@outlook.com', '@hotmail.com', '@live.com', '@msn.com',
    '@icloud.com', '@me.com', '@mac.com',
    '@yahoo.com', '@ymail.com', '@rocketmail.com',
    '@aol.com', '@aim.com',
    // Slovenskí poskytovatelia
    '@zoznam.sk', '@azet.sk', '@centrum.sk', '@atlas.sk',
    '@pobox.sk', '@post.sk', '@stonline.sk',
    '@orange.sk', '@telekom.sk', '@upc.sk',
    // Českí poskytovatelia
    '@seznam.cz', '@email.cz', '@post.cz', '@volny.cz',
    '@centrum.cz', '@atlas.cz', '@tiscali.cz', '@quick.cz',
    // Privacy a iní svetoví hráči
    '@proton.me', '@protonmail.com', '@pm.me',
    '@tutanota.com', '@tuta.io', '@tuta.com',
    '@mail.com', '@email.com',
    '@gmx.com', '@gmx.net', '@gmx.at', '@gmx.ch',
    '@fastmail.com', '@fastmail.fm',
    '@yandex.com', '@yandex.ru',
];

async function addToBlacklist(value, reason, type) {
    const trimmed = value.startsWith('@') ? value.trim().toLowerCase() : normalizeEmail(value);
    if (!trimmed) return;

    const isDomain = trimmed.startsWith('@');
    const entryType = type || (isDomain ? 'domain' : 'email');

    if (isDomain && PROTECTED_DOMAINS.includes(trimmed)) {
        alert(`⚠️ Túto doménu nemôžeš zablokovať celú!\n\n"${trimmed}" používajú státisíce ľudí. EMIL by nemal komu písať.\n\nAk chceš zablokovať konkrétnu osobu, pridaj jej celý email napr. jan@gmail.com.`);
        return;
    }

    const existing = allBlacklistEntries.find(e => e.id === trimmed);
    if (existing) {
        alert('Tento záznam je už v blackliste.');
        return;
    }

    try {
        // Doc ID = email alebo @doména → O(1) lookup, žiadne duplicity
        await setDoc(doc(db, 'blacklist', trimmed), {
            value: trimmed,
            type: entryType,
            reason: reason || 'Manuálne',
            addedAt: serverTimestamp(),
        });
        allBlacklistEntries.unshift({ id: trimmed, value: trimmed, type: entryType, reason: reason || 'Manuálne', addedAt: { seconds: Date.now() / 1000 } });
        renderBlacklist();
    } catch (err) {
        console.error('Add blacklist error:', err);
        alert('Chyba pri pridávaní záznamu.');
    }
}

document.getElementById('blacklistAddBtn').addEventListener('click', async () => {
    const input = document.getElementById('blacklistInput').value.trim();
    const reason = document.getElementById('blacklistReason').value.trim() || 'Manuálne';
    if (!input) {
        alert('Zadaj email alebo doménu (napr. @firma.sk).');
        return;
    }
    await addToBlacklist(input, reason);
    document.getElementById('blacklistInput').value = '';
    document.getElementById('blacklistReason').value = '';
});

document.getElementById('blacklistInput').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('blacklistAddBtn').click();
    }
});
