-- Add single finding columns to annotations table
-- Run this SQL to add the new finding and findingSubtype columns

-- Add finding column (single finding name)
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS finding VARCHAR(255);

-- Add finding_subtype column (single finding subtype)
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS finding_subtype VARCHAR(255);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_annotations_finding ON annotations(finding);
CREATE INDEX IF NOT EXISTS idx_annotations_finding_subtype ON annotations(finding_subtype);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'annotations'
ORDER BY ordinal_position;

