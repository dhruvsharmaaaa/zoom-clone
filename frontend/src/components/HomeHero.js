"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { VideoOff, Plus, ChevronDown } from "lucide-react";

/**
 * HomeHero.js
 * -----------
 * Matches the real Zoom app's home screen: a large live clock, the
 * current date below it, and three big colored square buttons --
 * New Meeting (orange), Join (blue), Schedule (blue, with a little
 * calendar icon showing today's actual day number, just like Zoom's).
 *
 * The clock re-renders every second via setInterval so it's a genuine
 * live clock, not a static screenshot of whatever time the page loaded.
 */
export default function HomeHero({ onNewMeeting, onJoin, onSchedule }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date()); // set once on mount (avoids SSR/client time mismatch)
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Render nothing time-dependent until mounted client-side, to avoid a
  // hydration mismatch between server render time and the browser's clock.
  if (!now) {
    return <div className="h-[220px]" />;
  }

  const dayOfMonth = format(now, "d");

  return (
    <div className="flex flex-col items-center text-center pt-6 pb-10">
      <div className="text-5xl font-bold tracking-tight text-[var(--zoom-text)] tabular-nums">
        {format(now, "h:mm a")}
      </div>
      <div className="text-gray-500 text-base mt-2 mb-9">{format(now, "EEEE, MMMM d")}</div>

      <div className="flex items-start gap-8 sm:gap-12">
        <HeroButton
          icon={<VideoOff size={26} className="text-white" />}
          bg="bg-[#F79433] hover:bg-[#ef8a24]"
          label="New meeting"
          hasDropdown
          onClick={onNewMeeting}
        />
        <HeroButton
          icon={<Plus size={26} className="text-white" strokeWidth={2.5} />}
          bg="bg-[var(--zoom-blue)] hover:bg-[var(--zoom-blue-hover)]"
          label="Join"
          onClick={onJoin}
        />
        <HeroButton
          icon={<CalendarDayIcon day={dayOfMonth} />}
          bg="bg-[var(--zoom-blue)] hover:bg-[var(--zoom-blue-hover)]"
          label="Schedule"
          onClick={onSchedule}
        />
      </div>
    </div>
  );
}

function HeroButton({ icon, bg, label, onClick, hasDropdown }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${bg}`}>
        {icon}
      </div>
      <span className="flex items-center gap-1 text-sm text-gray-700 font-normal">
        {label}
        {hasDropdown && <ChevronDown size={14} className="text-gray-400" />}
      </span>
    </button>
  );
}

// Mimics Zoom's real "Schedule" icon: a little white calendar card with
// two binder-ring tabs on top and today's actual day number inside,
// instead of a static generic calendar glyph.
function CalendarDayIcon({ day }) {
  return (
    <div className="relative w-10 h-10 bg-white rounded-md flex flex-col items-center justify-center shadow-sm">
      <div className="absolute -top-1 left-2 w-1 h-2 rounded-full bg-gray-300" />
      <div className="absolute -top-1 right-2 w-1 h-2 rounded-full bg-gray-300" />
      <span className="text-[var(--zoom-blue)] font-bold text-sm leading-none">{day}</span>
    </div>
  );
}
