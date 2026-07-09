export const USER_ROLES = ['admin', 'user', 'businessOwner'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['pending', 'active', 'rejected', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_GENDERS = ['male', 'female'] as const;
export type UserGender = (typeof USER_GENDERS)[number];
