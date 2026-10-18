import { chromium } from '@playwright/test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, expect, login } from './fixtures';

for (const route of ['login', 'dashboard']) {
  for (const profile of ['desktop', 'mobile'] as const) {
    test(`${route} ${profile} Lighthouse`, async ({ application }, info) => {
      const directory = await mkdtemp(
        path.join(tmpdir(), 'study-tracker-lighthouse-'),
      );
      try {
        const context = await chromium.launchPersistentContext(directory, {
          headless: true,
          args: [
            '--remote-debugging-address=127.0.0.1',
            '--remote-debugging-port=0',
          ],
          baseURL: application.url,
          locale: 'tr-TR',
        });
        try {
          await context.route('**/*', (request) =>
            new URL(request.request().url()).origin === application.url
              ? request.continue()
              : request.abort('blockedbyclient'),
          );
          const page = context.pages()[0] ?? (await context.newPage());
          const routeChecks: Promise<void>[] = [];
          const browserErrors: string[] = [];
          context.on('page', (auditedPage) => {
            auditedPage.on('pageerror', (error) =>
              browserErrors.push(error.message),
            );
            routeChecks.push(
              expect(
                auditedPage.getByRole('heading', {
                  name: route === 'dashboard' ? 'Merhaba, First.' : 'Giriş Yap',
                  exact: true,
                }),
              )
                .toBeVisible({ timeout: 20_000 })
                .catch((error) => {
                  browserErrors.push(String(error));
                }),
            );
          });
          page.on('pageerror', (error) => browserErrors.push(error.message));
          if (route === 'dashboard') await login(page);
          const port = Number(
            (
              await readFile(path.join(directory, 'DevToolsActivePort'), 'utf8')
            ).split('\n')[0],
          );
          expect(port).toBeGreaterThan(0);
          const { default: lighthouse } = await import('lighthouse');
          const result = await lighthouse(
            `${application.url}/${route}`,
            {
              port,
              logLevel: 'error',
              output: ['html', 'json'],
              disableStorageReset: true,
              onlyCategories: [
                'performance',
                'accessibility',
                'best-practices',
                'seo',
              ],
            },
            profile === 'desktop'
              ? {
                  extends: 'lighthouse:default',
                  settings: {
                    formFactor: 'desktop',
                    screenEmulation: {
                      mobile: false,
                      width: 1350,
                      height: 940,
                      deviceScaleFactor: 1,
                      disabled: false,
                    },
                    throttling: {
                      rttMs: 40,
                      throughputKbps: 10240,
                      cpuSlowdownMultiplier: 1,
                      requestLatencyMs: 0,
                      downloadThroughputKbps: 0,
                      uploadThroughputKbps: 0,
                    },
                  },
                }
              : undefined,
          );
          expect(result).toBeDefined();
          if (!result) throw new Error('Lighthouse returned no result');
          const reports = Array.isArray(result.report)
            ? result.report
            : [result.report];
          for (const [index, report] of reports.entries()) {
            const reportPath = info.outputPath(
              `lighthouse-${route}-${profile}.${index === 0 ? 'html' : 'json'}`,
            );
            await writeFile(reportPath, report);
            await info.attach(`lighthouse-${route}-${profile}`, {
              path: reportPath,
              contentType: index === 0 ? 'text/html' : 'application/json',
            });
          }
          expect(result.lhr.runtimeError).toBeUndefined();
          expect(new URL(result.lhr.finalDisplayedUrl).pathname).toBe(
            `/${route}`,
          );
          expect(
            routeChecks.length,
            'Lighthouse must open an audited page',
          ).toBeGreaterThan(0);
          await Promise.all(routeChecks);
          expect(browserErrors).toEqual([]);
          const scores = Object.fromEntries(
            Object.entries(result.lhr.categories).map(([key, value]) => [
              key,
              value.score === null ? null : Math.round(value.score * 100),
            ]),
          );
          console.log(
            JSON.stringify({
              route,
              profile,
              scores,
              metrics: Object.fromEntries(
                [
                  'first-contentful-paint',
                  'largest-contentful-paint',
                  'total-blocking-time',
                  'cumulative-layout-shift',
                ].map((key) => [key, result.lhr.audits[key]?.numericValue]),
              ),
            }),
          );
          // Performance is measured, not gated on a single noisy local run.
          expect(result.lhr.categories.accessibility?.score).toBe(1);
        } finally {
          await context.close();
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
}
