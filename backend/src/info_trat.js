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

        const glucoseValue = data["items.0.0.items.2.items.0.value.value"] || null;
        
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
            "Routa": route,
        }

    } catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
    }   
}