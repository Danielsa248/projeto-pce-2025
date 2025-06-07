import express from 'express';
import { FHIRConverter } from '../services/fhirConverter.js';
import { authenticateToken } from '../middleware/auth.js';
import { getRecordById } from './db.js';

// Mirth Connect configuration
const MIRTH_CONFIG = {
    url: "http://localhost:4080/",
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json', // fhir+json
        'Accept': 'application/fhir+json'
    }
};

const router = express.Router();

// Test Mirth Connect connection
async function testMirthConnection() {
    try {
        console.log(`Testing Mirth Connect connection to: ${MIRTH_CONFIG.url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MIRTH_CONFIG.timeout);
        
        // Try health check first
        const healthUrl = MIRTH_CONFIG.url.replace('/fhir', '/health');
        const response = await fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Mirth Connect connection successful:', data.status);
            return { connected: true, status: data.status };
        } else {
            console.log(`⚠️ Mirth Connect responded with status: ${response.status}`);
            return { connected: false, status: `HTTP ${response.status}`, error: response.statusText };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⚠️ Mirth Connect connection timeout');
            return { connected: false, status: 'Timeout', error: 'Connection timeout' };
        } else if (error.cause?.code === 'ECONNREFUSED') {
            console.log('⚠️ Mirth Connect connection refused');
            return { connected: false, status: 'Connection Refused', error: 'Server not reachable' };
        } else {
            console.log('⚠️ Mirth Connect connection failed:', error.message);
            return { connected: false, status: 'Error', error: error.message };
        }
    }
}

// Send individual record to Mirth
router.post('/send/:recordId', authenticateToken, async (req, res) => {
    try {
        const { recordId } = req.params;
        const userId = req.user.id;
        
        console.log(`📤 Attempting to send record ${recordId} for user ${userId}`);
        
        // Get record from database
        const record = await getRecordById(recordId, userId);
        if (!record) {
            console.log(`❌ Record ${recordId} not found for user ${userId}`);
            return res.status(404).json({ error: 'Record not found' });
        }

        console.log(`📋 Found record: ${record.tipo_registo} from ${record.data_registo}`);
        
        // Convert to FHIR
        let fhirResource;
        if (record.tipo_registo === 'Glucose') {
            console.log(`🧪 Converting Glucose record to FHIR...`);
            fhirResource = FHIRConverter.convertGlucoseToFHIR(
                record.dados, userId, record.data_registo
            );
        } else if (record.tipo_registo === 'Insulina') {
            console.log(`💉 Converting Insulin record to FHIR...`);
            fhirResource = FHIRConverter.convertInsulinToFHIR(
                record.dados, userId, record.data_registo
            );
        } else {
            console.log(`❌ Unsupported record type: ${record.tipo_registo}`);
            return res.status(400).json({ error: 'Unsupported record type' });
        }

        // Validate FHIR resource before sending
        if (!fhirResource) {
            console.log(`❌ FHIR conversion returned null/undefined`);
            return res.status(500).json({ error: 'Failed to convert record to FHIR format' });
        }

        if (!fhirResource.resourceType) {
            console.log(`❌ Generated FHIR resource missing resourceType`);
            return res.status(500).json({ error: 'Invalid FHIR resource generated' });
        }

        // Send to Mirth Connect
        const mirthResponse = await sendToMirth(fhirResource);
        
        console.log(`✅ Successfully sent to Mirth. Status: ${mirthResponse.status}`);
        
        res.json({ 
            success: true, 
            fhirResource,
            mirthResponse: {
                status: mirthResponse.status,
                statusText: mirthResponse.statusText
            }
        });
    } catch (error) {
        console.error('❌ Error sending FHIR record:', error);
        
        // Provide specific error messages
        let errorMessage = error.message;
        let statusCode = 500;
        
        if (error.cause?.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to Mirth Connect. Please verify the server is running.';
            statusCode = 503;
        } else if (error.name === 'AbortError') {
            errorMessage = 'Request to Mirth Connect timed out.';
            statusCode = 504;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: {
                originalError: error.message,
                mirthUrl: MIRTH_CONFIG.url
            }
        });
    }
});

// Bulk send records
router.post('/send-bulk', authenticateToken, async (req, res) => {
    try {
        const { recordIds } = req.body;
        const userId = req.user.id;
        
        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty recordIds array' });
        }

        const results = [];
        const errors = [];

        console.log(`📤 Starting bulk send of ${recordIds.length} records`);

        for (const recordId of recordIds) {
            try {
                const record = await getRecordById(recordId, userId);
                if (!record) {
                    errors.push({ recordId, error: 'Record not found' });
                    continue;
                }

                let fhirResource;
                if (record.tipo_registo === 'Glucose') {
                    fhirResource = FHIRConverter.convertGlucoseToFHIR(
                        record.dados, userId, record.data_registo
                    );
                } else if (record.tipo_registo === 'Insulina') {
                    fhirResource = FHIRConverter.convertInsulinToFHIR(
                        record.dados, userId, record.data_registo
                    );
                } else {
                    errors.push({ recordId, error: 'Unsupported record type' });
                    continue;
                }

                const mirthResponse = await sendToMirth(fhirResource);
                
                results.push({
                    recordId,
                    success: true,
                    status: mirthResponse.status
                });

                console.log(`✅ Successfully sent record ${recordId}`);

            } catch (recordError) {
                console.error(`❌ Error processing record ${recordId}:`, recordError);
                errors.push({ recordId, error: recordError.message });
            }
        }

        console.log(`📊 Bulk send completed. Success: ${results.length}, Errors: ${errors.length}`);

        res.json({
            success: true,
            processed: results.length,
            errors: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('❌ Error in bulk send:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test connection endpoint - clean implementation
router.get('/test-connection', authenticateToken, async (req, res) => {
    try {
        const connectionResult = await testMirthConnection();
        
        res.json({
            success: true,
            connected: connectionResult.connected,
            mirthUrl: MIRTH_CONFIG.url,
            status: connectionResult.status,
            timestamp: new Date().toISOString(),
            ...(connectionResult.error && { error: connectionResult.error }),
            suggestions: !connectionResult.connected ? [
                'Check if Mirth Connect is running',
                'Verify the URL and port number', 
                'Check network connectivity',
                'Ensure FHIR channels are configured'
            ] : []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            mirthUrl: MIRTH_CONFIG.url,
            timestamp: new Date().toISOString()
        });
    }
});

// Send to Mirth function - simplified
async function sendToMirth(fhirResource) {
    console.log(`📡 Sending FHIR ${fhirResource.resourceType} to: ${MIRTH_CONFIG.url}`);
    
    const requestBody = JSON.stringify(fhirResource);
    console.log(`📤 Request body length: ${requestBody.length}`);
    console.log(`📤 First 200 chars: ${requestBody.substring(0, 200)}...`);
    
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
        
        console.log(`📨 Mirth response: ${response.status} ${response.statusText}`);
        
        // Try to read response body for debugging
        const responseText = await response.text();
        console.log(`📨 Response body: ${responseText}`);
        
        if (!response.ok) {
            throw new Error(`Mirth Connect error: ${response.status} ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

export default router;