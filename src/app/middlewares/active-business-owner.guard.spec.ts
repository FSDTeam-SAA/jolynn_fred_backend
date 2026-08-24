jest.mock('../module/user/entities/user.entity', () => ({
  User: class User {},
}));

import { ExecutionContext } from '@nestjs/common';
import { ActiveBusinessOwnerGuard } from './active-business-owner.guard';

describe('ActiveBusinessOwnerGuard', () => {
  it('explains that the requested Other category is pending review', async () => {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          role: 'businessOwner',
          status: 'pending',
          requestedCategory: 'Religion',
        }),
      }),
    };
    const guard = new ActiveBusinessOwnerGuard(userModel as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'business-owner-id', role: 'businessOwner' },
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Your requested Other category "Religion" is currently subject to admin review',
    );
  });
});
