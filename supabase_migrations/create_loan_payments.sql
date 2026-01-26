-- Create loan_payments table for O'Meara Loan Schedule tracking
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_date DATE NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL,
  principal_portion NUMERIC(10, 2) NOT NULL,
  interest_portion NUMERIC(10, 2) NOT NULL,
  remaining_balance NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on payment_date for faster queries
CREATE INDEX IF NOT EXISTS idx_loan_payments_date
  ON loan_payments(payment_date DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_loan_payments_status
  ON loan_payments(status);

-- Enable Row Level Security (RLS)
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Enable all access for loan_payments"
  ON loan_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE loan_payments IS 'Tracks loan payment schedule and completion status for O''Meara loan';
