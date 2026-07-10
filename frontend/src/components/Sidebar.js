"use client";
/**
 * Sidebar.js
 * ----------
 * The thin left-hand icon rail you see in the real Zoom app
 * (Home / Chat / Meetings / Contacts / Apps). Only "Home" is a real
 * functioning page here -- the rest are visual placeholders, which
 * matches the assignment's "profile/settings placeholders" requirement.
 */
import { Home, MessageSquare, Video, Users, Grid3x3 } from "lucide-react";

const items = [
  { icon: Home, label: "Home", active: true },
  { icon: MessageSquare, label: "Chat", active: false },
  { icon: Video, label: "Meetings", active: false },
  { icon: Users, label: "Contacts", active: false },
  { icon: Grid3x3, label: "Apps", active: false },
];

export default function Sidebar() {
  return (
    <aside className="hidden sm:flex flex-col items-center w-20 py-4 bg-white border-r border-[var(--zoom-border)] shrink-0">
      {items.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          title={label}
          className={`flex flex-col items-center gap-1 w-16 py-3 rounded-lg mb-1 text-[11px] transition-colors ${
            active ? "text-[var(--zoom-blue)] bg-blue-50" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Icon size={20} strokeWidth={active ? 2.4 : 2} />
          {label}
        </button>
      ))}
    </aside>
  );
}
