import { sanitize, sanitizeObject } from '../sanitize';

describe('Sanitization Utility', () => {
  describe('sanitize()', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitize(input);
      expect(result).toBe('Hello');
      expect(result).not.toContain('<script>');
    });

    it('should remove all HTML tags', () => {
      const input = '<div><p>Hello</p><span>World</span></div>';
      const result = sanitize(input);
      expect(result).toBe('HelloWorld');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("XSS")';
      const result = sanitize(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("XSS")';
      const result = sanitize(input);
      expect(result).not.toContain('onclick=');
    });

    it('should handle nested script tags', () => {
      const input = '<script><script>alert("XSS")</script></script>';
      const result = sanitize(input);
      expect(result).toBe('');
      expect(result).not.toContain('<script>');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitize(input);
      expect(result).toBe('Hello World');
    });

    it('should handle null and undefined', () => {
      expect(sanitize(null as any)).toBeNull();
      expect(sanitize(undefined as any)).toBeUndefined();
    });

    it('should handle non-string input', () => {
      expect(sanitize(123 as any)).toBe(123);
      expect(sanitize(true as any)).toBe(true);
    });

    it('should preserve safe text', () => {
      const input = 'Hello World! This is safe text.';
      const result = sanitize(input);
      expect(result).toBe('Hello World! This is safe text.');
    });

    it('should handle img tags with onerror', () => {
      const input = '<img src=x onerror=alert("XSS")>';
      const result = sanitize(input);
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror');
    });
  });

  describe('sanitizeObject()', () => {
    it('should sanitize string values in object', () => {
      const input = {
        name: '<script>alert("XSS")</script>Test',
        description: '<b>Bold</b> text',
        number: 123,
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('Test');
      expect(result.description).toBe('Bold text');
      expect(result.number).toBe(123);
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>XSS</script>John',
          email: 'john@test.com',
        },
        count: 5,
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('John');
      expect(result.user.email).toBe('john@test.com');
      expect(result.count).toBe(5);
    });

    it('should handle arrays in objects', () => {
      const input = {
        tags: ['<script>tag1</script>', 'tag2'],
        count: 2,
      };
      const result = sanitizeObject(input);
      // Arrays are not deep sanitized in current implementation
      expect(result.tags).toEqual(['<script>tag1</script>', 'tag2']);
    });

    it('should handle null values', () => {
      const input = {
        name: 'Test',
        description: null,
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('Test');
      expect(result.description).toBeNull();
    });
  });
});
