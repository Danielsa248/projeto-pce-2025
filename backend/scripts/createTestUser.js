import bcrypt from 'bcrypt';
import { pool } from '../src/bd.js';
import { v4 as uuidv4 } from 'uuid';

async function createTestUser() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Check if test user already exists
        const checkResult = await client.query('SELECT id FROM utilizador WHERE username = $1', ['testuser']);
        
        if (checkResult.rows.length > 0) {
            console.log('Test user already exists!');
            await client.query('ROLLBACK');
            return;
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash('password123', 10);
        
        // Get next available ID
        const idResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM utilizador');
        const nextId = idResult.rows[0].next_id;
        
        // Insert test user
        await client.query(
            'INSERT INTO utilizador (id, nome, data_nasc, altura, peso, genero, username, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [nextId, 'Test User', '1990-01-01', 175.0, 70.0, 'O', 'testuser', passwordHash]
        );
        
        // Insert email for the test user
        await client.query(
            'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
            [nextId, 'E', 'testuser@example.com']
        );
        
        // Insert test address
        const moradaId = uuidv4();
        await client.query(
            'INSERT INTO morada (id, utilizador, endereco, cidade, distrito, pais, cod_postal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [moradaId, nextId, 'Rua de Teste 123', 'Cidade Teste', 'Distrito Teste', 'Portugal', '1000-100']
        );
        
        await client.query('COMMIT');
        console.log('Test user created successfully!');
        console.log('Username: testuser');
        console.log('Password: password123');
        console.log('User ID:', nextId);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating test user:', err);
    } finally {
        client.release();
        pool.end();
    }
}

createTestUser();