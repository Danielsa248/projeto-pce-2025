// Mirth Connect configuration
export const MIRTH_CONFIG = {
    url: "http://localhost:4080/",
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json', // application/fhir+json
        'Accept': 'application/fhir+json'
    }
};

// Test Mirth Connect connection
export async function testMirthConnection() {
    try {
        console.log(`Testing Mirth Connect connection to: ${MIRTH_CONFIG.url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Test the actual Mirth endpoint with a GET request
        const response = await fetch(MIRTH_CONFIG.url, {
            method: 'GET',
            headers: {
                'Accept': '*/*'  // Accept any response type
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Any response from Mirth means it's running and reachable
        console.log(`✅ Mirth Connect responded with status: ${response.status}`);
        
        return { 
            success: true,
            connected: true, 
            status: response.status,
            statusText: response.statusText,
            mirthUrl: MIRTH_CONFIG.url
        };
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⚠️ Mirth Connect connection timeout');
            return { success: false, connected: false, status: 'Timeout', error: 'Connection timeout' };
        } else if (error.cause?.code === 'ECONNREFUSED') {
            console.log('⚠️ Mirth Connect connection refused');
            return { success: false, connected: false, status: 'Connection Refused', error: 'Server not reachable' };
        } else {
            console.log('⚠️ Mirth Connect connection failed:', error.message);
            return { success: false, connected: false, status: 'Error', error: error.message };
        }
    }
}

// Send FHIR resource to Mirth
export async function sendToMirth(fhirResource) {
    console.log(`Sending FHIR ${fhirResource.resourceType} to: ${MIRTH_CONFIG.url}`);
    
    const requestBody = JSON.stringify(fhirResource);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MIRTH_CONFIG.timeout);
    
    try {
        const response = await fetch(MIRTH_CONFIG.url, {
            method: 'POST',
            headers: MIRTH_CONFIG.headers,
            body: requestBody,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`Mirth response: ${response.status} ${response.statusText}`);
        const responseText = await response.text();
        console.log(`Response body: ${responseText}`);
        
        if (!response.ok) {
            throw new Error(`Mirth Connect error: ${response.status} ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
