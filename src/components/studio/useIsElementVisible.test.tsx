/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import { act, useState } from 'react';
import { useIsElementVisible } from './useIsElementVisible';

let observedCallback: IntersectionObserverCallback | null = null;
const observe = jest.fn();
const disconnect = jest.fn();

class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    observedCallback = cb;
  }
  observe = observe;
  disconnect = disconnect;
  unobserve = jest.fn();
}

function Probe({ mounted, onValue }: { mounted: boolean; onValue: (visible: boolean) => void }) {
  const [setNode, visible] = useIsElementVisible();
  onValue(visible);
  return mounted ? <div ref={setNode} /> : null;
}

describe('useIsElementVisible', () => {
  beforeEach(() => {
    observedCallback = null;
    observe.mockClear();
    disconnect.mockClear();
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;
  });

  it('eleman henuz mount olmadan (kosullu render) baslangicta gorunur kabul eder', () => {
    const values: boolean[] = [];
    render(<Probe mounted={false} onValue={(v) => values.push(v)} />);
    expect(values[values.length - 1]).toBe(true);
    expect(observe).not.toHaveBeenCalled();
  });

  // Asil regresyon: StudioPreview'da canvasShell yalnizca sahne acildiktan
  // SONRA mount olur — duz RefObject ile efekt yalnizca ilk mount'ta
  // calisip elemani hic bulamazdi. Callback ref, eleman SONRADAN monte
  // olunca da gozlemi kurar.
  it('eleman sonradan (kosullu render acilinca) mount olunca gozlemi KURAR', () => {
    const { rerender } = render(<Probe mounted={false} onValue={() => {}} />);
    expect(observe).not.toHaveBeenCalled();

    rerender(<Probe mounted onValue={() => {}} />);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('IntersectionObserver gorunmez raporlayinca false doner', () => {
    const values: boolean[] = [];
    render(<Probe mounted onValue={(v) => values.push(v)} />);

    act(() => {
      observedCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(values[values.length - 1]).toBe(false);
  });

  it('eleman sokulunce (unmount/kosullu kapanis) observer birakilir', () => {
    function Wrapper() {
      const [mounted, setMounted] = useState(true);
      return (
        <>
          <button onClick={() => setMounted(false)}>kapat</button>
          <Probe mounted={mounted} onValue={() => {}} />
        </>
      );
    }
    const { getByText } = render(<Wrapper />);
    expect(observe).toHaveBeenCalledTimes(1);

    act(() => getByText('kapat').click());
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
