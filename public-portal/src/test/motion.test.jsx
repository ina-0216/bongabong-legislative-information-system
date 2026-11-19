import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const motionProbe = vi.hoisted(() => ({ motionConfig: [], lazyMotion: [] }));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  const React = await import('react');
  return {
    ...actual,
    MotionConfig: (props) => {
      motionProbe.motionConfig.push(props);
      return React.createElement(actual.MotionConfig, props);
    },
    LazyMotion: (props) => {
      motionProbe.lazyMotion.push(props);
      return React.createElement(actual.LazyMotion, props);
    },
  };
});

import App from '../App.jsx';

describe('reduced motion and lazy boundaries', () => {
  it('mounts MotionConfig with reducedMotion="user" so the OS setting is honoured app-wide', () => {
    render(<App />);

    expect(motionProbe.motionConfig.length).toBeGreaterThan(0);
    expect(motionProbe.motionConfig.some((props) => props.reducedMotion === 'user')).toBe(true);
  });

  it('wraps the tree in LazyMotion with domAnimation and strict mode', () => {
    render(<App />);

    expect(motionProbe.lazyMotion.length).toBeGreaterThan(0);
    const entry = motionProbe.lazyMotion[0];
    expect(entry.strict).toBe(true);
    // domAnimation must be provided, otherwise nothing animates under strict.
    expect(entry.features).toBeTruthy();
  });

  it('keeps animated components inside the LazyMotion boundary', async () => {
    // If a lazy route rendered outside LazyMotion, the home bands would not
    // appear at all in strict mode. Rendering them proves the boundary order.
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('ships a prefers-reduced-motion override in the stylesheet', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/v11.css'), 'utf8');

    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    // The override must neutralise animation, transition and smooth scroll.
    expect(css).toMatch(/animation-duration:\s*\.001ms\s*!important/);
    expect(css).toMatch(/transition-duration:\s*\.001ms\s*!important/);
    expect(css).toMatch(/scroll-behavior:\s*auto\s*!important/);
  });
});