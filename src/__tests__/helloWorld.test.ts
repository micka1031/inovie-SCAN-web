import { helloWorld } from '../helloWorld';
import { describe, it, expect } from 'vitest';

describe('Hello World', () => {
  it('should return "Hello, World!"', () => {
    expect(helloWorld()).toBe('Hello, World!');
  });
});
