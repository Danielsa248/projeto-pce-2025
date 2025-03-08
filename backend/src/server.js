// ISTO É SÓ UM TESTE

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.listen(3000, () => {
  console.log('Servidor a correr em http://localhost:3000/');
});
