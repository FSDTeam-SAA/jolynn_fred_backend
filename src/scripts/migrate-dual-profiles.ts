import mongoose from 'mongoose';
import 'dotenv/config';
import config from '../app/config';
import { User, UserSchema } from '../app/module/user/entities/user.entity';

async function migrateDualProfiles() {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(config.mongoUri);
  const userModel =
    mongoose.models.User ?? mongoose.model(User.name, UserSchema);
  const cursor = userModel.find().cursor();
  let migrated = 0;

  for await (const user of cursor) {
    const role = user.role ?? 'user';
    const status = user.status ?? 'active';
    const setPayload: Record<string, unknown> = {
      roles: [...new Set([...(user.roles ?? []), role])],
      defaultRole: user.defaultRole ?? role,
      accountStatus:
        user.accountStatus ?? (role === 'businessOwner' ? 'active' : status),
    };

    if (role === 'user' && !user.userProfile) {
      setPayload.userProfile = {
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

    if (role === 'businessOwner' && !user.businessProfile) {
      setPayload.businessProfile = {
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
        status,
        stripeAccountId: user.stripeAccountId,
      };
    }

    await userModel.updateOne({ _id: user._id }, { $set: setPayload });
    migrated += 1;
  }

  await mongoose.disconnect();
  process.stdout.write(`Migrated ${migrated} account(s)\n`);
}

migrateDualProfiles().catch(async (error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  await mongoose.disconnect();
  process.exitCode = 1;
});
