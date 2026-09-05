import { readStudioRenderEnv } from './env';

describe('readStudioRenderEnv', () => {
  it('STUDIO_RENDER_FAL_KEY yoksa fırlatır', () => {
    expect(() => readStudioRenderEnv({})).toThrow('studio_render_unavailable');
  });

  it('yalnızca zorunlu değişkenle çağrılırsa varsayılanları uygular', () => {
    const cfg = readStudioRenderEnv({ STUDIO_RENDER_FAL_KEY: 'key123' });
    expect(cfg).toEqual({
      falApiKey: 'key123',
      modelId: 'fal-ai/flux-general/depth',
      monthlyBudgetUsd: 50,
      estCostPerRenderUsd: 0.035,
    });
  });

  it('tüm değişkenler verilirse hepsini kullanır', () => {
    const cfg = readStudioRenderEnv({
      STUDIO_RENDER_FAL_KEY: 'key123',
      STUDIO_RENDER_MODEL_ID: 'fal-ai/custom-model',
      STUDIO_RENDER_MONTHLY_BUDGET_USD: '75',
      STUDIO_RENDER_EST_COST_USD: '0.05',
    });
    expect(cfg).toEqual({
      falApiKey: 'key123',
      modelId: 'fal-ai/custom-model',
      monthlyBudgetUsd: 75,
      estCostPerRenderUsd: 0.05,
    });
  });

  it('boş string sayısal env değişkenini SESSİZCE 0 yapıp bütçeyi kapatmaz — fallback\'e düşer', () => {
    const cfg = readStudioRenderEnv({
      STUDIO_RENDER_FAL_KEY: 'key123',
      STUDIO_RENDER_MONTHLY_BUDGET_USD: '',
    });
    expect(cfg.monthlyBudgetUsd).toBe(50);
  });
});
