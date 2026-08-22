/** @jest-environment jsdom */
import { isWebGLAvailable } from './webglSupport';

describe('isWebGLAvailable', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('canvas.getContext bir WebGL baglami donerse true doner', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    expect(isWebGLAvailable()).toBe(true);
  });

  it('canvas.getContext null donerse (WebGL desteklenmiyor) false doner', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(isWebGLAvailable()).toBe(false);
  });

  it('getContext firlatirsa (bazi tarayici/GPU kombinasyonlari) false doner, hata sizdirmaz', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('context creation failed');
    });
    expect(isWebGLAvailable()).toBe(false);
  });
});
