import { describe, expect, it } from 'vitest';
import { stateFromResponse } from '../../src/lib/server/health';
describe('health state conversion', () => {
  it('maps expected, unexpected usable, and server responses', () => {
    expect(stateFromResponse(200, 200)).toBe('online');
    expect(stateFromResponse(302, 200)).toBe('degraded');
    expect(stateFromResponse(503, 200)).toBe('offline');
  });
});
