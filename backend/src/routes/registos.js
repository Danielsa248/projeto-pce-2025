import express from 'express';
import * as bd from '../db/registos.js';
import { authenticateToken } from '../middleware/auth.js';
import * as info_trat from '../services/clean_info.js';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();


// Rota para guardar na BD o json
router.post("/compositions", authenticateToken, async (req, res) => {
    let { type, composition } = req.body;
    if (typeof composition === "string") {
        composition = JSON.parse(composition);
    }

    const id = uuidv4();
    const data_registo = new Date();
    const userId = req.user.id;

    try {
        let tipo = null;
        if (type === "Medição de Insulina") {
            tipo = "Insulina";
        } 
        else if (type === "Medição de Glicose") {
            tipo = "Glucose";
        }
        else {
            return res.status(400).json({ 
                success: false, 
                message: 'Tipo de registo desconhecido' 
            });
        }
        
        const sucesso = await bd.saveRegisto(tipo, id, data_registo, composition, userId);
            
        if (!sucesso) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao guardar o registo' 
            });
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Registo guardado com sucesso',
            id: id
        });
    } catch (error) {
        console.error('Erro ao processar registo:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao processar o registo' 
        });
    }
});


// Rota para obter registos de um determinado tipo
router.get('/registos/:tipo', authenticateToken, async (req, res) => {
  const { tipo } = req.params;
  const userId = req.user.id;
  
  try {
    if (!['Insulina', 'Glucose'].includes(tipo)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser Insulina ou Glucose' 
      });
    }
    
    const result = await bd.getRegistos(userId, tipo);
    
    const parseValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };
    
    const processedData = result.rows.map(row => {
      try {
        const rawData = typeof row.dados === 'string' ? JSON.parse(row.dados) : row.dados;
    
        let processedInfo = null;
        try {
          processedInfo = tipo === 'Glucose' 
            ? info_trat.extractGlucoseInfo(rawData) 
            : info_trat.extractInsulinInfo(rawData);
        } catch (extractError) {
          console.error(`Error extracting ${tipo} info for record ${row.id}:`, extractError);
        }
        
        let timestamp = row.data_registo;
        if (processedInfo && processedInfo.DataMedicao && processedInfo.HoraMedicao) {
          timestamp = new Date(`${processedInfo.DataMedicao}T${processedInfo.HoraMedicao}`);
        }
        
        const value = processedInfo ? 
          parseValue(tipo === 'Glucose' ? processedInfo.ValorGlicose : processedInfo.ValorInsulina) : 
          null;
        
        const baseRecord = {
          id: row.id,
          timestamp: timestamp,
          value: value
        };
        
        if (tipo === 'Glucose' && processedInfo) {
          return {
            ...baseRecord,
            glucose_value: parseValue(processedInfo.ValorGlicose),
            condition: processedInfo.Regime,
            meal_calories: parseValue(processedInfo.Calorias),
            meal_duration: processedInfo.TempoDesdeUltimaRefeicao || null,
            exercise_calories: parseValue(processedInfo.CaloriasExercicio),
            exercise_duration: processedInfo.TempoDesdeExercicio || null,
            weight: parseValue(processedInfo.PesoAtual),
            notes: processedInfo.NomeRegisto || null
          };
        } else if (tipo === 'Insulina' && processedInfo) {
          return {
            ...baseRecord,
            route: processedInfo.Rota,
            insulin_value: parseValue(processedInfo.ValorInsulina),
            date: processedInfo.DataMedicao || null,
            time: processedInfo.HoraMedicao || null,
          };
        } else {
          return {
            ...baseRecord,
            processing_error: true,
            raw_data: rawData
          };
        }
      } catch (rowError) {
        console.error(`Error processing record ${row.id}:`, rowError);
        return {
          id: row.id,
          timestamp: row.data_registo,
          value: null,
          error: true
        };
      }
    });
    
    return res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching registos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error retrieving data' 
    });
  }
});

export default router;