import { type UserRole, type UserStatus } from '../constants/auth.constants';
import {
  BusinessProfile,
  PersonalProfile,
  User,
  UserDocument,
} from '../module/user/entities/user.entity';

type UserLike = User | UserDocument;

export const businessOwnerMembershipFilter: Record<string, unknown> = {
  $or: [{ roles: 'businessOwner' }, { role: 'businessOwner' }],
};

export const activeBusinessOwnerFilter: Record<string, unknown> = {
  $and: [
    businessOwnerMembershipFilter,
    {
      $or: [
        { 'businessProfile.status': 'active' },
        { businessProfile: { $exists: false }, status: 'active' },
      ],
    },
  ],
};

export function getAvailableRoles(user: UserLike): UserRole[] {
  const roles = [...(user.roles ?? []), user.role];
  return [...new Set(roles.filter(Boolean))];
}

export function hasProfileRole(user: UserLike, role: UserRole): boolean {
  return getAvailableRoles(user).includes(role);
}

export function getDefaultRole(user: UserLike): UserRole {
  const availableRoles = getAvailableRoles(user);
  const preferredRole = user.defaultRole ?? user.role;
  return availableRoles.includes(preferredRole)
    ? preferredRole
    : (availableRoles[0] ?? 'user');
}

export function getAccountStatus(user: UserLike): UserStatus {
  return user.accountStatus ?? user.status ?? 'active';
}

export function getPersonalProfile(user: UserLike): PersonalProfile {
  if (user.userProfile) {
    return user.userProfile;
  }

  return {
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    phoneNumber: user.phoneNumber,
    country: user.country,
    city: user.city,
    state: user.state,
    address: user.address,
    postcode: user.postcode,
    profilePicture: user.profilePicture,
    backgroundImage: user.backgroundImage,
    dateOfBirth: user.dateOfBirth,
    bio: user.bio,
    tag: user.tag,
  };
}

export function getBusinessProfile(user: UserLike): BusinessProfile {
  if (user.businessProfile) {
    return user.businessProfile;
  }

  return {
    businessName: user.businessName,
    ownerName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    businessEmail: user.businessEmail,
    businessWebsiteUrl: user.businessWebsiteUrl,
    serviceArea: user.serviceArea,
    category: user.category,
    requestedCategory: user.requestedCategory,
    serviceCategoryId: user.serviceCategoryId,
    phoneNumber: user.phoneNumber,
    country: user.country,
    city: user.city,
    state: user.state,
    address: user.address,
    postcode: user.postcode,
    profilePicture: user.profilePicture,
    backgroundImage: user.backgroundImage,
    bio: user.bio,
    status: user.status,
    stripeAccountId: user.stripeAccountId,
  };
}

export function toPlainProfile<T extends PersonalProfile | BusinessProfile>(
  profile: T,
): T {
  const mongooseProfile = profile as T & { toObject?: () => T };
  return typeof mongooseProfile.toObject === 'function'
    ? mongooseProfile.toObject()
    : ({ ...profile } as T);
}
