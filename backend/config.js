// Criado para facilitar o carregamento do .env em qualquer ficheiro

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '.env') });

console.log('Loading .env from:', path.resolve(__dirname, '.env'));

export default process.env;