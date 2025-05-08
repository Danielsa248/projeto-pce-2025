import { useState, useEffect, useRef } from 'react';
import { Container, Nav } from 'react-bootstrap';
import $ from 'jquery';
import 'datatables.net-bs5';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';

export default function Historico() {
    const [tipoRegistos, setTipoRegistos] = useState('glicose');
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    
    const getSampleData = (tipo) => {
        // IR BUSCAR OS DADOS DO BACKEND
    };
    
    useEffect(() => {
        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }
        
        const data = getSampleData(tipoRegistos);
        
        if (tableRef.current) {
            dataTableRef.current = $(tableRef.current).DataTable({
                data: data,
                columns: tipoRegistos === 'glicose' 
                    ? [
                        { data: 'data_registo', title: 'Data/Hora', render: (data) => new Date(data).toLocaleString('pt-PT') },
                        { data: 'valor', title: 'Valor' },
                        { data: 'unidade', title: 'Unidade' },
                        { data: 'jejum', title: 'Em Jejum' }
                      ]
                    : [
                        { data: 'data_registo', title: 'Data/Hora', render: (data) => new Date(data).toLocaleString('pt-PT') },
                        { data: 'tipo_insulina', title: 'Tipo' },
                        { data: 'dosagem', title: 'Dosagem' },
                        { data: 'unidade', title: 'Unidade' }
                      ],
                pageLength: 10,
                lengthChange: false,
                language: {
                    paginate: {
                        previous: "Anterior",
                        next: "Seguinte"
                    },
                    search: "Procurar:",
                    zeroRecords: "Nada encontrado",
                    info: "A mostrar _START_ a _END_ de _TOTAL_ atividades",
                    infoEmpty: "Sem dados",
                    infoFiltered: "(filtrado de _MAX_ total)"
                }
            });
        }
        
        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
                dataTableRef.current = null;
            }
        };
    }, [tipoRegistos]); // Re-run when tipoRegistos changes
    
    return (
        <Container fluid className="py-4">
            <h1 className="mb-4">Histórico de Registos</h1>
            
            <Nav variant="tabs" className="mb-4">
                <Nav.Item>
                    <Nav.Link 
                        active={tipoRegistos === 'glicose'} 
                        onClick={() => setTipoRegistos('glicose')}
                    >
                        Glicose
                    </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link 
                        active={tipoRegistos === 'insulina'} 
                        onClick={() => setTipoRegistos('insulina')}
                    >
                        Insulina
                    </Nav.Link>
                </Nav.Item>
            </Nav>
            
            <table className="table table-striped" ref={tableRef}></table>
        </Container>
    );
}