import { Pool } from 'pg'
import express from 'express';
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


export default router;