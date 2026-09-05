const getServerSessionMock = jest.fn();
const getVersionDetailMock = jest.fn();
const userFindUniqueMock = jest.fn();
const readEnvMock = jest.fn();
const generateRenderMock = jest.fn();
const buildPromptMock = jest.fn((..._args: unknown[]) => 'prompt');
const getCachedRenderMock = jest.fn();
const saveCachedRenderMock = jest.fn();
const monthSpendUsdMock = jest.fn();
const checkRateLimitMock = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) } },
}));
jest.mock('@/lib/studio/studioScenarioRepository', () => ({
  getStudioScenarioVersionDetail: (...args: unknown[]) => getVersionDetailMock(...args),
}));
jest.mock('@/lib/studio/render/env', () => ({
  readStudioRenderEnv: (...args: unknown[]) => readEnvMock(...args),
}));
jest.mock('@/lib/studio/render/falClient', () => ({
  generatePhotorealisticRender: (...args: unknown[]) => generateRenderMock(...args),
  buildRenderPrompt: (...args: unknown[]) => buildPromptMock(...args),
}));
jest.mock('@/lib/studio/render/renderCacheRepository', () => ({
  computeRenderCacheKey: jest.fn(() => 'cachekey123'),
  getCachedRender: (...args: unknown[]) => getCachedRenderMock(...args),
  saveCachedRender: (...args: unknown[]) => saveCachedRenderMock(...args),
  monthSpendUsd: (...args: unknown[]) => monthSpendUsdMock(...args),
}));
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  RATE_LIMITS: { STUDIO_RENDER: { limit: 5, windowMs: 60_000 } },
}));

import { POST } from '../route';

function makeReq(body: unknown) {
  return new Request('http://localhost/api/studio/scenarios/s1/versions/1/render', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validBody = {
  colorImageDataUrl: 'data:image/png;base64,AAA',
  depthImageDataUrl: 'data:image/png;base64,BBB',
  cameraPosition: [10, 12, 10],
};

const params = Promise.resolve({ scenarioId: 's1', versionNumber: '1' });

describe('POST .../render', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimitMock.mockReturnValue({ ok: true });
    getServerSessionMock.mockResolvedValue({ user: { id: 'user1' } });
    userFindUniqueMock.mockResolvedValue({ plan: 'PRO' });
    getVersionDetailMock.mockResolvedValue({ versionNumber: 1, schemaVersion: 1, snapshot: {} });
    readEnvMock.mockReturnValue({
      falApiKey: 'key',
      modelId: 'model',
      monthlyBudgetUsd: 50,
      estCostPerRenderUsd: 0.035,
    });
    getCachedRenderMock.mockResolvedValue(null);
    monthSpendUsdMock.mockResolvedValue(0);
    generateRenderMock.mockResolvedValue({ imageUrl: 'https://cdn.fal.ai/out.png' });
    saveCachedRenderMock.mockResolvedValue(undefined);
  });

  it('oturum yoksa 403 döner', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(403);
  });

  it('rate limit aşılırsa 429 döner', async () => {
    checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 30 });
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(429);
  });

  it('PRO olmayan kullanıcı için 403 döner', async () => {
    userFindUniqueMock.mockResolvedValue({ plan: 'FREE' });
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(403);
    expect(generateRenderMock).not.toHaveBeenCalled();
  });

  it('senaryo/versiyon bulunamazsa (sahip değil veya yok) 404 döner', async () => {
    getVersionDetailMock.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(404);
  });

  it('geçersiz gövdede 400 döner', async () => {
    const res = await POST(makeReq({ colorImageDataUrl: 'not-a-data-url' }), { params });
    expect(res.status).toBe(400);
  });

  it('cache hit ise sağlayıcı çağrılmadan cached:true ile döner', async () => {
    getCachedRenderMock.mockResolvedValue('https://cdn.fal.ai/cached.png');
    const res = await POST(makeReq(validBody), { params });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ imageUrl: 'https://cdn.fal.ai/cached.png', cached: true });
    expect(generateRenderMock).not.toHaveBeenCalled();
  });

  it('aylık bütçe aşıldıysa 503 döner, sağlayıcı çağrılmaz', async () => {
    monthSpendUsdMock.mockResolvedValue(999);
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(503);
    expect(generateRenderMock).not.toHaveBeenCalled();
  });

  it('sağlayıcı hatası verirse 502 döner, cache YAZILMAZ', async () => {
    generateRenderMock.mockRejectedValue(new Error('boom'));
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(502);
    expect(saveCachedRenderMock).not.toHaveBeenCalled();
  });

  it('başarılı üretimde 200 + cached:false döner ve cache\'e yazar', async () => {
    const res = await POST(makeReq(validBody), { params });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ imageUrl: 'https://cdn.fal.ai/out.png', cached: false });
    expect(saveCachedRenderMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'user1', cacheKey: 'cachekey123', imageUrl: 'https://cdn.fal.ai/out.png', estCostUsd: 0.035 })
    );
  });

  it('env okunamazsa (FAL_KEY yok) 503 döner', async () => {
    readEnvMock.mockImplementation(() => {
      throw new Error('studio_render_unavailable');
    });
    const res = await POST(makeReq(validBody), { params });
    expect(res.status).toBe(503);
  });
});
