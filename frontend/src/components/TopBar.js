"use client";
import { Search, Settings, ChevronDown } from "lucide-react";

export default function TopBar() {
  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-[var(--zoom-border)] bg-white shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-[var(--zoom-blue)] flex items-center justify-center">
          <span className="text-white font-bold text-sm">Z</span>
        </div>
        <span className="font-semibold text-lg tracking-tight">zoom</span>
      </div>

      <div className="hidden md:flex items-center flex-1 max-w-md mx-8 relative">
        <Search size={16} className="absolute left-3 text-gray-400" />
        <input
          placeholder="Search"
          className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[var(--zoom-gray-bg)] border border-[var(--zoom-border)] text-sm outline-none focus:border-[var(--zoom-blue)]"
        />
      </div>

      <div className="flex items-center gap-4">
        <button title="Settings" className="text-gray-500 hover:text-gray-800">
          <Settings size={19} />
        </button>
        <button className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
            DS
          </div>
          <span className="hidden md:inline text-sm text-gray-700">Dhruv Sharma</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>
    </header>
  );
}
