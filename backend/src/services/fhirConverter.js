import * as info_trat from '../services/clean_info.js';

export class FHIRConverter {
    static convertGlucoseToFHIR(rawData, userId, timestamp) {
        try {
            const processed = info_trat.extractGlucoseInfo(rawData);
            
            const fhirResource = {
                resourceType: "Observation",
                id: `glucose-${Date.now()}`,
                meta: {
                    profile: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"]
                },
                status: "final",
                category: [{
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/observation-category",
                        code: "vital-signs",
                        display: "Vital Signs"
                    }]
                }],
                code: {
                    coding: [{
                        system: "http://loinc.org",
                        code: "33747-0",
                        display: "Glucose [Mass/volume] in Blood"
                    }]
                },
                subject: {
                    reference: `Patient/${userId}`
                },
                effectiveDateTime: new Date(timestamp).toISOString(),
                valueQuantity: {
                    value: processed.ValorGlicose,
                    unit: "mg/dL",
                    system: "http://unitsofmeasure.org",
                    code: "mg/dL"
                },
                component: processed.Regime ? [{
                    code: {
                        coding: [{
                            system: "http://snomed.info/sct",
                            code: "226529007",
                            display: "Food intake"
                        }]
                    },
                    valueString: processed.Regime
                }] : []
            };
            
            console.log(`Generated Glucose FHIR resource for patient ${userId}`);
            return fhirResource;
        } catch (error) {
            console.error(`Error converting Glucose to FHIR:`, error);
            throw error;
        }
    }

    static convertInsulinToFHIR(rawData, userId, timestamp) {
        try {
            const processed = info_trat.extractInsulinInfo(rawData);
            
            const fhirResource = {
                resourceType: "MedicationAdministration",
                id: `insulin-${Date.now()}`,
                meta: {
                    profile: ["http://hl7.org/fhir/StructureDefinition/MedicationAdministration"]
                },
                status: "completed",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "5856",
                        display: "Insulin"
                    }]
                },
                subject: {
                    reference: `Patient/${userId}`
                },
                effectiveDateTime: new Date(timestamp).toISOString(),
                dosage: {
                    dose: {
                        value: processed.ValorInsulina,
                        unit: "units",
                        system: "http://unitsofmeasure.org",
                        code: "U"
                    },
                    route: {
                        coding: [{
                            system: "http://snomed.info/sct",
                            code: processed.Rota === "Intravenosa" ? "47625008" : "34206005",
                            display: processed.Rota || "Subcutaneous"
                        }]
                    }
                }
            };
            
            console.log(`Generated Insulin FHIR resource for patient ${userId} (${processed.ValorInsulina} units)`);
            return fhirResource;
        } catch (error) {
            console.error(`Error converting Insulin to FHIR:`, error);
            throw error;
        }
    }
}
