const normalizePath = (path) => {
  if (!path) {
    return '';
  }
  return path.replace(/\/+$/, '');
};

export const resolveArticleId = (ids, { path, search }) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return '';
  }
  const normalizedPath = normalizePath(path);
  const pathMatch = normalizedPath.match(/\/blog\/(.+)$/);
  if (pathMatch && ids.includes(pathMatch[1])) {
    return pathMatch[1];
  }

  const params = new URLSearchParams(search);
  const requestedId = params.get('id');
  if (requestedId && ids.includes(requestedId)) {
    return requestedId;
  }
  return ids[0];
};

export const buildNavigationLinks = (ids, currentId, basePath = '/blog') => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { prevLink: '', nextLink: '' };
  }
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1) {
    return { prevLink: '', nextLink: '' };
  }
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : '';
  const nextId =
    currentIndex < ids.length - 1 ? ids[currentIndex + 1] : '';
  const normalizedBase = normalizePath(basePath) || '/blog';
  return {
    prevLink: prevId ? `${normalizedBase}/${prevId}` : '',
    nextLink: nextId ? `${normalizedBase}/${nextId}` : ''
  };
};
