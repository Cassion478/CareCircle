export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="space-y-1 text-center sm:text-left">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            © 2026 CareCircle. Elderly Healthcare Companion.
          </p>
          <p className="text-[11px] text-slate-500 max-w-xl">
            Disclaimer: CareCircle is an independent healthcare routine companion and demonstration platform. All medication names, schedules, and emergency helplines are for illustrative purposes and do not constitute clinical or medical advice. Always consult a certified healthcare professional.
          </p>
        </div>
        <p className="text-xs text-slate-400 shrink-0">
          Built with Next.js, TypeScript & Tailwind CSS
        </p>
      </div>
    </footer>
  );
}
