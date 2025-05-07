import { lazy, Suspense } from 'react';

// Use the same FormRender component with the individuo type
const FormRender = lazy(() => import('../FormRender.jsx'));

export default function Register() {
    return (
        <div className="container">
            <h1 className="mb-4">Criar Conta</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <FormRender key="individuo" type="individuo" />
            </Suspense>
        </div>
    );
}