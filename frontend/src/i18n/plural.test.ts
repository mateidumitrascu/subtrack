import { describe, expect, it } from 'vitest'
import { roPlural } from './plural'

describe('Romanian plurals', () => {
  it('adds "de" from 20 upwards', () => {
    expect(roPlural(1, 'zi', 'zile')).toBe('1 zi')
    expect(roPlural(3, 'zi', 'zile')).toBe('3 zile')
    expect(roPlural(19, 'zi', 'zile')).toBe('19 zile')
    expect(roPlural(20, 'zi', 'zile')).toBe('20 de zile')
    expect(roPlural(101, 'zi', 'zile')).toBe('101 zile')
  })
})
