import express from 'express';
import { FHIRConverter } from '../services/fhirConverter.js';
import { sendToMirth, testMirthConnection, MIRTH_CONFIG } from '../services/mirth.js'
import { authenticateToken } from '../middleware/auth.js';
import { getRecordById } from '../db/registos.js';

const router = express.Router();

// Send individual record to Mirth
router.post('/send/:recordId', authenticateToken, async (req, res) => {
    try {
        const { recordId } = req.params;
        const userId = req.user.id;
        
        console.log(`Attempting to send record ${recordId} for user ${userId}`);
        
        // Get record from database
        const record = await getRecordById(recordId, userId);
        if (!record) {
            console.log(`Record ${recordId} not found for user ${userId}`);
            return res.status(404).json({ error: 'Record not found' });
        }

        console.log(`Found record: ${record.tipo_registo} from ${record.data_registo}`);
        
        // Convert to FHIR
        let fhirResource;
        if (record.tipo_registo === 'Glucose') {
            console.log(`Converting Glucose record to FHIR...`);
            fhirResource = FHIRConverter.convertGlucoseToFHIR(
                record.dados, userId, record.data_registo
            );
        } else if (record.tipo_registo === 'Insulina') {
            console.log(`Converting Insulin record to FHIR...`);
            fhirResource = FHIRConverter.convertInsulinToFHIR(
                record.dados, userId, record.data_registo
            );
        } else {
            console.log(`Unsupported record type: ${record.tipo_registo}`);
            return res.status(400).json({ error: 'Unsupported record type' });
        }

        // Validate FHIR resource before sending
        if (!fhirResource) {
            console.log(`FHIR conversion returned null/undefined`);
            return res.status(500).json({ error: 'Failed to convert record to FHIR format' });
        }

        if (!fhirResource.resourceType) {
            console.log(`Generated FHIR resource missing resourceType`);
            return res.status(500).json({ error: 'Invalid FHIR resource generated' });
        }

        // Send to Mirth Connect
        const mirthResponse = await sendToMirth(fhirResource);
        
        console.log(`Successfully sent to Mirth. Status: ${mirthResponse.status}`);
        
        res.json({ 
            success: true, 
            fhirResource,
            mirthResponse: {
                status: mirthResponse.status,
                statusText: mirthResponse.statusText
            }
        });
    } catch (error) {
        console.error('Error sending FHIR record:', error);
        
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

        console.log(`Starting bulk send of ${recordIds.length} records`);

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

                console.log(`Successfully sent record ${recordId}`);

            } catch (recordError) {
                console.error(`Error processing record ${recordId}:`, recordError);
                errors.push({ recordId, error: recordError.message });
            }
        }

        console.log(`Bulk send completed. Success: ${results.length}, Errors: ${errors.length}`);

        res.json({
            success: true,
            processed: results.length,
            errors: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Error in bulk send:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test connection endpoint
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

export default router;
