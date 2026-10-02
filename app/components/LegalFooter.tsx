import Link from 'next/link';

const externalLinks = [
  {
    href: 'https://www.youtube.com/t/terms',
    label: 'YouTube Terms',
  },
  {
    href: 'https://policies.google.com/privacy',
    label: 'Google Privacy',
  },
];

export default function LegalFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-slate-700">FANDEX</p>
          <p className="mt-1">
            K-pop research metrics · Preview research service
          </p>
        </div>

        <nav
          aria-label="Legal and provider policies"
          className="flex flex-wrap gap-x-5 gap-y-2"
        >
          <Link
            href="/privacy"
            className="font-bold hover:text-cyan-700"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-bold hover:text-cyan-700"
          >
            Terms of Service
          </Link>
          {externalLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="font-bold hover:text-cyan-700"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
