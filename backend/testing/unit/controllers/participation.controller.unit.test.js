jest.mock("../../../src/models/Participation", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock("../../../src/models/Experiment", () => ({
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../../src/services/eligibilityService", () => ({
  runEligibilityCheck: jest.fn(),
  analyzeProtocolBenefits: jest.fn(),
}));

const Participation = require("../../../src/models/Participation");
const Experiment = require("../../../src/models/Experiment");
const eligibilityService = require("../../../src/services/eligibilityService");
const {
  DuplicateParticipationError,
  ConflictingStudyError,
} = require("../../../src/errors/CustomErrors");
const {
  joinExperiment,
  getMyStudies,
  leaveExperiment,
  getParticipantsList,
  getParticipationDetail,
  submitDailyLog,
  deleteDailyLog,
  getPreJoinAnalysis,
} = require("../../../src/controllers/participationController");

describe("participationController unit", () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("joinExperiment", () => {
    test("returns 401 when the user is not authenticated", async () => {
      const req = { body: { experimentId: "exp-1" }, user: null };
      const res = createRes();

      await joinExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "You must be logged in to join an experiment.",
      });
    });

    test("returns 400 when experimentId is missing", async () => {
      const req = { body: {}, user: { _id: "user-1" } };
      const res = createRes();

      await joinExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Missing required field: experimentId",
      });
    });

    test("returns 409 when the cohort is full", async () => {
      const req = { body: { experimentId: "exp-1" }, user: { _id: "user-1" } };
      const res = createRes();
      Experiment.findOneAndUpdate.mockResolvedValue(null);

      await joinExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "CohortFull",
        message: "This study has reached its participant limit.",
      });
    });

    test("prevents duplicate enrollment and rolls back the reserved seat", async () => {
      const req = {
        body: { experimentId: "exp-1" },
        user: { _id: "user-1", age: 25, email: "u@example.com" },
      };
      const res = createRes();
      Experiment.findOneAndUpdate.mockResolvedValue({ _id: "exp-1" });
      Participation.findOne.mockResolvedValue({ _id: "part-1" });

      await joinExperiment(req, res, next);

      expect(Experiment.findByIdAndUpdate).toHaveBeenCalledWith("exp-1", {
        $inc: { currentParticipantCount: -1 },
      });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].error).toBe("DuplicateParticipationError");
    });

    test("rolls back the seat when eligibility checks fail", async () => {
      const req = {
        body: { experimentId: "exp-1" },
        user: { _id: "user-1", age: 25, email: "u@example.com" },
      };
      const res = createRes();
      const eligibilityError = new ConflictingStudyError([{ title: "Keto Study" }]);
      Experiment.findOneAndUpdate.mockResolvedValue({ _id: "exp-1" });
      Participation.findOne.mockResolvedValue(null);
      eligibilityService.runEligibilityCheck.mockRejectedValue(eligibilityError);

      await joinExperiment(req, res, next);

      expect(Experiment.findByIdAndUpdate).toHaveBeenCalledWith("exp-1", {
        $inc: { currentParticipantCount: -1 },
      });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].conflictingStudies).toEqual([{ title: "Keto Study" }]);
    });

    test("rolls back the seat when participation creation fails", async () => {
      const req = {
        body: { experimentId: "exp-1" },
        user: { _id: "user-1", age: 25, email: "u@example.com" },
      };
      const res = createRes();
      Experiment.findOneAndUpdate.mockResolvedValue({ _id: "exp-1" });
      Participation.findOne.mockResolvedValue(null);
      eligibilityService.runEligibilityCheck.mockResolvedValue({ eligible: true });
      Participation.create.mockRejectedValue(new Error("write failed"));

      await joinExperiment(req, res, next);

      expect(Experiment.findByIdAndUpdate).toHaveBeenCalledWith("exp-1", {
        $inc: { currentParticipantCount: -1 },
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].message).toBe("write failed");
    });

    test("creates a participation successfully when all checks pass", async () => {
      const created = { _id: "part-1", status: "joined" };
      const req = {
        body: { experimentId: "exp-1" },
        user: { _id: "user-1", age: 25, email: "u@example.com" },
      };
      const res = createRes();
      Experiment.findOneAndUpdate.mockResolvedValue({ _id: "exp-1" });
      Participation.findOne.mockResolvedValue(null);
      eligibilityService.runEligibilityCheck.mockResolvedValue({ eligible: true });
      Participation.create.mockResolvedValue(created);

      await joinExperiment(req, res, next);

      expect(Participation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          userAge: 25,
          userEmail: "u@example.com",
          experimentId: "exp-1",
          status: "joined",
          isAnonymized: false,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Successfully joined the experiment!",
        participation: created,
      });
    });

    test("uses a fallback age of zero when the user profile has no age", async () => {
      const req = {
        body: { experimentId: "exp-1" },
        user: { _id: "user-1", email: "u@example.com" },
      };
      const res = createRes();
      Experiment.findOneAndUpdate.mockResolvedValue({ _id: "exp-1" });
      Participation.findOne.mockResolvedValue(null);
      eligibilityService.runEligibilityCheck.mockResolvedValue({ eligible: true });
      Participation.create.mockResolvedValue({ _id: "part-1" });

      await joinExperiment(req, res, next);

      expect(Participation.create).toHaveBeenCalledWith(
        expect.objectContaining({ userAge: 0 })
      );
    });

    test("surfaces custom status codes from business errors", async () => {
      const req = {
        body: { experimentId: "exp-1" },
        user: { _id: "user-1", age: 25, email: "u@example.com" },
      };
      const res = createRes();
      Experiment.findOneAndUpdate.mockResolvedValue({ _id: "exp-1" });
      Participation.findOne.mockResolvedValue(null);
      const customError = new DuplicateParticipationError();
      eligibilityService.runEligibilityCheck.mockRejectedValue(customError);

      await joinExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("getPreJoinAnalysis", () => {
    test("returns 401 when analysis is requested without authentication", async () => {
      const req = { params: { experimentId: "exp-1" }, user: null };
      const res = createRes();

      await getPreJoinAnalysis(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    });

    test("returns the preview analysis report for an authenticated user", async () => {
      const req = { params: { experimentId: "exp-1" }, user: { _id: "user-1" } };
      const res = createRes();
      eligibilityService.analyzeProtocolBenefits.mockResolvedValue({ eligible: true, analysis: "Good fit" });

      await getPreJoinAnalysis(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ eligible: true, analysis: "Good fit" });
    });

    test("passes analysis errors to next", async () => {
      const req = { params: { experimentId: "exp-1" }, user: { _id: "user-1" } };
      const res = createRes();
      const error = new Error("analysis failed");
      eligibilityService.analyzeProtocolBenefits.mockRejectedValue(error);

      await getPreJoinAnalysis(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getMyStudies", () => {
    test("returns 401 when the request has no user id", async () => {
      const req = { user: {} };
      const res = createRes();

      await getMyStudies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("returns enriched studies for the current user", async () => {
      const req = { user: { _id: "user-1" } };
      const res = createRes();
      const studies = [
        { experimentId: "exp-1", toJSON: () => ({ experimentId: "exp-1", status: "joined" }) },
        { experimentId: "exp-2", toJSON: () => ({ experimentId: "exp-2", status: "completed" }) },
      ];

      Participation.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(studies),
      });
      Experiment.findById
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: "exp-1", title: "Study 1" }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: "exp-2", title: "Study 2" }) });

      await getMyStudies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].totalStudies).toBe(2);
      expect(res.json.mock.calls[0][0].studies[0].experimentId.title).toBe("Study 1");
    });

    test("returns an empty study list when the user has no enrollments", async () => {
      const req = { user: { _id: "user-1" } };
      const res = createRes();
      Participation.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      await getMyStudies(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        totalStudies: 0,
        studies: [],
      });
    });

    test("passes retrieval errors to next", async () => {
      const req = { user: { _id: "user-1" } };
      const res = createRes();
      const error = new Error("query failed");
      Participation.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(error),
      });

      await getMyStudies(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("leaveExperiment", () => {
    test("returns 404 when the participation record is missing", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      Participation.findOne.mockResolvedValue(null);

      await leaveExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("decrements the experiment count and deletes the participation on success", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      Participation.findOne.mockResolvedValue({ experimentId: "exp-1" });

      await leaveExperiment(req, res, next);

      expect(Experiment.findByIdAndUpdate).toHaveBeenCalledWith("exp-1", {
        $inc: { currentParticipantCount: -1 },
      });
      expect(Participation.findByIdAndDelete).toHaveBeenCalledWith("part-1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("passes leave errors to next", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      const error = new Error("leave failed");
      Participation.findOne.mockRejectedValue(error);

      await leaveExperiment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getParticipationDetail", () => {
    test("returns 404 when the user does not own the participation", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      Participation.findOne.mockResolvedValue(null);

      await getParticipationDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("returns the participation enriched with experiment details", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      const participation = {
        experimentId: "exp-1",
        toJSON: () => ({ _id: "part-1", experimentId: "exp-1" }),
      };
      Participation.findOne.mockResolvedValue(participation);
      Experiment.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: "exp-1", title: "Study 1" }),
      });

      await getParticipationDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].experimentId.title).toBe("Study 1");
    });

    test("passes detail lookup errors to next", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      const error = new Error("detail failed");
      Participation.findOne.mockRejectedValue(error);

      await getParticipationDetail(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("submitDailyLog", () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2026-04-12T08:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("returns 404 when the participation cannot be found", async () => {
      const req = {
        params: { id: "part-1" },
        body: { logData: { steps: 5000 } },
        user: { _id: "user-1" },
      };
      const res = createRes();
      Participation.findOne.mockResolvedValue(null);

      await submitDailyLog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("creates a new daily log when none exists for today", async () => {
      const participation = {
        logs: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      const req = {
        params: { id: "part-1" },
        body: { logData: { steps: 5000, mood: "good" } },
        user: { _id: "user-1" },
      };
      const res = createRes();
      Participation.findOne.mockResolvedValue(participation);

      await submitDailyLog(req, res, next);

      expect(participation.logs).toHaveLength(1);
      expect(participation.logs[0].date).toBe("2026-04-12");
      expect(participation.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("updates the existing log for today instead of adding a duplicate", async () => {
      const participation = {
        logs: [{ date: "2026-04-12", data: { steps: 1000 }, submittedAt: new Date("2026-04-12T01:00:00.000Z") }],
        save: jest.fn().mockResolvedValue(undefined),
      };
      const req = {
        params: { id: "part-1" },
        body: { logData: { steps: 9000 } },
        user: { _id: "user-1" },
      };
      const res = createRes();
      Participation.findOne.mockResolvedValue(participation);

      await submitDailyLog(req, res, next);

      expect(participation.logs).toHaveLength(1);
      expect(participation.logs[0].data).toEqual({ steps: 9000 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("passes log submission errors to next", async () => {
      const req = {
        params: { id: "part-1" },
        body: { logData: { steps: 5000 } },
        user: { _id: "user-1" },
      };
      const res = createRes();
      const error = new Error("save failed");
      Participation.findOne.mockRejectedValue(error);

      await submitDailyLog(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteDailyLog", () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2026-04-12T08:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("returns 404 when the participation cannot be found", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      Participation.findOne.mockResolvedValue(null);

      await deleteDailyLog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("returns 404 when there is no log for today", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      const participation = {
        logs: [{ date: "2026-04-11", data: { steps: 1000 } }],
        save: jest.fn(),
      };
      Participation.findOne.mockResolvedValue(participation);

      await deleteDailyLog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(participation.save).not.toHaveBeenCalled();
    });

    test("deletes today's log and returns the remaining entries", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      const participation = {
        logs: [
          { date: "2026-04-12", data: { steps: 1000 } },
          { date: "2026-04-11", data: { steps: 2000 } },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };
      Participation.findOne.mockResolvedValue(participation);

      await deleteDailyLog(req, res, next);

      expect(participation.logs).toEqual([{ date: "2026-04-11", data: { steps: 2000 } }]);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("passes delete errors to next", async () => {
      const req = { params: { id: "part-1" }, user: { _id: "user-1" } };
      const res = createRes();
      const error = new Error("delete failed");
      Participation.findOne.mockRejectedValue(error);

      await deleteDailyLog(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getParticipantsList", () => {
    test("returns joined participants by default with aggregate stats", async () => {
      const req = { params: { experimentId: "exp-1" }, query: {} };
      const res = createRes();
      const participants = [
        {
          _id: "part-1",
          experimentId: { title: "Study 1" },
          status: "joined",
          dateJoined: "2026-04-10",
          dateLeft: null,
          isAnonymized: false,
          userAge: 28,
        },
      ];

      Participation.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(participants),
          }),
        }),
      });
      Participation.countDocuments
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await getParticipantsList(req, res, next);

      expect(Participation.find).toHaveBeenCalledWith({ experimentId: "exp-1", status: "joined" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].stats.totalJoined).toBe(1);
      expect(res.json.mock.calls[0][0].participants[0].experimentTitle).toBe("Study 1");
    });

    test("includes withdrawn participants when includeWithdrawn=true", async () => {
      const req = { params: { experimentId: "exp-1" }, query: { includeWithdrawn: "true" } };
      const res = createRes();

      Participation.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      Participation.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await getParticipantsList(req, res, next);

      expect(Participation.find).toHaveBeenCalledWith({ experimentId: "exp-1" });
    });

    test("returns an empty participant list cleanly", async () => {
      const req = { params: { experimentId: "exp-1" }, query: {} };
      const res = createRes();

      Participation.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      Participation.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await getParticipantsList(req, res, next);

      expect(res.json.mock.calls[0][0].participants).toEqual([]);
    });

    test("passes list errors to next", async () => {
      const req = { params: { experimentId: "exp-1" }, query: {} };
      const res = createRes();
      const error = new Error("list failed");
      Participation.find.mockImplementation(() => {
        throw error;
      });

      await getParticipantsList(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
