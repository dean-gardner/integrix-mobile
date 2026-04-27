export function translateKnownDocumentSectionTitle(
  value: string | undefined,
  translate: (key: string) => string
): string {
  const normalized = (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  switch (normalized) {
    case 'pre work':
      return translate('app.documentDetail.sectionPreWork');
    case 'main works':
    case 'main work':
      return translate('app.documentDetail.sectionMainWorks');
    default:
      return (value ?? '').trim() || '-';
  }
}

export function translateKnownRoleName(
  value: string | undefined,
  translate: (key: string) => string
): string {
  const normalized = (value ?? '').trim().toLowerCase();
  switch (normalized) {
    case 'admin':
      return translate('app.roles.admin');
    case 'user':
      return translate('app.roles.user');
    default:
      return (value ?? '').trim() || '-';
  }
}

export function translateKnownTeamName(
  value: string | undefined,
  translate: (key: string, options?: Record<string, unknown>) => string
): string {
  const raw = (value ?? '').trim();
  const normalized = raw.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
  switch (normalized) {
    case 'port team':
      return translate('app.teamNames.portTeam');
    case 'asset integrity team':
      return translate('app.teamNames.assetIntegrityTeam');
    case "john's team":
    case 'johns team':
      return translate('app.teamNames.johnsTeam');
    case 'second team':
      return translate('app.teamNames.secondTeam');
    case 'new team':
      return translate('app.teamNames.newTeam');
    default:
      return raw || '-';
  }
}
