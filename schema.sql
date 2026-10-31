-- ============================================================================
-- GoReview - Schema PostgreSQL / Supabase
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ============================================================================

-- 1. Tabela de Clientes (Estabelecimentos)
-- Estados suportados em `status`:
--   'active'   -> Cliente Ativo (Subscrição ativa)
--   'trial'    -> Período Experimental (1º Mês Grátis - 30 dias)
--   'inactive' -> Inativo / Suspenso
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Estabelecimento',
    nif VARCHAR(20) NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    email VARCHAR(255),
    logo_url TEXT,
    google_review_url TEXT NOT NULL,
    status TEXT DEFAULT 'trial' NOT NULL CHECK (status IN ('active', 'trial', 'inactive')),
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Garantir migração de coluna email se a tabela já existir
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Atualizar o Café Central Lisboa com o e-mail oficial para envio de relatórios mensais
UPDATE public.clients
SET email = 'marcoacteodoro@hotmail.com'
WHERE nif = '509123456' OR slug = 'cafe-central';

-- Índices para acelerar a pesquisa por ?nif= ou ?client=
CREATE INDEX IF NOT EXISTS idx_clients_nif ON public.clients (nif);
CREATE INDEX IF NOT EXISTS idx_clients_slug ON public.clients (slug);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients (status);

-- 2. Tabela de Avaliações / Caixa de Reclamações (Registo do Filtro Ético)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    contact_info TEXT, -- Contacto opcional para o gerente resolver a reclamação (1 a 3 estrelas)
    redirected_to_google BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews (client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at);

-- ============================================================================
-- 3. VIEW SQL PARA RELATÓRIO MENSAL POR EMPRESA
-- ============================================================================
CREATE OR REPLACE VIEW public.view_monthly_client_report AS
SELECT
    c.id AS client_id,
    c.name AS client_name,
    c.nif AS client_nif,
    c.status AS client_status,
    to_char(date_trunc('month', r.created_at), 'YYYY-MM') AS report_month,
    COUNT(r.id) AS total_reviews,
    ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
    COUNT(r.id) FILTER (WHERE r.rating >= 4) AS positive_google_count,
    COUNT(r.id) FILTER (WHERE r.rating <= 3) AS internal_complaints_count,
    COUNT(r.id) FILTER (WHERE r.rating = 5) AS stars_5,
    COUNT(r.id) FILTER (WHERE r.rating = 4) AS stars_4,
    COUNT(r.id) FILTER (WHERE r.rating = 3) AS stars_3,
    COUNT(r.id) FILTER (WHERE r.rating = 2) AS stars_2,
    COUNT(r.id) FILTER (WHERE r.rating = 1) AS stars_1
FROM public.clients c
LEFT JOIN public.reviews r ON r.client_id = c.id
GROUP BY c.id, c.name, c.nif, c.status, date_trunc('month', r.created_at);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de clientes"
    ON public.clients
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Permitir criação de clientes"
    ON public.clients
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir atualização de clientes"
    ON public.clients
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir eliminação de clientes"
    ON public.clients
    FOR DELETE
    TO anon, authenticated
    USING (true);

CREATE POLICY "Permitir inserção pública de avaliações"
    ON public.reviews
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir leitura de avaliações para relatórios"
    ON public.reviews
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ============================================================================
-- Empresas de Teste (Pesquisáveis por NIF ou Slug)
-- ============================================================================

INSERT INTO public.clients (name, category, nif, slug, logo_url, google_review_url, status, active)
VALUES
    (
        'Café Central Lisboa',
        'Cafetaria & Pastelaria',
        '509123456',
        'cafe-central',
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=240&q=80',
        'https://www.google.com/maps/search/?api=1&query=Cafe+Central+Lisboa',
        'active',
        true
    ),
    (
        'Restaurante O Marinheiro',
        'Restauração & Marisqueira',
        '510987654',
        'restaurante-marinheiro',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=240&q=80',
        'https://www.google.com/maps/search/?api=1&query=Restaurante+O+Marinheiro+Porto',
        'trial',
        true
    ),
    (
        'Clínica Dentária Sorriso',
        'Saúde & Medicina Dentária',
        '512345678',
        'clinica-sorriso',
        'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=240&q=80',
        'https://www.google.com/maps/search/?api=1&query=Clinica+Dentaria+Lisboa',
        'active',
        true
    ),
    (
        'Barbearia Dom Bigode',
        'Estética & Barbearia',
        '514567890',
        'barbearia-dom-bigode',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=240&q=80',
        'https://www.google.com/maps/search/?api=1&query=Barbearia+Coimbra',
        'trial',
        true
    ),
    (
        'Pastelaria Belém Dourado',
        'Pastelaria Tradicional',
        '501234567',
        'pastelaria-belem-dourado',
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=240&q=80',
        'https://www.google.com/maps/search/?api=1&query=Pastelaria+Belem+Lisboa',
        'trial',
        true
    )
ON CONFLICT (slug) DO NOTHING;
