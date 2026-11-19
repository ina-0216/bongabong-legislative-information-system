import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConsultationReviewHistory } from '../pages/ConsultationVerification.jsx';

describe('ConsultationReviewHistory', () => {
  it('shows the reviewer, role, decision, reason, and recorded time', () => {
    render(
      <ConsultationReviewHistory
        title="Comment moderation history"
        history={[{
          id: 'review-1',
          reviewer: { name: 'Casey M Reviewer', role: 'Secretary' },
          action: 'RequestRejection',
          reason: 'Contains personal abuse.',
          createdAt: '2026-11-10T02:00:00.000Z',
        }]}
      />
    );

    expect(screen.getByRole('region', { name: 'Comment moderation history' })).toBeInTheDocument();
    expect(screen.getByText('Casey M Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Secretary', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Requested a second review')).toBeInTheDocument();
    expect(screen.getByText('Reason: Contains personal abuse.')).toBeInTheDocument();
    expect(screen.getByRole('time')).toHaveAttribute('datetime', '2026-11-10T02:00:00.000Z');
  });

  it('explains when a submission has not had staff review yet', () => {
    render(<ConsultationReviewHistory title="Eligibility review history" history={[]} />);

    expect(screen.getByText('No staff review actions recorded yet.')).toBeInTheDocument();
  });
});
