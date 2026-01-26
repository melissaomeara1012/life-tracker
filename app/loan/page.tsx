"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export const dynamic = 'force-dynamic';

type LoanPayment = {
  id: string;
  payment_date: string;
  amount_paid: number;
  principal_portion: number;
  interest_portion: number;
  remaining_balance: number;
  status: string;
};

type ScheduledPayment = {
  date: string;
  amount: number;
  interest: number;
  principal: number;
  balance: number;
};

// Loan constants
const PRINCIPAL = 22000;
const ANNUAL_RATE = 0.05;
const BIWEEKLY_RATE = ANNUAL_RATE / 26; // 26 bi-weekly periods in a year
const PAYMENT_AMOUNT = 275;
const START_DATE = new Date("2026-03-06");

function calculateSchedule(
  startBalance: number,
  startDate: Date,
  count: number
): ScheduledPayment[] {
  const schedule: ScheduledPayment[] = [];
  let balance = startBalance;
  let currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    if (balance <= 0) break;

    const interest = balance * BIWEEKLY_RATE;
    const principal = Math.min(PAYMENT_AMOUNT - interest, balance);
    const payment = interest + principal;
    balance = Math.max(0, balance - principal);

    schedule.push({
      date: currentDate.toISOString().split('T')[0],
      amount: payment,
      interest,
      principal,
      balance,
    });

    // Add 14 days for bi-weekly
    currentDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  }

  return schedule;
}

