export const buildPublicProfileUrl = (username?: string) =>
  username ? `/${encodeURIComponent(username)}` : null;

export const createServiceSlug = (title: string) =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildPublicServiceProfileUrl = (
  username?: string,
  serviceTitle?: string,
) => {
  const profileUrl = buildPublicProfileUrl(username);
  const serviceSlug = serviceTitle ? createServiceSlug(serviceTitle) : '';

  return profileUrl && serviceSlug
    ? `${profileUrl}?service=${encodeURIComponent(serviceSlug)}`
    : profileUrl;
};

export const buildLegacyProfileUrl = (
  businessOwnerId: string,
  serviceId?: string,
) => {
  const path = `/services/businesses/${businessOwnerId}`;
  return serviceId
    ? `${path}?serviceId=${encodeURIComponent(serviceId)}`
    : path;
};
