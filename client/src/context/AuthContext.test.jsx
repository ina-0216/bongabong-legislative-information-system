import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';

function AuthState() {
  const { user, loading, logout } = useAuth();

  return (
    <div>
      <span>{loading ? 'loading' : user ? 'signed-in' : 'signed-out'}</span>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}

function renderAuthProvider(queryClient = new QueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    </QueryClientProvider>
  );
  return queryClient;
}

describe('AuthProvider session recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears malformed persisted user data and completes startup', async () => {
    localStorage.setItem('ibosys_token', 'stale-token');
    localStorage.setItem('ibosys_user', '{invalid json');

    renderAuthProvider();

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(localStorage.getItem('ibosys_token')).toBeNull();
    expect(localStorage.getItem('ibosys_user')).toBeNull();
  });

  it('clears cached account data on logout', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['account-data'], { confidential: true });
    renderAuthProvider(queryClient);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(queryClient.getQueryData(['account-data'])).toBeUndefined());
  });
});
