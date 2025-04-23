const express = require('express');
const cors = require('cors');

const { v4: uuidv4 } = require("uuid");
const app = express();
const PORT = 3000;

app.use(cors()); // Permitir requisições do frontend
app.use(express.json());

// ISTO É SÓ UM TESTE PARA COMUNICAR COM O FRONTEND E PODE SER REMOVIDO
app.get('/teste/:num', (req, res) => {
    const num = parseInt(req.params.num);
    if (isNaN(num)) {
        return res.status(400).json({ error: 'Número inválido' });
    }
    res.json({ result: num * 2 });
});



app.post("/api/compositions", async (req, res) => {
    let { composition } = req.body;
    if (typeof composition === "string") {
        composition = JSON.parse(composition);
    }

    const id = uuidv4();

    try {
        /*
        await pool.query(
            "INSERT INTO public.composition VALUES ($1, $2)",
            [id, composition]
        );
         */
        res.status(201).json({ message: "Guardado com sucesso!", id });
    } catch (err) {
        console.error("Erro ao guardar:", err);
        res.status(500).json({ error: "Erro ao guardar a composition" });
    }
});











app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
