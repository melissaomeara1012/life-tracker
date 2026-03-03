-- Add notes column to loan_payments table for extra payment descriptions
ALTER TABLE loan_payments
ADD COLUMN notes TEXT;
