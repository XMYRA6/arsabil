import { foldTr } from './fold';

describe('foldTr', () => {
  it('Türkçe karakterleri katlar', () => {
    expect(foldTr('İZMİR Işık ığdır')).toBe('izmir isik igdir');
  });
  it('boşlukları kırpar', () => {
    expect(foldTr('  Çanakkale  ')).toBe('canakkale');
  });
  it('boş girdi boş döner', () => {
    expect(foldTr('')).toBe('');
  });
});
