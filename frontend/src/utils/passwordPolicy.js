const PASSWORD_RULES = [
  {
    key: 'length',
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    key: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    key: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    key: 'number',
    label: 'One number',
    test: (password) => /\d/.test(password),
  },
  {
    key: 'special',
    label: 'One special character',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function getPasswordChecks(password = '') {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));
}

export function isStrongPassword(password = '') {
  return getPasswordChecks(password).every((rule) => rule.passed);
}

export function getPasswordError(password = '') {
  if (!password.trim()) {
    return 'Password is required';
  }

  if (!isStrongPassword(password)) {
    return 'Use 8+ characters with uppercase, lowercase, number, and special character.';
  }

  return '';
}
