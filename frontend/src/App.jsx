import { useState } from "react";

function App() {
  const [numero, setNumero] = useState("");
  const [resultado, setResultado] = useState(null);

  const fazerRequisicao = async () => {
    if (!numero) return;
    try {
      const response = await fetch(`http://localhost:3000/teste/${numero}`);
      const data = await response.json();
      setResultado(data.result);
    } catch (error) {
      console.error("Erro ao obter dados:", error);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Teste API</h1>
      <input
        type="number"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        placeholder="Insere um número"
      />
      <button onClick={fazerRequisicao}>Enviar</button>
      {resultado !== null && <p>Resultado: {resultado}</p>}
    </div>
  );
}

export default App;
