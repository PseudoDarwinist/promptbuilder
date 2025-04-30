-- Add sharing columns to the journeys table
ALTER TABLE journeys ADD COLUMN is_shared INTEGER DEFAULT 0;
ALTER TABLE journeys ADD COLUMN share_id TEXT UNIQUE;

-- Optional: Create an index for faster lookup by share_id
CREATE INDEX IF NOT EXISTS idx_journeys_share_id ON journeys (share_id); 