import { Pool } from 'pg'
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import * as info_trat from '../clean_info.js';
import env from '../../config.js';


const router = express.Router();

export const pool = new Pool({
    connectionString: env.DB_URL,
});

// Testa a conexão à bd
pool.connect((error, client, release) => {
    if (error) {
        return console.error('Erro ao conectar à Base de Dados', error.stack);
    }
    console.log('Conectado à Base de Dados');
    release();
});

// Adicionar um registo de medição
export async function saveRegisto(tipo, id, data_registo, composition, userId) {
    try {
        const result = await pool.query('INSERT INTO registos (id, utilizador, data_registo, tipo_registo, dados) VALUES ($1, $2, $3, $4, $5)',
            [id, userId, data_registo, tipo, composition]);
        return result.rowCount > 0;
    } catch(error) {
        throw error;
    }
}


// Encontrar um utilizador por ID
export async function getUserById(id) {
    try{
        const result = await pool.query('SELECT * FROM utilizador WHERE id = $1', [id]);
        return result.rows[0] || null;
    }catch(error){
        console.error('Erro ao obter utilizador por ID:', error);
        throw error;
    }
}

// Eliminar um utilizador por ID
export async function deleteUserById(id) {
    try{
        const result = await pool.query('DELETE FROM utilizador WHERE id = $1', [id]);
        return result.rowCount > 0;
    }catch(error){
        console.error('Erro ao eliminar utilizador por ID:', error);
    }
}


export async function getRegistos(userId, tipo) {
    try {
        const result = await pool.query(
            'SELECT id, data_registo, dados FROM registos WHERE utilizador = $1 AND tipo_registo = $2 ORDER BY data_registo DESC',
            [userId, tipo]
        );
        return result;
    } catch (error) {
        console.error(`Error fetching ${tipo} records:`, error);
        throw error;
    }
}

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
        
        const sucesso = await saveRegisto(tipo, id, data_registo, composition, userId);
            
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
    
    const result = await getRegistos(userId, tipo);
    
    const parseValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };
    
    const processedData = result.rows.map(row => {
      const rawData = typeof row.dados === 'string' ? JSON.parse(row.dados) : row.dados;
      
      const processedInfo = tipo === 'Glucose' 
        ? info_trat.extractGlucoseInfo(rawData) 
        : info_trat.extractInsulinInfo(rawData);
      
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
          raw_composition: rawData
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

// ADICIONAR: Export default do router
export default router;