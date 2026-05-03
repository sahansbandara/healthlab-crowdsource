jest.mock("axios", () => ({
  get: jest.fn(),
}));

jest.mock("../../../src/models/Participation", () => ({
  find: jest.fn(),
}));

jest.mock("../../../src/models/Experiment", () => ({
  findById: jest.fn(),
}));

jest.mock("../../../src/services/externalHealthService", () => ({
  fetchClinicalData: jest.fn(),
}));

jest.mock("../../../src/services/gemini.service", () => ({
  verifyClinicalEligibility: jest.fn(),
  generatePersonalizedBenefitAnalysis: jest.fn(),
}));

const axios = require("axios");
const Participation = require("../../../src/models/Participation");
const Experiment = require("../../../src/models/Experiment");
const externalHealthService = require("../../../src/services/externalHealthService");
const geminiService = require("../../../src/services/gemini.service");
const eligibilityService = require("../../../src/services/eligibilityService");
const {
  IneligibleAgeError,
  InvalidMedicalTermError,
  ConflictingStudyError,
  ClinicalProtocolConflictError,
} = require("../../../src/errors/CustomErrors");

describe("eligibilityService unit", () => {
  let consoleLogSpy;

  const buildUser = (overrides = {}) => ({
    id: "user-1",
    age: 30,
    gender: "Female",
    bmi: 24,
    medicalConditions: ["Diabetes"],
    ...overrides,
  });

  const buildExperiment = (overrides = {}) => ({
    _id: "exp-1",
    title: "Metabolic Study",
    eligibilityRules: {},
    eligibilityCriteria: {},
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  describe("validateProtocol", () => {
    test("passes when the user satisfies all defined criteria", async () => {
      geminiService.verifyClinicalEligibility.mockResolvedValue({ isConflicted: false });

      const result = await eligibilityService.validateProtocol(
        buildUser(),
        buildExperiment({
          eligibilityCriteria: {
            minAge: 18,
            maxAge: 40,
            genders: ["female"],
            requiredConditions: ["Diabetes"],
            minBMI: 20,
            maxBMI: 30,
            excludedConditions: ["Hypertension"],
          },
        })
      );

      expect(result).toEqual({ valid: true, reason: "User passed all protocol checks" });
    });

    test("rejects when the user is below the minimum age", async () => {
      await expect(
        eligibilityService.validateProtocol(
          buildUser({ age: 17 }),
          buildExperiment({ eligibilityCriteria: { minAge: 18 } })
        )
      ).rejects.toBeInstanceOf(IneligibleAgeError);
    });

    test("rejects when the user is above the maximum age", async () => {
      await expect(
        eligibilityService.validateProtocol(
          buildUser({ age: 66 }),
          buildExperiment({ eligibilityCriteria: { maxAge: 65 } })
        )
      ).rejects.toBeInstanceOf(IneligibleAgeError);
    });

    test("accepts boundary ages equal to the minimum and maximum", async () => {
      const result = await eligibilityService.validateProtocol(
        buildUser({ age: 18 }),
        buildExperiment({ eligibilityCriteria: { minAge: 18, maxAge: 18 } })
      );

      expect(result.valid).toBe(true);
    });

    test("rejects when gender does not match the allowed list", async () => {
      await expect(
        eligibilityService.validateProtocol(
          buildUser({ gender: "Male" }),
          buildExperiment({ eligibilityCriteria: { genders: ["Female"] } })
        )
      ).rejects.toThrow("This study is only open to specific genders: Female");
    });

    test("matches gender case-insensitively", async () => {
      const result = await eligibilityService.validateProtocol(
        buildUser({ gender: " female " }),
        buildExperiment({ eligibilityCriteria: { genders: ["FEMALE"] } })
      );

      expect(result.valid).toBe(true);
    });

    test("rejects when a required medical condition is missing", async () => {
      await expect(
        eligibilityService.validateProtocol(
          buildUser({ medicalConditions: ["Asthma"] }),
          buildExperiment({ eligibilityCriteria: { requiredConditions: ["Diabetes"] } })
        )
      ).rejects.toBeInstanceOf(ClinicalProtocolConflictError);
    });

    test("passes when all required conditions are present", async () => {
      const result = await eligibilityService.validateProtocol(
        buildUser({ medicalConditions: ["Diabetes", "Asthma"] }),
        buildExperiment({ eligibilityCriteria: { requiredConditions: ["Diabetes"] } })
      );

      expect(result.valid).toBe(true);
    });

    test("rejects when BMI is below the minimum threshold", async () => {
      await expect(
        eligibilityService.validateProtocol(
          buildUser({ bmi: 17 }),
          buildExperiment({ eligibilityCriteria: { minBMI: 18 } })
        )
      ).rejects.toThrow("Your BMI (17) is below the minimum required (18)");
    });

    test("rejects when BMI is above the maximum threshold", async () => {
      await expect(
        eligibilityService.validateProtocol(
          buildUser({ bmi: 31 }),
          buildExperiment({ eligibilityCriteria: { maxBMI: 30 } })
        )
      ).rejects.toThrow("Your BMI (31) is above the maximum allowed (30)");
    });

    test("runs semantic exclusion checks and rejects conflicted users", async () => {
      geminiService.verifyClinicalEligibility.mockResolvedValue({
        isConflicted: true,
        conflictReason: "Excluded condition overlap",
        clinicalExplanation: "Your history overlaps with an excluded condition.",
      });

      await expect(
        eligibilityService.validateProtocol(
          buildUser({ medicalConditions: ["Type 2 Diabetes"] }),
          buildExperiment({ eligibilityCriteria: { excludedConditions: ["Diabetes"] } })
        )
      ).rejects.toBeInstanceOf(ClinicalProtocolConflictError);
    });

    test("passes semantic exclusion checks when no conflict is found", async () => {
      geminiService.verifyClinicalEligibility.mockResolvedValue({ isConflicted: false });

      const result = await eligibilityService.validateProtocol(
        buildUser({ medicalConditions: ["Migraine"] }),
        buildExperiment({ eligibilityCriteria: { excludedConditions: ["Diabetes"] } })
      );

      expect(geminiService.verifyClinicalEligibility).toHaveBeenCalledWith(
        ["Migraine"],
        ["Diabetes"]
      );
      expect(result.valid).toBe(true);
    });

    test("supports experiments with no explicit criteria", async () => {
      const result = await eligibilityService.validateProtocol(buildUser(), buildExperiment());

      expect(result.valid).toBe(true);
    });
  });

  describe("validateMedicalTerm", () => {
    test("returns verified metadata when the external API finds a match", async () => {
      axios.get.mockResolvedValue({
        data: { results: [{ term: "Diabetes Mellitus" }] },
      });

      const result = await eligibilityService.validateMedicalTerm("diabetes");

      expect(result).toEqual({
        valid: true,
        term: "diabetes",
        ncbiId: "Diabetes Mellitus",
        verified: true,
      });
    });

    test("throws InvalidMedicalTermError when the API returns no results", async () => {
      axios.get.mockResolvedValue({ data: { results: [] } });

      await expect(eligibilityService.validateMedicalTerm("made-up-condition")).rejects.toBeInstanceOf(
        InvalidMedicalTermError
      );
    });

    test("throws InvalidMedicalTermError when the API call fails", async () => {
      axios.get.mockRejectedValue(new Error("network"));

      await expect(eligibilityService.validateMedicalTerm("asthma")).rejects.toBeInstanceOf(
        InvalidMedicalTermError
      );
    });
  });

  describe("detectConflicts", () => {
    test("returns no conflicts when the user has no active participations", async () => {
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const result = await eligibilityService.detectConflicts("user-1", "exp-2");

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    test("returns no conflicts when the new experiment does not exist", async () => {
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ experimentId: { _id: "exp-9", title: "A" } }]),
      });
      Experiment.findById.mockResolvedValue(null);

      const result = await eligibilityService.detectConflicts("user-1", "exp-2");

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    test("returns no conflicts when the new experiment has no conflict list", async () => {
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ experimentId: { _id: "exp-9", title: "A" } }]),
      });
      Experiment.findById.mockResolvedValue(buildExperiment({ eligibilityRules: {} }));

      const result = await eligibilityService.detectConflicts("user-1", "exp-2");

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });

    test("throws when the new experiment directly conflicts with an existing study", async () => {
      const existingExperiment = { _id: "exp-old", title: "Old Study", eligibilityRules: {} };
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ experimentId: existingExperiment }]),
      });
      Experiment.findById.mockResolvedValue(
        buildExperiment({ eligibilityRules: { conflictsWith: ["exp-old"] } })
      );

      await expect(eligibilityService.detectConflicts("user-1", "exp-new")).rejects.toBeInstanceOf(
        ConflictingStudyError
      );
    });

    test("throws when an existing study conflicts with the new experiment", async () => {
      const existingExperiment = {
        _id: "exp-old",
        title: "Old Study",
        eligibilityRules: { conflictsWith: ["exp-new"] },
      };
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ experimentId: existingExperiment }]),
      });
      Experiment.findById.mockResolvedValue(
        buildExperiment({ _id: "exp-new", eligibilityRules: { conflictsWith: [] } })
      );

      await expect(eligibilityService.detectConflicts("user-1", "exp-new")).rejects.toBeInstanceOf(
        ConflictingStudyError
      );
    });

    test("returns no conflicts when active studies do not overlap", async () => {
      const existingExperiment = { _id: "exp-old", title: "Old Study", eligibilityRules: {} };
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ experimentId: existingExperiment }]),
      });
      Experiment.findById.mockResolvedValue(
        buildExperiment({ eligibilityRules: { conflictsWith: ["something-else"] } })
      );

      const result = await eligibilityService.detectConflicts("user-1", "exp-new");

      expect(result).toEqual({ hasConflict: false, conflicts: [] });
    });
  });

  describe("runEligibilityCheck", () => {
    test("throws when the experiment cannot be found", async () => {
      Experiment.findById.mockResolvedValue(null);

      await expect(eligibilityService.runEligibilityCheck(buildUser(), "missing-exp")).rejects.toThrow(
        "Experiment not found"
      );
    });

    test("returns eligible when protocol, enrichment, and conflict checks all pass", async () => {
      Experiment.findById.mockResolvedValue(buildExperiment());
      externalHealthService.fetchClinicalData.mockResolvedValue({ ok: true });
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const result = await eligibilityService.runEligibilityCheck(
        buildUser({ medicalConditions: ["Diabetes", "Asthma"] }),
        "exp-1"
      );

      expect(externalHealthService.fetchClinicalData).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        eligible: true,
        message: "User passed all clinical-grade eligibility checks",
      });
    });

    test("skips external enrichment when the user has no medical conditions", async () => {
      Experiment.findById.mockResolvedValue(buildExperiment());
      Participation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const result = await eligibilityService.runEligibilityCheck(
        buildUser({ medicalConditions: [] }),
        "exp-1"
      );

      expect(externalHealthService.fetchClinicalData).not.toHaveBeenCalled();
      expect(result.eligible).toBe(true);
    });

    test("propagates protocol validation failures", async () => {
      Experiment.findById.mockResolvedValue(buildExperiment({ eligibilityCriteria: { minAge: 40 } }));

      await expect(
        eligibilityService.runEligibilityCheck(buildUser({ age: 20 }), "exp-1")
      ).rejects.toBeInstanceOf(IneligibleAgeError);
    });
  });

  describe("analyzeProtocolBenefits", () => {
    test("returns the AI-generated benefit analysis", async () => {
      Experiment.findById.mockResolvedValue(buildExperiment());
      geminiService.generatePersonalizedBenefitAnalysis.mockResolvedValue("Strong fit");

      const result = await eligibilityService.analyzeProtocolBenefits(buildUser(), "exp-1");

      expect(result).toEqual({ eligible: true, analysis: "Strong fit" });
    });

    test("throws when the experiment for analysis does not exist", async () => {
      Experiment.findById.mockResolvedValue(null);

      await expect(eligibilityService.analyzeProtocolBenefits(buildUser(), "missing")).rejects.toThrow(
        "Experiment not found"
      );
    });
  });
});
