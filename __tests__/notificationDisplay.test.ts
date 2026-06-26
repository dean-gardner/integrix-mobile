import {
  buildNotificationDisplay,
  findLinkRangeInMessage,
  notificationActionLabel,
  stripEmbeddedUrlsFromDisplay,
  translateNotificationMessage,
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

  it('notificationActionLabel maps known labels and falls back to viewLink', () => {
    const t = (k: string) => (k === 'app.notificationsScreen.viewLink' ? 'VIEW' : k);
    expect(notificationActionLabel('here', t)).toBe('VIEW');
    expect(notificationActionLabel('View', t)).toBe('VIEW');
    expect(notificationActionLabel('عرض', t)).toBe('VIEW');
    expect(notificationActionLabel('Open PDF', t)).toBe('Open PDF');
    expect(notificationActionLabel('', t)).toBe('VIEW');
  });

  it('translateNotificationMessage maps document PDF and task completion templates', () => {
    const t = (key: string, opts?: Record<string, unknown>) => {
      if (key === 'app.notificationsScreen.documentPdfReady') return `DOC:${opts?.title}`;
      if (key === 'app.notificationsScreen.taskCompletionReportReady') return `TASK:${opts?.title}`;
      if (key === 'app.notificationsScreen.viewLink') return 'VIEW';
      return key;
    };
    expect(
      translateNotificationMessage(
        "A document 'Letourneau Chassis Inspection' PDF is ready for download. Click عرض to open the report.",
        t
      )
    ).toBe('DOC:Letourneau Chassis Inspection');
    expect(
      translateNotificationMessage(
        'A document "Letourneau Chassis Inspection" PDF is ready for download. Click عرض to open the report.',
        t
      )
    ).toBe('DOC:Letourneau Chassis Inspection');
    expect(
      translateNotificationMessage(
        "A document 'Letourneau Chassis Inspection' PDF is ready. Click عرض to open the report.",
        t
      )
    ).toBe('DOC:Letourneau Chassis Inspection');
    const taskMsg =
      "The task completion report for 'inspection washroom (clone)' is ready. Click http://integrix.s3-eu-central-1.amazonaws.com//TASK_COMPLETION_REPORT_16_03_2026_09_25.pdf.pdf to open the report.";
    expect(translateNotificationMessage(taskMsg, t)).toBe('TASK:inspection washroom (clone)');
  });

  it('cleans empty address placeholders and localizes reminder dates', () => {
    const t = (key: string, opts?: Record<string, unknown>) => {
      if (key === 'app.notificationsScreen.reminderTaskScheduled') {
        return `REMINDER:${opts?.title}:${opts?.startDate}`;
      }
      return key;
    };
    const translated = translateNotificationMessage(
      "Reminder: task '[Trench (Address: )] Remediation Document - 21/02/2026 07:41' is scheduled to start on 6/12/2026.",
      t,
      'en-US'
    );
    expect(translated).toContain('REMINDER:[Trench] Remediation Document - February 21, 2026');
    expect(translated).toContain('June 12, 2026');
    expect(translated).not.toContain('Address: )');
    expect(translated).not.toContain('6/12/2026');
  });

  it('buildNotificationDisplay returns localized body without English slices', () => {
    const t = (key: string, opts?: Record<string, unknown>) => {
      if (key === 'app.notificationsScreen.documentPdfReady') return `DOC:${opts?.title}`;
      if (key === 'app.notificationsScreen.viewLink') return 'عرض';
      return key;
    };
    const parts = buildNotificationDisplay(
      {
        message:
          "A document 'Test Doc' PDF is ready. Click عرض to open the report.",
        link: 'https://example.com/report.pdf',
        linkText: 'عرض',
      },
      t
    );
    expect(parts.bodyText).toBe('DOC:Test Doc');
    expect(parts.showActionLink).toBe(true);
    expect(parts.actionLabel).toBe('عرض');
    expect(parts.bodyText).not.toContain('Click');
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
