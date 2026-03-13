// --- CONFIGURAZIONE ---
const SUPABASE_URL = "https://fibkznmnroplmacvnsmj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYmt6bm1ucm9wbG1hY3Zuc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjczMTEsImV4cCI6MjA4NDEwMzMxMX0.8-Ra-QmU2KsMFktEO7RG27rREeFUm7_tsOe1nTx0ZZE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supabaseClient;

const loginSection = document.getElementById('loginSection');
const loginForm = document.getElementById('loginForm');
const adminDashboard = document.getElementById('adminDashboard');
const eventForm = document.getElementById('eventForm');
const tagForm = document.getElementById('tagForm');
const eventsList = document.getElementById('eventsList');
const tagsList = document.getElementById('tagsList');
const eventTagSelect = document.getElementById('eventTag');
const filterTimeSelect = document.getElementById('filterTime');
const cancelEditBtn = document.getElementById('cancelEdit');
const submitBtn = document.getElementById('submitBtn');
const formTitle = document.getElementById('formTitle');
const btnLogout = document.getElementById('btnLogout');

window.currentUserId = null;
let allTags = [];

const COMMON_ICONS = [
    'bx-star', 'bx-heart', 'bx-calendar', 'bx-time', 'bx-map', 
    'bx-camera', 'bx-music', 'bx-film', 'bx-game-album', 'bx-football',
    'bx-bus', 'bx-walk', 'bx-cycling', 'bx-map-pin', 'bx-party',
    'bx-dish', 'bx-coffee', 'bx-cake', 'bx-glass', 'bx-microphone',
    'bx-church', 'bx-bible', 'bx-cross', 'bx-pray', 'bx-brain',
    'bx-group', 'bx-user', 'bx-smile', 'bx-happy', 'bx-heart-circle',
    'bx-flag', 'bx-landscape', 'bx-mountain', 'bx-sun', 'bx-moon',
    'bx-gift', 'bx-award', 'bx-medal', 'bx-trophy', 'bx-target-lock'
];

// --- INIZIALIZZAZIONE ---

// Controlla sessione esistente
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        try {
            // Verifica il ruolo dell'utente
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('role, username')
                .eq('id', session.user.id);

            if (error) {
                alert('Errore recupero profilo: ' + error.message);
                showLogin();
                return;
            }

            if (!data || data.length === 0) {
                alert('Utente non registrato nel database. Contatta l\'amministratore.');
                showLogin();
                return;
            }

            const profile = data[0];

            // Solo gli admin possono accedere
            if (profile.role === 'admin') {
                currentUserId = session.user.id;
                window.currentUsername = profile.username;
                
                loginSection.style.display = 'none';
                adminDashboard.style.display = 'block';
                
                initIconPicker();
                loadTags();
                loadEvents();
                
                if (filterTimeSelect) {
                    filterTimeSelect.onchange = loadEvents;
                }
                loadLogs();
            } else {
                alert('Accesso negato. Solo gli amministratori possono entrare.');
                showLogin();
            }
        } catch (err) {
            alert("Errore durante l'accesso: " + err.message);
            showLogin();
        }
    } else {
        currentUserId = null;
        showLogin();
    }
});

// --- GESTIONE UI ---

function showDashboard() {
    loginSection.style.display = 'none';
    adminDashboard.style.display = 'block';
}

function showLogin() {
    loginSection.style.display = 'block';
    adminDashboard.style.display = 'none';
    
    // Ripristina il pulsante se era rimasto in caricamento
    const btn = loginForm.querySelector('button');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Accedi";
    }
}

