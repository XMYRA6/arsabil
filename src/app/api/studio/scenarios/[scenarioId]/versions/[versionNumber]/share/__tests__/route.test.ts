const getServerSessionMock = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/studio/shareToken');
jest.mock('@/lib/studio/studioScenarioAudit', () => ({
  logStudioScenarioEvent: jest.fn(),
}));

import { GET, POST, DELETE } from '../route';
import {
  createStudioShareToken,
  listStudioShareTokensForVersion,
  revokeStudioShareToken,
} from '@/lib/studio/shareToken';

describe('/api/studio/scenarios/[scenarioId]/versions/[versionNumber]/share route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('oturum yoksa 403 Forbidden doner', async () => {
      getServerSessionMock.mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1/versions/1/share');
      const res = await GET(req, { params: Promise.resolve({ scenarioId: 'sc-1', versionNumber: '1' }) });

      expect(res.status).toBe(403);
    });

    it('oturum varsa token listesini dondurur', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } });
      (listStudioShareTokensForVersion as jest.Mock).mockResolvedValue([
        { id: 'tok-1', token: 'token-abc', isActive: true },
      ]);

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1/versions/1/share');
      const res = await GET(req, { params: Promise.resolve({ scenarioId: 'sc-1', versionNumber: '1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tokens).toHaveLength(1);
      expect(json.tokens[0].token).toBe('token-abc');
    });
  });

  describe('POST', () => {
    it('oturum yoksa 403 Forbidden doner', async () => {
      getServerSessionMock.mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1/versions/1/share', {
        method: 'POST',
      });
      const res = await POST(req, { params: Promise.resolve({ scenarioId: 'sc-1', versionNumber: '1' }) });

      expect(res.status).toBe(403);
    });

    it('gecerli veri ile 201 Created ve tokenRecord doner', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } });
      (createStudioShareToken as jest.Mock).mockResolvedValue({
        success: true,
        tokenRecord: { id: 'tok-1', token: 'token-xyz', isActive: true },
      });

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1/versions/1/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 7 }),
      });
      const res = await POST(req, { params: Promise.resolve({ scenarioId: 'sc-1', versionNumber: '1' }) });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.tokenRecord.token).toBe('token-xyz');
    });
  });

  describe('DELETE', () => {
    it('token iptal edilince 200 OK doner', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } });
      (revokeStudioShareToken as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request('http://localhost:3000/api/studio/scenarios/sc-1/versions/1/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'token-xyz' }),
      });
      const res = await DELETE(req, { params: Promise.resolve({ scenarioId: 'sc-1', versionNumber: '1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
