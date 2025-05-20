import * as db from './bd.js';
import * as info_trat from './info_trat.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/auth.js';


const app = express();
const PORT = 3000;

dotenv.config();

app.use(cors()); // Permitir requisições do frontend
app.use(express.json());
app.use('/api/auth', authRoutes);


// Rota para guardar na BD o json
app.post("/api/compositions", authenticateToken, async (req, res) => {
    let { type, composition } = req.body;
    if (typeof composition === "string") {
        composition = JSON.parse(composition);
    }

    const id = uuidv4();
    const data_registo = new Date()
    const userId = req.user.id; // Use authenticated user ID

    let sucesso;

    try {
        if (type === "Medição de Insulina") {
            const tipo = "Insulina"
            // Use userId instead of hardcoded 1
            const sucesso = await db.saveRegisto(tipo, id, data_registo, composition, userId);
            const info = info_trat.extractInsulinInfo(composition);
            console.log("Informação do Form:", info);

        }
        else if (type === "Medição de Glicose") {
            const tipo = "Glucose"
            // Use userId instead of hardcoded 1
            const sucesso = await db.saveRegisto(tipo, id, data_registo, composition, userId);
            const info = info_trat.extractGlucoseInfo(composition);
            console.log("Informação do Form:", info);
        }
        else {
            const userInfo = info_trat.extractUserInfo(composition);
            console.log("Informação do Form:", userInfo);
            
            if (!userInfo.valid) {
                return res.status(400).json({ 
                    error: "Dados inválidos", 
                    validationErrors: userInfo.errors 
                });
            }
            
            const result = await db.saveUtilizador(userInfo);
            
            if (result.success) {
                sucesso = true;
            } else {
                if (result.error === 'duplicate_user') {
                    return res.status(409).json({ 
                        error: "Utilizador com esse número de utente já existe", 
                        message: result.message 
                    });
                } else {
                    sucesso = false;
                }
            }
        }

        if (sucesso) {
            res.status(201).json({ message: "Guardado com sucesso!", id });
        } else {
            res.status(500).json({ error: "Erro ao guardar o registo" });
        }

    } catch (err) {
        console.error("Erro ao guardar:", err);
        res.status(500).json({ error: "Erro ao guardar a composition" });
    }
});

// Add this route for the assistant chat
app.post("/api/assistant/chat", authenticateToken, async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
