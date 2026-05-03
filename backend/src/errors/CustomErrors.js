// Custom Business Logic Errors for Eligibility Engine

class IneligibleAgeError extends Error {
  constructor(userAge, requiredAge, message = null) {
    super(message || `You must be at least ${requiredAge} years old. You are ${userAge}.`);
    this.name = "IneligibleAgeError";
    this.statusCode = 403;
    this.userAge = userAge;
    this.requiredAge = requiredAge;
  }
}

class InvalidMedicalTermError extends Error {
  constructor(term) {
    super(`"${term}" is not a recognized medical condition. Please verify the spelling.`);
    this.name = "InvalidMedicalTermError";
    this.statusCode = 400;
    this.term = term;
  }
}

class ConflictingStudyError extends Error {
  constructor(conflictingStudies) {
    super(
      `You cannot join this study due to conflicting studies: ${conflictingStudies.map(s => s.title).join(", ")}`
    );
    this.name = "ConflictingStudyError";
    this.statusCode = 409;
    this.conflictingStudies = conflictingStudies;
  }
}

class DuplicateParticipationError extends Error {
  constructor() {
    super("You have already joined this experiment.");
    this.name = "DuplicateParticipationError";
    this.statusCode = 409;
  }
}

class ClinicalProtocolConflictError extends Error {
  constructor(reason, explanation) {
    super(explanation);
    this.name = "ClinicalProtocolConflictError";
    this.statusCode = 403;
    this.reason = reason;
    this.explanation = explanation;
  }
}

module.exports = {
  IneligibleAgeError,
  InvalidMedicalTermError,
  ConflictingStudyError,
  DuplicateParticipationError,
  ClinicalProtocolConflictError,
};
