export function extractGlucoseInfo(composition) {
    try {
        const data = typeof composition === 'string' ? JSON.parse(composition) : composition;

        let notesText = "";
        try {
            const richText = JSON.parse(data["items.0.0.items.0.value"]);
            if (richText.blocks && richText.blocks.length > 0) {
                notesText = richText.blocks.map(block => block.text).join('\n');
            }
        } catch (error) {
            console.error("Error parsing rich text:", error);
        }

        const measurementDate = data["items.0.0.items.1.value.date"] || null;

        const measurementTime = data["items.0.0.items.1.value.time"] || null;

        const glucoseValue = data["items.0.0.items.2.items.0.value.value"];
        
        const mealState = data["items.0.0.items.3.items.0.value"]?.text || null;
        
        const mealCalories = data["items.0.0.items.3.items.1.value.value"] || null;
        
        const timeSinceMeal = data["items.0.0.items.3.items.2.value"] || [];

        const exDuration = data["items.0.0.items.4.items.0.value"] || [];
        
        const exCalories = data["items.0.0.items.4.items.1.value.value"] || null;

        const weight = data["items.0.0.items.5.items.0.value.value"] || null;
        
        return {
            "NomeRegisto": notesText,
            "DataMedicao": measurementDate,
            "HoraMedicao": measurementTime,
            "ValorGlicose": glucoseValue,
            "Regime": mealState,
            "Calorias": mealCalories,
            "TempoDesdeUltimaRefeicao": timeSinceMeal,
            "TempoDesdeExercicio": exDuration,
            "CaloriasExercicio": exCalories,
            "PesoAtual": weight
        }

    } catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
    }   
}


export function extractInsulinInfo(composition) {
    try {
        const data = typeof composition === 'string' ? JSON.parse(composition) : composition;

        let notesText = "";
        try {
            const richText = JSON.parse(data["items.0.0.items.0.value"]);
            if (richText.blocks && richText.blocks.length > 0) {
                notesText = richText.blocks.map(block => block.text).join('\n');
            }
        } catch (error) {
            console.error("Error parsing rich text:", error);
        }

        const measurementDate = data["items.0.0.items.1.value.date"] || null;

        const measurementTime = data["items.0.0.items.1.value.time"] || null;

        const insulinValue = data["items.0.0.items.2.items.0.value.value"] || null;
        
        const route = data["items.0.0.items.3.items.0.value"]?.text || null;
        
        
        return {
            "NomeRegisto": notesText,
            "DataMedicao": measurementDate,
            "HoraMedicao": measurementTime,
            "ValorInsulina": insulinValue,
            "Rota": route,
        }

    } catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
    }   
}


function processContactos(contactosArray) {
    const numerosTelemovel = [];
    const emails = [];
    const errors = {};
        
    if (!Array.isArray(contactosArray)) {
        console.error("Contactos não é um array");
        return { numerosTelemovel: [], emails: [], errors: { format: "Formato inválido" } };
    }
    
    // Loop through each contact item in the array
    contactosArray.forEach((contact, index) => {
                
        let contactType = null;
        let contactValue = null;
        
        // Get the contact type (may be directly in the contact object or in values)
        if (contact.values && contact.values["items.0.0.items.0.items.3.items.0.value"]) {
            contactType = contact.values["items.0.0.items.0.items.3.items.0.value"].text;
        } else {
            contactType = contact["items.0.0.items.0.items.3.items.0.value"]?.text || null;
        }
        
        // Get the contact value (rich text)
        let richTextValue;
        if (contact.values && contact.values["items.0.0.items.0.items.3.items.1.value"]) {
            richTextValue = contact.values["items.0.0.items.0.items.3.items.1.value"];
        } else {
            richTextValue = contact["items.0.0.items.0.items.3.items.1.value"];
        }
        
        // Process rich text value
        try {
            if (richTextValue) {
                const parsedValue = JSON.parse(richTextValue);
                if (parsedValue.blocks && parsedValue.blocks.length > 0) {
                    contactValue = parsedValue.blocks.map(block => block.text).join('');
                }
            }
        } catch (error) {
            console.error(`Error parsing contact value:`, error, richTextValue);
        }
                
        if (contactValue) {
            // Convert to string to ensure string methods work
            const contactValueStr = String(contactValue).trim();
            
            // More robust email detection - either explicitly marked as email or contains @
            if (contactType?.toLowerCase().includes('email') || contactValueStr.includes('@')) {
                // Email validation using regex
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                if (!emailRegex.test(contactValueStr)) {
                    // Add error if email format is invalid
                    errors[`email_${index}`] = `Email inválido: ${contactValueStr}. Formato incorreto.`;
                } else {
                    // Add only if valid
                    emails.push({
                        id: contact.id || index,
                        value: contactValueStr,
                        type: contactType || 'Email'
                    });
                }
            } else {
                // Phone number validation code remains the same
                const cleanPhone = contactValueStr.replace(/[\s\-\(\)\.\+]/g, '');
                
                if (!/^\d+$/.test(cleanPhone)) {
                    errors[`phone_${index}`] = `Número de telefone inválido: ${contactValueStr}. Deve conter apenas dígitos.`;
                } else {
                    numerosTelemovel.push({
                        id: contact.id || index, 
                        value: contactValueStr,
                        type: contactType || 'Telemóvel'
                    });
                }
            }
        }
    });
        
    return { numerosTelemovel, emails, errors };
}

