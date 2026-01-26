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

type ChoreCompletion = {
  id: string;
  area: string;
  task: string;
  completed_at: string;
  notes: string | null;
};

const AREAS = ["Kitchen", "Dining", "Living", "Bathrooms", "Bedrooms"];
const TASKS = ["Mop", "Vacuum", "Counters", "Baseboards", "Cabinets"];

function dollarsToCents(v: string) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
function centsToDollars(c: number) {
  return (c / 100).toFixed(2);
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"finance" | "chores">("finance");

  // Finance state
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeSaving, setFinanceSaving] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [weekOf, setWeekOf] = useState("");
  const [savings, setSavings] = useState("");
  const [creditCard, setCreditCard] = useState("");

  // Chores state
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [choresLoading, setChoresLoading] = useState(true);
  const [choresSaving, setChoresSaving] = useState(false);
  const [choresError, setChoresError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [notes, setNotes] = useState("");

  // Finance functions
  async function loadFinance() {
    setFinanceLoading(true);
    const { data, error } = await supabase
      .from("snapshots")
      .select("*")
      .order("week_of", { ascending: true });

    if (error) setFinanceError(error.message);
    setRows((data as SnapshotRow[]) ?? []);
    setFinanceLoading(false);
  }

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
    setFinanceSaving(true);
    setFinanceError(null);

    const { error } = await supabase.from("snapshots").upsert({
      week_of: weekOf,
      checking_cents: 0,
      savings_cents: dollarsToCents(savings),
      credit_card_cents: dollarsToCents(creditCard),
    });

    if (error) setFinanceError(error.message);

    setSavings("");
    setCreditCard("");
    setFinanceSaving(false);
    loadFinance();
  }

  async function deleteRow(id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("snapshots").delete().eq("id", id);
    loadFinance();
  }

  // Chores functions
  async function loadChores() {
    setChoresLoading(true);
    const { data, error } = await supabase
      .from("chore_completions")
      .select("*")
      .order("completed_at", { ascending: false });

    if (error) setChoresError(error.message);
    setCompletions((data as ChoreCompletion[]) ?? []);
    setChoresLoading(false);
  }

  async function markComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedArea || !selectedTask) {
      setChoresError("Please select both area and task");
      return;
    }

    setChoresSaving(true);
    setChoresError(null);

    const { error } = await supabase.from("chore_completions").insert({
      area: selectedArea,
      task: selectedTask,
      completed_at: new Date().toISOString(),
      notes: notes || null,
    });

    if (error) setChoresError(error.message);

    setSelectedArea("");
    setSelectedTask("");
    setNotes("");
    setChoresSaving(false);
    loadChores();
  }

  async function deleteCompletion(id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("chore_completions").delete().eq("id", id);
    loadChores();
  }

  const getLastCleaned = (area: string, task: string) => {
    const completion = completions.find(
      (c) => c.area === area && c.task === task
    );
    return completion?.completed_at;
  };

  const getTopPriorities = () => {
    const allCombinations = AREAS.flatMap((area) =>
      TASKS.map((task) => ({ area, task }))
    );

    const withLastCleaned = allCombinations.map((combo) => {
      const lastCleaned = getLastCleaned(combo.area, combo.task);
      return {
        ...combo,
        lastCleaned,
        daysAgo: lastCleaned
          ? Math.floor((new Date().getTime() - new Date(lastCleaned).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity,
      };
    });

    return withLastCleaned
      .sort((a, b) => b.daysAgo - a.daysAgo)
      .slice(0, 5);
  };

  const topPriorities = getTopPriorities();

  // Initialize
  useEffect(() => {
    setWeekOf(new Date().toISOString().slice(0, 10));
    loadFinance();
    loadChores();
  }, []);

  return (
    <main className="min-h-screen relative py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Life Tracker
          </h1>
          <p className="text-white/60 text-sm font-medium">
            Track your finances, household chores, and loans with style
          </p>
        </div>

        {/* Tabs */}
        <div className="glass-strong rounded-3xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("finance")}
            className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === "finance"
                ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/50"
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            💰 Finance
          </button>
          <button
            onClick={() => setActiveTab("chores")}
            className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === "chores"
                ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/50"
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            🧹 Chores
          </button>
          <Link
            href="/loan"
            className="flex-1 px-6 py-3 rounded-2xl font-bold transition-all text-white/60 hover:text-white/90 hover:bg-white/5 text-center"
          >
            💵 Loan
          </Link>
        </div>

        {/* Finance Tracker Content */}
        {activeTab === "finance" && (
          <div className="max-w-2xl mx-auto">
            {financeError && (
              <div className="mb-4 glass rounded-2xl p-4 border-red-500/50 animate-pulse">
                <p className="text-red-300 text-sm font-medium">⚠️ {financeError}</p>
              </div>
            )}

            {/* Main form */}
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
                  disabled={financeSaving}
                >
                  {financeSaving ? "✨ Saving…" : "✨ Save Week"}
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
              {rows.length === 0 && !financeLoading && (
                <div className="glass rounded-2xl p-8 text-center">
                  <p className="text-white/50 text-lg">No entries yet. Start tracking your finances! 🚀</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chores Tracker Content */}
        {activeTab === "chores" && (
          <div>
            {choresError && (
              <div className="mb-4 glass rounded-2xl p-4 border-red-500/50 animate-pulse">
                <p className="text-red-300 text-sm font-medium">⚠️ {choresError}</p>
              </div>
            )}

            {/* Top 5 Priority List */}
            <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-red-500/20 mb-6 border-2 border-red-500/30">
              <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                Top 5 Priority Chores
              </h2>
              <div className="space-y-3">
                {topPriorities.map((priority, index) => (
                  <div
                    key={`${priority.area}-${priority.task}`}
                    className="glass rounded-2xl p-4 hover:bg-white/10 hover:scale-[1.02] border border-red-500/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white/90 text-lg">
                          {priority.area} - {priority.task}
                        </div>
                        <div className="text-red-400 text-sm font-medium">
                          {priority.lastCleaned ? (
                            <>
                              {priority.daysAgo === 0
                                ? "Last cleaned today"
                                : priority.daysAgo === 1
                                ? "Last cleaned yesterday"
                                : `Last cleaned ${priority.daysAgo} days ago`}
                            </>
                          ) : (
                            "Never cleaned"
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedArea(priority.area);
                          setSelectedTask(priority.task);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white text-sm font-semibold shadow-lg hover:scale-105"
                      >
                        Clean Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mark Complete Form */}
            <form
              onSubmit={markComplete}
              className="glass-strong rounded-3xl p-6 shadow-2xl shadow-purple-500/10 mb-6 hover:shadow-purple-500/20 hover:scale-[1.01]"
            >
              <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center gap-2">
                <span className="text-2xl">✓</span>
                Mark as Complete
              </h2>
              <div className="space-y-4">
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  <option value="" className="bg-slate-800">🏠 Select Area</option>
                  {AREAS.map((area) => (
                    <option key={area} value={area} className="bg-slate-800">
                      {area}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                >
                  <option value="" className="bg-slate-800">🧹 Select Task</option>
                  {TASKS.map((task) => (
                    <option key={task} value={task} className="bg-slate-800">
                      {task}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="📝 Notes (optional)"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:bg-white/15 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <button
                  className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-violet-500/50 hover:shadow-violet-500/70 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  type="submit"
                  disabled={choresSaving}
                >
                  {choresSaving ? "✨ Saving…" : "✨ Mark Complete"}
                </button>
              </div>
            </form>

            {/* Status Grid */}
            <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-blue-500/10 mb-6 hover:shadow-blue-500/20">
              <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center gap-2">
                <span className="text-2xl">📅</span>
                Last Cleaned Status
              </h2>
              <div className="space-y-6">
                {AREAS.map((area) => (
                  <div key={area} className="glass rounded-2xl p-4">
                    <h3 className="text-lg font-bold text-white/90 mb-3">{area}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {TASKS.map((task) => {
                        const lastCleaned = getLastCleaned(area, task);
                        const isRecent = lastCleaned &&
                          (new Date().getTime() - new Date(lastCleaned).getTime()) < 7 * 24 * 60 * 60 * 1000;

                        return (
                          <div
                            key={`${area}-${task}`}
                            className={`bg-white/5 rounded-xl p-3 border ${
                              isRecent
                                ? 'border-green-500/30 bg-green-500/10'
                                : lastCleaned
                                ? 'border-yellow-500/30 bg-yellow-500/5'
                                : 'border-red-500/30 bg-red-500/5'
                            }`}
                          >
                            <div className="font-semibold text-white/90 text-sm mb-1">
                              {task}
                            </div>
                            <div className={`text-xs ${
                              isRecent
                                ? 'text-green-400'
                                : lastCleaned
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}>
                              {lastCleaned ? formatTimeAgo(lastCleaned) : "Never"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent History */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Recent Activity
              </h2>
              {completions.slice(0, 20).map((c) => (
                <div
                  key={c.id}
                  className="glass rounded-2xl p-4 hover:bg-white/10 hover:scale-[1.01] group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-semibold text-white/90 text-lg mb-1">
                        {c.area} - {c.task}
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-violet-400">
                          🕐 {formatTimeAgo(c.completed_at)}
                        </span>
                        <span className="text-white/60 text-xs">
                          {new Date(c.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {c.notes && (
                        <div className="text-white/50 text-sm mt-1">
                          📝 {c.notes}
                        </div>
                      )}
                    </div>
                    <button
                      className="text-red-400 hover:text-red-300 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteCompletion(c.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
              {completions.length === 0 && !choresLoading && (
                <div className="glass rounded-2xl p-8 text-center">
                  <p className="text-white/50 text-lg">
                    No chores completed yet. Time to get cleaning! 🧹
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
