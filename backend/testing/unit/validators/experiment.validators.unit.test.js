const { validationResult } = require("express-validator");
const {
  createExperimentRules,
  pickAllowedCreateFields,
} = require("../../../src/validators/experimentValidators");

const runValidation = async (body) => {
  const req = { body };
  const rules = createExperimentRules();

  for (const rule of rules) {
    await rule.run(req);
  }

  return validationResult(req).array().map((error) => error.msg);
};

describe("experimentValidators unit", () => {
  describe("createExperimentRules", () => {
    test("accepts a valid payload, including participantLimit set to zero", async () => {
      const errors = await runValidation({
        title: "Hydration Diary",
        description: "Collects daily hydration logs.",
        participantLimit: 0,
        logFieldDefinitions: [
          { label: "Water intake", key: "waterIntake", type: "number", required: true },
        ],
      });

      expect(errors).toEqual([]);
    });

    test("rejects missing and empty required values", async () => {
      const errors = await runValidation({
        title: "",
        description: "",
        logFieldDefinitions: [],
      });

      expect(errors).toEqual(
        expect.arrayContaining([
          "title is required",
          "description is required",
          "participantLimit is required",
          "logFieldDefinitions must be a non-empty array",
        ])
      );
    });

    test("rejects duplicate log field keys", async () => {
      const errors = await runValidation({
        title: "Mood Tracker",
        description: "Tracks mood changes.",
        participantLimit: 10,
        logFieldDefinitions: [
          { label: "Morning mood", key: "moodScore", type: "text" },
          { label: "Evening mood", key: "moodScore", type: "text" },
        ],
      });

      expect(errors).toContain("Each log field definition must have a unique key");
    });

    test("rejects system-managed fields supplied by the client", async () => {
      const errors = await runValidation({
        title: "Blood Pressure Study",
        description: "Daily blood pressure readings.",
        participantLimit: 12,
        ownerId: "forbidden-owner",
        logFieldDefinitions: [
          { label: "Systolic", key: "systolic", type: "number" },
        ],
      });

      expect(errors).toContain("ownerId is system-managed and must not be provided");
    });
  });

  describe("pickAllowedCreateFields", () => {
    test("keeps only fields that are allowed during experiment creation", () => {
      const result = pickAllowedCreateFields({
        title: "Nutrition Pilot",
        description: "Meal logging study",
        participantLimit: 18,
        applicationDeadline: "2026-05-01",
        ownerId: "blocked-owner",
        createdAt: "2026-04-01",
        misc: "drop-this",
      });

      expect(result).toEqual({
        title: "Nutrition Pilot",
        description: "Meal logging study",
        participantLimit: 18,
        applicationDeadline: "2026-05-01",
      });
    });

    test("returns an empty object when called with an empty payload", () => {
      expect(pickAllowedCreateFields({})).toEqual({});
    });
  });
});
