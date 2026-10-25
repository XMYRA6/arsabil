/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text -- test mock */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FavoritesPage from '../favorites/page';
import DashboardListingsPage from '../listings/page';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill, unoptimized, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-next-image="" data-fill={fill ? 'true' : undefined} data-unoptimized={unoptimized ? 'true' : undefined} {...props} />
  ),
}));
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated' }) }));
jest.mock('react-hot-toast', () => ({ toast: { error: jest.fn() } }));

const CLOUD = 'https://res.cloudinary.com/demo/image/upload/arsa.jpg';

function mockFetch(payload: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload }) as any;
}

describe('dashboard favorites — ilan fotoğrafı', () => {
  it('renders the listing photo through next/image with alt and sizes', async () => {
    mockFetch([{ id: 'f1', listingId: 'l1', createdAt: '', listing: { id: 'l1', title: 'Deniz Arsa', photos: [CLOUD], type: 'SALE' } }]);
    render(<FavoritesPage />);
    const img = await screen.findByAltText('Deniz Arsa');
    expect(img).toHaveAttribute('data-next-image');
    expect(img).toHaveAttribute('data-fill', 'true');
    expect(img).toHaveAttribute('src', CLOUD);
    expect(img).toHaveAttribute('sizes', expect.stringContaining('vw'));
    expect(img).not.toHaveAttribute('data-unoptimized');
  });

  it('non-Cloudinary host is rendered unoptimized (no runtime host error)', async () => {
    mockFetch([{ id: 'f1', listingId: 'l1', createdAt: '', listing: { id: 'l1', title: 'X', photos: ['https://cdn.example.com/a.jpg'], type: 'SALE' } }]);
    render(<FavoritesPage />);
    const img = await screen.findByAltText('X');
    expect(img).toHaveAttribute('data-unoptimized', 'true');
  });

  it('diorama branch stays a plain <img> with src800 when there is no photo', async () => {
    mockFetch([{ id: 'f1', listingId: 'l1', createdAt: '', listing: { id: 'l1', title: 'Y', photos: [], type: 'SALE' } }]);
    const { container } = render(<FavoritesPage />);
    await waitFor(() => expect(container.querySelector('article img')).not.toBeNull());
    const img = container.querySelector('article img')!;
    expect(img).not.toHaveAttribute('data-next-image');
    expect(img.getAttribute('src')).toMatch(/\.webp/);
  });
});

describe('dashboard listings — ilan fotoğrafı', () => {
  const base = { isActive: true, status: 'APPROVED', createdAt: '2026-01-01', type: 'SALE' };

  it('renders the listing photo through next/image with alt and sizes', async () => {
    mockFetch([{ ...base, id: 'a', title: 'Dağ Arsa', photos: [CLOUD] }]);
    render(<DashboardListingsPage />);
    const img = await screen.findByAltText('Dağ Arsa');
    expect(img).toHaveAttribute('data-next-image');
    expect(img).toHaveAttribute('data-fill', 'true');
    expect(img).toHaveAttribute('src', CLOUD);
    expect(img).toHaveAttribute('sizes', expect.stringContaining('px'));
    expect(img).not.toHaveAttribute('data-unoptimized');
  });

  it('diorama branch stays a plain <img> with src800 when there is no photo', async () => {
    mockFetch([{ ...base, id: 'b', title: 'Boş', photos: [] }]);
    const { container } = render(<DashboardListingsPage />);
    await waitFor(() => expect(container.querySelector('article img')).not.toBeNull());
    const img = container.querySelector('article img')!;
    expect(img).not.toHaveAttribute('data-next-image');
    expect(img.getAttribute('src')).toMatch(/\.webp/);
  });
});
