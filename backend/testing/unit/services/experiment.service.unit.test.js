jest.mock("../../../src/models/Experiment", () => ({
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../../src/models/ExperimentWallet", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

const Experiment = require("../../../src/models/Experiment");
const ExperimentWallet = require("../../../src/models/ExperimentWallet");
const {
  createExperiment,
  getExperimentWallet,
} = require("../../../src/services/experimentService");

describe("experimentService unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createExperiment", () => {
    test("creates an experiment with only allowed fields and initializes its wallet", async () => {
      const userId = "researcher-1";
      const input = {
        title: "Sleep Tracking Study",
        description: "Measures sleep duration trends.",
        participantLimit: 25,
        status: "draft",
        currency: "USD",
        ownerId: "spoofed-owner",
        unexpectedField: "ignore-me",
      };

      const createdExperiment = {
        _id: "exp-1",
        ownerId: userId,
        title: input.title,
        description: input.description,
        participantLimit: input.participantLimit,
        status: input.status,
        currency: "LKR",
      };

      Experiment.create.mockResolvedValue(createdExperiment);
      ExperimentWallet.create.mockResolvedValue({ _id: "wallet-1" });

      const result = await createExperiment(userId, input);

      expect(Experiment.create).toHaveBeenCalledWith({
        ownerId: userId,
        title: "Sleep Tracking Study",
        description: "Measures sleep duration trends.",
        participantLimit: 25,
        status: "draft",
      });
      expect(ExperimentWallet.create).toHaveBeenCalledWith({
        experimentId: "exp-1",
        currency: "LKR",
        balance: 0,
      });
      expect(result).toBe(createdExperiment);
    });

    test("handles null data by creating the experiment with an empty sanitized payload", async () => {
      const createdExperiment = { _id: "exp-2", ownerId: "researcher-2" };
      Experiment.create.mockResolvedValue(createdExperiment);
      ExperimentWallet.create.mockResolvedValue({ _id: "wallet-2" });

      const result = await createExperiment("researcher-2", null);

      expect(Experiment.create).toHaveBeenCalledWith({
        ownerId: "researcher-2",
      });
      expect(ExperimentWallet.create).toHaveBeenCalledWith({
        experimentId: "exp-2",
        currency: undefined,
        balance: 0,
      });
      expect(result).toBe(createdExperiment);
    });

    test("bubbles up model errors and does not create a wallet when experiment creation fails", async () => {
      const createError = new Error("Validation failed");
      Experiment.create.mockRejectedValue(createError);

      await expect(createExperiment("researcher-3", { title: "" })).rejects.toThrow(
        "Validation failed"
      );
      expect(ExperimentWallet.create).not.toHaveBeenCalled();
    });
  });

  describe("getExperimentWallet", () => {
    test("returns the wallet when the requesting user owns the experiment", async () => {
      const wallet = { experimentId: "exp-10", balance: 150 };
      Experiment.findById.mockResolvedValue({
        _id: "exp-10",
        ownerId: { toString: () => "researcher-10" },
      });
      ExperimentWallet.findOne.mockResolvedValue(wallet);

      const result = await getExperimentWallet("exp-10", "researcher-10", "researcher");

      expect(ExperimentWallet.findOne).toHaveBeenCalledWith({ experimentId: "exp-10" });
      expect(result).toBe(wallet);
    });

    test("allows admins to fetch any experiment wallet", async () => {
      const wallet = { experimentId: "exp-11", balance: 0 };
      Experiment.findById.mockResolvedValue({
        _id: "exp-11",
        ownerId: { toString: () => "someone-else" },
      });
      ExperimentWallet.findOne.mockResolvedValue(wallet);

      const result = await getExperimentWallet("exp-11", "admin-1", "ADMIN");

      expect(result).toBe(wallet);
    });

    test("throws a clear error when the experiment does not exist", async () => {
      Experiment.findById.mockResolvedValue(null);

      await expect(getExperimentWallet("missing-exp", "user-1", "researcher")).rejects.toThrow(
        "Experiment not found"
      );
      expect(ExperimentWallet.findOne).not.toHaveBeenCalled();
    });

    test("throws when a non-admin user tries to read another researcher's wallet", async () => {
      Experiment.findById.mockResolvedValue({
        _id: "exp-12",
        ownerId: { toString: () => "owner-12" },
      });

      await expect(getExperimentWallet("exp-12", "intruder-1", "researcher")).rejects.toThrow(
        "Not authorized to view this wallet"
      );
      expect(ExperimentWallet.findOne).not.toHaveBeenCalled();
    });
  });
});
