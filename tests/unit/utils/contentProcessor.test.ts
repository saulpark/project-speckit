import { ContentProcessor } from '../../../src/utils/contentProcessor';

describe('ContentProcessor', () => {

  describe('textToDelta', () => {
    it('should wrap plain text in Delta ops structure', () => {
      const result = ContentProcessor.textToDelta('Hello World') as any;
      expect(result).toHaveProperty('ops');
      expect(Array.isArray(result.ops)).toBe(true);
      expect(result.ops).toHaveLength(1);
      expect(result.ops[0]).toHaveProperty('insert');
      expect(result.ops[0].insert).toContain('Hello World');
    });

    it('should append a newline to the text', () => {
      const result = ContentProcessor.textToDelta('Test') as any;
      expect(result.ops[0].insert).toBe('Test\n');
    });

    it('should handle empty string', () => {
      const result = ContentProcessor.textToDelta('') as any;
      expect(result.ops[0].insert).toBe('\n');
    });

    it('should handle text with special characters', () => {
      const result = ContentProcessor.textToDelta('Hello <World> & "Test"') as any;
      expect(result.ops[0].insert).toContain('Hello <World> & "Test"');
    });
  });

  describe('validateDelta', () => {
    it('should return true for valid Delta with string inserts', () => {
      const validDelta = { ops: [{ insert: 'Hello\n' }] };
      expect(ContentProcessor.validateDelta(validDelta)).toBe(true);
    });

    it('should return true for valid Delta with multiple ops', () => {
      const validDelta = {
        ops: [
          { insert: 'Hello ' },
          { insert: 'World', attributes: { bold: true } },
          { insert: '\n' }
        ]
      };
      expect(ContentProcessor.validateDelta(validDelta)).toBe(true);
    });

    it('should return false for null', () => {
      expect(ContentProcessor.validateDelta(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(ContentProcessor.validateDelta(undefined)).toBe(false);
    });

    it('should return false for a plain string', () => {
      expect(ContentProcessor.validateDelta('hello')).toBe(false);
    });

    it('should return false for object without ops', () => {
      expect(ContentProcessor.validateDelta({ data: 'hello' })).toBe(false);
    });

    it('should return false when ops is not an array', () => {
      expect(ContentProcessor.validateDelta({ ops: 'not an array' })).toBe(false);
    });

    it('should return false when op.insert is not a string', () => {
      const invalidDelta = { ops: [{ insert: 42 }] };
      expect(ContentProcessor.validateDelta(invalidDelta)).toBe(false);
    });

    it('should return false for empty ops array items missing insert', () => {
      const invalidDelta = { ops: [{ retain: 5 }] };
      expect(ContentProcessor.validateDelta(invalidDelta)).toBe(false);
    });

    it('should return true for empty ops array', () => {
      const emptyDelta = { ops: [] };
      expect(ContentProcessor.validateDelta(emptyDelta)).toBe(true);
    });
  });

  describe('deltaToPreview', () => {
    it('should extract plain text from Delta ops', () => {
      const delta = { ops: [{ insert: 'Hello World\n' }] };
      const preview = ContentProcessor.deltaToPreview(delta);
      expect(preview).toContain('Hello World');
    });

    it('should join multiple ops', () => {
      const delta = { ops: [{ insert: 'Hello ' }, { insert: 'World\n' }] };
      const preview = ContentProcessor.deltaToPreview(delta);
      expect(preview).toContain('Hello World');
    });

    it('should truncate at maxLength', () => {
      const longText = 'a'.repeat(300);
      const delta = { ops: [{ insert: longText }] };
      const preview = ContentProcessor.deltaToPreview(delta, 200);
      expect(preview.length).toBeLessThanOrEqual(203); // 200 chars + '...'
      expect(preview).toMatch(/\.\.\.$/);

    });

    it('should not truncate text shorter than maxLength', () => {
      const delta = { ops: [{ insert: 'Short text\n' }] };
      const preview = ContentProcessor.deltaToPreview(delta, 200);
      expect(preview).toBe('Short text');
      expect(preview).not.toContain('...');
    });

    it('should use default maxLength of 200', () => {
      const text = 'a'.repeat(201);
      const delta = { ops: [{ insert: text }] };
      const preview = ContentProcessor.deltaToPreview(delta);
      expect(preview).toMatch(/\.\.\.$/);

    });

    it('should return fallback for malformed delta', () => {
      const preview = ContentProcessor.deltaToPreview(null);
      expect(typeof preview).toBe('string');
      expect(preview.length).toBeGreaterThan(0);
    });

    it('should replace newlines with spaces', () => {
      const delta = { ops: [{ insert: 'Line 1\nLine 2\n' }] };
      const preview = ContentProcessor.deltaToPreview(delta);
      expect(preview).not.toContain('\n');
    });

    it('should handle ops with non-string inserts gracefully', () => {
      const delta = { ops: [{ insert: { image: 'url' } }, { insert: 'text\n' }] };
      const preview = ContentProcessor.deltaToPreview(delta);
      expect(typeof preview).toBe('string');
    });
  });

  describe('sanitizeContent', () => {
    it('should keep whitelisted attributes (bold, italic, underline, link, list)', () => {
      const delta = {
        ops: [{
          insert: 'Hello',
          attributes: { bold: true, italic: true }
        }]
      };
      const result = ContentProcessor.sanitizeContent(delta);
      expect(result.ops[0].attributes).toEqual({ bold: true, italic: true });
    });

    it('should remove non-whitelisted attributes', () => {
      const delta = {
        ops: [{
          insert: 'Hello',
          attributes: { bold: true, script: 'super', color: 'red' }
        }]
      };
      const result = ContentProcessor.sanitizeContent(delta);
      expect(result.ops[0].attributes).toEqual({ bold: true });
      expect(result.ops[0].attributes).not.toHaveProperty('script');
      expect(result.ops[0].attributes).not.toHaveProperty('color');
    });

    it('should set attributes to undefined when all are disallowed', () => {
      const delta = {
        ops: [{
          insert: 'Hello',
          attributes: { color: 'red', background: 'blue' }
        }]
      };
      const result = ContentProcessor.sanitizeContent(delta);
      expect(result.ops[0].attributes).toBeUndefined();
    });

    it('should handle ops without attributes', () => {
      const delta = { ops: [{ insert: 'Hello\n' }] };
      const result = ContentProcessor.sanitizeContent(delta);
      expect(result.ops[0].insert).toBe('Hello\n');
      expect(result.ops[0].attributes).toBeUndefined();
    });

    it('should convert non-string inserts to empty strings', () => {
      const delta = { ops: [{ insert: { image: 'url' } }] };
      const result = ContentProcessor.sanitizeContent(delta);
      expect(result.ops[0].insert).toBe('');
    });

    it('should return content unchanged if no ops', () => {
      const noOps = { data: 'test' };
      const result = ContentProcessor.sanitizeContent(noOps);
      expect(result).toEqual(noOps);
    });

    it('should return null/undefined as-is', () => {
      expect(ContentProcessor.sanitizeContent(null)).toBeNull();
      expect(ContentProcessor.sanitizeContent(undefined)).toBeUndefined();
    });

    it('should allow link attribute', () => {
      const delta = {
        ops: [{
          insert: 'Click here',
          attributes: { link: 'https://example.com' }
        }]
      };
      const result = ContentProcessor.sanitizeContent(delta);
      expect(result.ops[0].attributes).toEqual({ link: 'https://example.com' });
    });

    it('should allow list attribute', () => {
      const delta = {
        ops: [{
          insert: 'Item\n',
          attributes: { list: 'bullet' }
        }]
      };
      const result = ContentProcessor.sanitizeContent(delta);
      expect(result.ops[0].attributes).toEqual({ list: 'bullet' });
    });
  });
});
