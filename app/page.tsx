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

  const [weekOf, setWeekOf] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [checking, setChecking] = useState("");
  const [savings, setSavings] = useState("");
  const [creditCard, setCreditCard] = useState("");
  const [notes, setNotes] = useState("");

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
    load();
  }, []);

  const chartData = useMemo(() => {
    return rows.map((r) => {
      const cash = r.checking_cents + r.savings_cents;
      const netWorth = cash - r.credit_card_cents;
      return {
        week: r.week_of,
        checking: Number(centsToDollars(r.checking_cents)),
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
      checking_cents: dollarsToCents(checking),
      savings_cents: dollarsToCents(savings),
      credit_card_cents: dollarsToCents(creditCard),
      notes: notes || null,
    });

    if (error) setError(error.message);

    setChecking("");
    setSavings("");
    setCreditCard("");
    setNotes("");
    setSaving(false);
    load();
  }

  async function deleteRow(id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("snapshots").delete().eq("id", id);
    load();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md p-4">
        <h1 className="text-2xl font-bold">Weekly Finance Tracker</h1>

        {error && (
          <div className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={upsertSnapshot}
          className="mt-4 space-y-3 rounded bg-white p-4 shadow"
        >
          <input
            type="date"
            className="w-full rounded border p-2"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
          />
          <input
            placeholder="Checking"
            className="w-full rounded border p-2"
            inputMode="decimal"
            value={checking}
            onChange={(e) => setChecking(e.target.value)}
          />
          <input
            placeholder="Savings"
            className="w-full rounded border p-2"
            inputMode="decimal"
            value={savings}
            onChange={(e) => setSavings(e.target.value)}
          />
          <input
            placeholder="Credit Card Balance"
            className="w-full rounded border p-2"
            inputMode="decimal"
            value={creditCard}
            onChange={(e) => setCreditCard(e.target.value)}
          />
          <input
            placeholder="Notes (optional)"
            className="w-full rounded border p-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            className="w-full rounded bg-black p-2 text-white"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Week"}
          </button>
        </form>

        <div className="mt-6 h-64 rounded bg-white p-3 shadow">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="checking" />
              <Line type="monotone" dataKey="savings" />
              <Line type="monotone" dataKey="creditCard" />
              <Line type="monotone" dataKey="netWorth" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 space-y-2">
          {rows
            .slice()
            .reverse()
            .map((r) => (
              <div
                key={r.id}
                className="rounded border bg-white p-2 flex justify-between"
              >
                <div>
                  <div className="font-medium">{r.week_of}</div>
                  <div className="text-sm">
                    Net: $
                    {(
                      (r.checking_cents +
                        r.savings_cents -
                        r.credit_card_cents) /
                      100
                    ).toFixed(2)}
                  </div>
                </div>
                <button
                  className="text-red-600 text-sm"
                  onClick={() => deleteRow(r.id)}
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
