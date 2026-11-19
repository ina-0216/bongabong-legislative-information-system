import { describe, expect, it } from 'vitest';
import { prepareOrdinancePayload } from '../pages/EncodeOrdinance.jsx';

describe('ordinance effectivity date payload', () => {
  it('omits stale effectivity dates from a new measure draft', () => {
    const payload = prepareOrdinancePayload({
      type: 'Ordinance',
      number: '2026-017',
      title: 'Draft ordinance',
      effectivityDate: 'not-a-date',
    }, { isEditing: false, asDraft: true });

    expect(payload).not.toHaveProperty('effectivityDate');
    expect(payload).toMatchObject({ type: 'Ordinance', number: '2026-017', isDraft: true });
  });

  it('omits the empty effectivity date from an edit request', () => {
    const payload = prepareOrdinancePayload({
      type: 'Resolution',
      number: 'RES-2026-017',
      title: 'Updated resolution',
      effectivityDate: '',
    }, { isEditing: true, asDraft: false });

    expect(payload).not.toHaveProperty('effectivityDate');
    expect(payload).not.toHaveProperty('type');
    expect(payload).toMatchObject({ number: 'RES-2026-017', isDraft: false });
  });
});
