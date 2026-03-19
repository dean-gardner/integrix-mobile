import {
  findLinkRangeInMessage,
  notificationActionLabel,
  stripEmbeddedUrlsFromDisplay,
} from '../src/utils/notificationDisplay';

describe('findLinkRangeInMessage', () => {
  const link = 'https://example.com/reports/abc?x=1';

  it('finds exact substring', () => {
    const msg = `Before ${link} after`;
    expect(findLinkRangeInMessage(msg, link)).toEqual({ start: 7, end: 7 + link.length });
  });

  it('matches URL in message when link differs by trailing slash', () => {
    const inMsg = 'https://example.com/reports/abc?x=1';
    const msg = `Click ${inMsg} to open`;
    expect(findLinkRangeInMessage(msg, `${inMsg}/`)).toEqual({
      start: 6,
      end: 6 + inMsg.length,
    });
  });

  it('matches by host/path/search when message URL has trailing punctuation', () => {
    const msg = `See https://example.com/reports/abc?x=1).`;
    const r = findLinkRangeInMessage(msg, link);
    expect(r).not.toBeNull();
    expect(msg.slice(r!.start, r!.end)).toMatch(/^https:\/\/example\.com\/reports\/abc\?x=1/);
  });

  it('returns null when no URL matches', () => {
    expect(findLinkRangeInMessage('No link here', 'https://other.com/x')).toBeNull();
  });

  it('stripEmbeddedUrlsFromDisplay removes S3 URL and Click-to-open boilerplate', () => {
    const msg =
      "The task completion report for 'inspection washroom (clone)' is ready. Click http://integrix.s3-eu-central-1.amazonaws.com//TASK_COMPLETION_REPORT_16_03_2026_09_25.pdf.pdf to open the report.";
    expect(stripEmbeddedUrlsFromDisplay(msg)).toBe(
      "The task completion report for 'inspection washroom (clone)' is ready."
    );
  });

  it('notificationActionLabel keeps linkText and falls back to viewLink', () => {
    const t = (k: string) => (k === 'app.notificationsScreen.viewLink' ? 'VIEW' : k);
    expect(notificationActionLabel('here', t)).toBe('here');
    expect(notificationActionLabel('Open PDF', t)).toBe('Open PDF');
    expect(notificationActionLabel('', t)).toBe('VIEW');
  });

  it('matches S3-style URL in message when API link differs (http vs https, // path)', () => {
    const msg =
      "The report is ready. Click http://integrix.s3-eu-central-1.amazonaws.com//TASK_COMPLETION_REPORT_16_03_2026_09_25.pdf.pdf to open.";
    const apiLink =
      'https://integrix.s3-eu-central-1.amazonaws.com/TASK_COMPLETION_REPORT_16_03_2026_09_25.pdf.pdf';
    const r = findLinkRangeInMessage(msg, apiLink);
    expect(r).not.toBeNull();
    expect(msg.slice(r!.start, r!.end)).toContain('amazonaws.com');
    expect(msg.slice(r!.start, r!.end)).toContain('TASK_COMPLETION_REPORT');
  });
});
