const { it } = require('node:test');
const assert = require('node:assert/strict');
const { foldSearchText, matchesSearch } = require('../dist/cjs');

it('folds case and Turkish letter forms the same way on both sides', () => {
  assert.equal(foldSearchText('İSTANBUL Işık ÇAĞRI Şükrü Öğün'), 'istanbul isik cagri sukru ogun');
  for (const [text, query] of [['Sınav', 'sinav'], ['İstanbul', 'istanbul'], ['ILIK', 'ılık'], ['Dil öğrenimi', 'OGREN'], ['Çalışma', 'calis']]) {
    assert.equal(matchesSearch(text, query), true, `${query} → ${text}`);
  }
  assert.equal(matchesSearch('Matematik', 'fizik'), false);
  assert.equal(matchesSearch(null, 'x'), false);
  // Wildcard characters are plain text.
  assert.equal(matchesSearch('100%', '%'), true);
  assert.equal(matchesSearch('abc', '%'), false);
});
