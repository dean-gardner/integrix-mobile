import {
  isSignatureRequiredOnTaskCompletion,
  readTruthyFlag,
  SIGNATURE_REQUIRED_FLAG_KEYS,
} from '../src/utils/taskCompletionRequirements';
import { stripDataUrlPrefix } from '../src/utils/signaturePadHtml';

describe('taskCompletionRequirements', () => {
  it('readTruthyFlag accepts common truthy API values', () => {
    expect(readTruthyFlag({ requireSignatureOnTaskCompletion: true }, SIGNATURE_REQUIRED_FLAG_KEYS)).toBe(
      true
    );
    expect(readTruthyFlag({ requireSignatureOnTaskCompletion: 'true' }, SIGNATURE_REQUIRED_FLAG_KEYS)).toBe(
      true
    );
    expect(readTruthyFlag({ requireSignatureOnTaskCompletion: 1 }, SIGNATURE_REQUIRED_FLAG_KEYS)).toBe(
      true
    );
    expect(readTruthyFlag({ requireSignatureOnTaskCompletion: false }, SIGNATURE_REQUIRED_FLAG_KEYS)).toBe(
      false
    );
  });

  it('isSignatureRequiredOnTaskCompletion checks task then document version', () => {
    expect(
      isSignatureRequiredOnTaskCompletion({ isRequireSignatureOnTaskCompletion: true }, null)
    ).toBe(true);
    expect(
      isSignatureRequiredOnTaskCompletion(null, { requireSignatureOnCompletion: true })
    ).toBe(true);
    expect(isSignatureRequiredOnTaskCompletion({}, {})).toBe(false);
  });
});

describe('stripDataUrlPrefix', () => {
  it('strips data URL prefix from base64 payloads', () => {
    expect(stripDataUrlPrefix('data:image/png;base64,abc123')).toBe('abc123');
    expect(stripDataUrlPrefix('abc123')).toBe('abc123');
  });
});
