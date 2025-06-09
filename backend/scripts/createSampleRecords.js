import { pool } from '../src/db/conexao.js';
import { v4 as uuidv4 } from 'uuid';

// Helper to create text field values in the format used by the form
function createTextValue(text) {
  const blocks = [{
    key: uuidv4().substring(0, 5),
    text: text,
    type: "unstyled",
    depth: 0,
    inlineStyleRanges: [],
    entityRanges: [],
    data: {}
  }];
  
  return JSON.stringify({
    blocks: blocks,
    entityMap: {}
  });
}

// Function to generate sample glucose and insulin records using raw form data
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
    
    // Meal state options
    const mealStates = [
      { code: "at0012", text: "Jejum" }, 
      { code: "at0013", text: "Pós-prandial" }, 
      { code: "at0014", text: "Pré-prandial" }, 
      { code: "at0015", text: "Aleatório" }
    ];
    
    // Route options
    const routeOptions = [
      { code: "at0007", text: "Subcutânea" }, 
      { code: "at0008", text: "Intravenosa" }
    ];
    
    // Generate glucose and insulin records for the past 30 days
    for (let i = 0; i < 30; i++) {
      const baseDate = new Date();
      baseDate.setDate(today.getDate() - i);
      const dateStr = baseDate.toISOString().split('T')[0];
      
      // Morning glucose reading (fasting) - Raw Form Data
      const morningGlucose = {
        [`items.0.0.items.0.value`]: createTextValue(`Medição matinal dia ${i+1}`),
        [`items.0.0.items.1.value.date`]: dateStr,
        [`items.0.0.items.1.value.time`]: "08:30",
        [`items.0.0.items.2.items.0.value.value`]: 80 + Math.floor(Math.random() * 60),
        [`items.0.0.items.2.items.0.value.unit`]: "mg/dL",
        [`items.0.0.items.3.items.0.value`]: mealStates[0], // Jejum
        [`items.0.0.items.3.items.1.value.value`]: null,
        [`items.0.0.items.3.items.1.value.unit`]: "kcal",
        [`items.0.0.items.3.items.2.value`]: [
          { unit: "Hora(s)", value: "8" },
          { unit: "Minuto(s)", value: "" },
          { unit: "Segundo(s)", value: "" }
        ],
        [`items.0.0.items.4.items.0.value`]: [
          { unit: "Hora(s)", value: "" },
          { unit: "Minuto(s)", value: "" },
          { unit: "Segundo(s)", value: "" }
        ],
        [`items.0.0.items.4.items.1.value.value`]: null,
        [`items.0.0.items.4.items.1.value.unit`]: "kcal",
        [`items.0.0.items.5.items.0.value.value`]: 70 + Math.floor(Math.random() * 10),
        [`items.0.0.items.5.items.0.value.unit`]: "kg"
      };
      
      // Afternoon glucose reading (after lunch) - Raw Form Data
      const afternoonGlucose = {
        [`items.0.0.items.0.value`]: createTextValue(`Medição após almoço dia ${i+1}`),
        [`items.0.0.items.1.value.date`]: dateStr,
        [`items.0.0.items.1.value.time`]: "13:30",
        [`items.0.0.items.2.items.0.value.value`]: 100 + Math.floor(Math.random() * 80),
        [`items.0.0.items.2.items.0.value.unit`]: "mg/dL",
        [`items.0.0.items.3.items.0.value`]: mealStates[1], // Pós-prandial
        [`items.0.0.items.3.items.1.value.value`]: 500 + Math.floor(Math.random() * 300),
        [`items.0.0.items.3.items.1.value.unit`]: "kcal",
        [`items.0.0.items.3.items.2.value`]: [
          { unit: "Hora(s)", value: "0" },
          { unit: "Minuto(s)", value: "45" },
          { unit: "Segundo(s)", value: "" }
        ],
        [`items.0.0.items.4.items.0.value`]: [
          { unit: "Hora(s)", value: "" },
          { unit: "Minuto(s)", value: "" },
          { unit: "Segundo(s)", value: "" }
        ],
        [`items.0.0.items.4.items.1.value.value`]: null,
        [`items.0.0.items.4.items.1.value.unit`]: "kcal",
        [`items.0.0.items.5.items.0.value.value`]: 70 + Math.floor(Math.random() * 10),
        [`items.0.0.items.5.items.0.value.unit`]: "kg"
      };
      
      // Evening glucose reading (after dinner) - Raw Form Data
      const eveningGlucose = {
        [`items.0.0.items.0.value`]: createTextValue(`Medição após jantar dia ${i+1}`),
        [`items.0.0.items.1.value.date`]: dateStr,
        [`items.0.0.items.1.value.time`]: "20:30",
        [`items.0.0.items.2.items.0.value.value`]: 90 + Math.floor(Math.random() * 70),
        [`items.0.0.items.2.items.0.value.unit`]: "mg/dL",
        [`items.0.0.items.3.items.0.value`]: mealStates[1], // Pós-prandial
        [`items.0.0.items.3.items.1.value.value`]: 600 + Math.floor(Math.random() * 200),
        [`items.0.0.items.3.items.1.value.unit`]: "kcal",
        [`items.0.0.items.3.items.2.value`]: [
          { unit: "Hora(s)", value: "0" },
          { unit: "Minuto(s)", value: "30" },
          { unit: "Segundo(s)", value: "" }
        ],
        [`items.0.0.items.4.items.0.value`]: Math.random() > 0.5 ? [
          { unit: "Hora(s)", value: "1" },
          { unit: "Minuto(s)", value: Math.floor(Math.random() * 60).toString() },
          { unit: "Segundo(s)", value: "" }
        ] : [
          { unit: "Hora(s)", value: "" },
          { unit: "Minuto(s)", value: "" },
          { unit: "Segundo(s)", value: "" }
        ],
        [`items.0.0.items.4.items.1.value.value`]: Math.random() > 0.5 ? 300 + Math.floor(Math.random() * 200) : null,
        [`items.0.0.items.4.items.1.value.unit`]: "kcal",
        [`items.0.0.items.5.items.0.value.value`]: 70 + Math.floor(Math.random() * 10),
        [`items.0.0.items.5.items.0.value.unit`]: "kg"
      };
      
      // Morning insulin record - Raw Form Data
      const morningInsulin = {
        [`items.0.0.items.0.value`]: createTextValue(`Insulina matinal dia ${i+1}`),
        [`items.0.0.items.1.value.date`]: dateStr,
        [`items.0.0.items.1.value.time`]: "08:00",
        [`items.0.0.items.2.items.0.value.value`]: 5 + Math.floor(Math.random() * 10),
        [`items.0.0.items.2.items.0.value.unit`]: "UI",
        [`items.0.0.items.3.items.0.value`]: Math.random() > 0.8 ? routeOptions[1] : routeOptions[0]
      };
      
      // Evening insulin record - Raw Form Data
      const eveningInsulin = {
        [`items.0.0.items.0.value`]: createTextValue(`Insulina noturna dia ${i+1}`),
        [`items.0.0.items.1.value.date`]: dateStr,
        [`items.0.0.items.1.value.time`]: "19:30",
        [`items.0.0.items.2.items.0.value.value`]: 5 + Math.floor(Math.random() * 10),
        [`items.0.0.items.2.items.0.value.unit`]: "UI",
        [`items.0.0.items.3.items.0.value`]: Math.random() > 0.8 ? routeOptions[1] : routeOptions[0]
      };
      
      // Add records with proper timestamps
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(8, 30, 0, 0)),
        tipo_registo: 'Glucose',
        dados: morningGlucose
      });
      
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(13, 30, 0, 0)),
        tipo_registo: 'Glucose',
        dados: afternoonGlucose
      });
      
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(20, 30, 0, 0)),
        tipo_registo: 'Glucose',
        dados: eveningGlucose
      });
      
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(8, 0, 0, 0)),
        tipo_registo: 'Insulina',
        dados: morningInsulin
      });
      
      records.push({
        id: uuidv4(),
        utilizador: userId,
        data_registo: new Date(baseDate.setHours(19, 30, 0, 0)),
        tipo_registo: 'Insulina',
        dados: eveningInsulin
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
    
    // Optional: Test reading and processing the data
    console.log("\nTesting data retrieval and processing...");
    const testRecord = await client.query(
      'SELECT id, data_registo, dados FROM registos WHERE utilizador = $1 AND tipo_registo = $2 ORDER BY data_registo DESC LIMIT 1',
      [userId, 'Glucose']
    );
    
    if (testRecord.rows.length > 0) {
      const rawData = testRecord.rows[0].dados;
      console.log("Raw data from database:", rawData);
      
      // You would process this with your extractGlucoseInfo function
      console.log("To process this data, use: info_trat.extractGlucoseInfo(rawData)");
    }
    
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