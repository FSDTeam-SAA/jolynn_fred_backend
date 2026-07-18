export const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

export const RESERVED_USERNAMES = new Set([
  'about',
  'admin',
  'advertise',
  'api',
  'auth',
  'contact',
  'dashboard',
  'faq',
  'help-wanted',
  'location',
  'login',
  'mail',
  'privacy',
  'profile',
  'qoute',
  'quote',
  'register',
  'report',
  'reviews',
  'service',
  'services',
  'settings',
  'sponsor',
  'support',
  'terms',
  'user',
  'users',
  'www',
]);

export const normalizeUsername = (value?: string) =>
  value?.trim().toLowerCase();

export const isReservedUsername = (value?: string) =>
  value ? RESERVED_USERNAMES.has(normalizeUsername(value)!) : false;
