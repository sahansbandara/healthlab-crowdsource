const { calculateMatchScore } = require("../../../src/services/recommendationService");

describe("recommendationService unit", () => {
  const buildExperiment = (overrides = {}) => ({
    title: "General Study",
    description: "A broad health research project.",
    eligibilityRules: {},
    ...overrides,
  });

  const buildUser = (overrides = {}) => ({
    age: 30,
    medicalConditions: [],
    activityLevel: "Prefer not to say",
    ...overrides,
  });

  describe("calculateMatchScore", () => {
    test("awards full age points when the user is inside the target age range", () => {
      const result = calculateMatchScore(
        buildUser({ age: 30 }),
        buildExperiment({ eligibilityRules: { minAge: 25, maxAge: 35 } })
      );

      expect(result.score).toBeGreaterThanOrEqual(20);
      expect(result.allReasons).toContain("Fits target age group");
    });

    test("awards partial age points when the user is slightly below the minimum age", () => {
      const result = calculateMatchScore(
        buildUser({ age: 22 }),
        buildExperiment({ eligibilityRules: { minAge: 25, maxAge: 40 } })
      );

      expect(result.allReasons).toContain("Close to target age range");
      expect(result.score).toBe(30);
    });

    test("awards partial age points when the user is slightly above the maximum age", () => {
      const result = calculateMatchScore(
        buildUser({ age: 43 }),
        buildExperiment({ eligibilityRules: { minAge: 20, maxAge: 40 } })
      );

      expect(result.allReasons).toContain("Close to target age range");
      expect(result.score).toBe(30);
    });

    test("awards neutral age points when no age rules are defined", () => {
      const result = calculateMatchScore(buildUser(), buildExperiment());

      expect(result.score).toBeGreaterThanOrEqual(10);
      expect(result.allReasons).not.toContain("Fits target age group");
    });

    test("awards a full medical-condition match when conditions overlap directly", () => {
      const result = calculateMatchScore(
        buildUser({ medicalConditions: ["Diabetes"] }),
        buildExperiment({
          eligibilityRules: { medicalConditions: ["Type 2 Diabetes", "Hypertension"] },
        })
      );

      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.reason).toBe("Matches conditions: Diabetes");
    });

    test("awards topic relevance points when the description mentions a user condition", () => {
      const result = calculateMatchScore(
        buildUser({ medicalConditions: ["Asthma"], activityLevel: "Prefer not to say" }),
        buildExperiment({
          description: "A study on asthma self-management tools.",
          eligibilityRules: { medicalConditions: ["Diabetes"] },
        })
      );

      expect(result.allReasons).toContain("Topic relevance to your health profile");
      expect(result.score).toBe(30);
    });

    test("awards moderate points when the experiment is open to everyone medically", () => {
      const result = calculateMatchScore(
        buildUser({ activityLevel: "Prefer not to say" }),
        buildExperiment({ eligibilityRules: {} })
      );

      expect(result.score).toBe(30);
    });

    test("awards activity-level points when sedentary keywords match the study", () => {
      const result = calculateMatchScore(
        buildUser({ activityLevel: "Sedentary" }),
        buildExperiment({ title: "Office Stress Reset", description: "Sleep and mindfulness support." })
      );

      expect(result.allReasons).toContain("Matches your Sedentary lifestyle");
      expect(result.score).toBe(60);
    });

    test("awards activity-level points when very active keywords match the study", () => {
      const result = calculateMatchScore(
        buildUser({ activityLevel: "Very Active" }),
        buildExperiment({ title: "Cardio Stamina Project", description: "Intense running program." })
      );

      expect(result.allReasons).toContain("Matches your Very Active lifestyle");
    });

    test("does not award activity points when lifestyle keywords do not match", () => {
      const result = calculateMatchScore(
        buildUser({ activityLevel: "Very Active" }),
        buildExperiment({ title: "Desk Work Study", description: "General productivity tracking." })
      );

      expect(result.allReasons).not.toContain("Matches your Very Active lifestyle");
      expect(result.score).toBe(30);
    });

    test("awards keyword relevance for one matching interest", () => {
      const result = calculateMatchScore(
        buildUser({ activityLevel: "Prefer not to say" }),
        buildExperiment({ title: "Pain Management Study", description: "Chronic pain education." })
      );

      expect(result.allReasons).toContain("Relevant project: pain");
      expect(result.score).toBe(40);
    });

    test("caps keyword relevance points at twenty even when multiple interests match", () => {
      const result = calculateMatchScore(
        buildUser({ activityLevel: "Sedentary" }),
        buildExperiment({
          title: "Sleep Nutrition Wearables Project",
          description: "Technology and wearables for sleep and nutrition improvement.",
        })
      );

      expect(result.score).toBe(70);
      expect(result.allReasons.filter((reason) => reason.startsWith("Relevant project:"))).toHaveLength(1);
    });

    test("caps the final score at one hundred percent", () => {
      const result = calculateMatchScore(
        buildUser({
          age: 30,
          medicalConditions: ["Diabetes"],
          activityLevel: "Sedentary",
        }),
        buildExperiment({
          title: "Sleep Nutrition Wearables Project",
          description:
            "Nutrition, sleep, technology, wearables, and mindfulness for office workers with diabetes.",
          eligibilityRules: {
            minAge: 25,
            maxAge: 35,
            medicalConditions: ["Type 2 Diabetes"],
          },
        })
      );

      expect(result.score).toBe(100);
    });

    test("returns the default reason when no stronger rationale is found", () => {
      const result = calculateMatchScore(
        buildUser({ activityLevel: "Unknown", medicalConditions: [] }),
        buildExperiment({
          title: "General Wellness Study",
          description: "A broad health project.",
          eligibilityRules: { minAge: 60, maxAge: 70, medicalConditions: ["Arthritis"] },
        })
      );

      expect(result.score).toBe(0);
      expect(result.reason).toBe("General health study");
      expect(result.allReasons).toEqual([]);
    });

    test("treats missing user conditions as an empty array", () => {
      const result = calculateMatchScore(
        buildUser({ medicalConditions: null, activityLevel: "Prefer not to say" }),
        buildExperiment({ eligibilityRules: { medicalConditions: ["Asthma"] } })
      );

      expect(result.score).toBe(10);
    });

    test("supports a zero-like profile without crashing", () => {
      const result = calculateMatchScore(
        { age: 0, medicalConditions: [], activityLevel: "" },
        buildExperiment({ title: "Pediatric baseline", description: "", eligibilityRules: {} })
      );

      expect(result.score).toBe(30);
    });

    test("throws on invalid experiment input that is missing a title", () => {
      expect(() => calculateMatchScore(buildUser(), { description: "x", eligibilityRules: {} })).toThrow();
    });
  });
});
