'use client';

import { Component, type ReactNode } from 'react';

type StudioSceneBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
};

type StudioSceneBoundaryState = {
  hasError: boolean;
};

/**
 * `@react-three/fiber`'in `Canvas`'i WebGL baglami olusturamayinca render
 * hatasi firlatabilir (Faz 1B Task 3) — React'te bunu yakalamanin tek yolu
 * bir error boundary'dir, bu da HALA class component gerektiren tek durum
 * (fonksiyon bilesen/hook karsiligi yok).
 */
export class StudioSceneBoundary extends Component<StudioSceneBoundaryProps, StudioSceneBoundaryState> {
  state: StudioSceneBoundaryState = { hasError: false };

  static getDerivedStateFromError(): StudioSceneBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
