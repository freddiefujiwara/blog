// Special articles that also live on the top site as static pages.
// The static copies are generated from the same documents and are
// refreshed on a schedule, so readers are sent straight there
// instead of waiting for the API-backed article to load.
const STATIC_PAGE_PATHS = new Map([
  ['1bNigXcTT-1LSXjUYAlfFQuJPX6U7U3ELeWAfG5XIb58', '/map'],
  ['1WPrZI3RqXZcBIrVfrvY7Qn6AF-pFBHdNWXcK7PIwokM', '/bucket-list'],
  ['1tn5P1vB1jnKHSay_FC2AEtNxH0gQZ3_jffRnHuz4YpM', '/list-of-stuff'],
  ['1V7cXplHKbsT48EhLarl-SPHfDV-lSEafEId2OMgExkg', '/music']
]);

export function staticPagePathFor(id) {
  if (!id) {
    return null;
  }
  return STATIC_PAGE_PATHS.get(id) ?? null;
}
