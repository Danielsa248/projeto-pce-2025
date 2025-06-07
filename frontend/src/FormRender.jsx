import { Form } from "protected-aidaforms";
import { useState } from 'react';
import { Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import jdtGlicose from './opt/jdt_glucose.json';
import jdtInsulina from './opt/jdt_insulina.json';
import styleGlicose from './opt/style_glucose.json';
import styleInsulina from './opt/style_insulina.json';
import jdtIndividuo from './opt/jdt_individuo.json';
import styleIndividuo from './opt/style_individuo.json';
import { useAuth } from './context/AuthContext';

export default function FormRender({ type, onSubmitComplete }) {
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    const saveComposition = async (values, formType) => {
        try {
            setError(null);
            setSuccess(null);

            const serverType = {
                'glicose': 'Medição de Glicose',
                'insulina': 'Medição de Insulina',
                'individuo': 'Dados Individuais'
            }[formType];
            
            // Special handling for registration flow
            if (formType === 'individuo' && onSubmitComplete) {
                await onSubmitComplete(values);
                return { success: true };
            }
            // Normal flow for authenticated forms (glucose/insulin)
            else {
                const token = getToken();
                if (!token) {
                    throw new Error("Não autenticado. Por favor, faça login novamente.");
                }
                
                const response = await fetch('http://localhost:3000/api/bd/compositions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ type: serverType, composition: values }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Erro ao guardar dados");
                }

                const result = await response.json();
                console.log("Guardado com sucesso:", result);
                
                if (formType === 'glicose' || formType === 'insulina') {
                    const formName = formType === 'glicose' ? 'Glicose' : 'Insulina';
                    setSuccess(`Medição de ${formName} registada com sucesso!`);
                    
                    setTimeout(() => {
                        navigate('/');
                    }, 2000);
                }
                
                return result;
            }
        } catch (err) {
            console.error("Erro ao submeter composição:", err);
            setError(err.message || "Erro ao guardar dados");
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
            {/* Success Alert */}
            {success && (
                <Alert variant="success" className="mb-3">
                    <div className="d-flex align-items-center">
                        <i className="fas fa-check-circle me-2"></i>
                        {success}
                    </div>
                    <div className="mt-2">
                        <small>A redirecionar para o dashboard...</small>
                    </div>
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}>
                    <div className="d-flex align-items-center">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        {error}
                    </div>
                </Alert>
            )}

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