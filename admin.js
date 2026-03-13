// --- CONFIGURAZIONE ---
const SUPABASE_URL = "https://fibkznmnroplmacvnsmj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYmt6bm1ucm9wbG1hY3Zuc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjczMTEsImV4cCI6MjA4NDEwMzMxMX0.8-Ra-QmU2KsMFktEO7RG27rREeFUm7_tsOe1nTx0ZZE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supabaseClient;

const loginSection = document.getElementById('loginSection');
const loginForm = document.getElementById('loginForm');
const adminDashboard = document.getElementById('adminDashboard');
const passwordChangeSection = document.getElementById('passwordChangeSection');
const passwordChangeForm = document.getElementById('passwordChangeForm');
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
const loadingOverlay = document.getElementById('loadingOverlay');

window.currentUserId = null;
let allTags = [];
let editingEventData = null; // Per tracciare modifiche ai log

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

// Gestione visibilità sezioni e overlay
let loadingHidden = false;
function hideLoading() {
    if (loadingHidden) return;
    loadingHidden = true;
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 400);
    }
}

// Timeout di sicurezza: se dopo 5 secondi siamo ancora su caricamento, forziamo il login
setTimeout(() => {
    if (!loadingHidden) {
        console.warn("Safety timeout: forzando visualizzazione login");
        showLogin();
    }
}, 5000);

function showDashboard() {
    loginSection.style.display = 'none';
    passwordChangeSection.style.display = 'none';
    adminDashboard.style.display = 'block';
    hideLoading();
}

function showPasswordChange() {
    loginSection.style.display = 'none';
    adminDashboard.style.display = 'none';
    passwordChangeSection.style.display = 'block';
    hideLoading();
}

function showLogin() {
    loginSection.style.display = 'block';
    adminDashboard.style.display = 'none';
    passwordChangeSection.style.display = 'none';
    hideLoading();
    
    // Ripristina il pulsante se era rimasto in caricamento
    const btn = loginForm.querySelector('button');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Accedi";
    }
}

// Funzione principale di controllo accesso
async function checkUser(session) {
    if (session) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('role, username, must_change_password')
                .eq('id', session.user.id);

            if (error) {
                console.error("Profile fetch error:", error);
                showLogin();
                return;
            }

            if (!data || data.length === 0) {
                showLogin();
                return;
            }

            const profile = data[0];

            if (profile.role === 'admin') {
                window.currentUserId = session.user.id;
                window.currentUsername = profile.username;
                
                // Mostra nome utente nella navbar
                const userDisplay = document.getElementById('currentUserDisplay');
                if (userDisplay) userDisplay.innerText = profile.username;

                // Verifica se deve cambiare password
                if (profile.must_change_password) {
                    showPasswordChange();
                } else {
                    showDashboard();
                initIconPicker();
                loadTags();
                loadEvents();
                loadTeam(); // Carica l'elenco utenti
                
                if (filterTimeSelect) {
                    filterTimeSelect.onchange = loadEvents;
                }
                loadLogs();
                }
            } else {
                alert('Accesso negato. Solo gli amministratori possono entrare.');
                showLogin();
            }
        } catch (err) {
            console.error("Auth check error:", err);
            showLogin();
        }
    } else {
        window.currentUserId = null;
        showLogin();
    }
}

// Avvio immediato e ascolto cambiamenti
(async () => {
    // 1. Controlla sessione subito al caricamento
    const { data: { session } } = await supabaseClient.auth.getSession();
    await checkUser(session);

    // 2. Ascolta cambiamenti futuri (login/logout)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth event:", event);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            await checkUser(session);
        }
    });
})();

// --- GESTIONE UI ---
// Nota: showDashboard e showLogin sono state spostate sopra per visibilità

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

