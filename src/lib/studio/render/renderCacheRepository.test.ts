import {
  computeRenderCacheKey,
  getCachedRender,
  saveCachedRender,
  monthSpendUsd,
  type RenderCacheDb,
} from './renderCacheRepository';

describe('computeRenderCacheKey', () => {
  it('aynı senaryo+versiyon+kamera için deterministik aynı anahtarı üretir', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    const b = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    expect(a).toBe(b);
  });

  it('farklı versiyon numarası farklı anahtar üretir', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    const b = computeRenderCacheKey('scn1', 4, { position: [10, 12, 10] });
    expect(a).not.toBe(b);
  });

  it('kamera pozisyonu 0.5 birim hassasiyetle yuvarlanır — küçük OrbitControls sürüklemesi cache miss üretmez', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10.05, 12.02, 10.1] });
    const b = computeRenderCacheKey('scn1', 3, { position: [10.2, 12.1, 10.3] });
    expect(a).toBe(b);
  });

  it('anlamlı derecede farklı kamera açısı farklı anahtar üretir', () => {
    const a = computeRenderCacheKey('scn1', 3, { position: [10, 12, 10] });
    const b = computeRenderCacheKey('scn1', 3, { position: [-10, 12, -10] });
    expect(a).not.toBe(b);
  });
});

function createMockDb(): RenderCacheDb & {
  findUniqueMock: jest.Mock;
  createMock: jest.Mock;
  aggregateMock: jest.Mock;
} {
  const findUniqueMock = jest.fn();
  const createMock = jest.fn();
  const aggregateMock = jest.fn();
  return {
    studioRenderCache: {
      findUnique: findUniqueMock,
      create: createMock,
      aggregate: aggregateMock,
    },
    findUniqueMock,
    createMock,
    aggregateMock,
  };
}

describe('getCachedRender', () => {
  it('kayıt varsa imageUrl döner', async () => {
    const db = createMockDb();
    db.findUniqueMock.mockResolvedValue({ imageUrl: 'https://cdn.example/x.png' });
    const result = await getCachedRender(db, 'user1', 'key1');
    expect(result).toBe('https://cdn.example/x.png');
    expect(db.findUniqueMock).toHaveBeenCalledWith({
      where: { userId_cacheKey: { userId: 'user1', cacheKey: 'key1' } },
    });
  });

  it('kayıt yoksa null döner', async () => {
    const db = createMockDb();
    db.findUniqueMock.mockResolvedValue(null);
    const result = await getCachedRender(db, 'user1', 'key1');
    expect(result).toBeNull();
  });
});

describe('saveCachedRender', () => {
  it('verilen alanlarla create çağırır', async () => {
    const db = createMockDb();
    db.createMock.mockResolvedValue({});
    await saveCachedRender(db, {
      userId: 'user1',
      cacheKey: 'key1',
      imageUrl: 'https://cdn.example/x.png',
      estCostUsd: 0.035,
    });
    expect(db.createMock).toHaveBeenCalledWith({
      data: { userId: 'user1', cacheKey: 'key1', imageUrl: 'https://cdn.example/x.png', estCostUsd: 0.035 },
    });
  });
});

describe('monthSpendUsd', () => {
  it('ay başlangıcından itibaren estCostUsd toplamını döner', async () => {
    const db = createMockDb();
    db.aggregateMock.mockResolvedValue({ _sum: { estCostUsd: 1.75 } });
    const spend = await monthSpendUsd(db, new Date('2026-09-15T12:00:00.000Z'));
    expect(spend).toBe(1.75);
    expect(db.aggregateMock).toHaveBeenCalledWith({
      _sum: { estCostUsd: true },
      where: { createdAt: { gte: new Date(Date.UTC(2026, 8, 1)) } },
    });
  });

  it('hiç kayıt yoksa 0 döner', async () => {
    const db = createMockDb();
    db.aggregateMock.mockResolvedValue({ _sum: { estCostUsd: null } });
    const spend = await monthSpendUsd(db, new Date());
    expect(spend).toBe(0);
  });
});
