export interface FalRenderInput {
  colorImageDataUrl: string;
  depthImageDataUrl: string;
  prompt: string;
}

export interface FalRenderDeps {
  apiKey: string;
  modelId: string;
  fetchImpl?: typeof fetch;
}

export interface FalRenderResult {
  imageUrl: string;
}

export async function generatePhotorealisticRender(
  input: FalRenderInput,
  deps: FalRenderDeps
): Promise<FalRenderResult> {
  const fetchFn = deps.fetchImpl ?? fetch;
  const res = await fetchFn(`https://fal.run/${deps.modelId}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${deps.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: input.colorImageDataUrl,
      control_image_url: input.depthImageDataUrl,
      prompt: input.prompt,
    }),
  });

  if (!res.ok) {
    throw new Error(`fal_request_failed:${res.status}`);
  }

  const data = (await res.json()) as { images?: { url?: string }[] };
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('fal_no_image_returned');
  }

  return { imageUrl };
}

// Kalite hedefi "prosedürelden bariz iyi" (spec §Product Decision, Soru 3) —
// dergi/V-Ray kalitesi hedeflenmiyor, bu yüzden prompt sade tutuluyor.
export function buildRenderPrompt(): string {
  return 'photorealistic architectural exterior render of this building on its lot, natural daylight, professional real estate photography style, high detail materials';
}
