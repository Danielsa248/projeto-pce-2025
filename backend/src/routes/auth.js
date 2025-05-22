import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../bd.js';
import { v4 as uuidv4 } from 'uuid';
import * as info_trat from '../info_trat.js'; // Not from 'public/js/info_trat.js'

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
    const { username, password, composition } = req.body;
    
    try {
        
        // Check if username already exists
        const userCheck = await pool.query(
            'SELECT id FROM utilizador WHERE username = $1',
            [username]
        );
        
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Nome de utilizador já existe' 
            });
        }
        
        // Process composition data
        const userInfo = info_trat.extractUserInfo(composition);
        
        if (!userInfo || Object.keys(userInfo.errors || {}).length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Dados de formulário inválidos',
                errors: userInfo ? userInfo.errors : 'Erro ao processar dados'
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Begin transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Generate ID if not provided
            let userId = userInfo.NumeroUtente;
            if (!userId) {
                const idResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM utilizador');
                userId = idResult.rows[0].next_id;
            }
            
            // Convert gender from "Masculino" to "M", etc.
            const genderMap = {
                'Masculino': 'M',
                'Feminino': 'F',
                'Outro': 'O'
            };
            const genderCode = genderMap[userInfo.Genero] || 'O';
            
            // Insert user
            await client.query(
                'INSERT INTO utilizador (id, nome, data_nasc, altura, peso, genero, username, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [
                    userId, 
                    userInfo.Nome, 
                    userInfo.DataNascimento, 
                    userInfo.Altura, 
                    userInfo.Peso, 
                    genderCode, 
                    username, 
                    passwordHash
                ]
            );
            
            // Insert contact information
            if (userInfo.Contactos) {
                // Insert email addresses
                for (const email of userInfo.Contactos.emails || []) {
                    await client.query(
                        'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                        [userId, 'E', email.value]
                    );
                }
                
                // Insert phone numbers
                for (const telefone of userInfo.Contactos.telefones || []) {
                    await client.query(
                        'INSERT INTO contacto (utilizador, tipo_contacto, contacto) VALUES ($1, $2, $3)',
                        [userId, 'T', telefone.value]
                    );
                }
            }
            
            // Insert address
            if (userInfo.Morada) {
                const moradaId = uuidv4();
                await client.query(
                    'INSERT INTO morada (id, utilizador, endereco, cidade, distrito, pais, cod_postal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [
                        moradaId, 
                        userId, 
                        userInfo.Morada.endereco, 
                        userInfo.Morada.cidade, 
                        userInfo.Morada.distrito, 
                        userInfo.Morada.pais, 
                        userInfo.Morada.codigoPostal
                    ]
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
                message: 'Utilizador registado com sucesso',
                token,
                user: {
                    id: userId,
                    username,
                    name: userInfo.Nome
                }
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            
            // Check if this is a unique_violation error from our trigger
            if (err.code === 'unique_violation' || err.message.includes('já existe no sistema')) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Número de utente já registado no sistema'
                });
            }
            
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Erro no servidor durante o registo' 
        });
    }
});

export default router;