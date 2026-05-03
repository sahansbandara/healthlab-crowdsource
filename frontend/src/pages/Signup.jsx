import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, registerResearcher } from '../api/auth';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Select,
  ErrorMessage,
} from '../components/ui';
import { getPasswordChecks, getPasswordError } from '../utils/passwordPolicy';

const USER_TYPE_PARTICIPANT = 'participant';
const USER_TYPE_RESEARCHER = 'researcher';
const RESEARCHER_TYPES = [
  { value: 'Student', label: 'Student' },
  { value: 'NGO', label: 'NGO' },
  { value: 'Affiliated to Organization', label: 'Affiliated to Organization' },
  { value: 'Other', label: 'Other' },
];

const PasswordChecklist = ({ password = '' }) => {
  const checks = getPasswordChecks(password);

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Strong password requirements
      </p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {checks.map((check) => (
          <p
            key={check.key}
            className={`text-xs font-medium ${
              check.passed ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {check.passed ? '✓' : '○'} {check.label}
          </p>
        ))}
      </div>
    </div>
  );
};

const Signup = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState(USER_TYPE_PARTICIPANT);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: 'Prefer not to say',
    location: '',
    height: '',
    weight: '',
    bloodGroup: 'Unknown',
    medicalConditions: '',
    medications: '',
    smokingStatus: 'Prefer not to say',
    alcoholStatus: 'Prefer not to say',
    sleepPatterns: '',
    activityLevel: 'Prefer not to say',
  });

  const [researcherData, setResearcherData] = useState({
    name: '',
    fullName: '',
    email: '',
    password: '',
    nic: '',
    gender: '',
    currentWorkplace: '',
    highestAcademicQualification: '',
    researcherType: 'Student',
    otherResearcherTypeExplanation: '',
    hasPublishedResearch: false,
    publicationSiteOrLink: '',
    purpose: '',
  });
  const [affiliationFile, setAffiliationFile] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleResearcherChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? e.target.checked : value;
    setResearcherData((prev) => ({ ...prev, [name]: val }));
    if (validationErrors[name]) setValidationErrors((prev) => ({ ...prev, [name]: null }));
  };

  const switchUserType = (type) => {
    setUserType(type);
    setError('');
    setValidationErrors({});
    if (type === USER_TYPE_PARTICIPANT) setStep(1);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (userType === USER_TYPE_PARTICIPANT && step === 1) {
      const err = {};
      if (!formData.name?.trim()) err.name = 'Full name is required';
      if (!formData.email?.trim()) err.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) err.email = 'Enter a valid email';
      const passwordError = getPasswordError(formData.password);
      if (passwordError) err.password = passwordError;
      if (Object.keys(err).length > 0) {
        setValidationErrors((prev) => ({ ...prev, ...err }));
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrev = (e) => {
    e.preventDefault();
    setStep(step - 1);
  };

  const validateResearcherForm = () => {
    const err = {};
    if (!researcherData.fullName?.trim()) err.fullName = 'Full name is required';
    if (!researcherData.email?.trim()) err.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(researcherData.email)) err.email = 'Enter a valid email';
    const passwordError = getPasswordError(researcherData.password);
    if (passwordError) err.password = passwordError;
    if (!researcherData.nic?.trim()) err.nic = 'NIC is required';
    if (!researcherData.gender?.trim()) err.gender = 'Gender is required';
    if (!researcherData.currentWorkplace?.trim()) err.currentWorkplace = 'Current workplace is required';
    if (!researcherData.highestAcademicQualification?.trim()) err.highestAcademicQualification = 'Highest academic qualification is required';
    if (!researcherData.purpose?.trim()) err.purpose = 'Purpose / need of research is required';
    if (researcherData.researcherType === 'Other' && !researcherData.otherResearcherTypeExplanation?.trim()) {
      err.otherResearcherTypeExplanation = 'Please specify when researcher type is Other';
    }
    if (researcherData.researcherType === 'Affiliated to Organization' && !affiliationFile) {
      err.affiliationProof = 'Affiliation proof (image or document) is required';
    }
    if (researcherData.hasPublishedResearch && !researcherData.publicationSiteOrLink?.trim()) {
      err.publicationSiteOrLink = 'Publication site or reference link is required when you have published research';
    }
    setValidationErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (userType === USER_TYPE_PARTICIPANT) {
      const err = {};
      if (!formData.name?.trim()) err.name = 'Full name is required';
      if (!formData.email?.trim()) err.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) err.email = 'Enter a valid email';
      const passwordError = getPasswordError(formData.password);
      if (passwordError) err.password = passwordError;
      if (Object.keys(err).length > 0) {
        setValidationErrors((prev) => ({ ...prev, ...err }));
        setStep(1);
        return;
      }
    }
    if (userType === USER_TYPE_RESEARCHER && !validateResearcherForm()) return;
    try {
      if (userType === USER_TYPE_PARTICIPANT) {
        const processedData = {
          ...formData,
          medicalConditions: formData.medicalConditions.split(',').map((item) => item.trim()).filter(Boolean),
          medications: formData.medications.split(',').map((item) => item.trim()).filter(Boolean),
          age: Number(formData.age),
          height: formData.height ? Number(formData.height) : undefined,
          weight: formData.weight ? Number(formData.weight) : undefined,
        };
        await registerUser(processedData);
        navigate('/experiments');
      } else {
        const fd = new FormData();
        fd.append('name', researcherData.name || researcherData.fullName);
        fd.append('fullName', researcherData.fullName || researcherData.name);
        fd.append('email', researcherData.email);
        fd.append('password', researcherData.password);
        fd.append('nic', researcherData.nic);
        fd.append('gender', researcherData.gender);
        fd.append('currentWorkplace', researcherData.currentWorkplace);
        fd.append('highestAcademicQualification', researcherData.highestAcademicQualification);
        fd.append('researcherType', researcherData.researcherType);
        fd.append('hasPublishedResearch', researcherData.hasPublishedResearch);
        fd.append('purpose', researcherData.purpose);
        if (researcherData.researcherType === 'Other' && researcherData.otherResearcherTypeExplanation) {
          fd.append('otherResearcherTypeExplanation', researcherData.otherResearcherTypeExplanation);
        }
        if (researcherData.hasPublishedResearch && researcherData.publicationSiteOrLink) {
          fd.append('publicationSiteOrLink', researcherData.publicationSiteOrLink);
        }
        if (affiliationFile) fd.append('affiliationProof', affiliationFile);
        await registerResearcher(fd);
        navigate('/login', { state: { message: 'Researcher registration submitted. You can sign in after admin approval.' } });
      }
    } catch (err) {
      setError(err.response?.data?.message || (userType === USER_TYPE_RESEARCHER ? 'Researcher registration failed' : 'Registration failed'));
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <Input
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={validationErrors.name}
        required
      />
      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={validationErrors.email}
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        error={validationErrors.password}
        required
        minLength={8}
        hint="Use 8+ characters with uppercase, lowercase, number, and special character."
      />
      <PasswordChecklist password={formData.password} />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <Input label="Age" name="age" type="number" value={formData.age} onChange={handleChange} required />
      <Select
        label="Gender"
        name="gender"
        value={formData.gender}
        onChange={handleChange}
        options={['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']}
      />
      <Input label="Location (Optional)" name="location" value={formData.location} onChange={handleChange} placeholder="City, Country or 'Prefer not to say'" />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <Input label="Height (cm)" name="height" type="number" value={formData.height} onChange={handleChange} />
      <Input label="Weight (kg)" name="weight" type="number" value={formData.weight} onChange={handleChange} />
      <Select
        label="Blood Group"
        name="bloodGroup"
        value={formData.bloodGroup}
        onChange={handleChange}
        options={['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
      />
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <Input
        label="Medical Conditions (comma separated)"
        name="medicalConditions"
        value={formData.medicalConditions}
        onChange={handleChange}
        placeholder="e.g. Asthma, Diabetes"
      />
      <Input
        label="Current Medications (comma separated)"
        name="medications"
        value={formData.medications}
        onChange={handleChange}
        placeholder="e.g. Aspirin, Insulin"
      />
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <Select
        label="Smoking Status"
        name="smokingStatus"
        value={formData.smokingStatus}
        onChange={handleChange}
        options={['Never', 'Former', 'Current', 'Prefer not to say']}
      />
      <Select
        label="Alcohol Consumption"
        name="alcoholStatus"
        value={formData.alcoholStatus}
        onChange={handleChange}
        options={['Never', 'Occasional', 'Regular', 'Prefer not to say']}
      />
      <Input
        label="Sleep Patterns"
        name="sleepPatterns"
        value={formData.sleepPatterns}
        onChange={handleChange}
        placeholder="e.g. 6-8 hours/night"
      />
      <Select
        label="Activity Level"
        name="activityLevel"
        value={formData.activityLevel}
        onChange={handleChange}
        options={['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Prefer not to say']}
      />
    </div>
  );

  const renderResearcherForm = () => (
    <div className="space-y-8">
      {/* Personal information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Your name, contact and identity details.</p>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Full name"
              name="fullName"
              value={researcherData.fullName}
              onChange={handleResearcherChange}
              error={validationErrors.fullName}
              required
            />
          </div>
          <Input
            label="Email"
            name="email"
            type="email"
            value={researcherData.email}
            onChange={handleResearcherChange}
            error={validationErrors.email}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={researcherData.password}
            onChange={handleResearcherChange}
            error={validationErrors.password}
            hint="Use 8+ characters with uppercase, lowercase, number, and special character."
            required
            minLength={8}
          />
          <div className="sm:col-span-2">
            <PasswordChecklist password={researcherData.password} />
          </div>
          <Input
            label="NIC"
            name="nic"
            value={researcherData.nic}
            onChange={handleResearcherChange}
            error={validationErrors.nic}
            required
          />
          <Select
            label="Gender"
            name="gender"
            value={researcherData.gender}
            onChange={handleResearcherChange}
            error={validationErrors.gender}
            options={[{ value: '', label: 'Select' }, 'Male', 'Female', 'Non-binary', 'Other']}
            required
          />
        </div>
      </Card>

      {/* Academic & workplace */}
      <Card>
        <CardHeader>
          <CardTitle>Academic & workplace</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Your current affiliation and qualification.</p>
        </CardHeader>
        <div className="space-y-4">
          <Input
            label="Current workplace"
            name="currentWorkplace"
            value={researcherData.currentWorkplace}
            onChange={handleResearcherChange}
            error={validationErrors.currentWorkplace}
            placeholder="University, institute or organization"
            required
          />
          <Input
            label="Highest academic qualification"
            name="highestAcademicQualification"
            value={researcherData.highestAcademicQualification}
            onChange={handleResearcherChange}
            error={validationErrors.highestAcademicQualification}
            placeholder="e.g. PhD, MSc, BSc"
            required
          />
          <Select
            label="Researcher type"
            name="researcherType"
            value={researcherData.researcherType}
            onChange={handleResearcherChange}
            options={RESEARCHER_TYPES}
          />
          {researcherData.researcherType === 'Other' && (
            <Input
              label="Please specify"
              name="otherResearcherTypeExplanation"
              value={researcherData.otherResearcherTypeExplanation}
              onChange={handleResearcherChange}
              error={validationErrors.otherResearcherTypeExplanation}
              required
            />
          )}
          {researcherData.researcherType === 'Affiliated to Organization' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Affiliation proof (image or PDF) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                name="affiliationProof"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                onChange={(e) => {
                  setAffiliationFile(e.target.files?.[0] || null);
                  if (validationErrors.affiliationProof) setValidationErrors((p) => ({ ...p, affiliationProof: null }));
                }}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              {validationErrors.affiliationProof && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.affiliationProof}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Upload a document or image proving your affiliation.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Publications */}
      <Card>
        <CardHeader>
          <CardTitle>Publications</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Optional: link to previous research if applicable.</p>
        </CardHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="hasPublishedResearch"
              checked={researcherData.hasPublishedResearch}
              onChange={handleResearcherChange}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-700">I have previously published research</span>
          </label>
          {researcherData.hasPublishedResearch && (
            <Input
              label="Publication site or reference link"
              name="publicationSiteOrLink"
              value={researcherData.publicationSiteOrLink}
              onChange={handleResearcherChange}
              error={validationErrors.publicationSiteOrLink}
              placeholder="URL or journal name"
              required
            />
          )}
        </div>
      </Card>

      {/* Research purpose */}
      <Card>
        <CardHeader>
          <CardTitle>Research purpose</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Describe why you need access as a researcher.</p>
        </CardHeader>
        <Textarea
          label="Purpose / need of research"
          name="purpose"
          value={researcherData.purpose}
          onChange={handleResearcherChange}
          error={validationErrors.purpose}
          rows={4}
          placeholder="Describe your research purpose and need..."
          required
        />
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 py-8 sm:py-12">
      <Card className="w-full max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <h2 className="text-2xl font-bold text-blue-600">Create account</h2>
          <div className="flex rounded-lg border border-gray-200 p-0.5 mt-4">
            <button
              type="button"
              onClick={() => switchUserType(USER_TYPE_PARTICIPANT)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                userType === USER_TYPE_PARTICIPANT ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Participant
            </button>
            <button
              type="button"
              onClick={() => switchUserType(USER_TYPE_RESEARCHER)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                userType === USER_TYPE_RESEARCHER ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Researcher
            </button>
          </div>
          {userType === USER_TYPE_PARTICIPANT && (
            <p className="text-sm text-gray-500 mt-3">Step {step} of 5</p>
          )}
          {userType === USER_TYPE_RESEARCHER && (
            <p className="text-sm text-gray-500 mt-3">Register as a researcher. Admin approval required before you can sign in.</p>
          )}
        </CardHeader>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {userType === USER_TYPE_PARTICIPANT && (
            <>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              {step === 5 && renderStep5()}
            </>
          )}
          {userType === USER_TYPE_RESEARCHER && renderResearcherForm()}

          <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-gray-200">
            {userType === USER_TYPE_PARTICIPANT ? (
              <>
                {step > 1 ? (
                  <Button type="button" variant="secondary" onClick={handlePrev}>
                    Back
                  </Button>
                ) : (
                  <Link to="/login" className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Login instead
                  </Link>
                )}
                {step < 5 ? (
                  <Button type="button" onClick={handleNext} className="!bg-blue-600 hover:!bg-blue-700 focus:!ring-blue-600">
                    Next step
                  </Button>
                ) : (
                  <Button type="submit" className="!bg-blue-600 hover:!bg-blue-700 focus:!ring-blue-600">Complete registration</Button>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Login instead
                </Link>
                <Button type="submit" className="!bg-blue-600 hover:!bg-blue-700 focus:!ring-blue-600">Submit for review</Button>
              </>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Signup;
