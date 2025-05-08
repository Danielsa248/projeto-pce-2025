import { lazy, Suspense } from 'react';

// Use the same FormRender component with the individuo type
const FormRender = lazy(() => import('../FormRender.jsx'));

export default function Register() {
    return (
        <div className="container">
            <Suspense fallback={<div>Loading...</div>}>
                <FormRender key="individuo" type="individuo" />
            </Suspense>
        </div>
    );
}