// --- AUTENTICAZIONE ---

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const pass = document.getElementById('loginPass').value;
    const btn = loginForm.querySelector('button');
    const originalText = btn.innerText;

    btn.disabled = true;
    btn.innerText = "Accesso in corso...";

    try {
        let email = identifier;

        // Se non è un'email, la trattiamo come username
        if (!identifier.includes('@')) {
            const { data, error: rpcError } = await supabaseClient.rpc('get_email_from_username', {
                p_username: identifier
            });

            if (rpcError) {
                throw new Error(`Errore recupero email: ${rpcError.message}`);
            }
            if (!data) {
                throw new Error("Username non trovato.");
            }
            email = data;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pass,
        });

        if (error) {
            throw error;
        }
        // onAuthStateChange gestirà il passaggio alla dashboard
    } catch (err) {
        alert("Errore login: " + err.message);
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

async function logout() {
    console.log("Pulsante logout cliccato...");
    try {
        // Timeout di sicurezza per evitare blocchi infiniti
        const timeout = setTimeout(() => {
            console.warn("SignOut timeout, forzando reload...");
            window.location.reload();
        }, 1500);

        await supabaseClient.auth.signOut();
        clearTimeout(timeout);
        console.log("Sessione chiusa con successo.");
        window.location.reload();
    } catch (err) {
        console.error("Errore durante il logout:", err);
        window.location.reload();
    }
}

// Event Delegation per il pulsante logout (più affidabile)
document.addEventListener('click', function(e) {
    if (e.target && (e.target.id === 'btnLogout' || e.target.closest('#btnLogout'))) {
        logout();
    }
});

// Rendi logout accessibile globalmente come backup
window.logout = logout;

// --- LOGGING ---
// Le funzioni logAction e loadLogs sono state spostate in logs.js

// --- GESTIONE ICONE ---

function initIconPicker() {
    const picker = document.getElementById('iconPicker');
    const input = document.getElementById('tagIcon');
    const preview = document.getElementById('iconPreview');
    if (!picker) return;

    picker.innerHTML = COMMON_ICONS.map(icon => `
        <div class="icon-item" data-icon="bx ${icon}" title="${icon}">
            <i class='bx ${icon}'></i>
        </div>
    `).join('');

    picker.querySelectorAll('.icon-item').forEach(item => {
        item.onclick = () => {
            picker.querySelectorAll('.icon-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const fullIconClass = item.dataset.icon;
            input.value = fullIconClass;
            preview.innerHTML = `<i class='${fullIconClass}'></i>`;
        };
    });
}

// --- CRUD TAG ---

async function loadTags() {
    const { data, error } = await supabaseClient.from('tags').select('*').order('name');
    if (error) {
        console.error("Errore caricamento tag:", error);
        return;
    }
    allTags = data;
    renderTags();
    populateTagSelect();
}

function renderTags() {
    if (!tagsList) return;
    tagsList.innerHTML = allTags.map(t => `
        <div class="d-flex justify-content-between align-items-center mb-1 border-bottom border-secondary pb-1">
            <span><i class='${t.icon}'></i> ${t.label} <small class="text-muted">(${t.name})</small></span>
            <button class="btn btn-link btn-sm text-danger p-0" onclick="deleteTag('${t.id}')"><i class='bx bx-x'></i></button>
        </div>
    `).join('');
}

function populateTagSelect() {
    if (!eventTagSelect) return;
    const currentVal = eventTagSelect.value;
    eventTagSelect.innerHTML = allTags.map(t => `
        <option value="${t.name}">${t.label}</option>
    `).join('');
    if (currentVal) eventTagSelect.value = currentVal;
}

tagForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('tagName').value.trim().toLowerCase();
    const label = document.getElementById('tagLabel').value.trim();
    const icon = document.getElementById('tagIcon').value.trim();
    const color_class = document.getElementById('tagColor').value;

    const { error } = await supabaseClient.from('tags').insert([{ name, label, icon, color_class }]);
    if (error) {
        alert("Errore salvataggio tag: " + error.message);
    } else {
        tagForm.reset();
        loadTags();
    }
};

async function deleteTag(id) {
    if (!confirm("Sei sicuro? Se il tag è usato da degli eventi, l'eliminazione fallirà.")) return;
    const { error } = await supabaseClient.from('tags').delete().eq('id', id);
    if (error) alert("Errore: " + error.message);
    else loadTags();
}

// --- CRUD EVENTI ---

async function loadEvents() {
    eventsList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-info"></div></div>';
    
    let query = supabaseClient.from('events').select('*');
    
    // Applica filtro se necessario
    if (filterTimeSelect && filterTimeSelect.value === 'future') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('date', today);
    }
    
    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
        eventsList.innerHTML = `<div class="alert alert-danger">Errore caricamento: ${error.message}</div>`;
        return;
    }

    if (data.length === 0) {
        eventsList.innerHTML = '<div class="text-center text-muted py-4">Nessun evento trovato.</div>';
        return;
    }

    eventsList.innerHTML = data.map(event => `
        <div class="event-item d-flex justify-content-between align-items-start">
            <div>
                <div class="fw-bold">${new Date(event.date).toLocaleDateString('it-IT')} ore ${event.time_start || '21:00'}-${event.time_end || '22:30'} - ${event.titolo}</div>
                <div class="small text-muted">${event.luogo} • Tag: ${event.tag}</div>
                <div class="small mt-1">${event.testo || ''}</div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-info" onclick="editEvent('${event.id}')"><i class='bx bx-edit'></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent('${event.id}')"><i class='bx bx-trash'></i></button>
            </div>
        </div>
    `).join('');
}

eventForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('eventId').value;
    const date = document.getElementById('eventDate').value;
    const time_start = document.getElementById('eventTimeStart').value;
    const time_end = document.getElementById('eventTimeEnd').value;
    const titolo = document.getElementById('eventTitle').value;
    const tag = document.getElementById('eventTag').value;
    const luogo = document.getElementById('eventPlace').value;
    const testo = document.getElementById('eventText').value;

    const selectedTagObj = allTags.find(t => t.name === tag);
    const tag_label = selectedTagObj ? selectedTagObj.label : tag;

    const eventData = { date, time_start, time_end, titolo, tag, tag_label, luogo, testo };

    let res;
    if (id) {
        // Update
        res = await supabaseClient.from('events').update(eventData).eq('id', id);
    } else {
        // Insert
        res = await supabaseClient.from('events').insert([eventData]);
    }

    if (res.error) {
        alert("Errore salvataggio: " + res.error.message);
    } else {
        const action = id ? 'UPDATE_EVENT' : 'CREATE_EVENT';
        logAction(action, { title: titolo });
        resetForm();
        loadEvents();
        loadLogs();
    }
};

async function deleteEvent(id) {
    if (!confirm("Sei sicuro di voler eliminare questo evento?")) return;

    // Get event details for logging before deleting
    const { data: eventData, error: fetchError } = await supabaseClient.from('events').select('titolo').eq('id', id).single();
    if (fetchError) {
        console.error('Could not fetch event for logging', fetchError);
    }

    const { error } = await supabaseClient.from('events').delete().eq('id', id);

    if (error) {
        alert("Errore eliminazione: " + error.message);
    } else {
        if (eventData) {
            logAction('DELETE_EVENT', { title: eventData.titolo });
        }
        loadEvents();
        loadLogs();
    }
}

async function editEvent(id) {
    const { data, error } = await supabaseClient.from('events').select('*').eq('id', id).single();
    
    if (error) {
        alert("Errore recupero dati: " + error.message);
        return;
    }

    document.getElementById('eventId').value = data.id;
    document.getElementById('eventDate').value = data.date;
    document.getElementById('eventTimeStart').value = data.time_start || '21:00';
    document.getElementById('eventTimeEnd').value = data.time_end || '22:30';
    document.getElementById('eventTitle').value = data.titolo;
    document.getElementById('eventTag').value = data.tag;
    document.getElementById('eventPlace').value = data.luogo;
    document.getElementById('eventText').value = data.testo;

    formTitle.innerText = "Modifica Evento";
    submitBtn.innerText = "Aggiorna Evento";
    cancelEditBtn.classList.remove('d-none');
}

function resetForm() {
    eventForm.reset();
    document.getElementById('eventId').value = "";
    formTitle.innerText = "Aggiungi Evento";
    submitBtn.innerText = "Salva Evento";
    cancelEditBtn.classList.add('d-none');
}

cancelEditBtn.onclick = resetForm;

// --- FINE ---
// Nota: La gestione dei log è ora in logs.js
