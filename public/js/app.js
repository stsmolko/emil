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
const dashboardSection = document.getElementById('dashboardSection');
const settingsSection = document.getElementById('settingsSection');
const radySection = document.getElementById('radySection');

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

function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('border-b-2', 'border-primary', 'text-gray-900');
        btn.classList.add('text-gray-500');
    });

    dashboardSection.classList.add('hidden');
    settingsSection.classList.add('hidden');
    radySection.classList.add('hidden');

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
        
        // Load 7-day chart
        await load7DayChart();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
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

async function loadContacts() {
    try {
        const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
        
        onSnapshot(q, (snapshot) => {
            contactsTable.innerHTML = '';

            const total = snapshot.size;
            const remaining = snapshot.docs.filter(d => !d.data().sent).length;
            statTotal.textContent = total;
            statRemaining.textContent = remaining;

            if (snapshot.empty) {
                contactsTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                            Žiadne kontakty. Pridajte nový kontakt alebo importujte CSV.
                        </td>
                    </tr>
                `;
                return;
            }
            
            snapshot.forEach((docSnap) => {
                const contact = docSnap.data();
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition';
                
                const statusBadge = contact.sent 
                    ? '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Odoslané</span>'
                    : '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Čaká</span>';
                
                const sentDate = contact.sentAt 
                    ? new Date(contact.sentAt.toDate()).toLocaleString('sk-SK')
                    : '-';
                
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-700">${contact.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${contact.email}</td>
                    <td class="px-6 py-4 text-sm">${statusBadge}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${sentDate}</td>
                    <td class="px-6 py-4 text-sm">
                        <button onclick="deleteContact('${docSnap.id}')" 
                                class="text-red-600 hover:text-red-700 font-medium">
                            Zmazať
                        </button>
                    </td>
                `;
                contactsTable.appendChild(row);
            });
            
            loadDashboard();
        });
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

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

addContactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    
    try {
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

importBtn.addEventListener('click', async () => {
    const file = csvFile.files[0];
    if (!file) {
        alert('Vyberte CSV súbor');
        return;
    }
    
    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const [name, email] = lines[i].split(',').map(s => s.trim());
            if (email && name) {
                await addDoc(collection(db, 'contacts'), {
                    email,
                    name,
                    sent: false,
                    createdAt: serverTimestamp()
                });
                imported++;
            }
        }
        
        alert(`Importovaných ${imported} kontaktov!`);
        csvFile.value = '';
        csvFileName.textContent = '';
    } catch (error) {
        console.error('Error importing CSV:', error);
        alert('Chyba pri importovaní CSV');
    }
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
        }
        
        const emailDoc = smtpDoc.docs.find(doc => doc.id === 'email');
        if (emailDoc) {
            const data = emailDoc.data();
            if (data.subjects) {
                document.getElementById('emailSubjects').value = data.subjects.join('\n');
            }
            if (data.greetings) {
                document.getElementById('emailGreetings').value = data.greetings.join('\n');
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

smtpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const host = document.getElementById('smtpHost').value;
    const port = parseInt(document.getElementById('smtpPort').value);
    const user = document.getElementById('smtpUser').value;
    const pass = document.getElementById('smtpPass').value;
    const from = user; // Use the same email as user (avoid spam filters)
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
    
    try {
        await setDoc(doc(db, 'settings', 'smtp'), {
            host,
            port,
            user,
            pass,
            from
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

// ─── Spam Score Checker ───────────────────────────────────────────────────────

const SPAM_WORDS = [
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
    'free', 'click here', 'buy now', 'limited offer', 'guaranteed',
    'act now', 'winner', 'cash prize', 'no risk', 'order now',
];

const TECHNICAL_CAPS = [
    'PDF', 'HTML', 'SMTP', 'CSS', 'API', 'URL', 'IT', 'SR', 'ČR',
    'EÚ', 'EU', 'NALY', 'GPS', 'DIČ', 'IČO', 'DPH', 'GDPR', 'SRO',
    'IČ', 'DPH', 'IČ DPH', 'IČDPH', 'SK', 'CZ', 'MBA', 'PhD', 'MSc',
    'PS',
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
    return html;
}

document.getElementById('spamCheckBtn').addEventListener('click', () => {
    const subjects = splitEntries(document.getElementById('emailSubjects').value);
    const body = document.getElementById('emailBody').value.trim();

    if (!subjects.length && !body) {
        alert('Najprv vyplňte predmety alebo telo emailu.');
        return;
    }

    const subjectText = subjects.join(' | ');
    const subjectHtml = subjectText
        ? analyzeText(subjectText, '📋 Predmety emailov')
        : '<p class="text-xs text-gray-400 px-2">Žiadne predmety na kontrolu.</p>';

    const bodyHtml = body
        ? analyzeText(body, '✉️ Telo emailu', subjectText)
        : '<p class="text-xs text-gray-400 px-2">Žiadne telo emailu na kontrolu.</p>';

    document.getElementById('spamSubjectResult').innerHTML = subjectHtml;
    document.getElementById('spamBodyResult').innerHTML = bodyHtml;
    document.getElementById('spamResults').classList.remove('hidden');
});
