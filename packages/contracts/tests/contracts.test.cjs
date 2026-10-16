const { it } = require('node:test');
const assert = require('node:assert/strict');
const { defaultPreferences, preferencesSchema, preferencesPatchSchema, settingsPatchSchema, publicSettingsSchema, defaultSiteSettings } = require('../dist/cjs');
it('round-trips the entire preference contract including system theme, null color and Sunday', () => {
  assert.deepEqual(preferencesSchema.parse(JSON.parse(JSON.stringify(defaultPreferences))), defaultPreferences);
  assert.deepEqual(preferencesPatchSchema.parse({theme:'system',customPrimaryColor:null,activeStudyDays:[0]}),{theme:'system',customPrimaryColor:null,activeStudyDays:[0]});
});
it('rejects unknown keys, invalid timezones, duplicate weekdays and unsupported versions', () => {
  for (const value of [{theme:'unknown'},{timezone:'invalid'},{activeStudyDays:[1,1]},{defaultPomodoroDuration:1.5},{dailyStudyGoal:25},{schemaVersion:2},{workGoals:{dailyHours:5}}]) assert.equal(preferencesPatchSchema.safeParse(value).success,false);
});
it('allows localized site names and exposes only public branding fields', () => {
  const siteName = 'Yeni Çalışma Alanı — Eğitim';
  assert.equal(settingsPatchSchema.parse({siteName}).siteName,siteName);
  const publicSettings=publicSettingsSchema.parse(defaultSiteSettings);
  assert.equal(publicSettings.adminEmail,undefined); assert.equal(publicSettings.backup_interval,undefined);
  for (const patch of [{siteName:'  '},{siteName:'x'.repeat(101)},{siteLogo:'javascript:alert(1)'},{internalKey:'test'},{backup_interval:'3'}]) assert.equal(settingsPatchSchema.safeParse(patch).success,false);
});
