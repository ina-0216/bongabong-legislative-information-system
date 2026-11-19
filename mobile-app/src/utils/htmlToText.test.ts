import { describe, expect, it } from 'vitest';

import { htmlToText } from './htmlToText';

describe('htmlToText', () => {
  it('removes rich-text tags and preserves paragraph breaks', () => {
    expect(htmlToText('<p>Welcome <strong>neighbors</strong>.</p><p>Read more.</p>')).toBe(
      'Welcome neighbors.\nRead more.',
    );
  });

  it('decodes named and numeric HTML entities', () => {
    expect(htmlToText('<p>Fish &amp; chips &#8212; &#x1F44B;</p>')).toBe('Fish & chips — 👋');
  });

  it('formats list items and removes executable or hidden markup blocks', () => {
    expect(htmlToText('<ul><li>One</li><li>Two</li></ul><script>ignore()</script>'))
      .toBe('• One\n• Two');
  });
});
