// FormGlicose.jsx
import { Form } from "protected-aidaforms";
import jdt from "./opt/jdt_glucose.json";
import formDesign from "./opt/style_glucose.json";

const saveComposition = async (values) => {
    try {
        const response = await fetch("http://localhost:3000/api/compositions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ composition: values }),
        });

        if (!response.ok) throw new Error("Erro ao guardar");

        const result = await response.json();
        console.log("Guardado com sucesso:", result);
    } catch (err) {
        console.error("Erro ao submeter composição:", err);
    }
};

export default function FormGlicose() {
    return (
        <div className="p-3">
            <h1>Medição de Glicose</h1>
            <Form
                template={jdt}
                formDesign={JSON.stringify(formDesign)}
                showPrint={false}
                editMode={true}
                submitButtonDisabled={false}
                canSubmit={true}
                onSubmit={(values, changedFields) => saveComposition(values)}
                saveButtonDisabled={false}
                canSave={false}
                canCancel={true}
                dlm={{}}
                professionalTasks={["Registar Pedido", "Consultar Pedido", "Anular Pedido"]}
            />
        </div>
    );
}