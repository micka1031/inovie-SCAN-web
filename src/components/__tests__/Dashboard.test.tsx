import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  test('affiche le titre du tableau de bord', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Tableau de bord/i)).toBeInTheDocument();
  });
});

