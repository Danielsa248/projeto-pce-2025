import { Form } from "protected-aidaforms";
import jdtGlicose from './opt/jdt_glucose.json';
import jdtInsulina from './opt/jdt_insulina.json';
import styleGlicose from './opt/style_glucose.json';
import styleInsulina from './opt/style_insulina.json';
import jdtIndividuo from './opt/jdt_individuo.json';
import styleIndividuo from './opt/style_individuo.json';
import { useAuth } from './context/AuthContext';

export default function FormRender({ type, onSubmitComplete }) {
    const { getToken } = useAuth();

    const saveComposition = async (values, formType) => {
        try {
            // Map component type to server expected type
            const serverType = {
                'glicose': 'Medição de Glicose',
                'insulina': 'Medição de Insulina',
                'individuo': 'Dados Individuais'
            }[formType];
            
            // Special handling for registration flow
            if (formType === 'individuo' && onSubmitComplete) {
                console.log("Submitting form data for registration:", values);
                
                // Call the parent's onSubmitComplete callback
                await onSubmitComplete(values);
                return { success: true };
            }
            // Normal flow for authenticated forms
            else {
                const token = getToken();
                if (!token) {
                    throw new Error("Não autenticado. Por favor, faça login novamente.");
                }
                
                const response = await fetch('http://localhost:3000/api/compositions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ type: serverType, composition: values }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Erro ao guardar dados");
                }

                const result = await response.json();
                console.log("Guardado com sucesso:", result);
                
                return result;
            }
        } catch (err) {
            console.error("Erro ao submeter composição:", err);
            throw err;
        }
    };

    const formConfig = {
        glicose: {
            jdt: jdtGlicose,
            formDesign: styleGlicose
        },
        insulina: {
            jdt: jdtInsulina,
            formDesign: styleInsulina
        },
        individuo: {
            jdt: jdtIndividuo,
            formDesign: styleIndividuo
        }
    };

    const {jdt, formDesign } = formConfig[type];

    return (
        <div className="p-3">
            <Form
                template={jdt}
                formDesign={JSON.stringify(formDesign)}
                showPrint={false}
                editMode={true}
                submitButtonDisabled={false}
                canSubmit={true}
                onSubmit={(values, changedFields) => saveComposition(values, type)}
                saveButtonDisabled={false}
                canSave={false}
                canCancel={true}
                dlm={{}}
                professionalTasks={["Registar Pedido", "Consultar Pedido", "Anular Pedido"]}
            />
        </div>
    );
}