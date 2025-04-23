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


// Encontrar um utilizador por ID
export async function getUtilizadorById(id) {
    try{
        const result = await pool.query('SELECT * FROM utilizador WHERE id = $1', [id]);
        return result.rows[0] || null;
    }catch(error){
        console.error('Erro ao obter utilizador por ID:', error);
        throw error;
    }
}


// Eliminar um utilizador por ID
export async function deleteUtilizadorById(id) {
    try{
        const result = await pool.query('DELETE FROM utilizador WHERE id = $1', [id]);
        return result.rowCount > 0;
    }catch(error){
        console.error('Erro ao eliminar utilizador por ID:', error);
    }
}


// Adicionar um utilizador



// Adicionar um registo de insulina



// Adicionar um registo de glicose




