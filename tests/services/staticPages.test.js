import { describe, expect, it } from 'vitest';
import { staticPagePathFor } from '../../src/services/staticPages';

describe('staticPages service', () => {
  it('maps each special article id to its static page path', () => {
    expect(staticPagePathFor('1bNigXcTT-1LSXjUYAlfFQuJPX6U7U3ELeWAfG5XIb58')).toBe('/map');
    expect(staticPagePathFor('1WPrZI3RqXZcBIrVfrvY7Qn6AF-pFBHdNWXcK7PIwokM')).toBe('/bucket-list');
    expect(staticPagePathFor('1tn5P1vB1jnKHSay_FC2AEtNxH0gQZ3_jffRnHuz4YpM')).toBe('/list-of-stuff');
    expect(staticPagePathFor('1V7cXplHKbsT48EhLarl-SPHfDV-lSEafEId2OMgExkg')).toBe('/music');
  });

  it('returns null for ordinary articles and empty ids', () => {
    expect(staticPagePathFor('1ORcobKE3DfRrSUV6yMUodfVQgiL1ouKaCTWKTEFUR6A')).toBeNull();
    expect(staticPagePathFor('')).toBeNull();
    expect(staticPagePathFor(null)).toBeNull();
    expect(staticPagePathFor(undefined)).toBeNull();
  });
});
