const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
let app;
let User;
let Researcher;
let Experiment;
let Review;
let Participation;

const signToken = (user) =>
  jwt.sign(
    { id: String(user._id), role: user.role },
    process.env.JWT_SECRET || "integration-test-secret",
    { expiresIn: "1d" }
  );

const authHeader = (user) => `Bearer ${signToken(user)}`;

const participantPayload = (overrides = {}) => ({
  name: "Participant User",
  email: `participant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
  password: "HealthLab@2026",
  age: 28,
  gender: "Female",
  location: "Colombo",
  height: 165,
  weight: 60,
  bloodGroup: "O+",
  medicalConditions: [],
  medications: [],
  smokingStatus: "Never",
  alcoholStatus: "Never",
  sleepPatterns: "Regular",
  activityLevel: "Moderately Active",
  ...overrides,
});

const researcherPayload = (overrides = {}) => ({
  name: "Researcher User",
  fullName: "Researcher User",
  email: `researcher-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
  password: "HealthLab@2026",
  nic: `NIC-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  gender: "Female",
  currentWorkplace: "HealthLab University",
  highestAcademicQualification: "MSc",
  researcherType: "Other",
  otherResearcherTypeExplanation: "Independent clinical researcher",
  hasPublishedResearch: "false",
  purpose: "Investigate participant health behavior patterns",
  ...overrides,
});

const experimentPayload = (overrides = {}) => ({
  title: "Sleep Tracking Study",
  description: "Tracks sleep quality and hydration over time.",
  participantLimit: 10,
  status: "draft",
  eligibilityCriteria: {
    minAge: 18,
    maxAge: 60,
  },
  logFieldDefinitions: [
    { label: "Sleep hours", key: "sleepHours", type: "number", required: true },
  ],
  ...overrides,
});

const reviewPayload = (overrides = {}) => ({
  title: "Digital Sleep Review",
  summary: "A concise review of digital wellbeing and sleep tracking.",
  content: "This review discusses sleep tracking methods, risks, and practical recommendations.",
  status: "draft",
  keywords: ["sleep", "wellbeing"],
  ...overrides,
});

async function createUser(attrs = {}) {
  return User.create({
    name: attrs.name || "Seed User",
    email:
      attrs.email ||
      `seed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
    password: attrs.password || "HealthLab@2026",
    role: attrs.role || "participant",
    age: attrs.age,
    gender: attrs.gender,
    location: attrs.location,
    height: attrs.height,
    weight: attrs.weight,
    medicalConditions: attrs.medicalConditions,
    activityLevel: attrs.activityLevel,
    sleepPatterns: attrs.sleepPatterns,
    bloodGroup: attrs.bloodGroup,
  });
}

async function createResearcherUser(status = "approved", userOverrides = {}, researcherOverrides = {}) {
  const user = await createUser({
    role: "researcher",
    name: "Approved Researcher",
    ...userOverrides,
  });

  const researcher = await Researcher.create({
    user: user._id,
    fullName: researcherOverrides.fullName || user.name,
    nic: researcherOverrides.nic || `NIC-${Math.random().toString(36).slice(2, 8)}`,
    gender: researcherOverrides.gender || "Female",
    currentWorkplace: researcherOverrides.currentWorkplace || "HealthLab Institute",
    highestAcademicQualification:
      researcherOverrides.highestAcademicQualification || "MSc",
    researcherType: researcherOverrides.researcherType || "Other",
    otherResearcherTypeExplanation:
      researcherOverrides.otherResearcherTypeExplanation || "Specialized research",
    hasPublishedResearch:
      researcherOverrides.hasPublishedResearch !== undefined
        ? researcherOverrides.hasPublishedResearch
        : false,
    publicationSiteOrLink: researcherOverrides.publicationSiteOrLink || null,
    purpose: researcherOverrides.purpose || "Academic validation",
    status,
    reviewNotes: researcherOverrides.reviewNotes || "",
  });

  return { user, researcher };
}

