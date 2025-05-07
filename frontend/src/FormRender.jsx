import { Form } from "protected-aidaforms";
import jdtGlicose from './opt/jdt_glucose.json';
import jdtInsulina from './opt/jdt_insulina.json';
import styleGlicose from './opt/style_glucose.json';
import styleInsulina from './opt/style_insulina.json';
import jdtIndividuo from './opt/jdt_individuo.json';
import styleIndividuo from './opt/style_individuo.json';

const saveComposition = async (values, type) => {
    try {
        const response = await fetch("http://localhost:3000/api/compositions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ type, composition: values }),
        });

        if (!response.ok) throw new Error("Erro ao guardar");

        const result = await response.json();
        console.log("Guardado com sucesso:", result);
        return result;
    } catch (err) {
        console.error("Erro ao submeter composição:", err);
        throw err;
    }
};

export default function FormRender({ type }) {
    const formConfig = {
        glicose: {
            title: "Medição de Glicose",
            jdt: jdtGlicose,
            formDesign: styleGlicose
        },
        insulina: {
            title: "Medição de Insulina",
            jdt: jdtInsulina,
            formDesign: styleInsulina
        },
        individuo: {
            title: "Registo de Utilizador",
            jdt: jdtIndividuo,
            formDesign: styleIndividuo
        }
    };

    const { title, jdt, formDesign } = formConfig[type];

    return (
        <div className="p-3">
            <h1>{title}</h1>
            <Form
                template={jdt}
                formDesign={JSON.stringify(formDesign)}
                showPrint={false}
                editMode={true}
                submitButtonDisabled={false}
                canSubmit={true}
                onSubmit={(values, changedFields) => saveComposition(values, title)}
                saveButtonDisabled={false}
                canSave={false}
                canCancel={true}
                dlm={{}}
                professionalTasks={["Registar Pedido", "Consultar Pedido", "Anular Pedido"]}
            />
        </div>
    );
}