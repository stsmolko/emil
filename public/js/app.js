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
const dashboardSection = document.getElementById('dashboardSection');
const settingsSection = document.getElementById('settingsSection');

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

function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('border-b-2', 'border-primary', 'text-gray-900');
        btn.classList.add('text-gray-500');
    });
    
    if (tab === 'dashboard') {
        dashboardTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        dashboardTab.classList.remove('text-gray-500');
        dashboardSection.classList.remove('hidden');
        settingsSection.classList.add('hidden');
        loadDashboard();
    } else if (tab === 'settings') {
        settingsTab.classList.add('border-b-2', 'border-primary', 'text-gray-900');
        settingsTab.classList.remove('text-gray-500');
        dashboardSection.classList.add('hidden');
        settingsSection.classList.remove('hidden');
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
            document.getElementById('emailBody').value = data.emailBody || '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

smtpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const host = document.getElementById('smtpHost').value;
    const port = parseInt(document.getElementById('smtpPort').value);
    const user = document.getElementById('smtpUser').value;
    const pass = document.getElementById('smtpPass').value;
    const from = user; // Use the same email as user (avoid spam filters)
    const subjects = document.getElementById('emailSubjects').value
        .split('\n')
        .filter(s => s.trim())
        .map(s => s.trim());
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
            emailBody
        });
        
        settingsSuccess.innerHTML = `✅ Nastavenia úspešne uložené!<br><small>Počet predmetov: ${subjects.length}</small>`;
        settingsSuccess.classList.remove('hidden');
        setTimeout(() => {
            settingsSuccess.classList.add('hidden');
        }, 3000);
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Chyba pri ukladaní nastavení');
    }
});
