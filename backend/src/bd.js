import { Pool } from 'pg'
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

config();

export const pool = new Pool({
    connectionString: process.env.DB_URL,
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

// Adicionar um novo utilizador
export async function saveUtilizador(userInfo) {
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
        const utilizador_id = userInfo.NumeroUtente || null;
        const nome = userInfo.Nome || null;
        const altura = userInfo.Altura || null;
        const peso = userInfo.Peso || null;
        const genero = userInfo.Genero || null;
        const data_nascimento = userInfo.DataNascimento || null;

        const endereco = userInfo.Morada.endereco || null;
        const cidade = userInfo.Morada.cidade || null;
        const distrito = userInfo.Morada.distrito || null;
        const pais = userInfo.Morada.pais || null;
        const cod_postal = userInfo.Morada.codigoPostal || null;
        const morada_id = randomUUID();

        const telefones = userInfo.Contactos?.telefones || [];
        const emails = userInfo.Contactos?.emails || [];

        await client.query('BEGIN');

        // Insert utilizador
        try {
            await client.query(
                'INSERT INTO utilizador (id, nome, data_nasc, altura, peso, genero) VALUES ($1, $2, $3, $4, $5, $6)',
                [utilizador_id, nome, data_nascimento, altura, peso, genero]
            );
        } catch (insertError) {
            // Check if this is our custom unique violation error for user ID
            if (insertError.code === '23505' || insertError.code === 'unique_violation') {
                await client.query('ROLLBACK');
                return { 
                    success: false, 
                    error: 'duplicate_user',
                    message: `Utilizador com ID ${utilizador_id} já existe no sistema.`
                };
            }
            // If it's some other error, rethrow it
            throw insertError;
        }

        // Insert phone numbers
        for (const telefone of telefones) {
            await client.query(
                'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                [utilizador_id, 'T', telefone.value]  // Change 'telefone' to 'phone'
            );
        }

        // Insert email addresses
        for (const email of emails) {
            await client.query(
                'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                [utilizador_id, 'E', email.value]  // 'email' might already be valid
            );
        }

        // Insert morada
        await client.query(
            'INSERT INTO morada (id, utilizador, endereco, cidade, distrito, pais, cod_postal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [morada_id, utilizador_id, endereco, cidade, distrito, pais, cod_postal]
        );

        await client.query('COMMIT');
        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao salvar utilizador:', error);
        return { 
            success: false,
            error: 'database_error',
            message: 'Erro ao salvar utilizador no sistema.'
        };
    } finally {
        // Always release the client back to the pool
        client.release();
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



