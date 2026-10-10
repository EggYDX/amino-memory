import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Windows launcher format', () => {
  it('uses CRLF without a BOM so CMD parses every line correctly', () => {
    const bytes = readFileSync(new URL('../../启动网页.cmd', import.meta.url));
    expect(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(false);
    const script = bytes.toString('utf8');
    expect(script).toContain('\r\n');
    expect(script.replaceAll('\r\n', '')).not.toContain('\n');
    expect(script).toContain('cd /d "%~dp0"');
  });
});