passwordChangeForm.onsubmit = async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const btn = passwordChangeForm.querySelector('button');

    if (newPass !== confirmPass) {
        alert("Le password non coincidono!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Aggiornamento in corso...";

    try {
        // 1. Aggiorna password in Auth
        const { error: authError } = await supabaseClient.auth.updateUser({
            password: newPass
        });

        if (authError) throw authError;

        // 2. Aggiorna flag in Profiles
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', window.currentUserId);

        if (profileError) throw profileError;

        logAction('PASSWORD_CHANGED', { info: 'L\'utente ha aggiornato la password al primo accesso' });
        alert("Password aggiornata con successo! Benvenuto.");
        showDashboard();
        
        // Carica dati dashboard
        initIconPicker();
        loadTags();
        loadEvents();
        loadTeam();
        if (filterTimeSelect) filterTimeSelect.onchange = loadEvents;
        loadLogs();

    } catch (err) {
        alert("Errore aggiornamento: " + err.message);
        btn.disabled = false;
        btn.innerText = "Aggiorna Password e Accedi";
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
    if (allTags.length === 0) {
        tagsList.innerHTML = '<p class="text-muted small text-center py-2">Nessun tag creato.</p>';
        return;
    }
    
    tagsList.innerHTML = `
        <div class="d-flex flex-wrap gap-2 pt-2">
            ${allTags.map(t => `
                <div class="tag-pill d-flex align-items-center gap-2 px-2 py-1 rounded-pill border border-secondary bg-dark-subtle" style="font-size: 0.8rem;">
                    <i class='${t.icon} text-info'></i>
                    <span class="text-white">${t.label}</span>
                    <button class="btn btn-link btn-sm text-danger p-0 lh-1" onclick="deleteTag('${t.id}')" title="Elimina tag">
                        <i class='bx bx-x-circle'></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
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
        logAction('CREATE_TAG', { name, label });
        tagForm.reset();
        loadTags();
    }
};

async function deleteTag(id) {
    if (!confirm("Sei sicuro? Se il tag è usato da degli eventi, l'eliminazione fallirà.")) return;
    
    // Recupera info per log
    const { data: tagData } = await supabaseClient.from('tags').select('label').eq('id', id).single();
    
    const { error } = await supabaseClient.from('tags').delete().eq('id', id);
    if (error) {
        alert("Errore: " + error.message);
    } else {
        if (tagData) logAction('DELETE_TAG', { label: tagData.label });
        loadTags();
    }
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
        eventsList.innerHTML = '<div class="text-center text-muted py-5"><i class="bx bx-calendar-x fs-1 mb-2"></i><br>Nessun evento trovato.</div>';
        return;
    }

    const format = d => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });

    eventsList.innerHTML = `
        <div class="list-group list-group-flush mt-2">
            ${data.map(event => {
                const tagObj = allTags.find(t => t.name === event.tag) || { label: event.tag, color_class: 'badge-secondary', icon: 'bx-tag' };
                const tagIcon = tagObj.icon.startsWith('bx') ? tagObj.icon : `bx ${tagObj.icon}`;
                
                return `
                    <div class="list-group-item bg-transparent border-secondary border-opacity-25 px-0 py-2">
                        <div class="d-flex align-items-center gap-3 cursor-pointer p-2 rounded hover-bg" onclick="toggleEventActions('${event.id}')" style="cursor: pointer; transition: background 0.2s;">
                            <div class="text-center" style="min-width: 50px;">
                                <div class="fw-bold text-white small">${format(event.date)}</div>
                                <div class="text-muted" style="font-size: 0.65rem;">${event.time_start || '21:00'}</div>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-semibold text-info mb-0">${event.titolo}</div>
                                <div class="text-muted small d-flex align-items-center gap-1">
                                    <i class='${tagIcon}' style="font-size: 0.8rem;"></i> ${tagObj.label}
                                </div>
                            </div>
                        </div>
                        
                        <div id="actions-${event.id}" class="d-none mt-2 ps-5 pb-2">
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-info px-3" onclick="editEvent('${event.id}')">
                                    <i class='bx bx-edit-alt'></i> Modifica
                                </button>
                                <button class="btn btn-sm btn-outline-danger px-3" onclick="deleteEvent('${event.id}')">
                                    <i class='bx bx-trash'></i> Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Funzione per mostrare/nascondere le azioni di un evento
