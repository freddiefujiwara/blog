export const resolveArticleId = (ids, search) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return '';
  }
  const params = new URLSearchParams(search);
  const requestedId = params.get('id');
  if (requestedId && ids.includes(requestedId)) {
    return requestedId;
  }
  return ids[0];
};

export const buildNavigationLinks = (ids, currentId, baseUrl) => {
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
  return {
    prevLink: prevId ? `${baseUrl}?id=${prevId}` : '',
    nextLink: nextId ? `${baseUrl}?id=${nextId}` : ''
  };
};
