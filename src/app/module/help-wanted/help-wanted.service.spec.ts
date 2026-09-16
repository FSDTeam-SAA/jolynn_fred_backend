jest.mock('./entities/help-wanted.entity', () => ({
  HelpWanted: class HelpWanted {},
}));
jest.mock('./entities/help-wanted-counter.entity', () => ({
  HelpWantedCounter: class HelpWantedCounter {},
}));
jest.mock('../service-category/entities/service-category.entity', () => ({
  ServiceCategory: class ServiceCategory {},
}));
jest.mock('../user/entities/user.entity', () => ({
  User: class User {},
}));
jest.mock('../service-category/service-category.service', () => ({
  ServiceCategoryService: class ServiceCategoryService {},
}));
jest.mock('src/app/helpers/fileUploder', () => ({
  fileUpload: { deleteFromCloudinary: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('src/app/helpers/sendMailer', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import sendMailer from 'src/app/helpers/sendMailer';
import { HelpWantedService } from './help-wanted.service';

describe('HelpWantedService moderation deletion', () => {
  it('notifies the post owner when an admin removes the post', async () => {
    const postId = new Types.ObjectId();
    const post = {
      _id: postId,
      userId: new Types.ObjectId(),
      email: 'poster@example.com',
      username: 'Poster',
      jobId: 'JOB-101',
      category: 'Plumbing',
      images: [],
    };
    const helpWantedModel = {
      findById: jest.fn().mockResolvedValue(post),
      findByIdAndDelete: jest.fn().mockResolvedValue(post),
    };
    const service = new HelpWantedService(
      helpWantedModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.deleteHelpWanted(
        postId.toString(),
        new Types.ObjectId().toString(),
        'admin',
      ),
    ).resolves.toBe(post);

    expect(sendMailer).toHaveBeenCalledWith(
      post.email,
      'Your job post was removed',
      expect.stringContaining('violated our community standards'),
    );
  });
});
