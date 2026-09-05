import { generatePhotorealisticRender, buildRenderPrompt } from './falClient';

function mockFetchOnce(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('buildRenderPrompt', () => {
  it('boş olmayan bir prompt metni döner', () => {
    expect(buildRenderPrompt().length).toBeGreaterThan(10);
  });
});

describe('generatePhotorealisticRender', () => {
  const input = {
    colorImageDataUrl: 'data:image/png;base64,AAA',
    depthImageDataUrl: 'data:image/png;base64,BBB',
    prompt: 'test prompt',
  };

  it('başarılı yanıtta imageUrl döner ve doğru gövdeyi/başlığı gönderir', async () => {
    const fetchImpl = mockFetchOnce(200, { images: [{ url: 'https://cdn.fal.ai/x.png' }] });
    const result = await generatePhotorealisticRender(input, {
      apiKey: 'key123',
      modelId: 'fal-ai/flux-general/depth',
      fetchImpl,
    });
    expect(result).toEqual({ imageUrl: 'https://cdn.fal.ai/x.png' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fal.run/fal-ai/flux-general/depth',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Key key123' }),
      })
    );
    const [, options] = fetchImpl.mock.calls[0];
    const sentBody = JSON.parse(options.body);
    expect(sentBody).toEqual({
      image_url: input.colorImageDataUrl,
      control_image_url: input.depthImageDataUrl,
      prompt: input.prompt,
    });
  });

  it('sağlayıcı HTTP hatası döndürürse fırlatır', async () => {
    const fetchImpl = mockFetchOnce(500, {});
    await expect(
      generatePhotorealisticRender(input, { apiKey: 'key123', modelId: 'm', fetchImpl })
    ).rejects.toThrow('fal_request_failed:500');
  });

  it('yanıtta görsel yoksa fırlatır', async () => {
    const fetchImpl = mockFetchOnce(200, { images: [] });
    await expect(
      generatePhotorealisticRender(input, { apiKey: 'key123', modelId: 'm', fetchImpl })
    ).rejects.toThrow('fal_no_image_returned');
  });
});
