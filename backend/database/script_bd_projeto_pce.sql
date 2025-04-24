CREATE TYPE sexo_tipo AS ENUM ('Masculino', 'Feminino', 'Outro');

CREATE TYPE contacto_tipo AS ENUM ('Telemovel', 'Email');

CREATE TYPE registo_tipo AS ENUM ('Insulina', 'Glucose');


-- Tabela de utilizador
CREATE TABLE public.utilizador (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    data_nasc DATE NOT NULL,
    altura NUMERIC(5,2) NOT NULL,
    peso NUMERIC(5,2) NOT NULL,
    genero SEXO_TIPO NOT NULL
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
    id INTEGER PRIMARY KEY,
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