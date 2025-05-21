import { pool } from '../src/bd.js';
import { v4 as uuidv4 } from 'uuid';

// Function to generate sample glucose and insulin records
async function createSampleRecords() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get user ID from command line or use a default
    const userId = process.argv[2] || 1;
    
    // Check if user exists
    const userCheck = await client.query('SELECT id FROM utilizador WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      console.error(`User with ID ${userId} does not exist!`);
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`Creating sample records for user ID: ${userId}`);
    
    // Generate 30 days of sample data
    const today = new Date();
    const records = [];
    
    // Meal state options from the form
    const mealStates = ["Jejum", "Pós-prandial", "Pré-prandial", "Aleatório"];
    
    // Generate glucose and insulin records for the past 30 days
    for (let i = 0; i < 30; i++) {
      const baseDate = new Date();
      baseDate.setDate(today.getDate() - i);
      const dateStr = baseDate.toISOString().split('T')[0];
      
      // Morning glucose reading (fasting)
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(8, 30, 0, 0)),
        tipo_registo: 'Glucose',
        dados: {
          ValorGlicose: 80 + Math.floor(Math.random() * 60), // 80-140 range
          Regime: "Jejum",
          NomeRegisto: 'Medição matinal',
          DataMedicao: dateStr,
          HoraMedicao: '08:30',
          Calorias: null,
          PesoAtual: 70 + Math.floor(Math.random() * 10),
          CaloriasExercicio: null,
          TempoDesdeExercicio: [
            {unit: "Hora(s)", value: ""},
            {unit: "Minuto(s)", value: ""},
            {unit: "Segundo(s)", value: ""}
          ],
          TempoDesdeUltimaRefeicao: [
            {unit: "Hora(s)", value: "8"},
            {unit: "Minuto(s)", value: ""},
            {unit: "Segundo(s)", value: ""}
          ]
        }
      });
      
      // Afternoon glucose reading (after lunch)
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(13, 30, 0, 0)),
        tipo_registo: 'Glucose',
        dados: {
          ValorGlicose: 100 + Math.floor(Math.random() * 80), // 100-180 range
          Regime: "Pós-prandial",
          NomeRegisto: 'Medição após almoço',
          DataMedicao: dateStr,
          HoraMedicao: '13:30',
          Calorias: 500 + Math.floor(Math.random() * 300),
          PesoAtual: 70 + Math.floor(Math.random() * 10),
          CaloriasExercicio: null,
          TempoDesdeExercicio: [
            {unit: "Hora(s)", value: ""},
            {unit: "Minuto(s)", value: ""},
            {unit: "Segundo(s)", value: ""}
          ],
          TempoDesdeUltimaRefeicao: [
            {unit: "Hora(s)", value: "0"},
            {unit: "Minuto(s)", value: "45"},
            {unit: "Segundo(s)", value: ""}
          ]
        }
      });
      
      // Evening glucose reading (after dinner)
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(20, 30, 0, 0)),
        tipo_registo: 'Glucose',
        dados: {
          ValorGlicose: 90 + Math.floor(Math.random() * 70), // 90-160 range
          Regime: "Pós-prandial",
          NomeRegisto: 'Medição após jantar',
          DataMedicao: dateStr,
          HoraMedicao: '20:30',
          Calorias: 600 + Math.floor(Math.random() * 200),
          PesoAtual: 70 + Math.floor(Math.random() * 10),
          CaloriasExercicio: Math.random() > 0.5 ? 300 + Math.floor(Math.random() * 200) : null,
          TempoDesdeExercicio: Math.random() > 0.5 ? [
            {unit: "Hora(s)", value: "1"},
            {unit: "Minuto(s)", value: Math.floor(Math.random() * 60).toString()},
            {unit: "Segundo(s)", value: ""}
          ] : [
            {unit: "Hora(s)", value: ""},
            {unit: "Minuto(s)", value: ""},
            {unit: "Segundo(s)", value: ""}
          ],
          TempoDesdeUltimaRefeicao: [
            {unit: "Hora(s)", value: "0"},
            {unit: "Minuto(s)", value: "30"},
            {unit: "Segundo(s)", value: ""}
          ]
        }
      });
      
      // Morning insulin record
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(8, 0, 0, 0)),
        tipo_registo: 'Insulina',
        dados: {
          ValorInsulina: 5 + Math.floor(Math.random() * 10), // 5-15 range
          Routa: Math.random() > 0.8 ? 'Intravenosa' : 'Subcutânea',
          NomeRegisto: 'Insulina matinal',
          DataMedicao: dateStr,
          HoraMedicao: '08:00'
        }
      });
      
      // Evening insulin record
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(19, 30, 0, 0)),
        tipo_registo: 'Insulina',
        dados: {
          ValorInsulina: 5 + Math.floor(Math.random() * 10), // 5-15 range
          Routa: Math.random() > 0.8 ? 'Intravenosa' : 'Subcutânea',
          NomeRegisto: 'Insulina noturna',
          DataMedicao: dateStr,
          HoraMedicao: '19:30'
        }
      });
    }
    
    // Insert all records
    for (const record of records) {
      await client.query(
        'INSERT INTO registos (id, utilizador, data_registo, tipo_registo, dados) VALUES ($1, $2, $3, $4, $5)',
        [record.id, record.utilizador, record.data_registo, record.tipo_registo, JSON.stringify(record.dados)]
      );
    }
    
    await client.query('COMMIT');
    console.log(`Successfully added ${records.length} sample records!`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating sample records:', err);
  } finally {
    client.release();
    pool.end();
  }
}

// Execute the function
createSampleRecords();