-- =============================================================================
-- Temas do leitor do design system caseLeitura ("Nove jeitos de ler").
-- Os valores existentes continuam valendo: light = Papel, sepia = Sépia,
-- dark = Noite. Os novos completam os nove.
-- =============================================================================

alter type public.reader_theme add value if not exists 'linen';    -- Linho
alter type public.reader_theme add value if not exists 'sage';     -- Sálvia
alter type public.reader_theme add value if not exists 'contrast'; -- Contraste
alter type public.reader_theme add value if not exists 'twilight'; -- Crepúsculo
alter type public.reader_theme add value if not exists 'ocean';    -- Oceano
alter type public.reader_theme add value if not exists 'black';    -- Breu
