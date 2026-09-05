export interface StudioRenderEnvConfig {
  falApiKey: string;
  modelId: string;
  monthlyBudgetUsd: number;
  estCostPerRenderUsd: number;
}

type EnvLike = Record<string, string | undefined>;

// Akif'teki numEnv ile AYNI desen (openaiClient.ts): boş string veya
// NaN'ı 0 olarak kabul ETME — aksi halde container UI'ları (Coolify vb.)
// set edilmemiş değişkeni '' verir ve monthlyBudgetUsd=0 özelliği
// sessizce her isteği 503'e düşürür.
function numEnv(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : fallback;
}

export function readStudioRenderEnv(env: EnvLike = process.env): StudioRenderEnvConfig {
  const falApiKey = env.STUDIO_RENDER_FAL_KEY;
  if (!falApiKey) throw new Error('studio_render_unavailable');
  return {
    falApiKey,
    modelId: env.STUDIO_RENDER_MODEL_ID || 'fal-ai/flux-general/depth',
    monthlyBudgetUsd: numEnv(env.STUDIO_RENDER_MONTHLY_BUDGET_USD, 50),
    estCostPerRenderUsd: numEnv(env.STUDIO_RENDER_EST_COST_USD, 0.035),
  };
}
