import { describe, expect, it } from 'vitest';
import {
  mergeExtractedDataIntoForm,
  parseExtractedOrdinanceSections,
} from '../pages/EncodeOrdinance.jsx';

const sampleProvisions = `BE IT ORDAINED BY THE SANGGUNIANG BAYAN IN SESSION ASSEMBLED:
Section 1. Purpose.
This fictional sample demonstrates how the extraction tool identifies a numbered section and provisions.
Section 2. Demonstration Program.
For extraction testing only, this sample describes sorting recyclable materials at a demonstration site.
Section 3. Sample Notice.
Any notice described in this sample is illustrative only.`;

describe('ordinance extraction section mapping', () => {
  it('splits extracted numbered provisions into their own titled form sections', () => {
    expect(parseExtractedOrdinanceSections(sampleProvisions)).toEqual([
      {
        title: 'Section 1. Purpose.',
        content: '<p>This fictional sample demonstrates how the extraction tool identifies a numbered section and provisions.</p>',
      },
      {
        title: 'Section 2. Demonstration Program.',
        content: '<p>For extraction testing only, this sample describes sorting recyclable materials at a demonstration site.</p>',
      },
      {
        title: 'Section 3. Sample Notice.',
        content: '<p>Any notice described in this sample is illustrative only.</p>',
      },
    ]);
  });

  it('populates the ordinance section editor when extracted data is accepted', () => {
    const previous = {
      type: 'Ordinance',
      provisions: '',
      sections: [{ title: 'Section 1.', content: '' }],
    };

    const result = mergeExtractedDataIntoForm(previous, { provisions: sampleProvisions });

    expect(result.sections).toHaveLength(3);
    expect(result.sections[0]).toMatchObject({ title: 'Section 1. Purpose.' });
    expect(result.sections[0].content).toContain('This fictional sample demonstrates');
    expect(result.sections[1]).toMatchObject({ title: 'Section 2. Demonstration Program.' });
    expect(result.sections[2]).toMatchObject({ title: 'Section 3. Sample Notice.' });
  });

  it('keeps manually edited section data unchanged', () => {
    const previous = {
      type: 'Ordinance',
      provisions: '<p>My existing text.</p>',
      sections: [{ title: 'Section 1. Existing.', content: '<p>My existing text.</p>' }],
    };

    const result = mergeExtractedDataIntoForm(
      previous,
      { provisions: sampleProvisions },
      new Set(['provisions', 'sections'])
    );

    expect(result.sections).toEqual(previous.sections);
    expect(result.provisions).toBe(previous.provisions);
  });
});
