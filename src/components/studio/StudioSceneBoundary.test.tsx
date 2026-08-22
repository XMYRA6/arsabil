/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { StudioSceneBoundary } from './StudioSceneBoundary';

function Boom(): never {
  throw new Error('WebGL context creation failed');
}

describe('StudioSceneBoundary', () => {
  // React, error boundary tarafindan yakalanan hatalari yine de console.error
  // ile loglar — testte bunu bastirip gercek assertion'a odaklaniyoruz.
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('hata yoksa children i normal render eder', () => {
    render(
      <StudioSceneBoundary fallback={<div>fallback</div>}>
        <div>sahne</div>
      </StudioSceneBoundary>,
    );
    expect(screen.getByText('sahne')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });

  it('child render sirasinda hata firlatirsa fallback i gosterir, hatayi yutar', () => {
    render(
      <StudioSceneBoundary fallback={<div>fallback</div>}>
        <Boom />
      </StudioSceneBoundary>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });

  it('onError callback ini hatayla birlikte cagirir', () => {
    const onError = jest.fn();
    render(
      <StudioSceneBoundary fallback={<div>fallback</div>} onError={onError}>
        <Boom />
      </StudioSceneBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