window.toggleEventActions = (id) => {
    const actionsDiv = document.getElementById(`actions-${id}`);
    const allActions = document.querySelectorAll('[id^="actions-"]');
    
    const isOpening = actionsDiv.classList.contains('d-none');

    // Chiudi tutti gli altri
    allActions.forEach(el => el.classList.add('d-none'));

    // Toggle quello selezionato
    if (isOpening) {
        actionsDiv.classList.remove('d-none');
    }
};

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
        let logDetails = { title: titolo };

        if (id && editingEventData) {
            // Calcola differenze per il log stile Discord
            const changes = [];
            const fields = [
                { key: 'date', label: 'Data' },
                { key: 'time_start', label: 'Ora Inizio' },
                { key: 'time_end', label: 'Ora Fine' },
                { key: 'titolo', label: 'Nome Evento' },
                { key: 'tag', label: 'Tag' },
                { key: 'luogo', label: 'Luogo' },
                { key: 'testo', label: 'Descrizione' }
            ];

            fields.forEach(f => {
                const oldVal = String(editingEventData[f.key] || '');
                const newVal = String(eventData[f.key] || '');
                if (oldVal !== newVal) {
                    changes.push({ field: f.label, old: oldVal, new: newVal });
                }
            });

            if (changes.length > 0) {
                logDetails.changes = changes;
            }
        } else if (!id) {
            // Nuovo evento: logga dettagli base più completi
            logDetails.info = `${date} alle ${time_start}`;
            logDetails.location = luogo;
        }

        logAction(action, logDetails);
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

window.deleteEvent = deleteEvent;

async function editEvent(id) {
    console.log("Modifica evento:", id);
    const { data, error } = await supabaseClient.from('events').select('*').eq('id', id).single();
    
    if (error) {
        alert("Errore recupero dati: " + error.message);
        return;
    }

    editingEventData = data; // Salva per il log dei cambiamenti

    document.getElementById('eventId').value = data.id;
    document.getElementById('eventDate').value = data.date;
    document.getElementById('eventTimeStart').value = data.time_start || '21:00';
    document.getElementById('eventTimeEnd').value = data.time_end || '22:00';
    document.getElementById('eventTitle').value = data.titolo;
    document.getElementById('eventTag').value = data.tag;
    document.getElementById('eventPlace').value = data.luogo;
    document.getElementById('eventText').value = data.testo;

    formTitle.innerText = "Modifica Evento";
    submitBtn.innerText = "Aggiorna Evento";
    cancelEditBtn.classList.remove('d-none');

    // Scorri fino al form
    document.getElementById('eventForm').scrollIntoView({ behavior: 'smooth' });
}

window.editEvent = editEvent;

function resetForm() {
    eventForm.reset();
    document.getElementById('eventId').value = "";
    editingEventData = null; // Pulisce stato log
    formTitle.innerText = "Aggiungi Evento";
    submitBtn.innerText = "Salva Evento";
    cancelEditBtn.classList.add('d-none');
}

cancelEditBtn.onclick = resetForm;

// --- FINE ---
// Nota: La gestione dei log è ora in logs.js

// --- GESTIONE TEAM ---

async function loadTeam() {
    const teamList = document.getElementById('teamList');
    if (!teamList) return;

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('username, role, must_change_password')
            .order('username', { ascending: true });

        if (error) throw error;

        teamList.innerHTML = data.map(member => {
            const statusClass = member.must_change_password ? 'text-warning' : 'text-success';
            const statusIcon = member.must_change_password ? 'bx-lock-alt' : 'bx-check-shield';
            const statusText = member.must_change_password ? 'In attesa' : 'Attivo';

            return `
                <tr>
                    <td>
                        <div class="fw-semibold text-white">${member.username}</div>
                    </td>
                    <td>
                        <span class="${statusClass} small d-flex align-items-center gap-1">
                            <i class='bx ${statusIcon}'></i> ${statusText}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-info-subtle text-info border border-info-subtle small text-uppercase" style="font-size: 0.65rem;">${member.role}</span>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Errore caricamento team:", err);
        teamList.innerHTML = `<tr><td colspan="3" class="text-center text-danger small py-3">Errore: ${err.message}</td></tr>`;
    }
}
