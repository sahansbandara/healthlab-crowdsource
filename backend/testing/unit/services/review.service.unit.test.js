jest.mock("../../../src/models/Review", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock("../../../src/models/Experiment", () => ({
  findById: jest.fn(),
}));

const mongoose = require("mongoose");
const Review = require("../../../src/models/Review");
const Experiment = require("../../../src/models/Experiment");
const reviewService = require("../../../src/services/reviewService");

describe("reviewService unit", () => {
  const objectId = (seed = "507f1f77bcf86cd799439011") => new mongoose.Types.ObjectId(seed);
  const mockReviewListQuery = (items) => ({
    sort: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(items),
            }),
          }),
        }),
      }),
    }),
  });
  const mockReviewByIdQuery = (item) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(item),
      }),
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listReviews", () => {
    test("returns only published reviews for anonymous viewers", async () => {
      const items = [{ _id: "r1" }];
      Review.find.mockReturnValue(mockReviewListQuery(items));
      Review.countDocuments.mockResolvedValue(1);

      const result = await reviewService.listReviews({}, null, null);

      expect(Review.find).toHaveBeenCalledWith({ status: "published" });
      expect(result.items).toEqual(items);
    });

    test("lets admins filter by explicit status", async () => {
      Review.find.mockReturnValue(mockReviewListQuery([]));
      Review.countDocuments.mockResolvedValue(0);

      await reviewService.listReviews({ status: "draft" }, objectId(), "admin");

      expect(Review.find).toHaveBeenCalledWith({ status: "draft" });
    });

    test("shows published reviews plus own drafts for researchers", async () => {
      const viewerId = objectId();
      Review.find.mockReturnValue(mockReviewListQuery([]));
      Review.countDocuments.mockResolvedValue(0);

      await reviewService.listReviews({}, viewerId, "researcher");

      expect(Review.find).toHaveBeenCalledWith({
        $or: [{ status: "published" }, { author: viewerId }],
      });
    });

    test("limits researchers to their own drafts when status=draft", async () => {
      const viewerId = objectId();
      Review.find.mockReturnValue(mockReviewListQuery([]));
      Review.countDocuments.mockResolvedValue(0);

      await reviewService.listReviews({ status: "draft" }, viewerId, "researcher");

      expect(Review.find).toHaveBeenCalledWith({ status: "draft", author: viewerId });
    });

    test("rejects invalid experiment ids in list filters", async () => {
      await expect(
        reviewService.listReviews({ experimentId: "bad-id" }, objectId(), "admin")
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid experimentId" });
    });

    test("combines search text with visibility rules", async () => {
      const viewerId = objectId();
      Review.find.mockReturnValue(mockReviewListQuery([]));
      Review.countDocuments.mockResolvedValue(0);

      await reviewService.listReviews({ q: "sleep" }, viewerId, "researcher");

      expect(Review.find.mock.calls[0][0].$and).toBeDefined();
    });

    test("normalizes pagination bounds", async () => {
      Review.find.mockReturnValue(mockReviewListQuery([]));
      Review.countDocuments.mockResolvedValue(250);

      const result = await reviewService.listReviews({ page: 0, limit: 999 }, null, null);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(result.totalPages).toBe(3);
    });
  });

  describe("listByExperiment", () => {
    test("rejects invalid experiment ids", async () => {
      await expect(reviewService.listByExperiment("bad-id", {}, null, null)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("returns not found when the experiment does not exist", async () => {
      Experiment.findById.mockResolvedValue(null);

      await expect(
        reviewService.listByExperiment("507f1f77bcf86cd799439011", {}, null, null)
      ).rejects.toMatchObject({ statusCode: 404, message: "Experiment not found" });
    });
  });

  describe("getReviewById", () => {
    test("rejects invalid review ids", async () => {
      await expect(reviewService.getReviewById("bad-id", null, null)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("returns not found for missing reviews", async () => {
      Review.findById.mockReturnValue(mockReviewByIdQuery(null));

      await expect(
        reviewService.getReviewById("507f1f77bcf86cd799439011", null, null)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    test("blocks anonymous access to drafts", async () => {
      Review.findById.mockReturnValue(
        mockReviewByIdQuery({
          _id: "r1",
          status: "draft",
          author: { _id: objectId() },
        })
      );

      await expect(
        reviewService.getReviewById("507f1f77bcf86cd799439011", null, null)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    test("allows the author to view their own draft", async () => {
      const authorId = objectId();
      const review = { _id: "r1", status: "draft", author: { _id: authorId } };
      Review.findById.mockReturnValue(mockReviewByIdQuery(review));

      const result = await reviewService.getReviewById(
        "507f1f77bcf86cd799439011",
        authorId,
        "researcher"
      );

      expect(result).toBe(review);
    });
  });

  describe("createReview", () => {
    test("creates a draft review without an experiment link", async () => {
      Review.create.mockResolvedValue({ _id: "r1" });
      Review.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: "r1", status: "draft" }),
        }),
      });

      const result = await reviewService.createReview(
        { title: "Review", summary: "Summary", content: "Content" },
        objectId()
      );

      expect(Review.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "draft", keywords: [] })
      );
      expect(result._id).toBe("r1");
    });

    test("rejects invalid experiment ids during review creation", async () => {
      await expect(
        reviewService.createReview(
          { title: "Review", summary: "Summary", content: "Content", experiment: "bad-id" },
          objectId()
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects missing experiments during review creation", async () => {
      Experiment.findById.mockResolvedValue(null);

      await expect(
        reviewService.createReview(
          {
            title: "Review",
            summary: "Summary",
            content: "Content",
            experiment: "507f1f77bcf86cd799439011",
          },
          objectId()
        )
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    test("uses summary as abstract for backward compatibility", async () => {
      Experiment.findById.mockResolvedValue({ _id: objectId() });
      Review.create.mockResolvedValue({ _id: "r1" });
      Review.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: "r1" }),
        }),
      });

      await reviewService.createReview(
        {
          title: "Review",
          summary: "Summary",
          content: "Content",
          experiment: "507f1f77bcf86cd799439011",
          keywords: ["health"],
          status: "published",
        },
        objectId()
      );

      expect(Review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: "Summary",
          abstract: "Summary",
          status: "published",
          keywords: ["health"],
        })
      );
    });
  });

  describe("updateReview", () => {
    test("rejects invalid review ids on update", async () => {
      await expect(reviewService.updateReview("bad-id", {}, objectId(), "researcher")).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("returns not found when updating a missing review", async () => {
      Review.findById.mockResolvedValue(null);

      await expect(
        reviewService.updateReview("507f1f77bcf86cd799439011", {}, objectId(), "researcher")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    test("rejects unauthorized update attempts", async () => {
      Review.findById.mockResolvedValue({
        author: { equals: () => false },
      });

      await expect(
        reviewService.updateReview(
          "507f1f77bcf86cd799439011",
          { title: "Updated" },
          objectId(),
          "researcher"
        )
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    test("supports partial updates for authors", async () => {
      const review = {
        _id: "r1",
        author: { equals: () => true },
        save: jest.fn().mockResolvedValue(undefined),
      };
      Review.findById
        .mockResolvedValueOnce(review)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ _id: "r1", title: "Updated" }),
          }),
        });

      const result = await reviewService.updateReview(
        "507f1f77bcf86cd799439011",
        { title: "Updated" },
        objectId(),
        "researcher"
      );

      expect(review.title).toBe("Updated");
      expect(result.title).toBe("Updated");
    });

    test("allows admins to update any review", async () => {
      const review = {
        _id: "r1",
        author: { equals: () => false },
        save: jest.fn().mockResolvedValue(undefined),
      };
      Review.findById
        .mockResolvedValueOnce(review)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ _id: "r1", status: "published" }),
          }),
        });

      const result = await reviewService.updateReview(
        "507f1f77bcf86cd799439011",
        { status: "published" },
        objectId(),
        "admin"
      );

      expect(review.status).toBe("published");
      expect(result.status).toBe("published");
    });
  });

  describe("deleteReview", () => {
    test("rejects invalid ids on delete", async () => {
      await expect(reviewService.deleteReview("bad-id", objectId(), "researcher")).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("returns not found when deleting a missing review", async () => {
      Review.findById.mockResolvedValue(null);

      await expect(
        reviewService.deleteReview("507f1f77bcf86cd799439011", objectId(), "researcher")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    test("rejects unauthorized delete attempts", async () => {
      Review.findById.mockResolvedValue({
        author: { equals: () => false },
      });

      await expect(
        reviewService.deleteReview("507f1f77bcf86cd799439011", objectId(), "researcher")
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    test("deletes the review for the author", async () => {
      Review.findById.mockResolvedValue({
        author: { equals: () => true },
      });
      Review.findByIdAndDelete.mockResolvedValue({ _id: "r1" });

      const result = await reviewService.deleteReview(
        "507f1f77bcf86cd799439011",
        objectId(),
        "researcher"
      );

      expect(Review.findByIdAndDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(result).toEqual({ deleted: true });
    });
  });
});
