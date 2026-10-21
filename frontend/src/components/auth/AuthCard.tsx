import type { ReactNode } from 'react';
import { Brand } from '../common/Brand';

/** Shared frame for the public account pages. */
export default function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--canvas) px-4 py-12 text-(--text)">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Brand />
          </div>
          <h1 className="mt-6 text-[28px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-(--muted)">{description}</p>
        </div>
        <div className="panel p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
