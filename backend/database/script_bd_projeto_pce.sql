CREATE TYPE sexo_tipo AS ENUM ('M', 'F', 'O');

CREATE TYPE contacto_tipo AS ENUM ('T', 'E');

CREATE TYPE registo_tipo AS ENUM ('Insulina', 'Glucose');


-- Tabela de utilizador
CREATE TABLE public.utilizador (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    data_nasc DATE NOT NULL,
    altura NUMERIC(5,2) NOT NULL,
    peso NUMERIC(5,2) NOT NULL,
    genero SEXO_TIPO NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- Tabela de contato
CREATE TABLE public.contacto (
    utilizador INTEGER NOT NULL,
    tipo_contacto contacto_tipo NOT NULL,
    contacto TEXT NOT NULL,
	PRIMARY KEY (utilizador, contacto),
    CONSTRAINT fk_contacto_utilizador FOREIGN KEY (utilizador)
        REFERENCES public.utilizador (id) ON DELETE CASCADE
);

-- Tabela de morada
CREATE TABLE public.morada (
    id TEXT PRIMARY KEY,
    utilizador INTEGER NOT NULL,
    endereco TEXT NOT NULL,
    cidade TEXT NOT NULL,
    distrito TEXT NOT NULL,
    pais TEXT NOT NULL,
    cod_postal TEXT NOT NULL,
    CONSTRAINT fk_morada_utilizador FOREIGN KEY (utilizador)
        REFERENCES public.utilizador (id) ON DELETE CASCADE
);

-- Tabela de registos
CREATE TABLE public.registos (
    id TEXT PRIMARY KEY,
    utilizador INTEGER NOT NULL,
    data_registo TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo_registo registo_tipo NOT NULL,
    dados JSONB NOT NULL,
    CONSTRAINT fk_registo_utilizador FOREIGN KEY (utilizador)
        REFERENCES public.utilizador (id) ON DELETE CASCADE
);

-- Tabela de registos agendados
CREATE TABLE public.agenda (
    id SERIAL PRIMARY KEY,
    utilizador INTEGER NOT NULL,
    tipo_registo registo_tipo NOT NULL,
    data_evento TIMESTAMP NOT NULL,
    notas TEXT,
    realizado BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_agenda_utilizador FOREIGN KEY (utilizador)
        REFERENCES public.utilizador (id) ON DELETE CASCADE,
    CONSTRAINT check_future_event CHECK (data_evento > NOW())
);


-- Trigger function to check if user ID already exists
CREATE OR REPLACE FUNCTION check_user_id_exists()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM utilizador WHERE id = NEW.id) THEN
        RAISE EXCEPTION 'Erro: Utilizador com ID % já existe no sistema.', NEW.id
            USING HINT = 'Por favor, escolha outro número de utente.',
                  ERRCODE = 'unique_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_user_id_exists_trigger
BEFORE INSERT ON utilizador
FOR EACH ROW
EXECUTE FUNCTION check_user_id_exists();

-- Função do trigger para atualizar o peso do utilizador
CREATE OR REPLACE FUNCTION update_user_weight_from_registo()
RETURNS TRIGGER AS $$
DECLARE
    peso_atual NUMERIC(5,2);
    peso_anterior NUMERIC(5,2);
    peso_texto TEXT;
    peso_key TEXT;
    dados_keys TEXT[];
