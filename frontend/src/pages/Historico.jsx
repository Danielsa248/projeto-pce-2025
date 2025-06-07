import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Spinner, Alert, Badge, Modal, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import $ from 'jquery';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import { useAuth } from '../context/AuthContext';
import './Historico.css';

export default function Historico() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const tableInitializedRef = useRef(false);
    const navigate = useNavigate();
    const { getToken } = useAuth();

    const transformData = (glucoseData, insulinData) => {
        const transformedGlucose = glucoseData.map(item => ({
            data_registo: item.timestamp,
            tipo: 'Glicose',
            valor: `${item.glucose_value ?? 0} mg/dL`,
            regime: item.condition,
            calorias_refeicao: item.meal_calories ?? null,
            tempo_ult_refeicao: item.meal_duration ?? null,
            tempo_ult_exercicio: item.exercise_duration ?? null,
            calorias_exercicio: item.exercise_calories ?? null,
            peso: item.weight ?? null,
        }));
        
        const transformedInsulin = insulinData.map(item => ({
            data_registo: item.timestamp,
            tipo: 'Insulina',
            valor: `${item.insulin_value ?? item.value ?? 0} U`,
            regime: item.route || 'Subcutânea',
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
                fetch('http://localhost:3000/api/bd/registos/Glucose?include=all', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }),
                fetch('http://localhost:3000/api/bd/registos/Insulina?include=all', {
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

    // Função para mostrar detalhes no modal
    const handleViewDetails = useCallback((registoId, tipo) => {
        // Encontrar o registo nos dados
        const record = data.find(item => 
            (item.raw_data?.id === registoId) || 
            `${item.tipo}-${data.indexOf(item)}` === registoId
        );
        
        if (record) {
            setSelectedRecord(record);
            setShowModal(true);
        }
    }, [data]);

    // Função para fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedRecord(null);
    };

    const initializeDataTable = useCallback((tableData) => {
        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
            tableInitializedRef.current = false;
        }
        
        if (!tableRef.current) return;
        
        // Enhanced custom sorting for dates
        $.fn.dataTable.ext.type.order['date-pt-pre'] = function (d) {
            try {
                const parts = d.split(',')[0].split('/');
                const timeParts = d.split(',')[1].trim().split(':');
                
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                const hour = parseInt(timeParts[0], 10);
                const minute = parseInt(timeParts[1], 10);
                
                return new Date(year, month, day, hour, minute).getTime();
            } catch (e) {
                return 0;
            }
        };
        
        const columns = [
            { 
                data: 'data_registo', 
                title: '<i class="fas fa-calendar-alt me-2"></i>Data/Hora',
                render: function(data) {
                    const date = new Date(data);
                    const dateStr = date.toLocaleDateString('pt-PT');
                    const timeStr = date.toLocaleTimeString('pt-PT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                    return `
                        <div class="date-cell">
                            <div class="date-part">${dateStr}</div>
                            <small class="time-part text-muted">${timeStr}</small>
                        </div>
                    `;
                },
                type: 'date-pt',
                width: '15%',
                className: 'text-center'
            },
            { 
                data: 'tipo', 
                title: '<i class="fas fa-tag me-2"></i>Tipo',
                render: function(data) {
                    const badgeClass = data === 'Glicose' ? 'bg-primary' : 'bg-danger';
                    const icon = data === 'Glicose' ? 'fas fa-tint' : 'fas fa-syringe';
                    return `
                        <span class="badge ${badgeClass} type-badge">
                            <i class="${icon} me-1"></i>${data}
                        </span>
                    `;
                },
                width: '15%',
                className: 'text-center'
            },
            { 
                data: 'valor', 
                title: '<i class="fas fa-chart-line me-2"></i>Valor',
                render: function(data) {
                    let valueClass = 'text-body';
                    
                    return `<span class="value-cell ${valueClass}">${data}</span>`;
                },
                width: '15%',
                className: 'text-center'
            },
            { 
                data: 'regime', 
                title: '<i class="fas fa-info-circle me-2"></i>Regime/Rota',
                render: function(data) {
                    return `<span class="regime-cell">${data}</span>`;
                },
                width: '15%',
                className: 'text-center'
            },
            {
                data: null,
                title: '<i class="fas fa-cog me-2"></i>Ações',
                orderable: false,
                searchable: false,
                render: function(data, type, row, meta) {
                    const registoId = row.raw_data?.id || `${row.tipo}-${meta.row}`;
                    return `
                        <button 
                            class="btn btn-outline-primary btn-sm details-btn" 
                            data-registo-id="${registoId}" 
                            data-tipo="${row.tipo}"
                            title="Ver detalhes do registo"
                        >
                            <i class="fas fa-eye me-1"></i>
                            Detalhes
                        </button>
                    `;
                },
                width: '10%',
                className: 'text-center'
            }
        ];

        dataTableRef.current = $(tableRef.current).DataTable({
            data: tableData,
            columns: columns,
            pageLength: 10,
            lengthChange: true,
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
            order: [[0, 'desc']],
            language: {
                paginate: {
                    previous: '<i class="fas fa-chevron-left"></i>',
                    next: '<i class="fas fa-chevron-right"></i>'
                },
                search: "",
                searchPlaceholder: "Procurar registos...",
                zeroRecords: `
                    <div class="text-center py-4">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Nenhum registo encontrado</h5>
                        <p class="text-muted">Tente ajustar os filtros de pesquisa</p>
                    </div>
                `,
                info: "A mostrar _START_ a _END_ de _TOTAL_ registos",
                infoEmpty: "Sem dados disponíveis",
                infoFiltered: "(filtrado de _MAX_ registos totais)",
                lengthMenu: "Mostrar _MENU_ registos por página"
            },
            responsive: true,
            autoWidth: false,
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            drawCallback: function() {
                // Add fade-in animation to rows
                $('.dataTables_wrapper tbody tr').addClass('fade-in-row');
                
                // Add click event listeners to details buttons
                $('.details-btn').off('click').on('click', function(e) {
                    e.preventDefault();
                    const registoId = $(this).data('registo-id');
                    const tipo = $(this).data('tipo');
                    handleViewDetails(registoId, tipo);
                });
            }
        });
        
        tableInitializedRef.current = true;
    }, [handleViewDetails]);
    
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
    
    // Componente Modal para mostrar detalhes
    const DetailsModal = () => {
        if (!selectedRecord) return null;

        // Função para processar duração que vem como array de objetos
        const formatDuration = (durationArray) => {
            if (!durationArray || !Array.isArray(durationArray)) {
                return null;
            }

            const parts = [];
            
            durationArray.forEach(item => {
                if (item && item.value && item.value !== '' && item.value !== '0') {
                    const value = parseInt(item.value, 10);
                    if (value > 0) {
                        // Mapear unidades para português
                        let unit = '';
                        switch (item.unit) {
                            case 'Hora(s)':
                                unit = value === 1 ? 'hora' : 'horas';
                                break;
                            case 'Minuto(s)':
                                unit = value === 1 ? 'minuto' : 'minutos';
                                break;
                            case 'Segundo(s)':
                                unit = value === 1 ? 'segundo' : 'segundos';
                                break;
                            default:
                                unit = item.unit;
                        }
                        parts.push(`${value} ${unit}`);
                    }
                }
            });

            return parts.length > 0 ? parts.join(', ') : null;
        };

        const hasValidDuration = (durationArray) => {
            return formatDuration(durationArray) !== null;
        };

        const isGlucose = selectedRecord.tipo === 'Glicose';
        const badgeClass = isGlucose ? 'bg-primary' : 'bg-danger';
        const icon = isGlucose ? 'fas fa-tint' : 'fas fa-syringe';

        return (
            <Modal 
                show={showModal} 
                onHide={handleCloseModal} 
                size="lg" 
                centered
                className="details-modal"
            >
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="d-flex align-items-center">
                        <Badge bg={isGlucose ? 'primary' : 'danger'} className="me-3">
                            <i className={`${icon} me-2`}></i>
                            {selectedRecord.tipo}
                        </Badge>
                        <span>Detalhes do Registo</span>
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="pt-2">
                    {isGlucose ? (
                        <div className="row">
                            <div className="col-md-6">
                                {/* Data */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-calendar-alt me-2"></i>
                                        Data e Hora
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {new Date(selectedRecord.data_registo).toLocaleString('pt-PT', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>

                                {/* Valor da Glicose */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-chart-line me-2"></i>
                                        Valor da Glicose
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {selectedRecord.valor}
                                    </p>
                                </div>

                                {/* Evento/Regime */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-utensils me-2"></i>
                                        Regime
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {selectedRecord.regime}
                                    </p>
                                </div>
                                
                                {/* Peso */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-weight me-2"></i>
                                        Peso Corporal
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {selectedRecord.peso ? 
                                            `${selectedRecord.peso} kg` : 
                                            <span className="text-muted">-</span>
                                        }
                                    </p>
                                </div>
                            </div>
                            
                            <div className="col-md-6">
                                {/* Calorias da Refeição */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-bomb me-2"></i>
                                        Calorias da Refeição
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {selectedRecord.calorias_refeicao ? 
                                            `${selectedRecord.calorias_refeicao} kcal` : 
                                            <span className="text-muted">-</span>
                                        }                 
                                    </p>
                                </div>

                                {/* Duração da Refeição */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-stopwatch me-2"></i>
                                        Tempo desde a Última Refeição
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {hasValidDuration(selectedRecord.tempo_ult_refeicao) ? 
                                            formatDuration(selectedRecord.tempo_ult_refeicao) : 
                                            <span className="text-muted">-</span>
                                        }
                                    </p>
                                </div>

                                {/* Calorias do Exercício */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-fire-alt me-2"></i>
                                        Calorias Queimadas no Exercício Físico
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {selectedRecord.calorias_exercicio ? 
                                            `${selectedRecord.calorias_exercicio} kcal` :
                                            <span className="text-muted">-</span>
                                        }
                                    </p>
                                </div>

                                {/* Duração do Exercício */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-primary mb-2 fw-bold">
                                        <i className="fas fa-hourglass-half me-2"></i>
                                        Tempo desde o Último Exercício Físico
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {hasValidDuration(selectedRecord.tempo_ult_exercicio) ? 
                                            formatDuration(selectedRecord.tempo_ult_exercicio) : 
                                            <span className="text-muted">-</span>
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="row">
                            <div className="col-md-6">
                                {/* Data */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-danger mb-2 fw-bold">
                                        <i className="fas fa-calendar-alt me-2"></i>
                                        Data e Hora
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {new Date(selectedRecord.data_registo).toLocaleString('pt-PT', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>

                                {/* Valor da Insulina */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-danger mb-2 fw-bold">
                                        <i className="fas fa-syringe me-2"></i>
                                        Dose de Insulina
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {selectedRecord.valor}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="col-md-6">
                                {/* Rota de Administração */}
                                <div className="detail-item mb-4">
                                    <h6 className="text-danger mb-2 fw-bold">
                                        <i className="fas fa-route me-2"></i>
                                        Rota de Administração
                                    </h6>
                                    <p className="mb-0 fs-6 fw-semibold text-dark">
                                        {selectedRecord.regime || selectedRecord.raw_data?.route || 'Subcutânea'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="outline-secondary" onClick={handleCloseModal}>
                        <i className="fas fa-times me-2"></i>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    };
    
    return (
        <Container className="py-4">
            <div className="mb-4">
                <div className="d-flex align-items justify-content-between">
                    <div>
                        <h1 className="display-6 fw-bold text-primary mb-1">
                            <i className="fas fa-history me-3"></i>
                            Histórico de Registos
                        </h1>
                        <p className="text-muted mb-1">
                            Consulte o seu histórico de medições de glicose e administrações de insulina
                        </p>
                    </div>
                    {data.length > 0 && (
                        <div className="stats-cards d-none d-lg-flex">
                            <div className="stat-card me-3">
                                <div className="stat-number">{data.filter(d => d.tipo === 'Glicose').length}</div>
                                <div className="stat-label">Glicose</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">{data.filter(d => d.tipo === 'Insulina').length}</div>
                                <div className="stat-label">Insulina</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {isLoading && data.length === 0 ? (
                <div className="text-center my-5 loading-state">
                    <div className="spinner-container">
                        <Spinner animation="border" role="status" className="loading-spinner">
                            <span className="visually-hidden">A carregar...</span>
                        </Spinner>
                    </div>
                    <h5 className="mt-3 text-muted">A carregar dados...</h5>
                    <p className="text-muted">Por favor, aguarde enquanto obtemos o seu histórico</p>
                </div>
            ) : error ? (
                <Alert variant="danger" className="my-3 custom-alert">
                    <div className="d-flex align-items-center">
                        <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
                        <div className="flex-grow-1">
                            <Alert.Heading className="h5 mb-2">Erro ao Carregar Dados</Alert.Heading>
                            <p className="mb-3">{error}</p>
                            <button 
                                className="btn btn-outline-danger"
                                onClick={fetchAllData}
                            >
                                <i className="fas fa-redo me-2"></i>
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                </Alert>
            ) : (
                <div className="table-container">
                    <div className="table-responsive custom-table-wrapper">
                        <table className="table table-hover custom-table" ref={tableRef}></table>
                    </div>
                </div>
            )}

            {/* Modal para detalhes do registo */}
            <DetailsModal />
        </Container>
    );
}