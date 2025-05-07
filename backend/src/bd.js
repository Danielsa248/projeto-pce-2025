import { Pool } from 'pg'
import { config } from 'dotenv';



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
export async function saveRegisto(tipo, id, data_registo, composition) {
    try{
        /*O id do utilizador esta hardcoded (temos de arranjar forma de obter o id do gajo que preenche o forms)*/
        const result = await pool.query('INSERT INTO registos (id, utilizador, data_registo, tipo_registo, dados) VALUES ($1, $2, $3, $4, $5)',
            [id, 1, data_registo, tipo, composition]);
        return result.rowCount > 0;

    }catch(error){
        throw error;
    }
}


// Adicionar um novo utilizador (NAO FINALIZADA - ESBOÇO)
export async function saveUser(composition) {
    try{
        const utilizador_id = null
        const nome = null
        const altura = null
        const peso = null
        const genero = null
        const data_nascimento = null
        /*morada_id, endereco, cidade, distrito, pais, cod_postal
        tipo_contacto, contacto*/

        await client.query('BEGIN');

        const utilizadorResult = await client.query(
            'INSERT INTO utilizador (id, nome, data_nasc, altura, peso, genero) VALUES ($1, $2, $3, $4, $5, $6)',
            [utilizador_id, nome, data_nascimento, altura, peso, genero]
        );

        const utilizadorId = utilizadorResult.rows[0].id;

        if (contactos && contactos.length > 0) {
            for (const contacto of contactos) {
                await client.query(
                    'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                    [utilizador_id, tipo_contacto, contacto]
                );
            }
        }

        if (morada) {
            await client.query(
                'INSERT INTO morada (id, utilizador, endereco, cidade, distrito, pais, cod_postal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [morada_id, utilizador_id, endereco, cidade, distrito, pais, cod_postal]
            );
        }

        await client.query('COMMIT');

        return utilizadorId;

    }catch(error){
        await client.query('ROLLBACK');
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



