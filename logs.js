/**
 * logs.js - Gestione dello storico attività (Logging)
 * Questo file gestisce la registrazione e la visualizzazione delle azioni admin.
 */

// Funzione per registrare un'azione nel database
async function logAction(action, details = {}) {
    try {
        // Verifica se supabaseClient è disponibile (definito in admin.js)
        if (typeof supabaseClient === 'undefined') {
            console.error('supabaseClient non trovato in logs.js');
            return;
        }

        await supabaseClient.from('logs').insert([{
            user_id: currentUserId,           // Variabile globale da admin.js
            username: window.currentUsername, // Variabile globale da admin.js
            action: action,
            details: details
        }]);
        console.log(`Log registrato: ${action}`, details);
    } catch (error) {
        console.error('Errore durante la registrazione del log:', error);
    }
}

// Funzione per caricare e visualizzare i log nella dashboard
async function loadLogs() {
    const logsList = document.getElementById('logsList');
    if (!logsList) return;

    try {
        const { data, error } = await supabaseClient
            .from('logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            logsList.innerHTML = `<div class="alert alert-danger">Errore caricamento log: ${error.message}</div>`;
            return;
        }

        if (data.length === 0) {
            logsList.innerHTML = '<div class="text-center text-muted py-3">Nessuna attività registrata.</div>';
            return;
        }

        logsList.innerHTML = data.map(log => {
            const date = new Date(log.created_at).toLocaleString('it-IT');
            const details = log.details ? `<code>${JSON.stringify(log.details)}</code>` : '';
            return `
                <div class="d-flex justify-content-between align-items-start border-bottom border-secondary py-2">
                    <div>
                        <strong>${log.action}</strong> by <em>${log.username || 'system'}</em><br>
                        <span class="text-muted small">${details}</span>
                    </div>
                    <small class="text-muted text-nowrap ms-2">${date}</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Errore durante il caricamento dei log:', err);
    }
}

// Rendi le funzioni disponibili globalmente
window.logAction = logAction;
window.loadLogs = loadLogs;
