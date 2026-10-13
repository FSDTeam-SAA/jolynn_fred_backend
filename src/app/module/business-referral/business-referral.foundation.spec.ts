import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBusinessReferralDto } from './dto/create-business-referral.dto';
import { SearchBusinessReferralsDto } from './dto/search-business-referrals.dto';
import { UpdateReferralEmailDto } from './dto/update-referral-email.dto';
import { BusinessClaimSchema } from './entities/business-claim.entity';
import { BusinessReferralSchema } from './entities/business-referral.entity';

describe('Business referral foundation', () => {
  it('normalizes and validates a multipart referral payload', async () => {
    const dto = plainToInstance(CreateBusinessReferralDto, {
      businessName: '  Acme Plumbing  ',
      serviceCategoryId: '6871aa22bb33cc44dd55ee66',
      state: ' Texas ',
      city: ' Austin ',
      businessEmail: ' OWNER@ACME.EXAMPLE ',
      businessPhone: '',
      rating: '5',
      review: '  Excellent service and communication.  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      businessName: 'Acme Plumbing',
      state: 'Texas',
      city: 'Austin',
      businessEmail: 'owner@acme.example',
      businessPhone: undefined,
      rating: 5,
      review: 'Excellent service and communication.',
    });
  });

  it('rejects referral ratings outside one through five', async () => {
    const dto = plainToInstance(CreateBusinessReferralDto, {
      businessName: 'Acme Plumbing',
      serviceCategoryId: '6871aa22bb33cc44dd55ee66',
      state: 'Texas',
      city: 'Austin',
      businessEmail: 'owner@acme.example',
      rating: '6',
      review: 'Excellent service and communication.',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'rating')).toBe(true);
  });

  it('allowlists public referral sorting and caps page size', async () => {
    const invalidSort = plainToInstance(SearchBusinessReferralsDto, {
      sortBy: 'businessEmail',
    });
    const oversizedPage = plainToInstance(SearchBusinessReferralsDto, {
      limit: '101',
    });

    const [sortErrors, pageErrors] = await Promise.all([
      validate(invalidSort),
      validate(oversizedPage),
    ]);

    expect(sortErrors.some((error) => error.property === 'sortBy')).toBe(true);
    expect(pageErrors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('normalizes a corrected business email', async () => {
    const dto = plainToInstance(UpdateReferralEmailDto, {
      businessEmail: ' CORRECTED@ACME.EXAMPLE ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.businessEmail).toBe('corrected@acme.example');
  });

  it('defines uniqueness and discovery indexes', () => {
    const referralIndexes = BusinessReferralSchema.indexes();
    const claimIndexes = BusinessClaimSchema.indexes();

    expect(referralIndexes).toEqual(
      expect.arrayContaining([
        [{ businessEmail: 1 }, expect.objectContaining({ unique: true })],
        [
          {
            normalizedBusinessName: 1,
            normalizedState: 1,
            normalizedCity: 1,
          },
          expect.objectContaining({ unique: true }),
        ],
      ]),
    );
    expect(claimIndexes).toEqual(
      expect.arrayContaining([
        [{ referralId: 1 }, expect.objectContaining({ unique: true })],
      ]),
    );
  });
});
