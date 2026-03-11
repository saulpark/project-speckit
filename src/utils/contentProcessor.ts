/**
 * Content processor utility for handling Quill Delta format content
 */
export class ContentProcessor {

  /**
   * Convert plain text to Delta format
   */
  static textToDelta(text: string): object {
    return {
      ops: [{ insert: text + '\n' }]
    };
  }

  /**
   * Validate Delta format - checks ops is an array of { insert: string } objects
   */
  static validateDelta(delta: any): boolean {
    try {
      return (
        delta !== null &&
        delta !== undefined &&
        typeof delta === 'object' &&
        Array.isArray(delta.ops) &&
        delta.ops.every((op: any) =>
          typeof op === 'object' &&
          op !== null &&
          typeof op.insert === 'string'
        )
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate preview text from Delta content
   */
  static deltaToPreview(delta: any, maxLength: number = 200): string {
    try {
      const text = delta.ops
        .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
        .join('')
        .replace(/\n/g, ' ')
        .trim();

      return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
    } catch {
      return 'No content preview available';
    }
  }

  /**
   * Sanitize Delta content by stripping disallowed attributes.
   * Whitelist: bold, italic, underline, link, list
   */
  static sanitizeContent(content: any): any {
    if (!content || !content.ops) {
      return content;
    }

    return {
      ops: content.ops.map((op: any) => {
        const sanitized: any = {
          insert: typeof op.insert === 'string' ? op.insert : '',
        };

        const attrs = ContentProcessor.sanitizeAttributes(op.attributes);
        if (attrs !== undefined) {
          sanitized.attributes = attrs;
        }

        return sanitized;
      })
    };
  }

  private static sanitizeAttributes(attrs: any): any {
    if (!attrs || typeof attrs !== 'object') return undefined;

    const safeAttrs = ['bold', 'italic', 'underline', 'link', 'list'];
    const sanitized: any = {};

    Object.keys(attrs).forEach(key => {
      if (safeAttrs.includes(key)) {
        sanitized[key] = attrs[key];
      }
    });

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
}
