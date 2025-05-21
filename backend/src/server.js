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
            const tipo = "Insulina";
            const processedData = info_trat.extractInsulinInfo(composition);
            console.log("Informação processada:", processedData);
            
            // Only save to DB if we successfully processed the data
            if (processedData) {
                sucesso = await db.saveRegisto(tipo, id, data_registo, processedData, userId);
            } else {
                sucesso = false;
            }
        }
        else if (type === "Medição de Glicose") {
            const tipo = "Glucose";
            const processedData = info_trat.extractGlucoseInfo(composition);
            console.log("Informação processada:", processedData);
            
            // Only save to DB if we successfully processed the data
            if (processedData) {
                sucesso = await db.saveRegisto(tipo, id, data_registo, processedData, userId);
            } else {
                sucesso = false;
            }
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

// Endpoint to fetch glucose and insulin records
app.get("/api/registos/:tipo", authenticateToken, async (req, res) => {
  try {
    const { tipo } = req.params;
    const userId = req.user.id;
    
    // Validate tipo parameter
    if (!['Insulina', 'Glucose'].includes(tipo)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser Insulina ou Glucose' 
      });
    }
    
    // Query the database
    const result = await pool.query(
      'SELECT id, data_registo, dados FROM registos WHERE utilizador = $1 AND tipo_registo = $2 ORDER BY data_registo DESC',
      [userId, tipo]
    );
    
    // Process the results - dados now contains our clean processed data
    const processedData = result.rows.map(row => {
      const dados = typeof row.dados === 'string' ? JSON.parse(row.dados) : row.dados;
      
      // Format date/time
      let timestamp = row.data_registo;
      if (dados.DataMedicao && dados.HoraMedicao) {
        timestamp = new Date(`${dados.DataMedicao}T${dados.HoraMedicao}`);
      }
      
      return {
        id: row.id,
        timestamp: timestamp,
        value: parseFloat(tipo === 'Glucose' ? dados.ValorGlicose : dados.ValorInsulina)
      };
    });
    
    return res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.tipo} records:`, error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter registos do servidor' 
    });
  }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
