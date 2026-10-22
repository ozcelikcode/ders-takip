const { it } = require('node:test');
const assert = require('node:assert/strict');
const {
  inflect, createTerms, terminologyPresets, terminologyPresetIds, publicSettingsSchema, defaultSiteSettings, settingsPatchSchema,
  accusativeFits, suggestAccusative, customTerminologySchema, customTerminologyFrom, resolveTerminology, preferencesPatchSchema,
  inflectEnglish, registerSchema, defaultPreferences,
} = require('../dist/cjs');

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
    for (const word of Object.values(terminologyPresets[id].tr)) assert.ok(covered.has(word), `${id}: ${word}`);
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

// Words plain harmony gets wrong, with the accusative a person gives: [word, acc, dat, gen, loc, abl, plural, pluralAcc]
const irregular = [
  ['kitap', 'kitabı', 'kitaba', 'kitabın', 'kitapta', 'kitaptan', 'kitaplar', 'kitapları'],
  ['saat', 'saati', 'saate', 'saatin', 'saatte', 'saatten', 'saatler', 'saatleri'],
  ['ağız', 'ağzı', 'ağza', 'ağzın', 'ağızda', 'ağızdan', 'ağızlar', 'ağızları'],
  ['hak', 'hakkı', 'hakka', 'hakkın', 'hakta', 'haktan', 'haklar', 'hakları'],
  ['renk', 'rengi', 'renge', 'rengin', 'renkte', 'renkten', 'renkler', 'renkleri'],
  ['rol', 'rolü', 'role', 'rolün', 'rolde', 'rolden', 'roller', 'rolleri'],
  ['oturum', 'oturumu', 'oturuma', 'oturumun', 'oturumda', 'oturumdan', 'oturumlar', 'oturumları'],
];

it('inflects custom words from their given accusative', () => {
  for (const [word, accusative, dat, gen, loc, abl, plural, pluralAcc] of irregular) {
    const term = { word, accusative };
    assert.ok(accusativeFits(word, accusative), word);
    assert.equal(inflect(term, { case: 'acc' }), accusative, word);
    assert.equal(inflect(term, { case: 'dat' }), dat, word);
    assert.equal(inflect(term, { case: 'gen' }), gen, word);
    assert.equal(inflect(term, { case: 'loc' }), loc, word);
    assert.equal(inflect(term, { case: 'abl' }), abl, word);
    assert.equal(inflect(term, { plural: true }), plural, word);
    assert.equal(inflect(term, { plural: true, case: 'acc' }), pluralAcc, word);
  }
});

it('suggests the regular accusative and matches the preset golden forms through the term path', () => {
  assert.equal(suggestAccusative('proje'), 'projeyi');
  assert.equal(suggestAccusative('kitap'), 'kitapı');
  for (const [word, acc, dat, gen, loc, abl, plural, pluralDat] of golden) {
    const term = { word, accusative: acc };
    assert.deepEqual(
      [inflect(term, { case: 'dat' }), inflect(term, { case: 'gen' }), inflect(term, { case: 'loc' }), inflect(term, { case: 'abl' }), inflect(term, { plural: true }), inflect(term, { plural: true, case: 'dat' })],
      [dat, gen, loc, abl, plural, pluralDat],
      word,
    );
  }
});

it('rejects accusatives and words that cannot belong together', () => {
  assert.equal(accusativeFits('kitap', 'kitapa'), false);
  assert.equal(accusativeFits('kitap', 'defteri'), false);
  assert.equal(accusativeFits('proje', 'projei'), false);
  const valid = customTerminologyFrom('education');
  assert.equal(customTerminologySchema.safeParse(valid).success, true);
  for (const word of ['iki kelime', 'Ders', 'a', 'ders1']) {
    const parsed = customTerminologySchema.safeParse({ ...valid, course: { word, accusative: 'dersi' } });
    assert.equal(parsed.success, false, word);
  }
  const mismatch = customTerminologySchema.safeParse({ ...valid, topic: { word: 'kitap', accusative: 'kitapa' } });
  assert.deepEqual(mismatch.error.issues[0].path, ['topic', 'accusative']);
});

it('prefers personal custom words, then the personal preset, then the site words', () => {
  const mine = customTerminologyFrom('skills');
  const site = { terminologyPreset: 'education', customTerminology: customTerminologyFrom('goals') };
  assert.equal(resolveTerminology({ customTerminology: mine, terminologyPreset: 'general' }, site), mine);
  assert.equal(resolveTerminology({ customTerminology: null, terminologyPreset: 'general' }, site), 'general');
  assert.equal(resolveTerminology({}, site), site.customTerminology);
  assert.equal(resolveTerminology({}, { ...site, customTerminology: null }), 'education');
  assert.equal(createTerms(mine).topic({ plural: true }), 'alıştırmalar');
});

it('accepts custom words in settings and preference patches, null clearing them', () => {
  assert.equal(publicSettingsSchema.safeParse(defaultSiteSettings).success, true);
  assert.equal(settingsPatchSchema.safeParse({ customTerminology: null }).success, true);
  assert.equal(settingsPatchSchema.safeParse({ customTerminology: customTerminologyFrom('general') }).success, true);
  assert.equal(preferencesPatchSchema.safeParse({ customTerminology: customTerminologyFrom('general') }).success, true);
  assert.equal(preferencesPatchSchema.safeParse({ customTerminology: { course: { word: 'x', accusative: 'x' } } }).success, false);
});

it('pluralizes English nouns and ignores the Turkish cases', () => {
  for (const [word, plural] of [['project', 'projects'], ['task', 'tasks'], ['session', 'sessions'], ['class', 'classes'], ['box', 'boxes'], ['match', 'matches'], ['study', 'studies'], ['day', 'days']])
    assert.equal(inflectEnglish(word, { plural: true }), plural, word);
  assert.equal(inflectEnglish('Course', { case: 'acc' }), 'course');
});

it('gives every preset an English vocabulary and keeps custom words as typed in English', () => {
  for (const id of terminologyPresetIds)
    for (const word of Object.values(terminologyPresets[id].en)) assert.match(word, /^[a-z]+$/, `${id}: ${word}`);
  const english = createTerms('education', 'en');
  assert.equal(english.course({ capitalize: true, plural: true }), 'Courses');
  assert.equal(english.topic({ case: 'acc', plural: true }), 'topics');
  assert.equal(createTerms(undefined, 'en').course(), 'project');
  const book = { ...customTerminologyFrom('general'), course: { word: 'kitap', accusative: 'kitabı' } };
  assert.equal(createTerms(book, 'en').course({ plural: true, capitalize: true }), 'Kitaps');
  assert.equal(createTerms(book).course({ case: 'dat' }), 'kitaba');
});

it('keeps the interface language a site setting, not a per-account or browser choice', () => {
  assert.equal(defaultSiteSettings.language, 'tr');
  assert.equal(settingsPatchSchema.safeParse({ language: 'en' }).success, true);
  assert.equal(settingsPatchSchema.safeParse({ language: 'de' }).success, false);
  assert.equal('language' in defaultPreferences, false);
  const account = { username: 'reader', email: 'reader@example.com', password: 'long-enough-password', firstName: 'Ada', lastName: 'Byron' };
  assert.equal(registerSchema.safeParse(account).success, true);
  assert.equal(registerSchema.safeParse({ ...account, language: 'en' }).success, false);
});
