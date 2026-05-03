jest.mock('../../src/modules/community/model/Post', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/modules/community/services/aiTaggingService', () => ({
  generateSmartTags: jest.fn(),
}));

const Post = require('../../src/modules/community/model/Post');
const User = require('../../src/models/User');
const { generateSmartTags } = require('../../src/modules/community/services/aiTaggingService');
const communityService = require('../../src/modules/community/services/communityService');

describe('communityService unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('voteToggle adds upvote and clears downvote for same user', async () => {
    const fakeDoc = {
      likes: [],
      downvotes: ['u1'],
      save: jest.fn().mockResolvedValue(undefined),
    };
    Post.findById.mockResolvedValue(fakeDoc);

    const result = await communityService.voteToggle('post1', 'u1', 'up');

    expect(result.upvoteCount).toBe(1);
    expect(result.downvoteCount).toBe(0);
    expect(result.voted).toBe('up');
    expect(fakeDoc.save).toHaveBeenCalled();
  });

  test('votePoll returns invalidOption when option index is outside range', async () => {
    const fakeDoc = {
      poll: {
        question: 'Q',
        options: [{ text: 'A', voters: [] }, { text: 'B', voters: [] }],
      },
      save: jest.fn(),
    };
    Post.findById.mockResolvedValue(fakeDoc);

    const result = await communityService.votePoll('post1', 'u1', 99);

    expect(result).toEqual({ invalidOption: true });
    expect(fakeDoc.save).not.toHaveBeenCalled();
  });

  test('createPost normalizes poll and returns ai metadata contract', async () => {
    generateSmartTags.mockResolvedValue({ category: 'Nutrition', aiTags: ['Diet', 'Public Health'] });
    User.findOne
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ _id: 'admin-1' }),
      });

    const created = { _id: 'p1' };
    Post.create = jest.fn().mockResolvedValue(created);
    Post.findById = jest.fn().mockReturnValue({
      populate: () => ({
        lean: async () => ({
          _id: 'p1',
          title: 'T',
          content: 'C',
          image: null,
          poll: { question: 'Q', options: [{ text: 'A', voters: [] }, { text: 'B', voters: [] }] },
        }),
      }),
    });

    const result = await communityService.createPost('u1', {
      title: 'T',
      content: 'C',
      tags: ['x'],
      poll: { question: 'Q', options: ['A', 'B', 'C'] },
    });

    expect(Post.create).toHaveBeenCalled();
    expect(result).toHaveProperty('post');
    expect(result).toHaveProperty('ai');
    expect(result.post.poll.totalVotes).toBe(0);
    expect(result.ai.category).toBe('Nutrition');
  });
});
