import { translateKnownDocumentSectionTitle } from '../src/utils/systemDisplayText';

describe('translateKnownDocumentSectionTitle', () => {
  const t = (key: string) =>
    ({
      'app.documentDetail.sectionPreWork': 'PRE_WORK',
      'app.documentDetail.sectionMainWorks': 'MAIN_WORKS',
    })[key] ?? key;

  it('maps common section titles regardless of casing and separators', () => {
    expect(translateKnownDocumentSectionTitle('Pre-Work', t)).toBe('PRE_WORK');
    expect(translateKnownDocumentSectionTitle('pre work', t)).toBe('PRE_WORK');
    expect(translateKnownDocumentSectionTitle('Main Works', t)).toBe('MAIN_WORKS');
    expect(translateKnownDocumentSectionTitle('main work', t)).toBe('MAIN_WORKS');
  });

  it('returns original title for unknown sections', () => {
    expect(translateKnownDocumentSectionTitle('Custom Section', t)).toBe('Custom Section');
  });
});
