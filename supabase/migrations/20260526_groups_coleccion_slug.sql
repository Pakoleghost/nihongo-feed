-- Add coleccion_slug to groups so each group can be mapped to a Zoom recording collection
ALTER TABLE groups ADD COLUMN IF NOT EXISTS coleccion_slug TEXT;
