import * as db from './bd.js';
import * as info_trat from './info_trat.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/auth.js';

// import env from '../config.js'; Usar este env caso seja preciso vars de ambiente


const app = express();
const PORT = 3000;


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
        // Map to the correct tipo
        let tipo = null;
        if (type === "Medição de Insulina") {
            tipo = "Insulina";
        } 
        else if (type === "Medição de Glicose") {
            tipo = "Glucose";
        }
        else {
            return res.status(400).json({ 
                success: false, 
                message: 'Tipo de registo desconhecido' 
            });
        }
        
        // Store the raw composition data directly
        sucesso = await db.saveRegisto(tipo, id, data_registo, composition, userId);
            
        if (!sucesso) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao guardar o registo' 
            });
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Registo guardado com sucesso',
            id: id
        });
    } catch (error) {
        console.error('Erro ao processar registo:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao processar o registo' 
        });
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

// Rota para obter registos de um determinado tipo
app.get('/api/registos/:tipo', authenticateToken, async (req, res) => {
  const { tipo } = req.params;
  const userId = req.user.id;
  
  try {
    if (!['Insulina', 'Glucose'].includes(tipo)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser Insulina ou Glucose' 
      });
    }
    
    // Use the database helper function
    const result = await db.getRegistos(userId, tipo);
    
    // Process the raw data when retrieving
    const processedData = result.rows.map(row => {
      const rawData = typeof row.dados === 'string' ? JSON.parse(row.dados) : row.dados;
      
      // Process the raw composition based on type
      const processedInfo = tipo === 'Glucose' 
        ? info_trat.extractGlucoseInfo(rawData) 
        : info_trat.extractInsulinInfo(rawData);
      
      // Format date/time
      let timestamp = row.data_registo;
      if (processedInfo && processedInfo.DataMedicao && processedInfo.HoraMedicao) {
        timestamp = new Date(`${processedInfo.DataMedicao}T${processedInfo.HoraMedicao}`);
      }
      
      // Extract the relevant value
      const value = processedInfo ? 
        parseFloat(tipo === 'Glucose' ? processedInfo.ValorGlicose : processedInfo.ValorInsulina) : 
        null;
      
      // For Glucose readings, also include condition
      const extraProps = {};
      if (tipo === 'Glucose' && processedInfo) {
        extraProps.condition = processedInfo.Regime;
      } else if (tipo === 'Insulina' && processedInfo) {
        extraProps.route = processedInfo.Routa;
      }
      
      return {
        id: row.id,
        timestamp: timestamp,
        value: value,
        ...extraProps
      };
    });
    
    return res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching registos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error retrieving data' 
    });
  }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
