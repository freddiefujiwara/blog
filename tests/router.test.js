import { describe, expect, it } from 'vitest';
import router from '../src/router';

describe('router', () => {
  it('has correctly configured base and routes', () => {
    // Check history base
    // Note: router.options.history.base is accessible in some versions
    expect(router.options.history.base).toBe('/blog');

    const routes = router.options.routes;
    expect(routes).toHaveLength(3);

    expect(routes[0].path).toBe('/');
    expect(routes[1].path).toBe('/tag/:tag');
    expect(routes[1].name).toBe('tag');
    expect(routes[1].props).toBe(true);
    expect(routes[2].path).toBe('/:id');
    expect(routes[2].name).toBe('post');
    expect(routes[2].props).toBe(true);
  });

  it('resolves routes to their views', async () => {
    // Basic check that components are defined
    const routes = router.options.routes;
    expect(routes[0].component.__name).toBe('BlogView');
    expect(routes[1].component.__name).toBe('TagView');
    expect(routes[2].component.__name).toBe('BlogView');
  });

  it('matches /tag/<tag> as the tag route, not as an article id', () => {
    const resolved = router.resolve(`/tag/${encodeURIComponent('運営')}`);
    expect(resolved.name).toBe('tag');
    expect(resolved.params.tag).toBe('運営');
  });
});
