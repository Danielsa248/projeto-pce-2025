import { pool } from './conexao.js';


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