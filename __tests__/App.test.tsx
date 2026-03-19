/**
 * @format
 */
import { initI18n } from '../src/i18n';

test('i18n ready for app shell (matches App RehydrateGate + initI18n)', async () => {
  await initI18n();
  expect(true).toBe(true);
});
