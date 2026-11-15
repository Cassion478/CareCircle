export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-xs text-slate-500">
          © 2026 CareCircle. Elderly Healthcare & Medication Management.
        </p>
        <p className="text-xs text-slate-400">
          Built with Next.js, TypeScript & Tailwind CSS
        </p>
      </div>
    </footer>
  );
}
