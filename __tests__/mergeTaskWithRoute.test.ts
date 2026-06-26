import { mergeTaskWithRoute } from '../src/config/taskDetail';

describe('mergeTaskWithRoute', () => {
  it('preserves document fields from route when API task omits them', () => {
    const route = {
      id: 'task-1',
      taskNumber: '1',
      documentId: 'doc-1',
      versionId: 'ver-1',
      description: '08/04 test',
      documentNumberStr: 'Doc000002957.01',
      requireSignatureOnTaskCompletion: true,
    };
    const fromApi = {
      id: 'task-1',
      taskNumber: '1',
      workOrderNumber: '1',
      notificationNumber: '1',
    };

    const merged = mergeTaskWithRoute(fromApi, route);
    expect(merged?.documentId).toBe('doc-1');
    expect(merged?.versionId).toBe('ver-1');
    expect(merged?.description).toBe('08/04 test');
    expect(merged?.documentNumberStr).toBe('Doc000002957.01');
    expect(merged?.requireSignatureOnTaskCompletion).toBe(true);
    expect(merged?.workOrderNumber).toBe('1');
  });
});
