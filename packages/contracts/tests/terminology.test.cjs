const { it } = require('node:test');
const assert = require('node:assert/strict');
const { inflect, createTerms, terminologyPresets, terminologyPresetIds, publicSettingsSchema, defaultSiteSettings, settingsPatchSchema } = require('../dist/cjs');

// Hand-verified Turkish forms: [word, acc, dat, gen, loc, abl, plural, pluralDat]
const golden = [
  ['proje', 'projeyi', 'projeye', 'projenin', 'projede', 'projeden', 'projeler', 'projelere'],
  ['görev', 'görevi', 'göreve', 'görevin', 'görevde', 'görevden', 'görevler', 'görevlere'],
  ['seans', 'seansı', 'seansa', 'seansın', 'seansta', 'seanstan', 'seanslar', 'seanslara'],
  ['ders', 'dersi', 'derse', 'dersin', 'derste', 'dersten', 'dersler', 'derslere'],
  ['konu', 'konuyu', 'konuya', 'konunun', 'konuda', 'konudan', 'konular', 'konulara'],
  ['hedef', 'hedefi', 'hedefe', 'hedefin', 'hedefte', 'hedeften', 'hedefler', 'hedeflere'],
  ['adım', 'adımı', 'adıma', 'adımın', 'adımda', 'adımdan', 'adımlar', 'adımlara'],
  ['beceri', 'beceriyi', 'beceriye', 'becerinin', 'beceride', 'beceriden', 'beceriler', 'becerilere'],
  ['alıştırma', 'alıştırmayı', 'alıştırmaya', 'alıştırmanın', 'alıştırmada', 'alıştırmadan', 'alıştırmalar', 'alıştırmalara'],
];

it('inflects every preset word with Turkish vowel harmony and buffer consonants', () => {
  for (const [word, acc, dat, gen, loc, abl, plural, pluralDat] of golden) {
    assert.equal(inflect(word, { case: 'acc' }), acc, word);
    assert.equal(inflect(word, { case: 'dat' }), dat, word);
    assert.equal(inflect(word, { case: 'gen' }), gen, word);
    assert.equal(inflect(word, { case: 'loc' }), loc, word);
    assert.equal(inflect(word, { case: 'abl' }), abl, word);
    assert.equal(inflect(word, { plural: true }), plural, word);
    assert.equal(inflect(word, { plural: true, case: 'dat' }), pluralDat, word);
  }
});

it('covers every word used by a preset in the golden table', () => {
  const covered = new Set(golden.map(([word]) => word));
  for (const id of terminologyPresetIds)
    for (const word of Object.values(terminologyPresets[id].words)) assert.ok(covered.has(word), `${id}: ${word}`);
});

it('capitalizes with Turkish casing and falls back to the default preset', () => {
  const terms = createTerms('education');
  assert.equal(terms.course({ capitalize: true, plural: true }), 'Dersler');
  assert.equal(terms.topic({ case: 'acc' }), 'konuyu');
  assert.equal(createTerms(undefined).course(), 'proje');
  assert.equal(createTerms('goals').topic({ capitalize: true }), 'Adım');
});

it('requires the preset in public settings and never injects it into a settings patch', () => {
  const legacy = { ...defaultSiteSettings };
  delete legacy.terminologyPreset;
  assert.equal(publicSettingsSchema.safeParse(legacy).success, false);
  assert.deepEqual(settingsPatchSchema.parse({ siteName: 'Yeni' }), { siteName: 'Yeni' });
  assert.equal(settingsPatchSchema.safeParse({ terminologyPreset: 'skills' }).success, true);
  assert.equal(settingsPatchSchema.safeParse({ terminologyPreset: 'astronomy' }).success, false);
});
