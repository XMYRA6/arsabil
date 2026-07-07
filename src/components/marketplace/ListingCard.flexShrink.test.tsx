/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ListingCard, type Listing } from './ListingCard';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next/image (it will error without a proper next.config image loader)
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('ListingCard — flexShrink fix', () => {
  // Minimal mock Listing object
  const mockListing: Listing = {
    id: 'test-123',
    title: 'Test Property',
    type: 'SALE',
  };

  it('should have flexShrink: 0 on root card element in split/column view', () => {
    const { container } = render(<ListingCard listing={mockListing} view="split" />);
    const rootElement = container.firstChild as HTMLElement;

    expect(rootElement).toBeInTheDocument();
    expect(rootElement.style.flexShrink).toBe('0');
  });

  it('should have flexShrink: 0 on root card element in list view', () => {
    const { container } = render(<ListingCard listing={mockListing} view="list" />);
    const rootElement = container.firstChild as HTMLElement;

    expect(rootElement).toBeInTheDocument();
    expect(rootElement.style.flexShrink).toBe('0');
  });

  it('should have flexShrink: 0 on root card element by default (split view)', () => {
    const { container } = render(<ListingCard listing={mockListing} />);
    const rootElement = container.firstChild as HTMLElement;

    expect(rootElement).toBeInTheDocument();
    expect(rootElement.style.flexShrink).toBe('0');
  });
});
