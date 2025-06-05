const BACKEND_URL = "http://localhost:3000"

export async function obterMarcacoes(utilizadorId) {
    const res = await fetch(`${BACKEND_URL}/api/agenda?utilizador=${utilizadorId}`);
    if (!res.ok) throw new Error('Erro ao obter marcações');
    return res.json();
}

export async function criarMarcacao({ utilizador, tipo_registo, data_evento, notas }) {
    const res = await fetch(`${BACKEND_URL}/api/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilizador, tipo_registo, data_evento, notas })
    });
    if (!res.ok) throw new Error('Erro ao criar marcação');
    return res.json();
}

export async function marcarComoRealizado(id) {
    const res = await fetch(`${BACKEND_URL}/api/agenda/${id}/realizado`, {
        method: 'PATCH'
    });
    if (!res.ok) throw new Error('Erro ao marcar como realizado');
    return res.json();
}

export async function apagarMarcacao(id) {
    const res = await fetch(`${BACKEND_URL}/api/agenda/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Erro ao apagar marcação');
}
