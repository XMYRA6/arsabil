const getServerSessionMock = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/studio/studioScenarioRepository');
jest.mock('@/lib/studio/studioScenarioAudit', () => ({
  logStudioScenarioEvent: jest.fn(),
}));

import { POST } from '../route';
import { createStudioScenarioVersion } from '@/lib/studio/studioScenarioRepository';

describe('/api/studio/scenarios/[scenarioId]/versions route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('versiyon cakismasinda (optimistic concurrency) 409 Conflict doner', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
      (createStudioScenarioVersion as jest.Mock).mockResolvedValue({
        success: false,
        conflict: true,
        error: 'Senaryo başka bir oturumda güncellenmiş.',
      });

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedVersionNumber: 1,
          snapshot: { schemaVersion: 1 },
        }),
      });

      const res = await POST(req, { params: Promise.resolve({ scenarioId: 'sc-1' }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('VERSION_CONFLICT');
    });

    it('basarili kayitta 201 Created doner', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
      (createStudioScenarioVersion as jest.Mock).mockResolvedValue({
        success: true,
        scenario: { id: 'sc-1', currentVersionNumber: 2 },
        version: { id: 'v-2', versionNumber: 2 },
      });

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedVersionNumber: 1,
          snapshot: { schemaVersion: 1 },
        }),
      });

      const res = await POST(req, { params: Promise.resolve({ scenarioId: 'sc-1' }) });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.version.versionNumber).toBe(2);
    });
  });
});
