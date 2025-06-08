const BACKEND_URL = "http://localhost:3000";

const getToken = () => localStorage.getItem('token');

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
    'Accept': 'application/json'
});

export async function sendRecordToFHIR(recordId) {
    const response = await fetch(`${BACKEND_URL}/api/fhir/send/${recordId}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar dados FHIR');
    }
    
    return response.json();
}

export async function sendBulkRecordsToFHIR(recordIds, options = {}) {
    const response = await fetch(`${BACKEND_URL}/api/fhir/send-bulk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recordIds, ...options })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar dados FHIR em lote');
    }
    
    return response.json();
}

export async function testMirthConnection() {
    const response = await fetch(`${BACKEND_URL}/api/fhir/test-connection`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao testar conexão com Mirth');
    }
    
    return response.json();
}
