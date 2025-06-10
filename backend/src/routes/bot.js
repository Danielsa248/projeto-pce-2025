import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post("/chat", authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id; // User ID from auth middleware
        
        // Call Ollama API
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'DiabetesAssistant',
                prompt: message,
                stream: false
            }),
        });
        
        const data = await response.json();
        
        return res.json({
            success: true,
            response: data.response
        });
    } catch (error) {
        console.error('Assistant API error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred with the assistant'
        });
    }
});

export default router;
