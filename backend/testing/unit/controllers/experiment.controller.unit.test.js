jest.mock("../../../src/models/Experiment", () => {
  const ExperimentMock = jest.fn();
  ExperimentMock.find = jest.fn();
  ExperimentMock.findById = jest.fn();
  ExperimentMock.findByIdAndUpdate = jest.fn();
  ExperimentMock.findByIdAndDelete = jest.fn();
  return ExperimentMock;
});

jest.mock("../../../src/models/Participation", () => ({
  find: jest.fn(),
}));

jest.mock("../../../src/validators/experimentValidators", () => ({
  pickAllowedCreateFields: jest.fn((body) => body),
}));

jest.mock("../../../src/services/gemini.service", () => ({
  generateSummary: jest.fn(),
}));

jest.mock("../../../src/services/protocolService", () => ({
  getGuidelinesForExperiment: jest.fn(),
}));

const Experiment = require("../../../src/models/Experiment");
const Participation = require("../../../src/models/Participation");
const { pickAllowedCreateFields } = require("../../../src/validators/experimentValidators");
const geminiService = require("../../../src/services/gemini.service");
const protocolService = require("../../../src/services/protocolService");
const {
  createExperiment,
  getExperiments,
  getExperimentById,
  updateExperiment,
  deleteExperiment,
  generateExperimentAiSummary,
  getSafetyGuidelines,
} = require("../../../src/controllers/experimentController");

