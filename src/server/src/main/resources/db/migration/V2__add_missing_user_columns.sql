-- Add missing created_at column to users table
ALTER TABLE users
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Set existing rows with a default value
UPDATE users
SET created_at = updated_at
WHERE created_at IS NULL;

-- Ensure other columns have appropriate types
ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMP;
