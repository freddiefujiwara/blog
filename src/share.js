// Canonical (production) URLs and SNS share-intent links for an article.
// Share links always point at the production URL, even when the article is
// being read on the staging build.

export const SITE_ORIGIN = 'https://freddiefujiwara.com';

export const buildArticleUrl = (id) => `${SITE_ORIGIN}/blog/${id}`;

export const buildShareLinks = ({ title, url }) => {
  const text = encodeURIComponent(title ?? '');
  const encodedUrl = encodeURIComponent(url ?? '');
  return [
    {
      key: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      key: 'line',
      label: 'LINE',
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`
    },
    {
      key: 'threads',
      label: 'Threads',
      href: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title ?? ''}\n${url ?? ''}`)}`
    }
  ];
};
