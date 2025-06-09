import { pool } from './conexao.js';


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