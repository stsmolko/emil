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
const settingsTab = document.getElementById('settingsTab');
const radyTab = document.getElementById('radyTab');
const blacklistTab = document.getElementById('blacklistTab');
const dashboardSection = document.getElementById('dashboardSection');
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

window.switchTab = function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('border-b-2', 'border-primary', 'text-gray-900');
        btn.classList.add('text-gray-500');
    });

    dashboardSection.classList.add('hidden');
    settingsSection.classList.add('hidden');
    radySection.classList.add('hidden');
    blacklistSection.classList.add('hidden');

    if (tab === 'dashboard') {
        dashboardTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        dashboardTab.classList.remove('text-gray-500');
        dashboardSection.classList.remove('hidden');
        loadDashboard();
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
    } catch (error) {
        console.error('Error loading stats:', error);
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

// ─── Contacts filter state ────────────────────────────────────────────────────
let allContactsCache = [];
let contactFilterState = 'all';
let contactSearchState = '';

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

        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-700">${contact.name}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${contact.email}</td>
            <td class="px-6 py-4 text-sm">${statusBadge}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${sentDate}</td>
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
                        Zmazať
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
            document.getElementById('smtpHost').value = data.host || '';
            document.getElementById('smtpPort').value = data.port || '';
            document.getElementById('smtpUser').value = data.user || '';
            document.getElementById('smtpPass').value = data.pass || '';
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
    
    const host = document.getElementById('smtpHost').value;
    const port = parseInt(document.getElementById('smtpPort').value);
    const user = document.getElementById('smtpUser').value;
    const pass = document.getElementById('smtpPass').value;
    const from = user;
    const dailyLimit = Math.min(50, Math.max(1, parseInt(document.getElementById('dailyLimitInput').value) || 10));
    const subjects = splitEntries(document.getElementById('emailSubjects').value);
    const greetings = splitEntries(document.getElementById('emailGreetings').value);
    const closings = splitEntries(document.getElementById('emailClosings').value);
    const devices = [...splitEntries(document.getElementById('emailDevice').value), ''];
    const emailBody = document.getElementById('emailBody').value;
    
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
            host,
            port,
            user,
            pass,
            from,
            dailyLimit
        });
        
        await setDoc(doc(db, 'settings', 'email'), {
            subjects,
            greetings,
            closings,
            devices,
            emailBody
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

function analyzeText(text, label, subjectForOverlap = null) {
    const original = stripSpintax(text);
    const lower = original.toLowerCase();
    const issues = [];
    const warnings = [];
    const good = [];
    let penalty = 0;

    // 0. Vulgárne slová — word boundary regex (\b) aby "hokejka" nespúšťala alert
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

    // 1. Hustota spamových slov
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

    // 2. ALL CAPS (ignoruj technické skratky)
    let capsText = original;
    TECHNICAL_CAPS.forEach(abbr => {
        capsText = capsText.replace(new RegExp(`\\b${abbr}\\b`, 'g'), '');
    });
    const capsMatches = (capsText.match(/[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]{3,}/g) || []);
    if (capsMatches.length > 0) {
        issues.push(`ALL CAPS pasáže: <strong>${capsMatches.join(', ')}</strong>`);
        penalty += 2;
    } else {
        good.push('Žiadne ALL CAPS');
    }

    // 3. Výkričníky
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

    // 4. Kombinovaná interpunkcia
    if (/[?!]{2,}/.test(original)) {
        issues.push('Kombinovaná interpunkcia: <strong>?! alebo !?</strong>');
        penalty += 1;
    }

    // 4b. Číslo/mena + výkričník (100 €!, 50%!, 9.99$!)
    const moneyExclaim = original.match(/[\d,.]+\s*[€$£%]\s*!|[€$£]\s*[\d,.]+\s*!/g) || [];
    if (moneyExclaim.length > 0) {
        issues.push(`Mena + výkričník: <strong>${moneyExclaim.join(', ')}</strong> — typický znak agresívneho marketingu`);
        penalty += 2;
    }

    // 5. URL skracovače
    if (/bit\.ly|tinyurl|goo\.gl|t\.co/i.test(original)) {
        issues.push('Skrátená URL: <strong>bit.ly / tinyurl</strong> — použite plnú adresu webu');
        penalty += 3;
    } else {
        good.push('Žiadne skrátené URL');
    }

    // 6. Počet URL (max 1 v plain texte)
    const urls = extractUrls(original);
    const uniqueUrls = [...new Set(urls)];
    if (uniqueUrls.length > 1) {
        issues.push(`Príliš veľa odkazov: <strong>${uniqueUrls.length} URL</strong> — v prvom kontakte max 1`);
        penalty += 2;
    } else if (uniqueUrls.length === 1) {
        good.push(`1 URL odkaz — v poriadku`);
    }

    // 6b. IP adresa v URL
    if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(original)) {
        issues.push('IP adresa v odkaze: <strong>http://192.168...</strong> — použite doménu (napr. naly.sk)');
        penalty += 3;
    }

    // 7. Tracking parametre
    if (/utm_source|utm_medium|utm_campaign|fbclid|gclid/i.test(original)) {
        issues.push('Tracking parametre v URL: <strong>utm_source / fbclid</strong> — odstrániť');
        penalty += 2;
    }

    // 8. Dĺžka textu (Goldilocks)
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

    // 9. Špeciálne symboly
    const symbols = original.match(SPECIAL_SYMBOLS) || [];
    if (symbols.length > 0) {
        issues.push(`Špeciálne symboly: <strong>${symbols.join(' ')}</strong>`);
        penalty += 2;
    }

    // 10. Subject-body overlap (len pre body)
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
    const subjects = splitEntries(document.getElementById('emailSubjects').value);
    const body = document.getElementById('emailBody').value.trim();

    if (!subjects.length && !body) {
        alert('Najprv vyplňte predmety alebo telo emailu.');
        return;
    }

    const subjectText = subjects.join(' | ');
    const subjectResult = subjectText
        ? analyzeText(subjectText, '📋 Predmety emailov')
        : { html: '<p class="text-xs text-gray-400 px-2">Žiadne predmety na kontrolu.</p>', score: 10 };

    const bodyResult = body
        ? analyzeText(body, '✉️ Telo emailu', subjectText)
        : { html: '<p class="text-xs text-gray-400 px-2">Žiadne telo emailu na kontrolu.</p>', score: 10 };

    document.getElementById('spamSubjectResult').innerHTML = subjectResult.html;
    document.getElementById('spamBodyResult').innerHTML = bodyResult.html;
    document.getElementById('spamResults').classList.remove('hidden');

    // Blokovanie uloženia ak skóre = 0 (HARD slová alebo extrémne spam)
    spamCheckPassed = subjectResult.score > 0 && bodyResult.score > 0;
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
    const total = cntS * cntG * cntC * cntD;

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
    const resolvedBody = clientParseSpintax(body).replace(/\{\{name\}\}/g, 'Ján Novák');
    const closing = clientParseSpintax(getRandomItem(closings));
    const device = clientParseSpintax(getRandomItem([...devices, ''])).trim();

    const parts = [
        ...(greeting.trim() ? [greeting.trim()] : []),
        resolvedBody.trim(),
        ...(closing.trim() ? [closing.trim()] : []),
        ...(device.trim() ? [device.trim()] : []),
    ];

    document.getElementById('previewSubject').textContent = subject;

    // Zobraziť telo — podpis (device) vizuálne odlíšený kurzívou
    const bodyEl = document.getElementById('previewBody');
    bodyEl.innerHTML = '';

    const mainParts = [
        ...(greeting.trim() ? [greeting.trim()] : []),
        resolvedBody.trim(),
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

function updateVariantCounter() {
    const subjects  = splitEntries(document.getElementById('emailSubjects').value);
    const greetings = splitEntries(document.getElementById('emailGreetings').value);
    const closings  = splitEntries(document.getElementById('emailClosings').value);
    const devices   = splitEntries(document.getElementById('emailDevice').value);

    const cntS = Math.max(subjects.length, 1);
    const cntG = Math.max(greetings.length, 1);
    const cntC = Math.max(closings.length, 1);
    const cntD = devices.length + 1; // +1 prázdny podpis
    const total = cntS * cntG * cntC * cntD;

    document.getElementById('liveSubjects').textContent = cntS;
    document.getElementById('liveGreetings').textContent = cntG;
    document.getElementById('liveClosings').textContent = cntC;
    document.getElementById('liveDevices').textContent = cntD;
    document.getElementById('liveTotal').textContent = total.toLocaleString('sk-SK');

    const badge = document.getElementById('liveVariantBadge');
    const msg   = document.getElementById('liveVariantMsg');

    const daysBeforeRepeat = Math.floor(total / 5); // priemer 5 emailov/deň (systém posiela 1–10 náhodne)

    if (total >= MONTHLY_MAX_EMAILS) {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-green-50 text-green-700';
        msg.className   = 'text-xs mt-1.5 text-green-600';
        msg.textContent = `✅ V poriadku — ${total.toLocaleString('sk-SK')} variant · email sa zopakuje raz za ~${daysBeforeRepeat} dní.`;
    } else if (total >= 50) {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-yellow-50 text-yellow-700';
        msg.className   = 'text-xs mt-1.5 text-yellow-600';
        msg.textContent = `⚠️ Môže sa opakovať — email sa zopakuje raz za ~${daysBeforeRepeat} dní. Odporúčame aspoň ${MONTHLY_MAX_EMAILS} variant.`;
    } else {
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-600';
        msg.className   = 'text-xs mt-1.5 text-red-600';
        msg.textContent = `🛑 Príliš málo variant — email sa zopakuje raz za ~${daysBeforeRepeat} dní. Odporúčame aspoň ${MONTHLY_MAX_EMAILS} variant.`;
    }
}

['emailSubjects', 'emailGreetings', 'emailClosings', 'emailDevice'].forEach(id => {
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
