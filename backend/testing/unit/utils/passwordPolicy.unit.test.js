const {
  STRONG_PASSWORD_MESSAGE,
  isStrongPassword,
} = require("../../../src/utils/passwordPolicy");

describe("passwordPolicy unit", () => {
  test("accepts a password that meets all strength requirements", () => {
    expect(isStrongPassword("HealthLab@2026")).toBe(true);
  });

  test("rejects empty and null-like values", () => {
    expect(isStrongPassword("")).toBe(false);
    expect(isStrongPassword(null)).toBe(false);
    expect(isStrongPassword(undefined)).toBe(false);
  });

  test("rejects passwords that miss one or more required character groups", () => {
    expect(isStrongPassword("alllowercase1!")).toBe(false);
    expect(isStrongPassword("ALLUPPERCASE1!")).toBe(false);
    expect(isStrongPassword("NoNumber!")).toBe(false);
    expect(isStrongPassword("NoSpecial123")).toBe(false);
  });

  test("exports the expected user-facing validation message", () => {
    expect(STRONG_PASSWORD_MESSAGE).toBe(
      "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character"
    );
  });
});
