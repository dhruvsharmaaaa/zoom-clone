"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import HomeHero from "@/components/HomeHero";
import NewMeetingModal from "@/components/NewMeetingModal";
import JoinMeetingModal from "@/components/JoinMeetingModal";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import MeetingListItem from "@/components/MeetingListItem";
import { api } from "@/lib/api";

/**
 * app/page.js  ("/" route)
 * ------------------------
 * The Dashboard. This is a CLIENT component ("use client" at top)
 * because it needs useState/useEffect for interactivity (opening
 * modals, fetching data after mount). Data fetching happens in
 * useEffect rather than a server component because the four action
 * buttons + tabs are all client-side interactive anyway, and keeping
 * everything in one client component avoids a server/client boundary
 * headache for a dashboard this size.
 */
export default function DashboardPage() {
  const [activeModal, setActiveModal] = useState(null); // "new" | "join" | "schedule" | null
  const [tab, setTab] = useState("upcoming"); // "upcoming" | "recent"
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([api.getUpcoming(), api.getRecent()]);
      setUpcoming(u);
      setRecent(r);
    } catch (err) {
      console.error("Failed to load meetings:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleStartScheduled(meeting) {
    router.push(`/meeting/${meeting.meeting_code}?name=${encodeURIComponent(meeting.host_name || "Host")}`);
  }

  const list = tab === "upcoming" ? upcoming : recent;

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <HomeHero
              onNewMeeting={() => setActiveModal("new")}
              onJoin={() => setActiveModal("join")}
              onSchedule={() => setActiveModal("schedule")}
            />

            {/* Tabs */}
            <div className="flex gap-6 border-b border-[var(--zoom-border)] mb-2">
              {[
                { key: "upcoming", label: "Upcoming" },
                { key: "recent", label: "Recent" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.key
                      ? "border-[var(--zoom-blue)] text-[var(--zoom-blue)]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="py-2">
              {loading ? (
                <p className="text-sm text-gray-400 py-6 text-center">Loading meetings…</p>
              ) : list.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No {tab} meetings. {tab === "upcoming" && "Schedule one to see it here."}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {list.map((m) => (
                    <MeetingListItem key={m.id} meeting={m} onJoin={handleStartScheduled} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {activeModal === "new" && <NewMeetingModal onClose={() => setActiveModal(null)} />}
      {activeModal === "join" && <JoinMeetingModal onClose={() => setActiveModal(null)} />}
      {activeModal === "schedule" && (
        <ScheduleMeetingModal
          onClose={() => setActiveModal(null)}
          onScheduled={() => loadData()}
        />
      )}
    </div>
  );
}