export function extractUserInfo(composition) {
    try {
        const data = typeof composition === 'string' ? JSON.parse(composition) : composition;
        
        const parseRichText = (path) => {
            try {
                if (!data[path]) return null;
                const richText = JSON.parse(data[path]);
                if (richText.blocks && richText.blocks.length > 0) {
                    return richText.blocks.map(block => block.text).join('\n');
                }
                return null;
            } catch (error) {
                console.error(`Error parsing rich text at ${path}:`, error);
                return null;
            }
        };
        
        const nome = parseRichText('items.0.0.items.0.items.0.value');

        const validateNumericField = (value, fieldName) => {
            if (!value) return null;
            
            const trimmed = value.trim();
            if (!/^\d+$/.test(trimmed)) {
                return `O campo ${fieldName} deve conter apenas números.`;
            }
            return null;
        };

        const numeroUtente = parseRichText('items.0.0.items.0.items.1.value');
        const numeroUtenteError = validateNumericField(numeroUtente, 'Número de Utente');
        
        const morada = {
            endereco: parseRichText('items.0.0.items.0.items.2.items.0.value'),
            cidade: parseRichText('items.0.0.items.0.items.2.items.1.value'),
            distrito: parseRichText('items.0.0.items.0.items.2.items.2.value'),
            codigoPostal: parseRichText('items.0.0.items.0.items.2.items.3.value'),
            pais: parseRichText('items.0.0.items.0.items.2.items.4.value')
        };
        
        const contactos = data['items.0.0.items.0.items.3.value'] || [];
        const { numerosTelemovel, emails, errors: contactErrors } = processContactos(contactos);

        const genero = data['items.0.0.items.0.items.4.items.0.value']?.text[0] || null;
        
        const altura = data['items.0.0.items.0.items.5.items.0.value.value'] || null;
        
        const peso = data['items.0.0.items.0.items.5.items.1.value.value'] || null; 
                
        const dataNascimento = data['items.0.0.items.0.items.6.items.0.value'] || null;

        const errors = {};
        if (numeroUtenteError) {
            errors.numeroUtente = numeroUtenteError;
        }

        // Add contact errors to the main errors object if any exist
        if (Object.keys(contactErrors).length > 0) {
            errors.contactos = contactErrors;
        }
        
        return {
            "Nome": nome,
            "NumeroUtente": numeroUtente,
            "Morada": morada,
            "Contactos": {
                "telefones": numerosTelemovel,
                "emails": emails
            },
            "Genero": genero,
            "Altura": altura,
            "Peso": peso,
            "DataNascimento": dataNascimento,
            "valid": Object.keys(errors).length === 0,
            "errors": errors
        };
        
    } catch (error) {
        console.error("Error extracting user information:", error);
        return null;
    }
}