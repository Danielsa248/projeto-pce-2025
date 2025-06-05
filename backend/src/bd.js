import { Pool } from 'pg'
import { randomUUID } from 'crypto';

import env from '../config.js';


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