async function createExperimentDoc(owner, attrs = {}) {
  return Experiment.create({
    ...experimentPayload(attrs),
    ownerId: owner._id,
  });
}

async function clearDatabase() {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

describe("Core integration", () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "integration-test-secret";
    process.env.MONGO_DB_NAME = "healthlab_test_db";

    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    const { connectDB } = require("../../src/config/db");
    await connectDB();

    app = require("../../src/app");
    User = require("../../src/models/User");
    Researcher = require("../../src/models/Researcher");
    Experiment = require("../../src/models/Experiment");
    Review = require("../../src/models/Review");
    Participation = require("../../src/models/Participation");

    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    if (consoleLogSpy) consoleLogSpy.mockRestore();
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongod) await mongod.stop();
  });

  describe("Health and routing", () => {
    test("returns a healthy status payload from /health", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.database).toBe("Connected");
    });

    test("returns 404 for unknown API routes", async () => {
      const res = await request(app).get("/api/unknown-route");

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Not Found");
    });

    test("returns 404 for unknown non-api routes", async () => {
      const res = await request(app).get("/unknown-route");

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Not Found");
    });
  });

  describe("Authentication and registration", () => {
    test("registers a participant with personal and physical details", async () => {
      const payload = participantPayload();

      const res = await request(app).post("/api/auth/register-participant").send(payload);
      const user = await User.findOne({ email: payload.email }).select("+password");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe("participant");
      expect(user.bmi).toBeCloseTo(22.0, 1);
    });

    test("rejects participant registration with a duplicate email", async () => {
      const payload = participantPayload();
      await request(app).post("/api/auth/register-participant").send(payload);

      const res = await request(app).post("/api/auth/register-participant").send(payload);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Email already registered");
    });

    test("rejects participant registration with a weak password", async () => {
      const res = await request(app)
        .post("/api/auth/register-participant")
        .send(participantPayload({ password: "weak" }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Password must be at least 8 characters");
    });

    test("rejects participant registration when name is missing", async () => {
      const payload = participantPayload();
      delete payload.name;

      const res = await request(app).post("/api/auth/register-participant").send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Full name is required");
    });

    test("rejects participant registration when email is invalid", async () => {
      const res = await request(app)
        .post("/api/auth/register-participant")
        .send(participantPayload({ email: "not-an-email" }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Valid email is required");
    });

    test("logs in a participant successfully", async () => {
      const payload = participantPayload();
      await request(app).post("/api/auth/register-participant").send(payload);

      const res = await request(app).post("/api/auth/login").send({
        email: payload.email,
        password: payload.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe("participant");
    });

    test("rejects login with a wrong password", async () => {
      const payload = participantPayload();
      await request(app).post("/api/auth/register-participant").send(payload);

      const res = await request(app).post("/api/auth/login").send({
        email: payload.email,
        password: "WrongPassword@2026",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("Invalid email or password");
    });

    test("returns the authenticated profile", async () => {
      const user = await createUser({ role: "participant", name: "Profile User" });

      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(user.email);
    });

    test("rejects profile access without a token", async () => {
      const res = await request(app).get("/api/auth/profile");

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("Authentication required");
    });

    test("updates a participant profile and recalculates bmi", async () => {
      const user = await createUser({
        role: "participant",
        height: 170,
        weight: 70,
        age: 25,
      });

      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", authHeader(user))
        .send({ weight: 68, height: 170, activityLevel: "Very Active", gender: "Female" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.bmi).toBeCloseTo(23.5, 1);
    });

    test("registers a researcher successfully with pending status", async () => {
      const payload = researcherPayload();

      const res = await request(app).post("/api/auth/register").field(payload);
      const researcher = await Researcher.findOne().populate("user");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.researcher.status).toBe("pending");
      expect(researcher.user.email).toBe(payload.email);
    });

    test("rejects researcher registration when duplicate email is used", async () => {
      const payload = researcherPayload();
      await request(app).post("/api/auth/register").field(payload);

      const res = await request(app).post("/api/auth/register").field(payload);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Email already registered");
    });

    test("rejects researcher registration when Other type explanation is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .field(researcherPayload({ otherResearcherTypeExplanation: "" }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Other researcher type explanation is required");
    });

    test("rejects researcher registration when publication link is required but missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .field(
          researcherPayload({
            hasPublishedResearch: "true",
            publicationSiteOrLink: "",
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Publication site name or reference link is required");
    });

    test("rejects researcher registration when affiliation proof is required but missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .field(
          researcherPayload({
            researcherType: "Affiliated to Organization",
            otherResearcherTypeExplanation: undefined,
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Affiliation proof");
    });
  });

  describe("Admin approval and experiment management", () => {
    test("allows an admin to approve a pending researcher", async () => {
      const admin = await createUser({ role: "admin", email: "admin-approve@test.com" });
      const { researcher } = await createResearcherUser("pending");

      const res = await request(app)
        .put(`/api/admin/researchers/${researcher._id}/approve`)
        .set("Authorization", authHeader(admin))
        .send({ reviewNotes: "Approved for experiment publishing" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("approved");
    });

    test("rejects researcher approval when requested by a participant", async () => {
      const participant = await createUser({ role: "participant" });
      const { researcher } = await createResearcherUser("pending");

      const res = await request(app)
        .put(`/api/admin/researchers/${researcher._id}/approve`)
        .set("Authorization", authHeader(participant))
        .send({ reviewNotes: "Attempted approval" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied");
    });

    test("rejects researcher approval without authentication", async () => {
      const { researcher } = await createResearcherUser("pending");

      const res = await request(app)
        .put(`/api/admin/researchers/${researcher._id}/approve`)
        .send({ reviewNotes: "Attempted approval" });

      expect(res.status).toBe(401);
    });

    test("creates an experiment for an approved researcher", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/experiments")
        .set("Authorization", authHeader(user))
        .send(experimentPayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId.toString()).toBe(String(user._id));
    });

    test("blocks experiment creation for a pending researcher", async () => {
      const { user } = await createResearcherUser("pending");

      const res = await request(app)
        .post("/api/experiments")
        .set("Authorization", authHeader(user))
        .send(experimentPayload());

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Admin approval required");
    });

    test("blocks experiment creation for a participant", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .post("/api/experiments")
        .set("Authorization", authHeader(participant))
        .send(experimentPayload());

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied");
    });

    test("rejects experiment creation without authentication", async () => {
      const res = await request(app).post("/api/experiments").send(experimentPayload());

      expect(res.status).toBe(401);
    });

    test("rejects experiment creation when participantLimit is negative", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/experiments")
        .set("Authorization", authHeader(user))
        .send(experimentPayload({ participantLimit: -1 }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("participantLimit must be an integer greater than or equal to 0");
    });

    test("rejects experiment creation when logFieldDefinitions is missing", async () => {
      const { user } = await createResearcherUser("approved");
      const payload = experimentPayload();
      delete payload.logFieldDefinitions;

      const res = await request(app)
        .post("/api/experiments")
        .set("Authorization", authHeader(user))
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("logFieldDefinitions is required");
    });

    test("rejects experiment creation when title exceeds two hundred characters", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/experiments")
        .set("Authorization", authHeader(user))
        .send(experimentPayload({ title: "A".repeat(201) }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("title must be at most 200 characters");
    });

    test("returns all available experiments", async () => {
      const { user } = await createResearcherUser("approved");
      await createExperimentDoc(user, { title: "Study A" });
      await createExperimentDoc(user, { title: "Study B" });

      const res = await request(app).get("/api/experiments");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test("returns an empty experiment list when the database is empty", async () => {
      const res = await request(app).get("/api/experiments");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("returns a single experiment by id", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);

      const res = await request(app).get(`/api/experiments/${experiment._id}`);

      expect(res.status).toBe(200);
      expect(res.body._id.toString()).toBe(String(experiment._id));
    });

    test("returns 404 when fetching a missing experiment", async () => {
      const res = await request(app).get(`/api/experiments/${new mongoose.Types.ObjectId()}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Experiment not found");
    });

    test("returns an error payload for an invalid experiment id lookup", async () => {
      const res = await request(app).get("/api/experiments/not-a-valid-id");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test("updates an experiment successfully", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);

      const res = await request(app)
        .put(`/api/experiments/${experiment._id}`)
        .set("Authorization", authHeader(user))
        .send({ title: "Updated Experiment Title" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Experiment Title");
    });

    test("supports partial experiment updates", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user, { description: "Initial description" });

      const res = await request(app)
        .put(`/api/experiments/${experiment._id}`)
        .set("Authorization", authHeader(user))
        .send({ description: "Edited description only" });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe("Edited description only");
    });

    test("returns 404 when updating a non-existing experiment", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .put(`/api/experiments/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", authHeader(user))
        .send({ title: "Updated" });

      expect(res.status).toBe(404);
    });

    test("rejects invalid experiment updates", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);

      const res = await request(app)
        .put(`/api/experiments/${experiment._id}`)
        .set("Authorization", authHeader(user))
        .send({ participantLimit: -5 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test("allows an admin to update an experiment", async () => {
      const admin = await createUser({ role: "admin" });
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);

      const res = await request(app)
        .put(`/api/experiments/${experiment._id}`)
        .set("Authorization", authHeader(admin))
        .send({ title: "Admin Updated Title" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Admin Updated Title");
    });

    test("deletes an experiment successfully", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);

      const res = await request(app)
        .delete(`/api/experiments/${experiment._id}`)
        .set("Authorization", authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("deleted");
    });

    test("returns 404 when deleting a non-existing experiment", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .delete(`/api/experiments/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", authHeader(user));

      expect(res.status).toBe(404);
    });

    test("allows an admin to delete an experiment", async () => {
      const admin = await createUser({ role: "admin" });
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);

      const res = await request(app)
        .delete(`/api/experiments/${experiment._id}`)
        .set("Authorization", authHeader(admin));

      expect(res.status).toBe(200);
    });

    test("returns general safety guidelines for a valid experiment", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user, { title: "General Wellness Study", tags: [] });

      const res = await request(app).get(`/api/experiments/${experiment._id}/safety-guidelines`);

      expect(res.status).toBe(200);
      expect(res.body.source).toBeTruthy();
      expect(Array.isArray(res.body.guidelines)).toBe(true);
    });

    test("returns 404 for safety guidelines on a missing experiment", async () => {
      const res = await request(app).get(
        `/api/experiments/${new mongoose.Types.ObjectId()}/safety-guidelines`
      );

      expect(res.status).toBe(404);
    });
  });

  describe("Research review flows", () => {
    test("creates a draft review successfully for a researcher", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("draft");
    });

    test("creates a published review successfully", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ status: "published" }));

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("published");
    });

    test("rejects review creation by a participant", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(participant))
        .send(reviewPayload());

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied");
    });

    test("rejects review creation without authentication", async () => {
      const res = await request(app).post("/api/reviews").send(reviewPayload());

      expect(res.status).toBe(401);
    });

    test("rejects review creation when title is missing", async () => {
      const { user } = await createResearcherUser("approved");
      const payload = reviewPayload();
      delete payload.title;

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("title must be a non-empty string");
    });

    test("rejects review creation when summary is missing", async () => {
      const { user } = await createResearcherUser("approved");
      const payload = reviewPayload();
      delete payload.summary;

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("summary must be a non-empty string");
    });

    test("rejects review creation when content is missing", async () => {
      const { user } = await createResearcherUser("approved");
      const payload = reviewPayload();
      delete payload.content;

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("content must be a non-empty string");
    });

    test("rejects review creation when status is invalid", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ status: "submitted" }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("status must be draft or published");
    });

    test("rejects review creation when experiment id is invalid", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ experiment: "bad-id" }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid experiment id");
    });

    test("rejects review creation when the linked experiment does not exist", async () => {
      const { user } = await createResearcherUser("approved");

      const res = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ experiment: String(new mongoose.Types.ObjectId()) }));

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Experiment not found");
    });

    test("lists only published reviews for anonymous viewers", async () => {
      const { user } = await createResearcherUser("approved");
      await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ title: "Published review", status: "published" }));
      await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ title: "Draft review", status: "draft" }));

      const res = await request(app).get("/api/reviews");

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].status).toBe("published");
    });

    test("lets an author see their own drafts in review listings", async () => {
      const { user } = await createResearcherUser("approved");
      await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ title: "Author draft", status: "draft" }));

      const res = await request(app)
        .get("/api/reviews")
        .set("Authorization", authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });

    test("returns a published review by id for anonymous viewers", async () => {
      const { user } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ status: "published" }));

      const res = await request(app).get(`/api/reviews/${created.body.data._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(created.body.data._id.toString());
    });

    test("blocks anonymous access to a draft review by id", async () => {
      const { user } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ status: "draft" }));

      const res = await request(app).get(`/api/reviews/${created.body.data._id}`);

      expect(res.status).toBe(403);
    });

    test("lets the author fetch their own draft review by id", async () => {
      const { user } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ status: "draft" }));

      const res = await request(app)
        .get(`/api/reviews/${created.body.data._id}`)
        .set("Authorization", authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("draft");
    });

    test("rejects invalid review ids on fetch", async () => {
      const res = await request(app).get("/api/reviews/not-a-valid-id");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid review id");
    });

    test("updates a review successfully", async () => {
      const { user } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload());

      const res = await request(app)
        .put(`/api/reviews/${created.body.data._id}`)
        .set("Authorization", authHeader(user))
        .send({ title: "Updated review title" });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Updated review title");
    });

    test("supports partial review updates", async () => {
      const { user } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload());

      const res = await request(app)
        .put(`/api/reviews/${created.body.data._id}`)
        .set("Authorization", authHeader(user))
        .send({ status: "published" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("published");
    });

    test("rejects unauthorized review updates from another researcher", async () => {
      const { user } = await createResearcherUser("approved");
      const { user: otherUser } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload());

      const res = await request(app)
        .put(`/api/reviews/${created.body.data._id}`)
        .set("Authorization", authHeader(otherUser))
        .send({ title: "Intruder edit" });

      expect(res.status).toBe(403);
    });

    test("rejects invalid review update bodies", async () => {
      const { user } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload());

      const res = await request(app)
        .put(`/api/reviews/${created.body.data._id}`)
        .set("Authorization", authHeader(user))
        .send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Validation failed");
    });

    test("deletes a review successfully", async () => {
      const { user } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload());

      const res = await request(app)
        .delete(`/api/reviews/${created.body.data._id}`)
        .set("Authorization", authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("deleted");
    });

    test("rejects unauthorized review deletion", async () => {
      const { user } = await createResearcherUser("approved");
      const { user: otherUser } = await createResearcherUser("approved");
      const created = await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload());

      const res = await request(app)
        .delete(`/api/reviews/${created.body.data._id}`)
        .set("Authorization", authHeader(otherUser));

      expect(res.status).toBe(403);
    });

    test("lists reviews by experiment", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);
      await request(app)
        .post("/api/reviews")
        .set("Authorization", authHeader(user))
        .send(reviewPayload({ experiment: String(experiment._id), status: "published" }));

      const res = await request(app).get(`/api/experiments/${experiment._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });

    test("returns an empty review list when an experiment has no reviews", async () => {
      const { user } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(user);

      const res = await request(app).get(`/api/experiments/${experiment._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });

    test("rejects invalid experiment ids when listing reviews by experiment", async () => {
      const res = await request(app).get("/api/experiments/not-a-valid-id/reviews");

      expect(res.status).toBe(400);
    });
  });

  describe("Recommendations, enrollment, studies, and activity", () => {
    test("rejects recommendation access without authentication", async () => {
      const res = await request(app).get("/api/recommendations");

      expect(res.status).toBe(401);
    });

    test("returns recommendations with match scores", async () => {
      const participant = await createUser({
        role: "participant",
        age: 30,
        activityLevel: "Sedentary",
        medicalConditions: ["Diabetes"],
      });
      const { user: researcher } = await createResearcherUser("approved");
      await createExperimentDoc(researcher, {
        title: "Sleep Nutrition Project",
        description: "Nutrition and sleep tracking for office staff with diabetes.",
        eligibilityRules: { minAge: 25, maxAge: 35, medicalConditions: ["Type 2 Diabetes"] },
      });
      await createExperimentDoc(researcher, {
        title: "General Walking Study",
        description: "A broad walking project for all users.",
        eligibilityRules: {},
      });

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(typeof res.body[0].matchScore).toBe("number");
      expect(res.body[0].matchScore).toBeGreaterThanOrEqual(res.body[1].matchScore);
    });

    test("marks recommended experiments as enrolled when the user has joined them", async () => {
      const participant = await createUser({ role: "participant", age: 30, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      await Participation.create({
        userId: participant._id,
        userAge: 30,
        userEmail: participant.email,
        experimentId: experiment._id,
        status: "joined",
      });

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body[0].enrolled).toBe(true);
    });

    test("returns an empty recommendation list when there are no experiments", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("returns an empty My Studies list before enrollment", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .get("/api/participations/my-studies")
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body.totalStudies).toBe(0);
      expect(res.body.studies).toEqual([]);
    });

    test("rejects enrollment without authentication", async () => {
      const res = await request(app).post("/api/participations/join").send({});

      expect(res.status).toBe(401);
    });

    test("rejects enrollment when experimentId is missing", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({});

      expect(res.status).toBe(400);
    });

    test("enrolls an eligible participant successfully", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher, {
        eligibilityCriteria: { minAge: 18, maxAge: 50 },
      });

      const res = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      expect(res.status).toBe(201);
      expect(res.body.participation.status).toBe("joined");
    });

    test("prevents duplicate enrollment into the same experiment", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);

      await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already joined");
    });

    test("blocks enrollment when the cohort is full", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher, {
        participantLimit: 1,
        currentParticipantCount: 1,
      });

      const res = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("participant limit");
    });

    test("blocks enrollment when the participant is below the eligible age", async () => {
      const participant = await createUser({ role: "participant", age: 15, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher, {
        eligibilityCriteria: { minAge: 18, maxAge: 50 },
      });

      const res = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("IneligibleAgeError");
    });

    test("blocks enrollment when the participant gender does not match", async () => {
      const participant = await createUser({
        role: "participant",
        age: 25,
        gender: "Male",
        medicalConditions: [],
      });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher, {
        eligibilityCriteria: { genders: ["Female"] },
      });

      const res = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("specific genders");
    });

    test("returns My Studies after a successful enrollment", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .get("/api/participations/my-studies")
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body.totalStudies).toBe(1);
      expect(res.body.studies[0].experimentId.title).toBe(experiment.title);
    });

    test("returns participation detail for the enrolled participant", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .get(`/api/participations/${joinRes.body.participation._id}`)
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body.experimentId.title).toBe(experiment.title);
    });

    test("prevents another participant from viewing someone else's study detail", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const otherParticipant = await createUser({ role: "participant", age: 30, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .get(`/api/participations/${joinRes.body.participation._id}`)
        .set("Authorization", authHeader(otherParticipant));

      expect(res.status).toBe(404);
    });

    test("submits a daily log successfully", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .post(`/api/participations/${joinRes.body.participation._id}/logs`)
        .set("Authorization", authHeader(participant))
        .send({ logData: { sleepHours: 7 } });

      expect(res.status).toBe(201);
      expect(res.body.participation.logs).toHaveLength(1);
    });

    test("updates today's log instead of creating a duplicate log entry", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      await request(app)
        .post(`/api/participations/${joinRes.body.participation._id}/logs`)
        .set("Authorization", authHeader(participant))
        .send({ logData: { sleepHours: 6 } });

      const res = await request(app)
        .post(`/api/participations/${joinRes.body.participation._id}/logs`)
        .set("Authorization", authHeader(participant))
        .send({ logData: { sleepHours: 8 } });

      expect(res.status).toBe(201);
      expect(res.body.participation.logs).toHaveLength(1);
      expect(res.body.participation.logs[0].data.sleepHours).toBe(8);
    });

    test("returns 404 when submitting a daily log for a missing participation", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .post(`/api/participations/${new mongoose.Types.ObjectId()}/logs`)
        .set("Authorization", authHeader(participant))
        .send({ logData: { sleepHours: 7 } });

      expect(res.status).toBe(404);
    });

    test("exposes today's activity through participation detail after logging", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      await request(app)
        .post(`/api/participations/${joinRes.body.participation._id}/logs`)
        .set("Authorization", authHeader(participant))
        .send({ logData: { sleepHours: 7, mood: "good" } });

      const res = await request(app)
        .get(`/api/participations/${joinRes.body.participation._id}`)
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].data.sleepHours).toBe(7);
    });

    test("deletes today's log successfully", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      await request(app)
        .post(`/api/participations/${joinRes.body.participation._id}/logs`)
        .set("Authorization", authHeader(participant))
        .send({ logData: { sleepHours: 7 } });

      const res = await request(app)
        .delete(`/api/participations/${joinRes.body.participation._id}/logs/today`)
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body.logs).toEqual([]);
    });

    test("returns 404 when deleting today's log and none exists", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .delete(`/api/participations/${joinRes.body.participation._id}/logs/today`)
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(404);
    });

    test("allows a participant to leave a study", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      const joinRes = await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .put(`/api/participations/${joinRes.body.participation._id}/leave`)
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("successfully left");
    });

    test("returns 404 when leaving a missing participation", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .put(`/api/participations/${new mongoose.Types.ObjectId()}/leave`)
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(404);
    });

    test("blocks participant access to the submission list endpoint", async () => {
      const participant = await createUser({ role: "participant" });

      const res = await request(app)
        .get(`/api/participations/experiment/${new mongoose.Types.ObjectId()}/participants`)
        .set("Authorization", authHeader(participant));

      expect(res.status).toBe(403);
    });

    test("returns the participant submission list for a researcher", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      await request(app)
        .post("/api/participations/join")
        .set("Authorization", authHeader(participant))
        .send({ experimentId: String(experiment._id) });

      const res = await request(app)
        .get(`/api/participations/experiment/${experiment._id}/participants`)
        .set("Authorization", authHeader(researcher));

      expect(res.status).toBe(200);
      expect(res.body.stats.totalJoined).toBe(1);
      expect(res.body.participants).toHaveLength(1);
    });

    test("includes withdrawn or non-joined records when includeWithdrawn=true", async () => {
      const participant = await createUser({ role: "participant", age: 28, medicalConditions: [] });
      const { user: researcher } = await createResearcherUser("approved");
      const experiment = await createExperimentDoc(researcher);
      await Participation.create({
        userId: participant._id,
        userAge: participant.age,
        userEmail: participant.email,
        experimentId: experiment._id,
        status: "dropped",
        dateLeft: new Date(),
      });

      const res = await request(app)
        .get(`/api/participations/experiment/${experiment._id}/participants?includeWithdrawn=true`)
        .set("Authorization", authHeader(researcher));

      expect(res.status).toBe(200);
      expect(res.body.participants).toHaveLength(1);
    });
  });
});
