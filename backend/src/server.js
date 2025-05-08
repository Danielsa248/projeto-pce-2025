import * as db from './bd.js';
import * as info_trat from './info_trat.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';


const app = express();
const PORT = 3000;

app.use(cors()); // Permitir requisições do frontend
app.use(express.json());


// Rota para guardar na BD o json
app.post("/api/compositions", async (req, res) => {
    let { type, composition } = req.body;
    if (typeof composition === "string") {
        composition = JSON.parse(composition);
    }

    const id = uuidv4();
    const data_registo = new Date()

    let sucesso;

    try {
        if (type === "Medição de Insulina") {
            const tipo = "Insulina"
            const sucesso = await db.saveRegisto(tipo, id, data_registo, composition);
            const info = info_trat.extractInsulinInfo(composition);
            console.log("Informação do Form:", info);

        }
        else if (type === "Medição de Glicose") {
            const tipo = "Glucose"
            const sucesso = await db.saveRegisto(tipo, id, data_registo, composition);
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


app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