BEGIN
    IF NEW.tipo_registo = 'Glucose' THEN
        
        BEGIN
            SELECT key INTO peso_key
            FROM jsonb_each_text(NEW.dados) 
            WHERE key LIKE '%items.5.items.0.value.value%'
            LIMIT 1;
            
            IF peso_key IS NOT NULL THEN
                peso_texto := NEW.dados ->> peso_key;
                RAISE NOTICE 'Peso encontrado na chave "%": %', peso_key, peso_texto;
            ELSE
                peso_texto := COALESCE(
                    NEW.dados ->> 'items.0.0.items.5.items.0.value.value',
                    NEW.dados ->> 'items.0.items.5.items.0.value.value',
                    NEW.dados ->> 'items.5.items.0.value.value'
                );
                RAISE NOTICE 'Peso procurado em chaves fixas: %', peso_texto;
            END IF;
            
            IF peso_texto IS NOT NULL AND peso_texto != '' AND peso_texto != 'null' THEN
                peso_atual := peso_texto::NUMERIC(5,2);
                RAISE NOTICE 'Peso convertido para: % kg', peso_atual;
            ELSE
                RAISE NOTICE 'Peso não encontrado ou vazio no registo %', NEW.id;
                RETURN NEW;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Erro ao extrair peso do JSONB para utilizador %: %', NEW.utilizador, SQLERRM;
                RETURN NEW;
        END;
        
        IF peso_atual IS NOT NULL AND peso_atual BETWEEN 20 AND 300 THEN
            
            SELECT peso INTO peso_anterior 
            FROM utilizador 
            WHERE id = NEW.utilizador;
            
            IF peso_anterior IS DISTINCT FROM peso_atual THEN
                
                UPDATE utilizador 
                SET peso = peso_atual
                WHERE id = NEW.utilizador;
                
                RAISE NOTICE 'SUCESSO: Peso atualizado para utilizador %: % kg → % kg', 
                    NEW.utilizador, peso_anterior, peso_atual;
                    
            ELSE
                RAISE NOTICE 'Peso não alterado para utilizador % (já era % kg)', 
                    NEW.utilizador, peso_atual;
            END IF;
        ELSE
            RAISE WARNING 'Peso inválido ignorado para utilizador %: % kg', 
                NEW.utilizador, peso_atual;
        END IF;
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro geral no trigger de peso para utilizador %: %', 
            NEW.utilizador, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o peso do utilizador
CREATE TRIGGER update_user_weight_trigger
    AFTER INSERT ON registos
    FOR EACH ROW
    EXECUTE FUNCTION update_user_weight_from_registo();

-- Função para o trigger de validação para contactos
CREATE OR REPLACE FUNCTION validate_contacto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_contacto = 'E' THEN
        IF NEW.contacto !~ '@' OR NEW.contacto !~ '\.' THEN
            RAISE EXCEPTION 'Email inválido: deve conter "@" e "." - Valor fornecido: %', NEW.contacto
                USING HINT = 'Formato válido: exemplo@dominio.com',
                      ERRCODE = 'check_violation';
        END IF;
        
        IF LENGTH(NEW.contacto) < 5 THEN
            RAISE EXCEPTION 'Email muito curto: % (mínimo 5 caracteres)', NEW.contacto
                USING HINT = 'Formato válido: a@b.c',
                      ERRCODE = 'check_violation';
        END IF;
        
        IF NEW.contacto ~ '^@' OR NEW.contacto ~ '@$' THEN
            RAISE EXCEPTION 'Email inválido: @ não pode estar no início ou fim - %', NEW.contacto
                USING HINT = 'Formato válido: exemplo@dominio.com',
                      ERRCODE = 'check_violation';
        END IF;
        
        IF NEW.contacto !~ '.+@.+\..+' THEN
            RAISE EXCEPTION 'Email inválido: formato incorreto - %', NEW.contacto
                USING HINT = 'Formato válido: exemplo@dominio.com',
                      ERRCODE = 'check_violation';
        END IF;
    END IF;
    
    IF NEW.tipo_contacto = 'T' THEN
        DECLARE
            telefone_limpo TEXT;
        BEGIN
            telefone_limpo := REGEXP_REPLACE(NEW.contacto, '[^0-9]', '', 'g');
            
            IF telefone_limpo !~ '^[0-9]+$' THEN
                RAISE EXCEPTION 'Telefone inválido: deve conter apenas números - Valor fornecido: %', NEW.contacto
                    USING HINT = 'Formatos válidos: 912345678, +351 912 345 678, (351) 912-345-678',
                          ERRCODE = 'check_violation';
            END IF;
            
            IF LENGTH(telefone_limpo) < 9 OR LENGTH(telefone_limpo) > 15 THEN
                RAISE EXCEPTION 'Telefone inválido: deve ter entre 9 e 15 dígitos - % (% dígitos)', 
                    NEW.contacto, LENGTH(telefone_limpo)
                    USING HINT = 'Exemplos válidos: 912345678 (9 dígitos), 351912345678 (12 dígitos)',
                          ERRCODE = 'check_violation';
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar contactos
CREATE TRIGGER validate_contacto_trigger
    BEFORE INSERT OR UPDATE ON contacto
    FOR EACH ROW
    EXECUTE FUNCTION validate_contacto();