describe("experimentController unit", () => {
  let consoleLogSpy;

  const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const next = jest.fn();

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createExperiment", () => {
    test("creates an experiment successfully for an authenticated researcher", async () => {
      const savedExperiment = { _id: "exp-1", title: "Hydration Study", save: jest.fn().mockResolvedValue(undefined) };
      Experiment.mockImplementation(() => savedExperiment);
      const req = { user: { _id: "researcher-1" }, body: { title: "Hydration Study", participantLimit: 20 } };
      const res = createRes();

      await createExperiment(req, res, next);

      expect(pickAllowedCreateFields).toHaveBeenCalledWith(req.body);
      expect(Experiment).toHaveBeenCalledWith({
        title: "Hydration Study",
        participantLimit: 20,
        ownerId: "researcher-1",
      });
      expect(savedExperiment.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("uses req.user.id when _id is not present", async () => {
      const savedExperiment = { _id: "exp-2", save: jest.fn().mockResolvedValue(undefined) };
      Experiment.mockImplementation(() => savedExperiment);
      const req = { user: { id: "researcher-2" }, body: { title: "Sleep Study" } };
      const res = createRes();

      await createExperiment(req, res, next);

      expect(Experiment).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "researcher-2" }));
    });

    test("uses the x-user-id header as a fallback owner id", async () => {
      const savedExperiment = { _id: "exp-3", save: jest.fn().mockResolvedValue(undefined) };
      Experiment.mockImplementation(() => savedExperiment);
      const req = { headers: { "x-user-id": "researcher-3" }, body: { title: "Cardio Study" } };
      const res = createRes();

      await createExperiment(req, res, next);

      expect(Experiment).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "researcher-3" }));
    });

    test("returns 400 when no user id can be resolved", async () => {
      const req = { headers: {}, body: { title: "Orphan Study" } };
      const res = createRes();

      await createExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "User ID not found in request" });
    });

    test("forwards save failures to next", async () => {
      const error = new Error("save failed");
      const savedExperiment = { save: jest.fn().mockRejectedValue(error) };
      Experiment.mockImplementation(() => savedExperiment);
      const req = { user: { _id: "researcher-1" }, body: { title: "Hydration Study" } };
      const res = createRes();

      await createExperiment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test("passes boundary-like large payload values through the whitelist helper", async () => {
      const longTitle = "A".repeat(200);
      const savedExperiment = { save: jest.fn().mockResolvedValue(undefined) };
      Experiment.mockImplementation(() => savedExperiment);
      const req = { user: { _id: "researcher-1" }, body: { title: longTitle, participantLimit: 0 } };
      const res = createRes();

      await createExperiment(req, res, next);

      expect(Experiment).toHaveBeenCalledWith(expect.objectContaining({ title: longTitle, participantLimit: 0 }));
    });
  });

  describe("getExperiments", () => {
    test("returns experiments with enrolled=false for anonymous users", async () => {
      const experiments = [
        { _id: "exp-1", toObject: () => ({ _id: "exp-1", title: "Study 1" }) },
      ];
      Experiment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(experiments) });
      const req = {};
      const res = createRes();

      await getExperiments(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0][0]).toEqual({
        _id: "exp-1",
        title: "Study 1",
        enrolled: false,
      });
    });

    test("marks joined experiments as enrolled for the current user", async () => {
      const experiments = [
        { _id: { toString: () => "exp-1" }, toObject: () => ({ _id: "exp-1", title: "Study 1" }) },
        { _id: { toString: () => "exp-2" }, toObject: () => ({ _id: "exp-2", title: "Study 2" }) },
      ];
      Experiment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(experiments) });
      Participation.find.mockResolvedValue([{ experimentId: { toString: () => "exp-2" } }]);
      const req = { user: { _id: "user-1" } };
      const res = createRes();

      await getExperiments(req, res, next);

      expect(res.json.mock.calls[0][0][1].enrolled).toBe(true);
      expect(res.json.mock.calls[0][0][0].enrolled).toBe(false);
    });

    test("returns an empty list when no experiments exist", async () => {
      Experiment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
      const req = { user: { _id: "user-1" } };
      const res = createRes();

      await getExperiments(req, res, next);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    test("forwards fetch errors to next", async () => {
      const error = new Error("query failed");
      Experiment.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(error) });
      const req = {};
      const res = createRes();

      await getExperiments(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getExperimentById", () => {
    test("returns the experiment when it exists", async () => {
      const experiment = { _id: "exp-1", title: "Study 1" };
      Experiment.findById.mockResolvedValue(experiment);
      const req = { params: { id: "exp-1" } };
      const res = createRes();

      await getExperimentById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(experiment);
    });

    test("returns 404 when the experiment does not exist", async () => {
      Experiment.findById.mockResolvedValue(null);
      const req = { params: { id: "missing" } };
      const res = createRes();

      await getExperimentById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Experiment not found" });
    });

    test("forwards invalid id lookup errors to next", async () => {
      const error = new Error("bad id");
      Experiment.findById.mockRejectedValue(error);
      const req = { params: { id: "bad-id" } };
      const res = createRes();

      await getExperimentById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateExperiment", () => {
    test("updates an experiment successfully", async () => {
      const updated = { _id: "exp-1", title: "Updated Study" };
      Experiment.findByIdAndUpdate.mockResolvedValue(updated);
      const req = { params: { id: "exp-1" }, body: { title: "Updated Study" } };
      const res = createRes();

      await updateExperiment(req, res, next);

      expect(Experiment.findByIdAndUpdate).toHaveBeenCalledWith(
        "exp-1",
        { title: "Updated Study" },
        { returnDocument: "after", runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("supports partial updates", async () => {
      const updated = { _id: "exp-1", description: "Only description changed" };
      Experiment.findByIdAndUpdate.mockResolvedValue(updated);
      const req = { params: { id: "exp-1" }, body: { description: "Only description changed" } };
      const res = createRes();

      await updateExperiment(req, res, next);

      expect(Experiment.findByIdAndUpdate).toHaveBeenCalledWith(
        "exp-1",
        { description: "Only description changed" },
        { returnDocument: "after", runValidators: true }
      );
    });

    test("returns 404 when updating a non-existing experiment", async () => {
      Experiment.findByIdAndUpdate.mockResolvedValue(null);
      const req = { params: { id: "missing" }, body: { title: "Updated" } };
      const res = createRes();

      await updateExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Experiment not found" });
    });

    test("forwards validator failures to next", async () => {
      const error = new Error("validation failed");
      Experiment.findByIdAndUpdate.mockRejectedValue(error);
      const req = { params: { id: "exp-1" }, body: { participantLimit: "invalid" } };
      const res = createRes();

      await updateExperiment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteExperiment", () => {
    test("deletes an experiment successfully", async () => {
      Experiment.findByIdAndDelete.mockResolvedValue({ _id: "exp-1" });
      const req = { params: { id: "exp-1" } };
      const res = createRes();

      await deleteExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Experiment deleted" });
    });

    test("returns 404 when deleting a non-existing experiment", async () => {
      Experiment.findByIdAndDelete.mockResolvedValue(null);
      const req = { params: { id: "missing" } };
      const res = createRes();

      await deleteExperiment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Experiment not found" });
    });

    test("forwards delete failures to next", async () => {
      const error = new Error("delete failed");
      Experiment.findByIdAndDelete.mockRejectedValue(error);
      const req = { params: { id: "bad-id" } };
      const res = createRes();

      await deleteExperiment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("generateExperimentAiSummary", () => {
    test("returns 404 when the experiment does not exist", async () => {
      Experiment.findById.mockResolvedValue(null);
      const req = { params: { id: "missing" } };
      const res = createRes();

      await generateExperimentAiSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("generates and stores an AI summary with markdown headings stripped", async () => {
      const experiment = {
        _id: { toString: () => "exp-1" },
        title: "Hydration Study",
        description: "Tracks hydration",
        status: "draft",
        participantLimit: 10,
        currentParticipantCount: 1,
        eligibilityCriteria: {},
        logFieldDefinitions: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      Experiment.findById.mockResolvedValue(experiment);
      Participation.find.mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });
      geminiService.generateSummary.mockResolvedValue("# Overview\n## Patterns\nStrong results");
      const req = { params: { id: "exp-1" } };
      const res = createRes();

      await generateExperimentAiSummary(req, res, next);

      expect(experiment.aiSummary).toBe("Overview\nPatterns\nStrong results");
      expect(experiment.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("normalizes participant log maps before building the summary prompt", async () => {
      const experiment = {
        _id: { toString: () => "exp-1" },
        title: "Hydration Study",
        description: "Tracks hydration",
        status: "draft",
        participantLimit: 10,
        currentParticipantCount: 1,
        eligibilityCriteria: {},
        logFieldDefinitions: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      const mapData = new Map([["water", 3]]);
      Experiment.findById.mockResolvedValue(experiment);
      Participation.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: { toString: () => "part-1" },
              userAge: 28,
              status: "joined",
              dateJoined: "2026-04-10",
              logs: [{ date: "2026-04-11", submittedAt: "now", data: mapData }],
            },
          ]),
        }),
      });
      geminiService.generateSummary.mockResolvedValue("Plain summary");
      const req = { params: { id: "exp-1" } };
      const res = createRes();

      await generateExperimentAiSummary(req, res, next);

      expect(geminiService.generateSummary.mock.calls[0][0]).toContain('"water": 3');
    });
  });

  describe("getSafetyGuidelines", () => {
    test("returns 404 when the experiment is missing", async () => {
      Experiment.findById.mockResolvedValue(null);
      const req = { params: { id: "missing" } };
      const res = createRes();

      await getSafetyGuidelines(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("returns safety guidance for a valid experiment", async () => {
      const experiment = { _id: "exp-1", title: "Study 1" };
      Experiment.findById.mockResolvedValue(experiment);
      protocolService.getGuidelinesForExperiment.mockResolvedValue({ source: "Test", guidelines: [] });
      const req = { params: { id: "exp-1" } };
      const res = createRes();

      await getSafetyGuidelines(req, res, next);

      expect(protocolService.getGuidelinesForExperiment).toHaveBeenCalledWith(experiment);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("forwards guideline generation errors to next", async () => {
      const experiment = { _id: "exp-1", title: "Study 1" };
      const error = new Error("guideline failed");
      Experiment.findById.mockResolvedValue(experiment);
      protocolService.getGuidelinesForExperiment.mockRejectedValue(error);
      const req = { params: { id: "exp-1" } };
      const res = createRes();

      await getSafetyGuidelines(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
