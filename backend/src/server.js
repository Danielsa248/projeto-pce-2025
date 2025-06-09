import express from 'express';
import cors from 'cors';
import agendaRoutes from './routes/agenda.js';
import authRoutes from './routes/auth.js';
import perfilRoutes from './routes/perfil.js';
import registosRoutes from './routes/registos.js';
import fhirRoutes from './routes/fhir.js';
import { authenticateToken } from './middleware/auth.js';


const app = express();
const PORT = 3000;

app.use(cors()); // Permitir requisições do frontend
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/registos', registosRoutes);
app.use('/api/fhir', fhirRoutes);


// Chat Bot API
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
