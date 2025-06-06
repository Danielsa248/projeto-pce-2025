import express from 'express';
import * as bd from '../db/agenda.js';

const router = express.Router();

// GET /api/agenda?utilizador=1
router.get('/', async (req, res) => {
    const utilizadorId = parseInt(req.query.utilizador, 10);
    if (!utilizadorId) return res.status(400).json({ erro: 'Utilizador inválido' });

    try {
        const agenda = await bd.listarAgenda(utilizadorId);
        res.json(agenda);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao obter agenda' });
    }
});

// POST /api/agenda
router.post('/', async (req, res) => {
    const { utilizador, tipo_registo, data_evento, notas } = req.body;
    if (!utilizador || !tipo_registo || !data_evento) {
        return res.status(400).json({ erro: 'Dados em falta' });
    }

    // Validate that the event date is not in the past
    const eventDate = new Date(data_evento);
    const now = new Date();
    
    if (eventDate < now) {
        return res.status(400).json({ 
            erro: 'Não é possível agendar eventos para datas que já passaram.' 
        });
    }

    try {
        const nova = await bd.criarMarcacao({ utilizador, tipo_registo, data_evento, notas });
        res.status(201).json(nova);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar marcação' });
    }
});

// PATCH /api/agenda/:id/status
router.patch('/:id/status', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { realizado } = req.body;

    if (typeof realizado !== 'boolean') {
        return res.status(400).json({ erro: 'Status deve ser true ou false' });
    }

    try {
        const atualizada = await bd.alterarStatusRealizado(id, realizado);
        res.json(atualizada);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao alterar status' });
    }
});

// DELETE /api/agenda/:id
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);

    try {
        await bd.apagarMarcacao(id);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao apagar marcação' });
    }
});

export default router;
