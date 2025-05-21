import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Spinner, Alert } from 'react-bootstrap';
import $ from 'jquery';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import { useAuth } from '../context/AuthContext';

export default function Historico() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const tableInitializedRef = useRef(false); // Track if table is already initialized
    const { getToken } = useAuth();
    

    const transformData = (glucoseData, insulinData) => {
        const transformedGlucose = glucoseData.map(item => ({
            data_registo: item.timestamp,
            tipo: 'Glicose',
            valor: `${item.value} mg/dL`,
            regime: item.condition || 'Jejum',
            raw_data: item
        }));
        
        const transformedInsulin = insulinData.map(item => ({
            data_registo: item.timestamp,
            tipo: 'Insulina',
            valor: `${item.value} U`,
            regime: item.route || 'Subcutânea',
            raw_data: item
        }));
        
        return [...transformedGlucose, ...transformedInsulin];
    };
    
    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const token = getToken();
            if (!token) {
                throw new Error('Não autenticado');
            }
            
            const [glucoseResponse, insulinResponse] = await Promise.all([
                fetch('http://localhost:3000/api/registos/Glucose', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }),
                fetch('http://localhost:3000/api/registos/Insulina', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                })
            ]);
            
            if (!glucoseResponse.ok || !insulinResponse.ok) {
                throw new Error(`Erro ao carregar dados`);
            }
            
            const glucoseResult = await glucoseResponse.json();
            const insulinResult = await insulinResponse.json();
            
            if (!glucoseResult.success || !insulinResult.success) {
                throw new Error('Erro ao obter dados');
            }
            
            // Pre-sort the data before passing it to DataTables
            const combinedData = transformData(glucoseResult.data, insulinResult.data)
                .sort((a, b) => {
                    const dateA = new Date(a.data_registo).getTime();
                    const dateB = new Date(b.data_registo).getTime();
                    return dateB - dateA; // Newest first
                });

            setData(combinedData);
            
            return combinedData;
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.message || 'Erro ao carregar dados');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    const initializeDataTable = useCallback((tableData) => {
        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
            tableInitializedRef.current = false;
        }
        
        if (!tableRef.current) return;
        
        // Add this custom sorting method to handle dates properly
        $.fn.dataTable.ext.type.order['date-pt-pre'] = function (d) {
            // Convert displayed date string back to milliseconds for sorting
            try {
                // Extract date from the rendered date string
                const parts = d.split(',')[0].split('/');
                const timeParts = d.split(',')[1].trim().split(':');
                
                // Create date in DD/MM/YYYY format (Portuguese format)
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
                const year = parseInt(parts[2], 10);
                const hour = parseInt(timeParts[0], 10);
                const minute = parseInt(timeParts[1], 10);
                
                return new Date(year, month, day, hour, minute).getTime();
            } catch (e) {
                return 0; // Default value for invalid dates
            }
        };
        
        const columns = [
            { 
                data: 'data_registo', 
                title: 'Data/Hora',
                render: function(data) {
                    const date = new Date(data);
                    return date.toLocaleString('pt-PT');
                },
                type: 'date-pt',
                width: '25%' // Add this fixed width
            },
            { 
                data: 'tipo', 
                title: 'Tipo',
                width: '15%' // Add this fixed width
            },
            { 
                data: 'valor', 
                title: 'Valor',
                width: '20%' // Add this fixed width
            },
            { 
                data: 'regime', 
                title: 'Regime/Rota',
                width: '40%' // Add this fixed width
            }
        ];
        

        dataTableRef.current = $(tableRef.current).DataTable({
            data: tableData,
            columns: columns,
            pageLength: 10,
            lengthChange: false,
            order: [[0, 'desc']], // Sort by date descending
            language: {
                paginate: {
                    previous: "Anterior",
                    next: "Seguinte"
                },
                search: "Procurar:",
                zeroRecords: "Nada encontrado",
                info: "A mostrar _START_ a _END_ de _TOTAL_ registos",
                infoEmpty: "Sem dados",
                infoFiltered: "(filtrado de _MAX_ total)"
            },
            responsive: true,
            autoWidth: false // Important - prevents automatic width calculation
        });
        
        tableInitializedRef.current = true;
    }, []);
    
    // Split the effects - first for data fetching
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);
    
    // Second effect for DataTable initialization - only runs when data changes
    useEffect(() => {
        if (data.length > 0) {
            initializeDataTable(data);
        }
        
        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
                dataTableRef.current = null;
                tableInitializedRef.current = false;
            }
        };
    }, [data, initializeDataTable]);
    
    return (
        <Container fluid className="py-4">
            <div className="mb-4">
                <h1>Histórico de Registos</h1>
            </div>
            
            {isLoading && data.length === 0 ? (
                <div className="text-center my-5">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">A carregar...</span>
                    </Spinner>
                    <p className="mt-2">A carregar dados...</p>
                </div>
            ) : error ? (
                <Alert variant="danger" className="my-3">
                    <Alert.Heading>Erro</Alert.Heading>
                    <p>{error}</p>
                    <button 
                        className="btn btn-outline-danger" 
                        onClick={fetchAllData}
                    >
                        Tentar novamente
                    </button>
                </Alert>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped" ref={tableRef}></table>
                </div>
            )}
        </Container>
    );
}