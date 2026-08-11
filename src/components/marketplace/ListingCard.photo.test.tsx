/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ListingCard, type Listing } from './ListingCard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('ListingCard — gerçek fotoğraf gösterimi', () => {
  const listingWithPhoto: Listing = {
    id: 'test-123',
    title: 'Test Arsa',
    type: 'SALE',
    photos: ['https://cdn.example.com/arsa-1.jpg'],
  };

  it('split görünümde photos[0] img src olarak kullanılır', () => {
    render(<ListingCard listing={listingWithPhoto} view="split" />);
    const img = screen.getByRole('img', { name: 'Test Arsa' });
    expect(img).toHaveAttribute('src', expect.stringContaining('cdn.example.com'));
  });

  it('list görünümde photos[0] img src olarak kullanılır', () => {
    render(<ListingCard listing={listingWithPhoto} view="list" />);
    const img = screen.getByRole('img', { name: 'Test Arsa' });
    expect(img).toHaveAttribute('src', expect.stringContaining('cdn.example.com'));
  });

  it('photos boşsa (regresyon) placeholder gradyan gösterilir, img render edilmez', () => {
    const listingWithoutPhoto: Listing = { id: 'test-456', title: 'Fotosuz Arsa', type: 'SALE' };
    render(<ListingCard listing={listingWithoutPhoto} view="split" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('ListingCard — imar durumu (zoning)', () => {
  it('list görünümde zoning gerçek enum etiketiyle gösterilir', () => {
    const listing: Listing = { id: 'z-1', title: 'Zoning Test', type: 'SALE', zoning: 'TARIM' };
    render(<ListingCard listing={listing} view="list" />);
    expect(screen.getByText(/Tarım/)).toBeInTheDocument();
  });

  it('zoning yoksa imar etiketi hiç render edilmez', () => {
    const listing: Listing = { id: 'z-2', title: 'Zoningsiz', type: 'SALE' };
    render(<ListingCard listing={listing} view="list" />);
    expect(screen.queryByText('Tarım')).not.toBeInTheDocument();
    expect(screen.queryByText('Konut')).not.toBeInTheDocument();
  });
});
