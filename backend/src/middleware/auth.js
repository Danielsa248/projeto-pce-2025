import jwt from 'jsonwebtoken';
import { pool } from '../db/conexao.js';

import env from '../../config.js';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access denied. No token provided.' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        
        // Check if user exists
        const result = await pool.query(
            'SELECT id, username, nome FROM utilizador WHERE id = $1',
            [decoded.userId]
        );
        
        const user = result.rows[0];
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};