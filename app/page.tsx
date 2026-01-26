"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
        {/* Header with gradient text */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-black bg-gradient-to-r from-emerald-700 via-pink-400 to-emerald-600 bg-clip-text text-transparent mb-2">
            Weekly Finance Tracker
          </h1>
          <p className="text-emerald-800/70 text-base font-medium">
            Track your financial journey with elegance
          </p>
        </div>

        {error && (
          <div className="mb-4 glass rounded-2xl p-4 border-rose-400/50 animate-pulse">
            <p className="text-rose-700 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Main form - glassmorphic card */}
        <form
          onSubmit={upsertSnapshot}
          className="glass-strong rounded-3xl p-6 shadow-2xl shadow-pink-300/30 mb-6 hover:shadow-pink-300/40 hover:scale-[1.01]"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl">
              <input
                type="date"
                className="w-full bg-white/50 border-2 border-emerald-700/30 rounded-2xl px-4 py-3 text-emerald-900 placeholder-emerald-700/50 focus:bg-white/70 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                value={weekOf}
                onChange={(e) => setWeekOf(e.target.value)}
              />
            </div>

            <input
              placeholder="💰 Savings Accounts"
              className="w-full bg-white/50 border-2 border-emerald-700/30 rounded-2xl px-4 py-3 text-emerald-900 placeholder-emerald-700/50 focus:bg-white/70 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              inputMode="decimal"
              value={savings}
              onChange={(e) => setSavings(e.target.value)}
            />

            <input
              placeholder="💳 Credit Card Balance"
              className="w-full bg-white/50 border-2 border-pink-300/50 rounded-2xl px-4 py-3 text-emerald-900 placeholder-emerald-700/50 focus:bg-white/70 focus:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
              inputMode="decimal"
              value={creditCard}
              onChange={(e) => setCreditCard(e.target.value)}
            />

            <button
              className="w-full bg-gradient-to-r from-emerald-700 to-pink-400 hover:from-emerald-800 hover:to-pink-500 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-emerald-700/40 hover:shadow-emerald-700/60 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              type="submit"
              disabled={saving}
            >
              {saving ? "✨ Saving…" : "✨ Save Week"}
            </button>
          </div>
        </form>

        {/* Chart section */}
        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-emerald-700/20 mb-6 hover:shadow-emerald-700/30">
          <h2 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Financial Overview
          </h2>
          <div className="h-80 bg-white/30 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,77,62,0.2)" />
                <XAxis
                  dataKey="week"
                  stroke="rgba(13,77,62,0.7)"
                  style={{ fontSize: '12px', fill: '#0d4d3e' }}
                />
                <YAxis
                  stroke="rgba(13,77,62,0.7)"
                  style={{ fontSize: '12px', fill: '#0d4d3e' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(250,247,242,0.95)',
                    border: '2px solid rgba(244,194,194,0.5)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                  }}
                  labelStyle={{ color: '#0d4d3e', fontWeight: 'bold' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#0d4d3e"
                  strokeWidth={2}
                  dot={{ fill: '#0d4d3e', r: 4 }}
                  activeDot={{ r: 6, fill: '#166f59' }}
                  name="Savings"
                />
                <Line
                  type="monotone"
                  dataKey="creditCard"
                  stroke="#f4c2c2"
                  strokeWidth={2}
                  dot={{ fill: '#f4c2c2', r: 4 }}
                  activeDot={{ r: 6, fill: '#f8a0a0' }}
                  name="Credit Card"
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#166f59"
                  strokeWidth={3}
                  dot={{ fill: '#166f59', r: 5 }}
                  activeDot={{ r: 7, fill: '#0d4d3e' }}
                  name="Net Worth"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical data */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span>
            History
          </h2>
          {rows
            .slice()
            .reverse()
            .map((r) => (
              <div
                key={r.id}
                className="glass rounded-2xl p-4 hover:bg-white/80 hover:scale-[1.01] group"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-semibold text-emerald-900 text-lg mb-1">
                      {new Date(r.week_of).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-emerald-700 font-medium">
                        💰 ${centsToDollars(r.savings_cents)}
                      </span>
                      <span className="text-pink-600 font-medium">
                        💳 ${centsToDollars(r.credit_card_cents)}
                      </span>
                      <span className="text-emerald-800 font-bold">
                        📈 Net: ${centsToDollars(r.savings_cents - r.credit_card_cents)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="text-rose-600 hover:text-rose-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-rose-100/60 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteRow(r.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          {rows.length === 0 && !loading && (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-emerald-700/70 text-lg">No entries yet. Start tracking your finances! 🚀</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
