import { describe, expect, it } from 'vitest';
import router from '../src/router';

describe('router', () => {
  it('has correctly configured base and routes', () => {
    // Check history base
    // Note: router.options.history.base is accessible in some versions
    expect(router.options.history.base).toBe('/blog');

    const routes = router.options.routes;
    expect(routes).toHaveLength(2);

    expect(routes[0].path).toBe('/');
    expect(routes[1].path).toBe('/:id');
    expect(routes[1].name).toBe('post');
    expect(routes[1].props).toBe(true);
  });

  it('resolves routes to BlogView', async () => {
    // Basic check that components are defined
    const routes = router.options.routes;
    expect(routes[0].component.__name).toBe('BlogView');
    expect(routes[1].component.__name).toBe('BlogView');
  });
});
