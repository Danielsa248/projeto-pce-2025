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

// Toda a informação de um utilizador por ID
export async function getUserByIdComplete(id) {
    try {
        const userResult = await pool.query('SELECT * FROM utilizador WHERE id = $1', [id]);
        
        if (!userResult.rows[0]) {
            return null;
        }

        const contactosResult = await pool.query(`
            SELECT 
                tipo_contacto,
                contacto
            FROM contacto 
            WHERE utilizador = $1 
            ORDER BY tipo_contacto
        `, [id]);

        const moradaResult = await pool.query(
            'SELECT * FROM morada WHERE utilizador = $1', 
            [id]
        );

        const contactos = contactosResult.rows.reduce((acc, contacto) => {
            if (contacto.tipo_contacto === 'E') {
                acc.emails.push({
                    valor: contacto.contacto,
                });
            } else if (contacto.tipo_contacto === 'T') {
                acc.telefones.push({
                    valor: contacto.contacto, 
                });
            }
            return acc;
        }, { emails: [], telefones: [] });

        let moradaObject = null;
        if (moradaResult.rows.length > 0) {
            const morada = moradaResult.rows[0];
            
            moradaObject = {
                endereco: morada.endereco || null,
                cidade: morada.cidade || null,
                distrito: morada.distrito || null,
                pais: morada.pais || null,
                cod_postal: morada.cod_postal || null
            };
        }

        return {
            ...userResult.rows[0],
            email: userResult.rows[0].email || contactos.emails[0]?.valor || null,
            telefone: userResult.rows[0].telefone || contactos.telefones[0]?.valor || null,
            emails: contactos.emails,
            telefones: contactos.telefones,
            morada: moradaObject
        };
        
    } catch(error) {
        console.error('Erro ao obter utilizador completo por ID:', error);
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

// Atualizar perfil do utilizador
export async function updateUserProfile(userId, profileData) {
    try {
        const { emails, telefones, altura, peso } = profileData;
        await pool.query('BEGIN');

        try {
            await pool.query(`
                UPDATE utilizador SET 
                    altura = COALESCE($2, altura),
                    peso = COALESCE($3, peso)
                WHERE id = $1
            `, [userId, altura, peso]);

            if (emails && Array.isArray(emails)) {
                await pool.query(
                    'DELETE FROM contacto WHERE utilizador = $1 AND tipo_contacto = $2',
                    [userId, 'E']
                );
                
                for (const email of emails) {
                    if (email.valor && email.valor.trim() !== '') {
                        await pool.query(
                            'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                            [userId, 'E', email.valor.trim()]
                        );
                    }
                }
            }

            if (telefones && Array.isArray(telefones)) {
                await pool.query(
                    'DELETE FROM contacto WHERE utilizador = $1 AND tipo_contacto = $2',
                    [userId, 'T']
                );
                
                for (const telefone of telefones) {
                    if (telefone.valor && telefone.valor.trim() !== '') {
                        await pool.query(
                            'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                            [userId, 'T', telefone.valor.trim()]
                        );
                    }
                }
            }

            await pool.query('COMMIT');

            return await getUserByIdComplete(userId);

        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        throw error;
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

export async function getRecordById(recordId, userId) {
    try {
        const result = await pool.query(
            'SELECT id, data_registo, dados, tipo_registo, utilizador FROM registos WHERE id = $1 AND utilizador = $2',
            [recordId, userId]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const record = result.rows[0];
        
        // Parse dados if it's a string
        if (typeof record.dados === 'string') {
            try {
                record.dados = JSON.parse(record.dados);
            } catch (parseError) {
                console.error('Error parsing record data:', parseError);
                // Keep original data if parsing fails
            }
        }
        
        return record;
    } catch (error) {
        console.error('Error fetching record by ID:', error);
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


// Obter perfil do utilizador autenticado
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getUserByIdComplete(userId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Perfil não encontrado'
            });
        }

        const { password, ...safeProfile } = profile;
        
        return res.json({
            success: true,
            data: safeProfile
        });
    } catch (error) {
        console.error('Erro ao obter perfil:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});


// Rota para atualizar perfil do utilizador
router.put('/perfil', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const profileData = req.body;
        
        const updatedProfile = await updateUserProfile(userId, profileData);
        
        if (!updatedProfile) {
            return res.status(404).json({
                success: false,
                message: 'Perfil não encontrado'
            });
        }

        const { password, ...safeProfile } = updatedProfile;
        
        return res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            data: safeProfile
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return res.status(500).json({
            success: false,
            message: 'A informação do perfil não pode ser atualizada',
        });
    }
});


// Export default do router
export default router;