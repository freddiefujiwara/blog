import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  LANGUAGE_STORAGE_KEY,
  LEGACY_LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGS,
  detectBrowserLang,
  resolveInitialLang,
  resolveViewerLang
} from '../../src/services/i18n';

// Property-based tests for language resolution. The example tests
// in i18n.test.js pin the known combinations; these pin the
// contract for ALL combinations, including values nobody would
// write an example for: whatever junk a stored preference or a
// browser language list contains, resolution must land on exactly
// one supported language, must never throw, and a valid stored
// choice must always win.

const RUNS = { numRuns: 100 };

// Anything a storage slot or a hand-rolled caller could hold:
// strings (valid codes or garbage), numbers, booleans, null,
// undefined, arrays, objects.
const junk = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.array(fc.string()),
  fc.object()
);
const validLang = fc.constantFrom(...SUPPORTED_LANGS);
const unsupported = junk.filter((value) => !SUPPORTED_LANGS.includes(value));

describe('resolveInitialLang properties', () => {
  it('always returns exactly one supported language and never throws', () => {
    fc.assert(
      fc.property(junk, junk, (stored, browser) => {
        expect(SUPPORTED_LANGS).toContain(resolveInitialLang({ stored, browser }));
      }),
      RUNS
    );
  });

  it('a valid stored value always wins over any browser value', () => {
    fc.assert(
      fc.property(validLang, junk, (stored, browser) => {
        expect(resolveInitialLang({ stored, browser })).toBe(stored);
      }),
      RUNS
    );
  });

  it('a valid browser value wins when the stored value is unusable', () => {
    fc.assert(
      fc.property(unsupported, validLang, (stored, browser) => {
        expect(resolveInitialLang({ stored, browser })).toBe(browser);
      }),
      RUNS
    );
  });

  it('falls back to Japanese when neither side is usable', () => {
    fc.assert(
      fc.property(unsupported, unsupported, (stored, browser) => {
        expect(resolveInitialLang({ stored, browser })).toBe('ja');
      }),
      RUNS
    );
  });
});

describe('detectBrowserLang properties', () => {
  // The element domain is what a language list can hold: strings
  // and other primitives (String() converts them all). Exotic
  // objects are out of domain here — a browser's language list is
  // always strings, and the one production caller (readBrowserLang)
  // additionally guards the call with try/catch.
  const tagJunk = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.constant(undefined),
    fc.array(fc.string())
  );

  it('only ever returns en, zh or null, whatever the list holds', () => {
    fc.assert(
      fc.property(fc.array(tagJunk, { maxLength: 5 }), (tags) => {
        expect(['en', 'zh', null]).toContain(detectBrowserLang(tags));
      }),
      RUNS
    );
  });

  it('an English tag at the head decides English, a Chinese tag Chinese', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 4 }),
        fc.constantFrom('en', 'en-US', 'EN-GB', 'en-au'),
        (tags, enTag) => {
          expect(detectBrowserLang([enTag, ...tags])).toBe('en');
        }
      ),
      RUNS
    );
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 4 }),
        fc.constantFrom('zh', 'zh-CN', 'zh-TW', 'zh-Hans'),
        (tags, zhTag) => {
          expect(detectBrowserLang([zhTag, ...tags])).toBe('zh');
        }
      ),
      RUNS
    );
  });

  it('yields null for a list with no mappable tag', () => {
    const unmappable = fc.string().filter((tag) => {
      const primary = tag.toLowerCase().split('-')[0];
      return primary !== 'en' && primary !== 'zh';
    });
    fc.assert(
      fc.property(fc.array(unmappable, { maxLength: 5 }), (tags) => {
        expect(detectBrowserLang(tags)).toBe(null);
      }),
      RUNS
    );
  });
});

describe('resolveViewerLang properties (through real storage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('stays supported and never throws for junk in both storage keys and the browser list', () => {
    fc.assert(
      fc.property(fc.string(), fc.array(fc.string(), { maxLength: 4 }), (storedJunk, languages) => {
        localStorage.clear();
        localStorage.setItem(LANGUAGE_STORAGE_KEY, storedJunk);
        localStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, storedJunk);
        vi.stubGlobal('navigator', { language: languages[0] ?? 'ja', languages });
        expect(SUPPORTED_LANGS).toContain(resolveViewerLang());
      }),
      RUNS
    );
  });

  it('a valid stored code wins through the storage path, whatever the browser says', () => {
    fc.assert(
      fc.property(validLang, fc.array(fc.string(), { maxLength: 3 }), (stored, languages) => {
        localStorage.clear();
        localStorage.setItem(LANGUAGE_STORAGE_KEY, stored);
        vi.stubGlobal('navigator', { language: 'fr', languages });
        expect(resolveViewerLang()).toBe(stored);
      }),
      { numRuns: 50 }
    );
  });
});