export default function LoanPage() {
  const [clearedPayments, setClearedPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Extra payment form state
  const [extraAmount, setExtraAmount] = useState("");
  const [extraDate, setExtraDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadPayments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("loan_payments")
      .select("*")
      .eq("status", "cleared")
      .order("payment_date", { ascending: true });

    if (error) {
      console.error("Error loading payments:", error);
    }
    setClearedPayments((data as LoanPayment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPayments();
    setExtraDate(new Date().toISOString().slice(0, 10));
  }, []);

  // Calculate current state based on cleared payments
  const remainingBalance =
    clearedPayments.length > 0
      ? clearedPayments[clearedPayments.length - 1].remaining_balance
      : PRINCIPAL;

  const totalInterestPaid = clearedPayments.reduce(
    (sum, p) => sum + p.interest_portion,
    0
  );

  const totalPrincipalPaid = clearedPayments.reduce(
    (sum, p) => sum + p.principal_portion,
    0
  );

  // Calculate next payment date
  const lastPaymentDate =
    clearedPayments.length > 0
      ? new Date(clearedPayments[clearedPayments.length - 1].payment_date)
      : new Date(START_DATE.getTime() - 14 * 24 * 60 * 60 * 1000); // Start date minus 14 days

  const nextPaymentDate = new Date(
    lastPaymentDate.getTime() + 14 * 24 * 60 * 60 * 1000
  );

  // Generate upcoming scheduled payments
  const upcomingSchedule = calculateSchedule(remainingBalance, nextPaymentDate, 20);

  // Estimate payoff date
  const fullSchedule = calculateSchedule(remainingBalance, nextPaymentDate, 1000);
  const payoffDate = fullSchedule.length > 0 ? fullSchedule[fullSchedule.length - 1].date : "Paid off";
  const estimatedTotalInterest = totalInterestPaid + fullSchedule.reduce((sum, p) => sum + p.interest, 0);

  async function markPaymentCleared(scheduledPayment: ScheduledPayment) {
    const { error } = await supabase.from("loan_payments").insert({
      payment_date: scheduledPayment.date,
      amount_paid: scheduledPayment.amount,
      principal_portion: scheduledPayment.principal,
      interest_portion: scheduledPayment.interest,
      remaining_balance: scheduledPayment.balance,
      status: "cleared",
    });

    if (error) {
      console.error("Error marking payment:", error);
      alert("Error marking payment as cleared");
      return;
    }

    loadPayments();
  }

  async function makeExtraPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!extraAmount || !extraDate) {
      alert("Please enter both amount and date");
      return;
    }

    const amount = parseFloat(extraAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSaving(true);

    // Calculate balance at the time of extra payment
    const paymentDate = new Date(extraDate);
    let balance = remainingBalance;

    // Calculate interest accrued since last payment
    const lastPaymentDate = clearedPayments.length > 0
      ? new Date(clearedPayments[clearedPayments.length - 1].payment_date)
      : new Date(START_DATE.getTime() - 14 * 24 * 60 * 60 * 1000);

    const daysSinceLastPayment = Math.floor(
      (paymentDate.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate interest for the period (daily rate)
    const dailyRate = ANNUAL_RATE / 365;
    const interest = balance * dailyRate * daysSinceLastPayment;
    const principal = Math.min(amount - interest, balance);
    const newBalance = Math.max(0, balance - principal);

    const { error } = await supabase.from("loan_payments").insert({
      payment_date: extraDate,
      amount_paid: amount,
      principal_portion: principal,
      interest_portion: interest,
      remaining_balance: newBalance,
      status: "cleared",
    });

    if (error) {
      console.error("Error adding extra payment:", error);
      alert("Error adding extra payment");
      setSaving(false);
      return;
    }

    setExtraAmount("");
    setExtraDate("");
    setSaving(false);
    loadPayments();
  }

  async function deletePayment(id: string) {
    if (!confirm("Delete this payment?")) return;
    await supabase.from("loan_payments").delete().eq("id", id);
    loadPayments();
  }

  // Prepare chart data
  const chartData = [
    {
      date: START_DATE.toISOString().split('T')[0],
      balance: PRINCIPAL,
      interest: 0,
    },
    ...clearedPayments.map((p, idx) => ({
      date: p.payment_date,
      balance: p.remaining_balance,
      interest: clearedPayments.slice(0, idx + 1).reduce((sum, payment) => sum + payment.interest_portion, 0),
    })),
  ];

  return (
    <main className="min-h-screen relative py-8 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium text-sm"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            O&apos;Meara Loan Schedule
          </h1>
          <p className="text-white/60 text-sm font-medium">
            $22,000 at 5% APR • $275 bi-weekly payments
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-strong rounded-2xl p-6 hover:scale-[1.02]">
            <div className="text-white/60 text-sm font-medium mb-2">
              Remaining Balance
            </div>
            <div className="text-3xl font-black text-white">
              ${remainingBalance.toFixed(2)}
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6 hover:scale-[1.02]">
            <div className="text-white/60 text-sm font-medium mb-2">
              Total Interest Paid
            </div>
            <div className="text-3xl font-black text-red-400">
              ${totalInterestPaid.toFixed(2)}
            </div>
            <div className="text-white/40 text-xs mt-1">
              Est. Total: ${estimatedTotalInterest.toFixed(2)}
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6 hover:scale-[1.02]">
            <div className="text-white/60 text-sm font-medium mb-2">
              Payoff Estimate
            </div>
            <div className="text-xl font-bold text-emerald-400">
              {payoffDate === "Paid off" ? payoffDate : new Date(payoffDate).toLocaleDateString()}
            </div>
            <div className="text-white/40 text-xs mt-1">
              {fullSchedule.length} payments left
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6 hover:scale-[1.02]">
            <div className="text-white/60 text-sm font-medium mb-2">
              Next Payment Due
            </div>
            <div className="text-xl font-bold text-violet-400">
              {nextPaymentDate.toLocaleDateString()}
            </div>
            <div className="text-white/40 text-xs mt-1">
              ${upcomingSchedule[0]?.amount.toFixed(2) ?? "0.00"}
            </div>
          </div>
        </div>

        {/* Extra Payment Form */}
        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-emerald-500/10 mb-6 border-2 border-emerald-500/30">
          <h2 className="text-2xl font-bold text-white/90 mb-4 flex items-center gap-2">
            <span className="text-2xl">💵</span>
            Make Extra Payment
          </h2>
          <form onSubmit={makeExtraPayment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-white/60 text-sm font-medium mb-2 block">
                Payment Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="$0.00"
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm font-medium mb-2 block">
                Payment Date
              </label>
              <input
                type="date"
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                value={extraDate}
                onChange={(e) => setExtraDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "💰 Processing..." : "💰 Add Payment"}
              </button>
            </div>
          </form>
          <p className="text-white/50 text-xs mt-3">
            Extra payments reduce the principal and can significantly decrease total interest paid over the life of the loan.
          </p>
        </div>

        {/* Upcoming Payments Checklist */}
        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-purple-500/10 mb-6">
          <h2 className="text-2xl font-bold text-white/90 mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Upcoming Payments
          </h2>
          <div className="space-y-2">
            {upcomingSchedule.map((payment, idx) => (
              <div
                key={idx}
                className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/10"
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded accent-violet-500 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.checked) {
                      markPaymentCleared(payment);
                    }
                  }}
                />
                <div className="flex-1">
                  <div className="font-semibold text-white/90">
                    {new Date(payment.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-white/60">
                    Interest: ${payment.interest.toFixed(2)} • Principal: ${payment.principal.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white text-lg">
                    ${payment.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-white/60">
                    Balance: ${payment.balance.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History Table */}
        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-blue-500/10 mb-6">
          <h2 className="text-2xl font-bold text-white/90 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Payment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/60 text-sm font-medium pb-3">Date</th>
                  <th className="text-right text-white/60 text-sm font-medium pb-3">Amount</th>
                  <th className="text-right text-white/60 text-sm font-medium pb-3">Interest</th>
                  <th className="text-right text-white/60 text-sm font-medium pb-3">Principal</th>
                  <th className="text-right text-white/60 text-sm font-medium pb-3">Balance</th>
                  <th className="text-right text-white/60 text-sm font-medium pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clearedPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 text-white/90">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right font-semibold text-white">
                      ${payment.amount_paid.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-red-400">
                      ${payment.interest_portion.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-emerald-400">
                      ${payment.principal_portion.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-violet-400 font-bold">
                      ${payment.remaining_balance.toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => deletePayment(payment.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded-lg hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {clearedPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/50">
                      No payments recorded yet. Check off payments above to track progress!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance Over Time */}
          <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-blue-500/10">
            <h2 className="text-xl font-bold text-white/90 mb-4">Balance Over Time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    name="Balance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative Interest */}
          <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-red-500/10">
            <h2 className="text-xl font-bold text-white/90 mb-4">Cumulative Interest Paid</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="interest"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 4 }}
                    name="Interest"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
