import type { CareerPackage } from '@/types/domain';

export interface PackageProcessStep {
  title: string;
  description: string;
}

export interface PackageFaqItem {
  question: string;
  answer: string;
}

export interface PackageDetailContent {
  bestFor: string;
  preparation: string[];
  process: PackageProcessStep[];
  importantNote?: string;
  faqs: PackageFaqItem[];
}

type PackageSpecificContent = Omit<PackageDetailContent, 'faqs'> & {
  faqs?: PackageFaqItem[];
};

const PACKAGE_CONTENT: Record<string, PackageSpecificContent> = {
  'golden signature package': {
    bestFor:
      'Professionals who want their CV, cover letter, LinkedIn profile, and application materials to present one coordinated career story.',
    preparation: [
      'Your current CV or a complete employment history',
      'The roles, industries, and locations you are targeting',
      'Key achievements, projects, qualifications, and certifications',
      'Your LinkedIn profile link and examples of relevant vacancies',
    ],
    process: [
      {
        title: 'Career direction review',
        description:
          'We review your experience, goals, and target opportunities before shaping the content direction.',
      },
      {
        title: 'Coordinated document development',
        description:
          'The included documents and profile content are developed around one consistent professional position.',
      },
      {
        title: 'Review and final delivery',
        description:
          'You review the completed work and use the included revision rounds to refine the agreed scope.',
      },
    ],
    importantNote:
      'The exact handling of job-application submissions is confirmed with SANAD before work begins. Never send account passwords through an enquiry message.',
  },
  'career excellence package': {
    bestFor:
      'Professionals who need a coordinated CV, cover letter, and LinkedIn profile without the additional job-application file.',
    preparation: [
      'Your current CV or complete career history',
      'Your target roles and preferred industries',
      'Measurable achievements, projects, and qualifications',
      'Your LinkedIn profile link and a relevant job description if available',
    ],
    process: [
      {
        title: 'Positioning review',
        description:
          'We identify the experience and strengths that should lead your professional story.',
      },
      {
        title: 'Content alignment',
        description:
          'Your CV, cover letter, and LinkedIn content are aligned for a consistent presentation.',
      },
      {
        title: 'Review and delivery',
        description:
          'You review the work and request refinements within the included revision allowance.',
      },
    ],
  },
  'professional distinction package': {
    bestFor:
      'Professionals who want a focused CV and matching cover letter for a clear, consistent application.',
    preparation: [
      'Your current CV or employment and education history',
      'The target role or a representative vacancy',
      'Important achievements, skills, and qualifications',
      'Any context that should be reflected in the cover letter',
    ],
    process: [
      {
        title: 'Application review',
        description:
          'We review your background and the type of opportunity you plan to pursue.',
      },
      {
        title: 'CV and letter development',
        description:
          'Both documents are shaped around the same professional message and priorities.',
      },
      {
        title: 'Final review',
        description:
          'You review the paired documents and use the included revision to refine the agreed content.',
      },
    ],
  },
  'professional cv': {
    bestFor:
      'Professionals who need a standalone CV with clearer structure, stronger achievement positioning, and ATS-conscious content.',
    preparation: [
      'Your existing CV, if available',
      'Employment, education, project, and certification details',
      'Examples of results and measurable achievements',
      'Your target role or a representative job description',
    ],
    process: [
      {
        title: 'Information review',
        description:
          'We review your career history, goals, and the information available for the CV.',
      },
      {
        title: 'Writing and structure',
        description:
          'Your experience is rewritten and organized for clarity, relevance, and easier scanning.',
      },
      {
        title: 'Revision and delivery',
        description:
          'You review the completed CV and request refinements within the included revision rounds.',
      },
    ],
  },
  'linkedin profile optimization': {
    bestFor:
      'Professionals who want a clearer LinkedIn headline, About section, experience narrative, and overall profile direction.',
    preparation: [
      'Your LinkedIn profile link or current profile text',
      'Your target roles, industries, and professional direction',
      'Your current CV or a summary of your experience',
      'Key projects, results, strengths, and qualifications',
    ],
    process: [
      {
        title: 'Profile review',
        description:
          'We assess the current profile against your target professional direction.',
      },
      {
        title: 'Content optimization',
        description:
          'Core profile sections are refined to improve clarity, consistency, and career relevance.',
      },
      {
        title: 'Guidance and handover',
        description:
          'You receive the optimized content and practical guidance for improving the overall profile.',
      },
    ],
    importantNote:
      'The service covers the profile sections listed in the package scope. Any direct access or implementation arrangement must be confirmed separately with SANAD.',
  },
  'job application service': {
    bestFor:
      'Professionals who need an organized workflow for target opportunities, application documents, and submission preparation.',
    preparation: [
      'Your current CV and available application documents',
      'Target roles, preferred industries, and locations',
      'Examples of suitable vacancies or selection criteria',
      'Your application priorities and any relevant deadlines',
    ],
    process: [
      {
        title: 'Target criteria review',
        description:
          'We confirm the type of opportunities and the application priorities relevant to your search.',
      },
      {
        title: 'Application preparation',
        description:
          'The opportunity list, supporting documents, and submission workflow are organized within the agreed scope.',
      },
      {
        title: 'Checklist handover',
        description:
          'You receive a clear application checklist and review the prepared workflow before completion.',
      },
    ],
    importantNote:
      'The number of opportunities, service period, platforms, and any submission assistance are confirmed before work begins. Never share account passwords by WhatsApp or an unsecured form.',
  },
};

function getCommonFaqs(packageItem: CareerPackage): PackageFaqItem[] {
  const revisionText =
    packageItem.maxRevisions === 1
      ? 'one revision round'
      : `${packageItem.maxRevisions} revision rounds`;

  return [
    {
      question: 'What do you need from me to begin?',
      answer:
        'Start with the preparation list on this page. SANAD will confirm any additional information required for your specific background and target role before work begins.',
    },
    {
      question: 'How do the included revisions work?',
      answer: `This service includes ${revisionText}. Revisions refine the agreed service scope and are coordinated after you review the first completed version.`,
    },
    {
      question: 'Does this service guarantee interviews or employment?',
      answer:
        'No. The service improves the clarity and presentation of your professional materials, but hiring decisions remain with employers and cannot be guaranteed.',
    },
  ];
}

export function getPackageDetailContent(
  packageItem: CareerPackage,
): PackageDetailContent {
  const specific = PACKAGE_CONTENT[packageItem.name.trim().toLowerCase()];

  if (specific) {
    return {
      ...specific,
      faqs: [...(specific.faqs ?? []), ...getCommonFaqs(packageItem)],
    };
  }

  return {
    bestFor:
      'Professionals looking for focused support with the career-service deliverables listed in this package.',
    preparation: [
      'Your current professional documents, if available',
      'Your employment, education, and qualification details',
      'Your target role, industry, or a representative vacancy',
      'Relevant achievements, projects, and priorities',
    ],
    process: [
      {
        title: 'Requirements review',
        description:
          'SANAD confirms your goals, available information, and the package scope.',
      },
      {
        title: 'Service development',
        description:
          'The included deliverables are prepared around the agreed professional direction.',
      },
      {
        title: 'Review and completion',
        description:
          'You review the work and request refinements within the included revision allowance.',
      },
    ],
    faqs: getCommonFaqs(packageItem),
  };
}
