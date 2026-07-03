import React from "react";
import { Languages, Video, Sparkles, HelpCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-xl shadow-lg shadow-rose-500/10 flex items-center justify-center">
            <Video className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400">
                AI VIDEO DUBBER
              </h1>
              <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-mono px-1.5 py-0.5 rounded uppercase tracking-wider">
                ចិន ➔ ខ្មែរ
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ប្រព័ន្ធបកប្រែវីដេអូចិន និងសំយោគសម្លេងខ្មែរស្វ័យប្រវត្តិតាមរយៈ AI 3.5
            </p>
          </div>
        </div>

        {/* Right Info Section */}
        <div className="flex items-center gap-4 self-end md:self-auto text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ប្រព័ន្ធដំណើរការធម្មតា (Online)</span>
          </div>

          <div className="group relative">
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-help">
              <HelpCircle className="w-4.5 h-4.5" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-slate-300 leading-relaxed">
              <div className="font-semibold text-white mb-1.5 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                តើវាដំណើរការយ៉ាងដូចម្តេច?
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                <li>ជ្រើសរើសវីដេអូគំរូ ឬបង្ហោះវីដេអូចិនផ្ទាល់ខ្លួន</li>
                <li>AI ស្កែនសំឡេងចិន បកប្រែជាអក្សរខ្មែរជាមួយម៉ោង</li>
                <li>ជ្រើសរើសសំឡេងខ្មែរដែលអ្នកពេញចិត្ត (ប្រុស/ស្រី)</li>
                <li>សំយោគ និងចាក់វីដេអូជាមួយសម្លេងខ្មែរថ្មីយ៉ាងរលូន</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
