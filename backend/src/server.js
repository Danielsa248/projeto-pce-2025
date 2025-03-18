const express = require('express');
const cors = require('cors');

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

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
