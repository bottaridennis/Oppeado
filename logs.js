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
            user_id: window.currentUserId,    // Variabile globale da admin.js
            username: window.currentUsername, // Variabile globale da admin.js
            action: action,
            details: details
        }]);
        console.log(`Log registrato: ${action}`, details);
    } catch (error) {
        console.error('Errore durante la registrazione del log:', error);
    }
}

// Funzione per caricare e visualizzare i log nella dashboard (versione compatta per admin.html)
async function loadLogs() {
    const logsList = document.getElementById('logsList');
    if (!logsList) return;
    renderDiscordLogs(logsList, 10); // Mostra solo gli ultimi 10 nella dashboard
}

// Funzione potente per il rendering in stile Discord
async function renderDiscordLogs(container, limit = 50) {
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from('logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            container.innerHTML = `<div class="alert alert-danger">Errore caricamento log: ${error.message}</div>`;
            return;
        }

        if (data.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-3">Nessuna attività registrata.</div>';
            return;
        }

        container.innerHTML = data.map(log => {
            const date = new Date(log.created_at).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            
            let logClass = '';
            let actionText = '';
            let icon = 'bx-info-circle';
            
            // Logica per stile Discord
            if (log.action.includes('CREATE')) {
                logClass = 'log-create';
                icon = 'bx-plus-circle';
                actionText = 'ha creato';
            } else if (log.action.includes('UPDATE')) {
                logClass = 'log-update';
                icon = 'bx-edit-alt';
                actionText = 'ha modificato';
            } else if (log.action.includes('DELETE')) {
                logClass = 'log-delete';
                icon = 'bx-trash';
                actionText = 'ha eliminato';
            } else {
                actionText = 'ha eseguito';
            }

            // Descrizione specifica basata sul tipo
            let targetType = log.action.includes('EVENT') ? 'l\'evento' : (log.action.includes('TAG') ? 'il tag' : '');
            let targetName = log.details?.title || log.details?.name || log.details?.label || 'un elemento';

            // Formattazione dettagli
            let detailsHtml = '';
            if (log.details && Object.keys(log.details).length > 0) {
                // Se ci sono differenze (per update)
                if (log.details.changes) {
                    detailsHtml = '<div class="log-details">';
                    log.details.changes.forEach(change => {
                        // Stile Discord per il cambio valori
                        detailsHtml += `<div class="mb-1">
                            <span class="text-secondary small text-uppercase fw-bold" style="font-size: 0.7rem;">${change.field}</span><br>
                            <span class="diff-old">${change.old || 'Nessuno'}</span> 
                            <i class='bx bx-right-arrow-alt text-muted mx-1'></i> 
                            <span class="diff-new">${change.new || 'Nessuno'}</span>
                        </div>`;
                    });
                    detailsHtml += '</div>';
                } else if (log.action.includes('CREATE')) {
                    // Per la creazione, mostriamo i dati inseriti
                    detailsHtml = '<div class="log-details">';
                    const entries = Object.entries(log.details).filter(([k]) => k !== 'title' && k !== 'name');
                    entries.forEach(([key, val]) => {
                        detailsHtml += `<div><span class="text-secondary small text-uppercase fw-bold" style="font-size: 0.7rem;">${key}</span>: ${val}</div>`;
                    });
                    detailsHtml += '</div>';
                }
            }

            return `
                <div class="log-item ${logClass}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <i class='bx ${icon} fs-5'></i>
                                <span class="log-user">${log.username || 'Sistema'}</span>
                                <span class="log-time opacity-50">• ${date}</span>
                            </div>
                            <div class="log-action">${actionText} ${targetType} <strong>${targetName}</strong></div>
                        </div>
                    </div>
                    ${detailsHtml}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Errore durante il rendering dei log:', err);
        container.innerHTML = `<div class="alert alert-danger">Errore critico: ${err.message}</div>`;
    }
}

// Rendi le funzioni disponibili globalmente
window.logAction = logAction;
window.loadLogs = loadLogs;
window.renderDiscordLogs = renderDiscordLogs;

