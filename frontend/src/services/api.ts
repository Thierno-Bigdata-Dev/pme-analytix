const BASE_API_URL = ''; // Relative path because Nginx proxies both to the same host/port

async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('pme_token');
    
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {})
    };
    
    const response = await fetch(`${BASE_API_URL}${path}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token expired or invalid, log out
        localStorage.removeItem('pme_token');
        window.dispatchEvent(new Event('auth-changed'));
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMsg = errorData.detail || errorData.message;
        if (!errorMsg && errorData.errors && Array.isArray(errorData.errors)) {
            errorMsg = errorData.errors.slice(0, 3).join(' ; ');
            if (errorData.errors.length > 3) {
                errorMsg += ` (+ ${errorData.errors.length - 3} autres)`;
            }
        }
        throw new Error(errorMsg || `API Error: ${response.status}`);
    }
    
    return response.json();
}

export const api = {
    async login(email: string, password: string, source?: string) {
        const payload: any = { email, password };
        if (source) {
            payload.source = source;
        }
        const data = await apiFetch('/api/core/auth/login/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (data.access) {
            localStorage.setItem('pme_token', data.access);
            window.dispatchEvent(new Event('auth-changed'));
        }
        return data;
    },
    
    logout() {
        localStorage.removeItem('pme_token');
        window.dispatchEvent(new Event('auth-changed'));
    },
    
    isAuthenticated(): boolean {
        return !!localStorage.getItem('pme_token');
    },
    
    getUserEmail(): string | null {
        const token = localStorage.getItem('pme_token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.email || null;
        } catch {
            return null;
        }
    },
    
    getTreasuryForecast(pmeId: number) {
        return apiFetch(`/api/ml/previsions/${pmeId}/`);
    },
    
    getCreditScore(pmeId: number) {
        return apiFetch(`/api/ml/score/${pmeId}/`);
    },
    
    getReports(pmeId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/rapport/`);
    },
    
    triggerReport(pmeId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/rapport/`, {
            method: 'POST'
        });
    },
    
    getSubscription(pmeId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/abonnement/`);
    },
    
    updateSubscription(pmeId: number, plan: string) {
        return apiFetch(`/api/core/pme/${pmeId}/abonnement/`, {
            method: 'POST',
            body: JSON.stringify({ plan })
        });
    },
    
    register(nomPme: string, secteur: string, siren: string, email: string, password: string) {
        return apiFetch('/api/core/auth/register/', {
            method: 'POST',
            body: JSON.stringify({ nom_pme: nomPme, secteur, siren, email, password })
        });
    },
    
    importCSV(pmeId: number, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return apiFetch(`/api/core/pme/${pmeId}/import/`, {
            method: 'POST',
            body: formData
        });
    },

    createTransaction(pmeId: number, data: { date: string; montant: number; type: 'credit' | 'debit'; categorie: string; description?: string }) {
        return apiFetch(`/api/core/pme/${pmeId}/import/`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    getTransactions(pmeId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/import/`);
    },
    
    updateTransaction(pmeId: number, transactionId: number, data: { date?: string; montant?: number; type?: 'credit' | 'debit'; categorie?: string; description?: string }) {
        return apiFetch(`/api/core/pme/${pmeId}/import/${transactionId}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteTransaction(pmeId: number, transactionId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/import/${transactionId}/`, {
            method: 'DELETE'
        });
    },
    
    getPmeId(): number | null {
        const token = localStorage.getItem('pme_token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.pme_id || null;
        } catch {
            return null;
        }
    },
    
    getUserRole(): string {
        const token = localStorage.getItem('pme_token');
        if (!token) return '';
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role || '';
        } catch {
            return '';
        }
    },
    
    getPMEs() {
        return apiFetch('/api/core/pmes/');
    },
    
    getRendezVous(pmeId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/rendezvous/`);
    },
    
    createRendezVous(pmeId: number, date: string, heure: string, partenaire: string, motif: string) {
        return apiFetch(`/api/core/pme/${pmeId}/rendezvous/`, {
            method: 'POST',
            body: JSON.stringify({ date, heure, partenaire, motif })
        });
    },

    runEDA(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return apiFetch('/api/ml/eda/', {
            method: 'POST',
            body: formData
        });
    },

    runCleanEDA(file: File, options: { drop_duplicates: boolean; impute_numeric: string; impute_categorical: string; handle_outliers: string }) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('drop_duplicates', String(options.drop_duplicates));
        formData.append('impute_numeric', options.impute_numeric);
        formData.append('impute_categorical', options.impute_categorical);
        formData.append('handle_outliers', options.handle_outliers);
        return apiFetch('/api/ml/eda/clean/', {
            method: 'POST',
            body: formData
        });
    },

    runEDADashboard(file: File, config: { metric: string; dimension: string; secondaryDimension?: string; dateCol?: string; aggregation: string }) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metric', config.metric);
        formData.append('dimension', config.dimension);
        if (config.secondaryDimension) formData.append('secondary_dimension', config.secondaryDimension);
        if (config.dateCol) formData.append('date_col', config.dateCol);
        formData.append('aggregation', config.aggregation);
        return apiFetch('/api/ml/eda/dashboard/', {
            method: 'POST',
            body: formData
        });
    },

    trainPredictor(file: File, config: { target: string; features: string[]; algo: string }) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('target', config.target);
        formData.append('features', config.features.join(','));
        formData.append('algo', config.algo);
        return apiFetch('/api/ml/eda/predict/train/', {
            method: 'POST',
            body: formData
        });
    },

    runPredictor(modelId: string, inputs: Record<string, any>) {
        return apiFetch('/api/ml/eda/predict/run/', {
            method: 'POST',
            body: JSON.stringify({ model_id: modelId, inputs })
        });
    },

    runSimulation(config: {
        pme_id?: number;
        marketing_budget: number;
        recruitment_cost: number;
        new_markets: boolean;
        revenue_growth_rate: number;
        expense_inflation_rate: number;
    }) {
        return apiFetch('/api/ml/simulation/', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },

    getAlerts(pmeId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/alerts/`);
    },
    
    refreshAlerts(pmeId: number) {
        return apiFetch(`/api/core/pme/${pmeId}/alerts/`, {
            method: 'POST'
        });
    },
    
    updateAlertStatus(pmeId: number, alertId: number, status: string) {
        return apiFetch(`/api/core/pme/${pmeId}/alerts/${alertId}/`, {
            method: 'PUT',
            body: JSON.stringify({ statut: status })
        });
    },
    
    sendChatMessage(pmeId: number, message: string) {
        return apiFetch(`/api/ml/chat/${pmeId}/`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }
};
