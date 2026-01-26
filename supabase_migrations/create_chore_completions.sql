-- Create chore_completions table for household chores tracking
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chore_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area TEXT NOT NULL,
  task TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on completed_at for faster queries
CREATE INDEX IF NOT EXISTS idx_chore_completions_completed_at
  ON chore_completions(completed_at DESC);

-- Create index on area and task for faster lookups
CREATE INDEX IF NOT EXISTS idx_chore_completions_area_task
  ON chore_completions(area, task);

-- Enable Row Level Security (RLS)
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Enable all access for chore_completions"
  ON chore_completions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE chore_completions IS 'Tracks completion of household chores by area and task type';
