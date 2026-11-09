const normalizePath = (path) => {
  if (!path) {
    return '';
  }
  return path.replace(/\/+$/, '');
};

const normalizeHash = (hash) => {
  if (!hash) {
    return '';
  }
  return hash.startsWith('#') ? hash.slice(1) : hash;
};

// Candidate article ids in priority order: path, hash, search query.
// Article URLs name their article in the path (/blog/<id>), while the
// hash may carry an in-article fragment instead (a heading's #h-…
// or an item title's #item-… anchor). The legacy form /blog#<id>
// names the article in the hash alone, so the hash stays a candidate
// — it just no longer outranks a path id that names a real article.
export const extractRequestedIds = ({ path, search, hash }) => {
  const candidates = [];
  const push = (value) => {
    if (value && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  const normalizedPath = normalizePath(path);
  const pathMatch = normalizedPath.match(/\/blog\/(.+)$/);
  if (pathMatch) {
    push(pathMatch[1]);
  }

  push(normalizeHash(hash));

  const params = new URLSearchParams(search);
  push(params.get('id') || '');

  return candidates;
};

export const extractRequestedId = (location) =>
  extractRequestedIds(location)[0] || '';

export const resolveArticleId = (ids, location) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return '';
  }
  const requestedId = extractRequestedIds(location).find((id) =>
    ids.includes(id)
  );
  if (requestedId) {
    return requestedId;
  }
  return ids[0];
};

export const buildNavigationLinks = (ids, currentId, basePath = '') => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { prevId: '', nextId: '', prevLink: '', nextLink: '' };
  }
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1) {
    return { prevId: '', nextId: '', prevLink: '', nextLink: '' };
  }
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : '';
  const nextId =
    currentIndex < ids.length - 1 ? ids[currentIndex + 1] : '';
  const normalizedBase = normalizePath(basePath);
  return {
    prevId,
    nextId,
    prevLink: prevId ? `${normalizedBase}/${prevId}` : '',
    nextLink: nextId ? `${normalizedBase}/${nextId}` : ''
  };
};
