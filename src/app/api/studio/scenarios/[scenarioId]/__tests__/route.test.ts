const getServerSessionMock = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/studio/studioScenarioRepository');
jest.mock('@/lib/studio/studioScenarioAudit', () => ({
  logStudioScenarioEvent: jest.fn(),
}));

import { GET, PATCH } from '../route';
import {
  getStudioScenarioById,
  archiveStudioScenario,
  restoreStudioScenario,
} from '@/lib/studio/studioScenarioRepository';

describe('/api/studio/scenarios/[scenarioId] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('oturum yoksa 403 Forbidden doner', async () => {
      getServerSessionMock.mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1');
      const res = await GET(req, { params: Promise.resolve({ scenarioId: 'sc-1' }) });

      expect(res.status).toBe(403);
    });

    it('senaryo bulunamazsa veya baska kullaniciya aitse 404 doner', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
      (getStudioScenarioById as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-99');
      const res = await GET(req, { params: Promise.resolve({ scenarioId: 'sc-99' }) });

      expect(res.status).toBe(404);
    });

    it('senaryo mevcutsa 200 OK ve detay dondurur', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
      (getStudioScenarioById as jest.Mock).mockResolvedValue({
        scenario: { id: 'sc-1', name: 'Mevcut' },
        versions: [{ id: 'v-1', versionNumber: 1 }],
      });

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1');
      const res = await GET(req, { params: Promise.resolve({ scenarioId: 'sc-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.scenario.name).toBe('Mevcut');
    });
  });

  describe('PATCH', () => {
    it('archive eylemi icin 200 doner', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
      (archiveStudioScenario as jest.Mock).mockResolvedValue({ id: 'sc-1', isArchived: true });

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ scenarioId: 'sc-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.scenario.isArchived).toBe(true);
    });
  });
});
