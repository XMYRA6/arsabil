jest.mock('@/lib/studio/shareToken');

import { GET } from '../route';
import { getPublicStudioProposal } from '@/lib/studio/shareToken';

describe('/api/studio/share/[token] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gecersiz veya kisa token icin 404 doner', async () => {
    const req = new Request('http://localhost:3000/api/studio/share/short');
    const res = await GET(req, { params: Promise.resolve({ token: 'short' }) });

    expect(res.status).toBe(404);
  });

  it('bulunamayan veya suresi dolmus token icin 404 doner', async () => {
    (getPublicStudioProposal as jest.Mock).mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/studio/share/valid-looking-token-123456');
    const res = await GET(req, { params: Promise.resolve({ token: 'valid-looking-token-123456' }) });

    expect(res.status).toBe(404);
  });

  it('gecerli token icin 200 OK ve proposal verisi dondurur', async () => {
    (getPublicStudioProposal as jest.Mock).mockResolvedValue({
      viewModel: {
        projectContext: { scenarioName: 'Paylaşılan Proje' },
      },
      token: 'valid-looking-token-123456',
      expiresAt: null,
      createdAt: '2026-08-22T10:00:00.000Z',
    });

    const req = new Request('http://localhost:3000/api/studio/share/valid-looking-token-123456');
    const res = await GET(req, { params: Promise.resolve({ token: 'valid-looking-token-123456' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.viewModel.projectContext.scenarioName).toBe('Paylaşılan Proje');
    expect(json.token).toBe('valid-looking-token-123456');
  });
});
