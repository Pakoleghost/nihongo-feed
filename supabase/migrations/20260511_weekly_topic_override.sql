-- Tabla para el tema de la semana editable desde la app
CREATE TABLE IF NOT EXISTS weekly_topic_override (
  id INTEGER PRIMARY KEY DEFAULT 1,
  kana TEXT NOT NULL,
  prompt TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Solo puede haber una fila (id = 1)
ALTER TABLE weekly_topic_override
  ADD CONSTRAINT single_row CHECK (id = 1);

-- RLS
ALTER TABLE weekly_topic_override ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer
CREATE POLICY "public read"
  ON weekly_topic_override FOR SELECT
  USING (true);

-- Solo usuarios autenticados pueden escribir
CREATE POLICY "auth write"
  ON weekly_topic_override FOR ALL
  USING (auth.uid() IS NOT NULL);
