import * as info_trat from './clean_info.js';

export class FHIRConverter {
    
    /**
     * Combines date and time into ISO string format
     * If both date and time are provided, combines them; otherwise uses date only
     */
    static formatDateTime(date, time) {
        if (!date) return new Date().toISOString();
        
        try {
            if (time) {
                // Ensure time has seconds if not provided
                const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
                const dateTimeString = `${date}T${timeWithSeconds}`;
                const parsedDate = new Date(dateTimeString);
                
                // Check if date is valid
                if (isNaN(parsedDate.getTime())) {
                    console.warn(`Invalid datetime combination: ${date}T${timeWithSeconds}, using date only`);
                    return new Date(date).toISOString();
                }
                
                return parsedDate.toISOString();
            } else {
                // Use date only, set time to start of day
                return new Date(date).toISOString();
            }
        } catch (error) {
            console.warn(`Error formatting datetime: ${error.message}, using current time`);
            return new Date().toISOString();
        }
    }

    /**
     * Creates a proper identifier for the resource
     */
    static createIdentifier(type, userId, timestamp) {
        return `${type}-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Converts duration array to total minutes and returns FHIR Quantity
     * Handles format: [{ unit: 'Hora(s)', value: '1' }, { unit: 'Minuto(s)', value: '8' }, { unit: 'Segundo(s)', value: '' }]
     */
    static convertDurationToQuantity(duration) {
        if (!duration || !Array.isArray(duration)) return null;
        
        let totalMinutes = 0;
        
        for (const timeUnit of duration) {
            if (!timeUnit.value || timeUnit.value === '') continue;
            
            const value = parseFloat(timeUnit.value);
            if (isNaN(value)) continue;
            
            switch (timeUnit.unit) {
                case 'Hora(s)':
                    totalMinutes += value * 60;
                    break;
                case 'Minuto(s)':
                    totalMinutes += value;
                    break;
                case 'Segundo(s)':
                    totalMinutes += value / 60;
                    break;
            }
        }
        
        if (totalMinutes === 0) return null;
        
        return {
            value: Math.round(totalMinutes * 100) / 100, // Round to 2 decimal places
            unit: "min",
            system: "http://unitsofmeasure.org",
            code: "min"
        };
    }

    /**
     * Convert glucose measurement to comprehensive FHIR Observation
     */
    static convertGlucoseToFHIR(rawData, userId, timestamp) {
        try {
            const processed = info_trat.extractGlucoseInfo(rawData);
            
            if (!processed || !processed.ValorGlicose) {
                throw new Error("Invalid glucose data: missing glucose value");
            }

            const effectiveDateTime = this.formatDateTime(processed.DataMedicao, processed.HoraMedicao) || new Date(timestamp).toISOString();
            
            const fhirResource = {
                resourceType: "Observation",
                id: this.createIdentifier("glucose", userId, timestamp),
                meta: {
                    versionId: "1",
                    lastUpdated: new Date().toISOString()
                },
                identifier: [{
                    use: "usual",
                    system: "http://your-healthcare-system.com/glucose-measurements",
                    value: this.createIdentifier("glucose", userId, timestamp)
                }],
                status: "final",
                category: [{
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/observation-category",
                        code: "survey",
                        display: "Survey"
                    }]
                }],
                code: {
                    coding: [{
                        system: "http://loinc.org",
                        code: "15074-8",
                        display: "Glucose [Moles/volume] in Blood"
                    }]
                },
                subject: {
                    reference: `Patient/${userId}`
                },
                effectiveDateTime: effectiveDateTime,
                issued: new Date().toISOString(),
                performer: [{
                    reference: `Patient/${userId}`
                }],
                valueQuantity: {
                    value: parseFloat(processed.ValorGlicose),
                    unit: "mg/dL",
                    system: "http://unitsofmeasure.org",
                    code: "mg/dL"
                },
                component: []
            };

            // Add meal state component
            if (processed.Regime) {
                fhirResource.component.push({
                    code: {
                        text: "Diet regime"
                    },
                    valueString: processed.Regime
                });
            }

            // Add meal calories component
            if (processed.Calorias) {
                fhirResource.component.push({
                    code: {
                        text: "Meal calories"
                    },
                    valueQuantity: {
                        value: parseFloat(processed.Calorias),
                        unit: "calories"
                    }
                });
            }

            // Add time since meal component
            const timeSinceMeal = this.convertDurationToQuantity(processed.TempoDesdeUltimaRefeicao);
            if (timeSinceMeal) {
                fhirResource.component.push({
                    code: {
                        text: "Time since last meal"
                    },
                    valueQuantity: {
                        value: timeSinceMeal.value,
                        unit: "minutes"
                    }
                });
            }

            // Add exercise duration component
            const exerciseDuration = this.convertDurationToQuantity(processed.TempoDesdeExercicio);
            if (exerciseDuration) {
                fhirResource.component.push({
                    code: {
                        text: "Exercise duration"
                    },
                    valueQuantity: {
                        value: exerciseDuration.value,
                        unit: "minutes"
                    }
                });
            }

            // Add exercise calories component
            if (processed.CaloriasExercicio) {
                fhirResource.component.push({
                    code: {
                        text: "Exercise calories burned"
                    },
                    valueQuantity: {
                        value: parseFloat(processed.CaloriasExercicio),
                        unit: "calories"
                    }
                });
            }

            // Add current weight component
            if (processed.PesoAtual) {
                fhirResource.component.push({
                    code: {
                        text: "Current weight"
                    },
                    valueQuantity: {
                        value: parseFloat(processed.PesoAtual),
                        unit: "kg"
                    }
                });
            }

            // Add notes as annotation
            if (processed.NomeRegisto) {
                fhirResource.note = [{
                    text: processed.NomeRegisto
                }];
            }

            console.log(`Generated comprehensive Glucose FHIR resource for patient ${userId}`);
            return fhirResource;
            
        } catch (error) {
            console.error(`Error converting Glucose to FHIR:`, error);
            throw new Error(`Failed to convert glucose data to FHIR: ${error.message}`);
        }
    }

    /**
     * Convert insulin administration to FHIR MedicationAdministration
     */
    static convertInsulinToFHIR(rawData, userId, timestamp) {
        try {
            const processed = info_trat.extractInsulinInfo(rawData);
            
            if (!processed || !processed.ValorInsulina) {
                throw new Error("Invalid insulin data: missing insulin value");
            }

            const occurenceDateTime = this.formatDateTime(processed.DataMedicao, processed.HoraMedicao) || new Date(timestamp).toISOString();
            
            // Map route to SNOMED CT codes
            const routeMapping = {
                "Subcutânea": { code: "34206005", display: "Subcutaneous route" },
                "Intravenosa": { code: "47625008", display: "Intravenous route" },
                "Intramuscular": { code: "78421000", display: "Intramuscular route" }
            };
            
            const routeInfo = routeMapping[processed.Rota] || { code: "34206005", display: "Subcutaneous route" };
            
            const fhirResource = {
                resourceType: "MedicationAdministration",
                id: this.createIdentifier("insulin", userId, timestamp),
                meta: {
                    profile: ["http://hl7.org/fhir/StructureDefinition/MedicationAdministration"],
                    versionId: "1",
                    lastUpdated: new Date().toISOString()
                },
                identifier: [{
                    use: "usual",
                    system: "http://your-healthcare-system.com/insulin-administrations",
                    value: this.createIdentifier("insulin", userId, timestamp)
                }],
                status: "completed",
                medication: {
                    concept: {
                        coding: [{
                            system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                            code: "253182",
                            display: "insulin, regular, human"
                        }],
                        text: "Insulin"
                    }
                },
                subject: {
                    reference: `Patient/${userId}`
                },
                occurenceDateTime: occurenceDateTime,
                recorded: new Date().toISOString(),
                dosage: {
                    text: `${processed.ValorInsulina} units administered ${processed.Rota ? processed.Rota.toLowerCase() : 'subcutaneously'}`,
                    route: {
                        coding: [{
                            system: "http://snomed.info/sct",
                            code: routeInfo.code,
                            display: routeInfo.display
                        }],
                        text: processed.Rota || "Subcutaneous"
                    },
                    method: {
                        coding: [{
                            system: "http://snomed.info/sct",
                            code: "422145002",
                            display: "Inject"
                        }]
                    },
                    dose: {
                        value: parseFloat(processed.ValorInsulina),
                        unit: "units",
                        system: "http://unitsofmeasure.org",
                        code: "U"
                    }
                },
                performer: [{
                    actor: {
                        reference: {
                            reference: `Patient/${userId}`
                        }
                    }
                }]
            };

            // Add notes if present
            if (processed.NomeRegisto) {
                fhirResource.note = [{
                    text: processed.NomeRegisto
                }];
            }

            console.log(`Generated Insulin MedicationAdministration FHIR resource for patient ${userId} (${processed.ValorInsulina} units)`);
            return fhirResource;
            
        } catch (error) {
            console.error(`Error converting Insulin to FHIR:`, error);
            throw new Error(`Failed to convert insulin data to FHIR: ${error.message}`);
        }
    }

    /**
     * Validates basic FHIR resource structure
     */
    static validateResource(resource) {
        const requiredFields = {
            "Observation": ["resourceType", "status", "code", "subject"],
            "MedicationAdministration": ["resourceType", "status", "medication", "subject", "occurenceDateTime"]
        };

        const required = requiredFields[resource.resourceType];
        if (!required) {
            throw new Error(`Unknown resource type: ${resource.resourceType}`);
        }

        for (const field of required) {
            if (!resource[field]) {
                throw new Error(`Missing required field: ${field} in ${resource.resourceType}`);
            }
        }

        return true;
    }
}
