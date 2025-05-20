import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../bd.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Get user from database
        const result = await pool.query(
            'SELECT id, username, nome, password_hash FROM utilizador WHERE username = $1',
            [username]
        );
        
        const user = result.rows[0];
        
        // Check if user exists
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
        
        // Create and sign JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Return user info and token
        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.nome
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// Register endpoint
router.post('/register', async (req, res) => {
    const { username, password, email, nome, data_nasc, altura, peso, genero } = req.body;
    
    try {
        // Check if username already exists
        const userCheck = await pool.query(
            'SELECT id FROM utilizador WHERE username = $1',
            [username]
        );
        
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Start transaction for consistent database state
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Generate new ID 
            let newId;
            const idResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM utilizador');
            newId = idResult.rows[0].next_id;
            
            // Insert user
            const result = await client.query(
                'INSERT INTO utilizador (id, nome, data_nasc, altura, peso, genero, username, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [newId, nome, data_nasc, altura, peso, genero, username, passwordHash]
            );
            
            const userId = result.rows[0].id;
            
            // Add email to contacto table
            if (email) {
                await client.query(
                    'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                    [userId, 'E', email]
                );
            }
            
            // Add morada if provided
            if (req.body.morada) {
                const { endereco, cidade, distrito, pais, cod_postal } = req.body.morada;
                const moradaId = uuidv4();
                
                await client.query(
                    'INSERT INTO morada (id, utilizador, endereco, cidade, distrito, pais, cod_postal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [moradaId, userId, endereco, cidade, distrito, pais, cod_postal]
                );
            }
            
            await client.query('COMMIT');
            
            // Create and sign JWT token
            const token = jwt.sign(
                { userId },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            return res.status(201).json({
                success: true,
                token,
                user: {
                    id: userId,
                    username,
                    name: nome
                }
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

export default router;