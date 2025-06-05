import { pool } from '../routes/db.js'

// Listar marcações da agenda por utilizador
export async function listarAgenda(utilizadorId) {
    const res = await pool.query(
        `SELECT * FROM agenda WHERE utilizador = $1 ORDER BY data_evento ASC`,
        [utilizadorId]
    );
    return res.rows;
}

// Criar nova marcação
export async function criarMarcacao({ utilizador, tipo_registo, data_evento, notas }) {
    const res = await pool.query(
        `INSERT INTO agenda (utilizador, tipo_registo, data_evento, notas)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [utilizador, tipo_registo, data_evento, notas]
    );
    return res.rows[0];
}

// Marcar como realizado
export async function marcarRealizado(id) {
    const res = await pool.query(
        `UPDATE agenda SET realizado = TRUE WHERE id = $1 RETURNING *`,
        [id]
    );
    return res.rows[0];
}

// Apagar marcação
export async function apagarMarcacao(id) {
    await pool.query(`DELETE FROM agenda WHERE id = $1`, [id]);
}
