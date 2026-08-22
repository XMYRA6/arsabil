const getServerSessionMock = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/studio/studioScenarioRepository');
jest.mock('@/lib/studio/studioScenarioAudit', () => ({
  logStudioScenarioEvent: jest.fn(),
}));

import { GET, POST } from '../route';
import { listStudioScenarios, createStudioScenario } from '@/lib/studio/studioScenarioRepository';

describe('/api/studio/scenarios route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('oturum yoksa 403 Forbidden doner', async () => {
      getServerSessionMock.mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/studio/scenarios');
      const res = await GET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain('Yetkisiz');
    });

    it('oturum varsa kullanicinin senaryolarini listeler', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
      (listStudioScenarios as jest.Mock).mockResolvedValue([
        { id: 'sc-1', name: 'Senaryo 1' },
      ]);

      const req = new Request('http://localhost:3000/api/studio/scenarios');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.scenarios).toHaveLength(1);
      expect(json.scenarios[0].name).toBe('Senaryo 1');
      expect(listStudioScenarios).toHaveBeenCalledWith('user-1', { includeArchived: false, search: undefined });
    });
  });

  describe('POST', () => {
    it('oturum yoksa 403 Forbidden doner', async () => {
      getServerSessionMock.mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/studio/scenarios', {
        method: 'POST',
        body: JSON.stringify({ name: 'Yeni' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it('gecerli veri ile 201 Created doner', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
      (createStudioScenario as jest.Mock).mockResolvedValue({
        scenario: { id: 'sc-1', name: 'Yeni Senaryo' },
        version: { id: 'ver-1', versionNumber: 1 },
      });

      const req = new Request('http://localhost:3000/api/studio/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Yeni Senaryo',
          snapshot: { schemaVersion: 1 },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.scenario.name).toBe('Yeni Senaryo');
    });
  });
});
