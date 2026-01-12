"use client";

import { useEffect, useMemo, useState } from "react";
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

type SnapshotRow = {
  id: string;
  week_of: string;
  checking_cents: number;
  savings_cents: number;
  credit_card_cents: number;
  notes: string | null;
};

function dollarsToCents(v: string) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
function centsToDollars(c: number) {
  return (c / 100).toFixed(2);
}

export default function HomePage() {
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weekOf, setWeekOf] = useState("");
  const [savings, setSavings] = useState("");
  const [creditCard, setCreditCard] = useState("");

  useEffect(() => {
    setWeekOf(new Date().toISOString().slice(0, 10));
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("snapshots")
      .select("*")
      .order("week_of", { ascending: true });

    if (error) setError(error.message);
    setRows((data as SnapshotRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    setWeekOf(new Date().toISOString().slice(0, 10));
    load();
  }, []);

  const chartData = useMemo(() => {
    return rows.map((r) => {
      const netWorth = r.savings_cents - r.credit_card_cents;
      return {
        week: r.week_of,
        savings: Number(centsToDollars(r.savings_cents)),
        creditCard: Number(centsToDollars(r.credit_card_cents)),
        netWorth: Number(centsToDollars(netWorth)),
      };
    });
  }, [rows]);

  async function upsertSnapshot(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("snapshots").upsert({
      week_of: weekOf,
      checking_cents: 0,
      savings_cents: dollarsToCents(savings),
      credit_card_cents: dollarsToCents(creditCard),
    });

    if (error) setError(error.message);

    setSavings("");
    setCreditCard("");
    setSaving(false);
    load();
  }

  async function deleteRow(id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("snapshots").delete().eq("id", id);
    load();
  }

  return (
    <main className="min-h-screen relative py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Navigation */}
        <div className="mb-6 flex justify-end">
          <Link
            href="/chores"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium text-sm glass px-4 py-2 rounded-xl hover:bg-white/10"
          >
            🧹 Chores Tracker →
          </Link>
        </div>

        {/* Header with gradient text */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Weekly Finance Tracker
          </h1>
          <p className="text-white/60 text-sm font-medium">
            Track your financial journey with style
          </p>
        </div>

        {error && (
          <div className="mb-4 glass rounded-2xl p-4 border-red-500/50 animate-pulse">
            <p className="text-red-300 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Main form - glassmorphic card */}
        <form
          onSubmit={upsertSnapshot}
          className="glass-strong rounded-3xl p-6 shadow-2xl shadow-purple-500/10 mb-6 hover:shadow-purple-500/20 hover:scale-[1.01]"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl">
              <input
                type="date"
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                value={weekOf}
                onChange={(e) => setWeekOf(e.target.value)}
              />
            </div>

            <input
              placeholder="💰 Savings Accounts"
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
              inputMode="decimal"
              value={savings}
              onChange={(e) => setSavings(e.target.value)}
            />

            <input
              placeholder="💳 Credit Card Balance"
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-pink-400/50 focus:outline-none focus:ring-2 focus:ring-pink-400/30"
              inputMode="decimal"
              value={creditCard}
              onChange={(e) => setCreditCard(e.target.value)}
            />

            <button
              className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-violet-500/50 hover:shadow-violet-500/70 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              type="submit"
              disabled={saving}
            >
              {saving ? "✨ Saving…" : "✨ Save Week"}
            </button>
          </div>
        </form>

        {/* Chart section */}
        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-blue-500/10 mb-6 hover:shadow-blue-500/20">
          <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Financial Overview
          </h2>
          <div className="h-80 bg-white/5 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="week"
                  stroke="rgba(255,255,255,0.6)"
                  style={{ fontSize: '12px' }}
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
                    backdropFilter: 'blur(10px)',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                  name="Savings"
                />
                <Line
                  type="monotone"
                  dataKey="creditCard"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6, fill: '#f87171' }}
                  name="Credit Card"
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7, fill: '#a78bfa' }}
                  name="Net Worth"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical data */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span>
            History
          </h2>
          {rows
            .slice()
            .reverse()
            .map((r) => (
              <div
                key={r.id}
                className="glass rounded-2xl p-4 hover:bg-white/10 hover:scale-[1.01] group"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-semibold text-white/90 text-lg mb-1">
                      {new Date(r.week_of).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-emerald-400">
                        💰 ${centsToDollars(r.savings_cents)}
                      </span>
                      <span className="text-red-400">
                        💳 ${centsToDollars(r.credit_card_cents)}
                      </span>
                      <span className="text-violet-400 font-bold">
                        📈 Net: ${centsToDollars(r.savings_cents - r.credit_card_cents)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="text-red-400 hover:text-red-300 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteRow(r.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          {rows.length === 0 && !loading && (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-white/50 text-lg">No entries yet. Start tracking your finances! 🚀</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
