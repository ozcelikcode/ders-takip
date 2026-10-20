const { it } = require('node:test');
const assert = require('node:assert/strict');
const { weeklyGoalHours, completeOnboardingSchema, defaultPreferences, preferencesSchema, preferencesPatchSchema, needsOnboarding, resolveTerminologyPreset } = require('../dist/cjs');

const preferences = {
  terminologyPreset: 'education', studyField: 'Dil öğrenimi', timezone: 'America/New_York', weekStartsOn: 0,
  activeStudyDays: [1, 2, 3], dailyStudyGoal: 1.5,
  defaultPomodoroDuration: 50, defaultShortBreak: 10, defaultLongBreak: 20, pomodorosUntilLongBreak: 3,
};

it('stored preferences without the onboarding fields stay valid and count as finished', () => {
  const legacy = { ...defaultPreferences };
  delete legacy.terminologyPreset;
  const parsed = preferencesSchema.parse(legacy);
  assert.equal(needsOnboarding(parsed), false);
  assert.equal(needsOnboarding({ onboarding: 'pending' }), true);
  assert.equal(needsOnboarding({ onboarding: 'done' }), false);
});

it('a personal terminology preset overrides the site preset until cleared', () => {
  assert.equal(resolveTerminologyPreset({ terminologyPreset: 'skills' }, 'general'), 'skills');
  assert.equal(resolveTerminologyPreset({ terminologyPreset: null }, 'education'), 'education');
  assert.equal(resolveTerminologyPreset({}, 'goals'), 'goals');
  assert.equal(preferencesPatchSchema.safeParse({ terminologyPreset: null }).success, true);
  assert.equal(preferencesPatchSchema.safeParse({ terminologyPreset: 'exam' }).success, false);
  assert.equal(preferencesPatchSchema.safeParse({ onboarding: 'started' }).success, false);
});

it('onboarding accepts concrete preferences with an optional workspace', () => {
  assert.equal(completeOnboardingSchema.safeParse({ preferences, workspace: null }).success, true);
  const parsed = completeOnboardingSchema.parse({ preferences, workspace: { categoryName: ' İngilizce ', courseNames: ['Kelime', 'Dinleme'] } });
  assert.equal(parsed.workspace.categoryName, 'İngilizce');
});

it('onboarding rejects unknown fields, missing choices and duplicate or excess records', () => {
  const invalid = [
    { preferences: { ...preferences, theme: 'dark' }, workspace: null },
    { preferences: { ...preferences, terminologyPreset: null }, workspace: null },
    { preferences, workspace: { categoryName: 'İş', courseNames: [] } },
    { preferences, workspace: { categoryName: 'İş', courseNames: ['Rapor', 'rapor'] } },
    { preferences, workspace: { categoryName: 'İş', courseNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] } },
    { preferences, workspace: { categoryName: '  ', courseNames: ['A'] } },
    { preferences },
  ];
  for (const input of invalid) assert.equal(completeOnboardingSchema.safeParse(input).success, false, JSON.stringify(input));
});

it('the weekly goal is the daily goal on every active day, capped at a week', () => {
  assert.equal(weeklyGoalHours({ dailyStudyGoal: 0.75, activeStudyDays: [1, 3, 5] }), 2.25);
  assert.equal(weeklyGoalHours({ dailyStudyGoal: 2, activeStudyDays: [] }), 0);
  assert.equal(weeklyGoalHours({ dailyStudyGoal: 24, activeStudyDays: [0, 1, 2, 3, 4, 5, 6] }), 168);
  assert.equal(completeOnboardingSchema.safeParse({ preferences: { ...preferences, weeklyStudyGoal: 5 }, workspace: null }).success, false);
});
