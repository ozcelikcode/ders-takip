import { defaultSiteSettings, publicSettingsSchema } from '@study-tracker/contracts';

// Screen tests were written against the education vocabulary. The settings store reads this
// cache when it loads, so every test file starts with that preset; tests/terminology.test.tsx
// covers the neutral default and preset switching explicitly.
// Transport suites run in the node environment, which has no localStorage.
if (typeof localStorage !== 'undefined')
  localStorage.setItem(
    'site-branding',
    JSON.stringify(publicSettingsSchema.parse({ ...defaultSiteSettings, terminologyPreset: 'education' })),
  );
