import type { CareerPackage } from '@/types/domain';

const questions: Record<string, string[]> = {
  'professional cv': [
    'Which language, file formats and page count are included?',
    'Does the scope cover writing from scratch, updating an existing CV, or both?',
  ],
  'professional distinction package': [
    'Is the cover letter tailored to one vacancy or provided as a reusable template?',
    'How does the included revision round apply across the CV and cover letter?',
  ],
  'career excellence package': [
    'How does the scope differ from ordering CV + Cover Letter and LinkedIn separately?',
    'Do you receive LinkedIn text to add yourself, or is implementation included?',
  ],
  'golden signature package': [
    'What exactly is included in the Job Application File?',
    'How does that file differ from the standalone Job Application Service?',
    'Is submission assistance included, and if so, for how many opportunities?',
  ],
  'linkedin profile optimization': [
    'Which profile sections and languages are included?',
    'Will you receive ready-to-use text and guidance, or is implementation included?',
  ],
  'job application service': [
    'Does SANAD submit applications, or provide preparation and a checklist only?',
    'How many opportunities, which platforms and what service period are covered?',
    'What application tracking or follow-up deliverable will you receive?',
  ],
};

export function getScopeQuestions(packageItem: CareerPackage): string[] {
  return (
    questions[packageItem.name.trim().toLowerCase()] ?? [
      'Which deliverables, formats and languages are included?',
      'What is outside the published scope?',
    ]
  );
}
