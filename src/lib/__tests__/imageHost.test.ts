import { isOptimizableHost } from '../imageHost'

describe('isOptimizableHost', () => {
  it.each([
    ['https://res.cloudinary.com/x', true],
    ['https://RES.CLOUDINARY.COM/x', true],
    ['http://res.cloudinary.com/x', false],
    ['//res.cloudinary.com/x', false],
    ['/rel.jpg', false],
    ['data:image/png;base64,AAAA', false],
    ['javascript:alert(1)', false],
    ['', false],
    ['https://res.cloudinary.com@evil.com/x', false],
    ['https://res.cloudinary.com.evil.com/x', false],
    ['https://res.cloudinary.com./x', false],
    ['not a url', false],
  ])('%j -> %s', (url, beklenen) => {
    expect(() => isOptimizableHost(url)).not.toThrow()
    expect(isOptimizableHost(url)).toBe(beklenen)
  })
})
