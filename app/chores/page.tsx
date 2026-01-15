"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export const dynamic = 'force-dynamic';

type ChoreCompletion = {
  id: string;
  area: string;
  task: string;
  completed_at: string;
  notes: string | null;
};

const AREAS = ["Kitchen", "Dining", "Living", "Bathrooms", "Bedrooms"];
const TASKS = ["Mop", "Vacuum", "Counters", "Baseboards", "Cabinets"];

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

export default function ChoresPage() {
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedArea, setSelectedArea] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("chore_completions")
      .select("*")
      .order("completed_at", { ascending: false });

    if (error) setError(error.message);
    setCompletions((data as ChoreCompletion[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedArea || !selectedTask) {
      setError("Please select both area and task");
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("chore_completions").insert({
      area: selectedArea,
      task: selectedTask,
      completed_at: new Date().toISOString(),
      notes: notes || null,
    });

    if (error) setError(error.message);

    setSelectedArea("");
    setSelectedTask("");
    setNotes("");
    setSaving(false);
    load();
  }

  async function deleteCompletion(id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("chore_completions").delete().eq("id", id);
    load();
  }

  // Get the last completion for each area/task combination
  const getLastCleaned = (area: string, task: string) => {
    const completion = completions.find(
      (c) => c.area === area && c.task === task
    );
    return completion?.completed_at;
  };

  // Calculate Top 5 Priority chores (never cleaned or cleaned longest ago)
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

    // Sort by days ago (descending), with never-cleaned first
    return withLastCleaned
      .sort((a, b) => b.daysAgo - a.daysAgo)
      .slice(0, 5);
  };

  const topPriorities = getTopPriorities();

  return (
    <main className="min-h-screen relative py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium text-sm"
          >
            ← Back to Finance Tracker
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Household Chores Tracker
          </h1>
          <p className="text-white/60 text-sm font-medium">
            Keep your home sparkling clean
          </p>
        </div>

        {error && (
          <div className="mb-4 glass rounded-2xl p-4 border-red-500/50 animate-pulse">
            <p className="text-red-300 text-sm font-medium">⚠️ {error}</p>
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
              disabled={saving}
            >
              {saving ? "✨ Saving…" : "✨ Mark Complete"}
            </button>
          </div>
        </form>

        {/* Status Grid - Shows when each area/task was last cleaned */}
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
          {completions.length === 0 && !loading && (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-white/50 text-lg">
                No chores completed yet. Time to get cleaning! 🧹
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
