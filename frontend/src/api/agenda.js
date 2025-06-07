const BACKEND_URL = "http://localhost:3000"

// Função para obter o token
const getToken = () => {
    return localStorage.getItem('token');
};

// Função para criar headers com autenticação
const getAuthHeaders = () => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };
};


export async function obterMarcacoes() {
    const token = getToken();
    
    if (!token) {
        throw new Error('Token de autenticação não encontrado');
    }

    const res = await fetch(`${BACKEND_URL}/api/agenda/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    
    if (!res.ok) {
        const errorText = await res.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ao obter marcações: ${res.status}`);
    }
    
    return res.json();
}


export async function criarMarcacao({ tipo_registo, data_evento, notas }) {
    const res = await fetch(`${BACKEND_URL}/api/agenda`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tipo_registo, data_evento, notas })
    });
    
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ erro: 'Erro desconhecido' }));
        throw new Error(errorData.erro || 'Erro ao criar marcação');
    }
    
    return res.json();
}

export async function alterarStatusMarcacao(id, realizado) {
    const res = await fetch(`${BACKEND_URL}/api/agenda/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ realizado })
    });
    
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ erro: 'Erro desconhecido' }));
        throw new Error(errorData.erro || 'Erro ao alterar status da marcação');
    }
    
    return res.json();
}

export async function apagarMarcacao(id) {
    const token = getToken();
    
    if (!token) {
        throw new Error('Token de autenticação não encontrado');
    }

    const res = await fetch(`${BACKEND_URL}/api/agenda/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ erro: 'Erro desconhecido' }));
        throw new Error(errorData.erro || 'Erro ao apagar marcação');
    }
}
