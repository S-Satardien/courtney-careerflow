import {
  CoverLetterTone,
  JobCategory,
  JobListing,
  MatchAnalysis,
  TailoredDocuments,
} from '@/types/job';
import { courtneyProfile } from '@/data/courtney-profile';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CourtneyTailorEngine');

interface WeightedSkill {
  term: string;
  label: string;
  tracks: JobCategory[];
}

// Comprehensive competency catalog extracted directly from Courtney James's CV
const COURTNEY_SKILLS: WeightedSkill[] = [
  // Teaching & Education
  { term: 'english', label: 'English HL/FAL', tracks: ['teaching', 'npo'] },
  { term: 'life orientation', label: 'Life Orientation', tracks: ['teaching', 'npo'] },
  { term: 'pgce', label: 'UCT PGCE', tracks: ['teaching', 'npo', 'admin'] },
  { term: 'sace', label: 'Valid SACE', tracks: ['teaching'] },
  { term: 'senior phase', label: 'Senior Phase', tracks: ['teaching'] },
  { term: 'fet phase', label: 'FET Phase', tracks: ['teaching'] },
  { term: 'intermediate phase', label: 'Intermediate Phase', tracks: ['teaching'] },
  { term: 'caps', label: 'CAPS Curriculum', tracks: ['teaching'] },
  { term: 'ieb', label: 'IEB / Independent', tracks: ['teaching'] },
  { term: 'inclusive', label: 'Inclusive Education', tracks: ['teaching', 'npo'] },
  { term: 'differentiated', label: 'Differentiated Instruction', tracks: ['teaching', 'npo'] },
  { term: 'pastoral', label: 'Pastoral Care', tracks: ['teaching', 'npo'] },
  { term: 'literature', label: 'English Literature', tracks: ['teaching'] },
  { term: 'literacy', label: 'Literacy Development', tracks: ['teaching', 'npo'] },
  { term: 'drama', label: 'Drama & Creative Writing', tracks: ['teaching'] },
  { term: 'hockey', label: 'Girls’ Hockey (Head of Code)', tracks: ['teaching'] },
  { term: 'tefl', label: 'i-to-i TEFL', tracks: ['teaching'] },
  { term: 'online', label: 'Online Teaching & Resources', tracks: ['teaching', 'admin'] },
  { term: 'whiteboard', label: 'Interactive Whiteboard', tracks: ['teaching'] },
  { term: 'police clearance', label: 'Clear Police Clearance', tracks: ['teaching', 'npo'] },

  // NPO, Mental Health & Neurodiversity
  { term: 'neurodiversity', label: 'Neurodiversity', tracks: ['teaching', 'npo'] },
  { term: 'autism', label: 'Autism Spectrum Support', tracks: ['teaching', 'npo'] },
  { term: 'mental health', label: 'Youth Mental Health (Be There)', tracks: ['teaching', 'npo'] },
  { term: 'wellbeing', label: 'Learner Wellbeing', tracks: ['teaching', 'npo'] },
  { term: 'coaching', label: 'Transformation & Child Coaching', tracks: ['teaching', 'npo', 'admin'] },
  { term: 'youth', label: 'Youth Development', tracks: ['npo', 'teaching'] },
  { term: 'volunteer', label: 'Volunteer Development (SHAWCO)', tracks: ['npo'] },
  { term: 'curriculum', label: 'Curriculum Design', tracks: ['teaching', 'npo', 'admin'] },
  { term: 'community', label: 'Community Engagement', tracks: ['npo', 'teaching'] },
  { term: 'non-profit', label: 'NPO Operations (ASF/SHAWCO)', tracks: ['npo', 'admin'] },
  { term: 'npo', label: 'NPO Sector', tracks: ['npo', 'admin'] },
  { term: 'ngo', label: 'NGO Programme Support', tracks: ['npo', 'admin'] },
  { term: 'donor', label: 'Programme & Financial Reporting', tracks: ['npo', 'admin'] },
  { term: 'bursary', label: 'Scholar / Bursary Admin (ASF)', tracks: ['npo', 'admin'] },
  { term: 'social', label: 'Social & Emotional Facilitation', tracks: ['npo', 'teaching'] },

  // Admin, L&D, HR & Project Management
  { term: 'learning and development', label: 'L&D Coordination (PSG)', tracks: ['admin', 'npo'] },
  { term: 'learning & development', label: 'L&D Coordination (PSG)', tracks: ['admin', 'npo'] },
  { term: 'l&d', label: 'L&D Coordination', tracks: ['admin'] },
  { term: 'cpd', label: 'CPD Accreditation', tracks: ['admin'] },
  { term: 'training', label: 'Staff & Graduate Training', tracks: ['admin', 'npo'] },
  { term: 'project manager', label: 'Project Management (Novque)', tracks: ['admin', 'npo'] },
  { term: 'project coordinat', label: 'Project Coordination', tracks: ['admin', 'npo'] },
  { term: 'programme coordinat', label: 'Programme Coordination', tracks: ['npo', 'admin'] },
  { term: 'executive assistant', label: 'Executive Assistant (PSG)', tracks: ['admin'] },
  { term: 'calendar', label: 'Executive Calendar Mgmt', tracks: ['admin'] },
  { term: 'hr', label: 'HR Operations Support', tracks: ['admin'] },
  { term: 'recruitment', label: 'Graduate Recruitment Support', tracks: ['admin'] },
  { term: 'performance management', label: 'Performance Mgmt Admin', tracks: ['admin'] },
  { term: 'stakeholder', label: 'Stakeholder Management', tracks: ['admin', 'npo'] },
  { term: 'budget', label: 'Budget & Expense Tracking', tracks: ['admin', 'npo'] },
  { term: 'logistics', label: 'Logistical & Event Coordination', tracks: ['admin', 'npo'] },
  { term: 'reporting', label: 'Financial & Programme Reporting', tracks: ['admin', 'npo'] },
  { term: 'academic admin', label: 'Academic Administration', tracks: ['admin', 'teaching'] },
  { term: 'administrative', label: 'Administrative Operations', tracks: ['admin', 'npo'] },
];

/**
 * Strict Teaching Subject Gate:
 * Returns true ONLY if a teaching vacancy is genuinely for English and/or Life Orientation.
 * Explicitly excludes Maths, Sciences, Geography, History, Accounting, EMS, Afrikaans,
 * isiXhosa, Sports Coaching, Foundation Phase, and generic Learning/Academic Support roles.
 *
 * @param title - Job title
 */
export function isStrictEnglishOrLoTeaching(title: string): boolean {
  const t = title.toLowerCase();

  // Must explicitly mention English or Life Orientation (or LO / Lewensoriëntering)
  const hasEnglishOrLo =
    /\benglish\b|life\s+orientation|\bl\.?o\.?\b|lewensori/i.test(t);
  if (!hasEnglishOrLo) {
    return false;
  }

  // Exclude teaching posts whose primary focus requires an unrelated non-English/LO subject
  const hasUnrelatedSubject =
    /\b(geography|mathematics|maths|math\s+lit|physical\s+science|natural\s+science|life\s+science|biology|chemistry|physics|accounting|economics|\bems\b|business\s+studies|afrikaans|isixhosa|isizulu|french|german|history|technology|robotics|coding|music|visual\s+art|creative\s+arts|foundation\s+phase|grade\s*[1-6]|grades\s*[1-6]|pre-?primary|ecd|swimming|water\s+polo|rugby|cricket)\b/i.test(
      t
    );

  if (hasUnrelatedSubject) {
    return false;
  }

  return true;
}

/**
 * Classifies a job posting into one of Courtney's three target career tracks.
 *
 * @param title - Job title
 * @param description - Job description text
 * @param company - Employer / school / NPO name
 */
export function classifyJobCategory(
  title: string,
  description: string,
  company: string = ''
): JobCategory {
  const titleLower = title.toLowerCase();
  const fullLower = `${title} ${company} ${description}`.toLowerCase();

  // Primary teaching signals
  if (
    /(teacher|educator|lecturer|tutor|english hl|english fal|life orientation|senior phase|fet phase|intermediate phase|high school|learning support|academic support)/i.test(
      titleLower
    )
  ) {
    return 'teaching';
  }

  // NPO / NGO / community / youth / social impact signals
  if (
    /(npo|ngo|non-profit|nonprofit|charity|foundation|trust|youth development|community|volunteer|literacy|shawco|scholar|social impact|christel house|leap|equal education|ikamva|waves for change|little lions|action appointments|yearbeyond|olico|natural justice|tcoe|environmental justice)/i.test(
      fullLower
    )
  ) {
    return 'npo';
  }

  // Fallback check if description strongly indicates school teaching
  if (/sace\s+regist|grades?\s*(8|9|10|11|12)|caps\s+curriculum/i.test(fullLower)) {
    return 'teaching';
  }

  return 'admin';
}

/**
 * Analyzes the semantic fit between a Western Cape job listing and Courtney James's CV.
 * Computes a weighted 0–100 score across Qualifications, Experience, and Western Cape Sector Fit.
 *
 * @param title - Job title
 * @param description - Job description text
 * @param requirements - Extracted requirements list
 * @param category - Classified career track
 * @param location - Job location string
 */
export function analyzeJobMatch(
  title: string,
  description: string,
  requirements: string[] = [],
  category: JobCategory = 'teaching',
  location: string = 'Cape Town, Western Cape'
): MatchAnalysis {
  const corpus = `${title} ${description} ${requirements.join(' ')}`.toLowerCase();
  const matchedLabels = new Set<string>();

  for (const skill of COURTNEY_SKILLS) {
    if (corpus.includes(skill.term)) {
      matchedLabels.add(skill.label);
    }
  }

  // Detect potential gap keywords (useful transparency for Courtney)
  const potentialGaps: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bafrikaans\s+(hl|home language|fluent|bilingual)/i, label: 'Bilingual Afrikaans' },
    { pattern: /\b(psychology\s+major|registered\s+counsellor|hpcsa)\b/i, label: 'HPCSA / Psychology Major' },
    { pattern: /\b(accounting|ems|economic\s+and\s+management)\b/i, label: 'EMS / Accounting' },
    { pattern: /\b(geography|history|physical\s+science|mathematics)\b/i, label: 'Secondary Subject Add-on' },
    { pattern: /\b(sdf|skills\s+development\s+facilitator|seta\s+assessor)\b/i, label: 'SETA Assessor / SDF' },
    { pattern: /\b(5\+\s*years|minimum\s*5\s*years)\b/i, label: '5+ Years Seniority' },
    { pattern: /\b(driver'?s?\s+licen[cs]e|own\s+transport)\b/i, label: 'Driver’s Licence' },
  ];

  const missingKeywords: string[] = [];
  for (const gap of potentialGaps) {
    if (gap.pattern.test(corpus)) {
      missingKeywords.push(gap.label);
    }
  }

  // 1. Qualifications & Credentials Score
  let qualificationsMatch = 70;
  if (category === 'teaching') {
    if (/english/i.test(title) && /life orientation|\blo\b/i.test(title)) {
      qualificationsMatch = 96;
      matchedLabels.add('English + LO Dual Specialisation');
    } else if (/english/i.test(title) && /life orientation|\blo\b/i.test(corpus)) {
      qualificationsMatch = 91;
      matchedLabels.add('English + LO Dual Specialisation');
    } else if (/english|life orientation/i.test(title)) {
      qualificationsMatch = 87;
    }
    if (/pgce|sace/i.test(corpus)) {
      qualificationsMatch = Math.min(98, qualificationsMatch + 3);
    }
  } else if (category === 'npo') {
    qualificationsMatch = 80;
    if (/education|youth|literacy|mental health|inclusive|neurodiversity|coaching/i.test(corpus)) {
      qualificationsMatch = 90;
    }
    if (/degree|pgce|english|communication/i.test(corpus)) {
      qualificationsMatch = Math.min(96, qualificationsMatch + 4);
    }
  } else {
    // admin / L&D / PM / EA
    qualificationsMatch = 78;
    if (/learning|development|l&d|cpd|training|academic|education/i.test(corpus)) {
      qualificationsMatch = 91;
    } else if (/executive assistant|project|hr|recruitment|admin/i.test(corpus)) {
      qualificationsMatch = 85;
    }
  }

  // 2. Experience & Role Fit Score (scaled cleanly across matched competencies)
  let experienceMatch = Math.min(94, 52 + matchedLabels.size * 4);
  if (category === 'teaching' && /(senior|fet|high school|grades?\s*(8|9|10|11|12))/i.test(title)) {
    experienceMatch = Math.min(98, experienceMatch + 5);
  }
  if (category === 'npo' && /(coordinator|administrator|volunteer|curriculum|programme|education)/i.test(title)) {
    experienceMatch = Math.min(96, experienceMatch + 5);
  }
  if (category === 'admin' && /(learning|development|project manager|executive assistant|academic)/i.test(title)) {
    experienceMatch = Math.min(96, experienceMatch + 5);
  }

  // 3. Western Cape & Sector Alignment
  let sectorFit = 76;
  const isWesternCape =
    /western cape|cape town|bergvliet|rondebosch|claremont|constantia|newlands|wynberg|ottery|fish hoek|sun valley|bellville|durbanville|brackenfell|century city|foreshore|paarl|stellenbosch|somerset west|crossroads|district six|pinelands|observatory/i.test(
      `${location} ${corpus}`
    );
  if (isWesternCape) {
    sectorFit = 90;
  }
  if (/southern suburbs|bergvliet|rondebosch|claremont|constantia|ottery|newlands|wynberg|cape town cbd|foreshore/i.test(location)) {
    sectorFit = 96;
  }

  // Mild penalty if secondary/specialised requirements need checking
  const gapPenalty = Math.min(10, missingKeywords.length * 3);

  const score = Math.max(
    60,
    Math.min(
      98,
      Math.round(qualificationsMatch * 0.4 + experienceMatch * 0.4 + sectorFit * 0.2) - gapPenalty
    )
  );

  const topKeywords = Array.from(matchedLabels).slice(0, 4).join(', ');
  let recommendation = `Strong profile alignment across ${topKeywords || 'UCT PGCE, English & Coordination'}.`;

  if (category === 'teaching' && score >= 88) {
    recommendation = `Prime Educator Fit: Direct match with Courtney’s UCT PGCE, BA English & Linguistics, valid SACE registration, and Bergvliet/Westerford High School English & LO experience.`;
  } else if (category === 'npo' && score >= 85) {
    recommendation = `High-Impact NPO Fit: Directly leverages SHAWCO curriculum & volunteer leadership, African Scholars Fund admin, Autism facilitation, and youth mental health training.`;
  } else if (category === 'admin' && score >= 85) {
    recommendation = `Strong Corporate/Admin Fit: Aligns directly with PSG Financial Services L&D/CPD & EA/HR experience and Novque Digital Agency project & budget management.`;
  } else if (score < 75) {
    recommendation = `Adjacent Opportunity: Emphasise transferable strengths in ${topKeywords || 'stakeholder communication, organisation, and learner-centred delivery'}.`;
  }

  return {
    score,
    breakdown: {
      qualificationsMatch,
      experienceMatch,
      sectorFit,
    },
    matchedKeywords: Array.from(matchedLabels),
    missingKeywords: missingKeywords.slice(0, 3),
    recommendation,
  };
}

/**
 * Maps a job category to the default cover letter tone.
 */
export function defaultToneForCategory(category: JobCategory): CoverLetterTone {
  if (category === 'teaching') return 'educator';
  if (category === 'npo') return 'npo';
  return 'corporate';
}

/**
 * Generates bespoke application documents (Cover Letter & Tailored CV Summary/Highlights)
 * crafted in Courtney James's authentic voice and calibrated to the selected tone.
 *
 * @param job - Target Western Cape job listing
 * @param toneOverride - Optional tone override ('educator' | 'npo' | 'corporate')
 */
export function generateTailoredDocuments(
  job: JobListing,
  toneOverride?: CoverLetterTone
): TailoredDocuments {
  const tone = toneOverride || defaultToneForCategory(job.category);
  logger.info(`Generating ${tone} application package for ${job.title} at ${job.company}`);

  const today = new Date().toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const matchedList =
    job.matchAnalysis.matchedKeywords.slice(0, 5).join(', ') ||
    'English, Life Orientation, Inclusive Education, and Programme Coordination';

  let tailoredCvSummary = courtneyProfile.trackSummaries[job.category];
  let highlightedBullets: string[] = [];
  let coverLetter = '';

  if (tone === 'educator') {
    tailoredCvSummary = `**SACE-registered, UCT-qualified Educator** (PGCE & BA in English Language, Literature & Linguistics) with Senior, FET, and Intermediate Phase teaching experience in **English and Life Orientation** at Bergvliet High School, Westerford High School, and The International School of Choueifat. Deeply committed to **inclusive, learner-centred education, neurodiversity, and youth mental health**, backed by Transformation Coaching, Little Lions Fellowship, and the Born This Way Foundation Be There Certificate. Active co-curricular leader (Head of Code Girls’ Hockey, Creative Writing Club, School Magazine).`;

    highlightedBullets = [
      `**Senior & FET Phase English & Life Orientation (Bergvliet High School & Westerford High School):** Delivered differentiated, learner-centred lessons fostering literacy, critical thinking, literature appreciation, and holistic adolescent wellbeing.`,
      `**Inclusive Education & Youth Mental Health:** Supported learners across diverse socio-economic contexts and facilitated reading, spelling, and social-emotional growth for a high-support-needs learner on the Autism spectrum; holds **Be There Certificate (2026)** and **Little Lions Fellowship (2025)**.`,
      `**Co-Curricular & Pastoral Leadership:** Head of Code for **Girls’ Hockey**, Manager of the **Creative Writing Club** and **Woman Up Society**, Co-Manager of the School Magazine, and experienced in pastoral care and progressive discipline.`,
      `**Full Compliance & Digital Readiness:** Valid **SACE Certificate**, **clear criminal record**, i-to-i TEFL online teaching experience, and **Interactive Whiteboard Training (2026)** plus strong administrative/organisational discipline.`,
    ];

    coverLetter = `**COURTNEY JAMES**
Cape Town, Western Cape • ${courtneyProfile.phone} • ${courtneyProfile.email}

${today}

**For Attention: The Principal / Hiring Committee**
${job.company}
${job.location}
Re: Application for **${job.title}**${job.referenceCode ? ` (Ref: ${job.referenceCode})` : ''}

Dear Hiring Committee,

I am writing to express my strong interest in the **${job.title}** vacancy at **${job.company}**. I am a qualified educator holding a **Postgraduate Certificate in Education (PGCE)** and a **Bachelor of Arts in English Language & Literature and Linguistics** from the **University of Cape Town (UCT)**. My academic foundation, combined with practical teaching experience across Senior, FET, and Intermediate phases, has equipped me to contribute meaningfully to a dynamic and inclusive school community.

I am deeply passionate about **inclusive education, neurodiversity, and youth mental health**, and I remain committed to continuous professional development in these areas—recently completing the **Be There Certificate** (Born This Way Foundation, 2026), **Transformation Coaching** (2025–2026), **Little Lions Fellowship** (2025), and **Educator – The Law & You** (ARISTA Training, 2026). Through my teaching roles at **Bergvliet High School**, **Westerford High School**, and internationally at **The International School of Choueifat**, as well as my community leadership with **SHAWCO Education**, I have developed a strong awareness of learners' diverse emotional and academic needs and strive to create supportive, structured classrooms where every student feels seen, valued, and capable of success.

I have a particular passion for the **English language and literature**, aiming to inspire a genuine appreciation for reading, critical thinking, and confident self-expression. Equally, I find teaching **Life Orientation** deeply rewarding as it bridges classroom learning with real-life resilience, empathy, and personal growth. Beyond the classroom, I enthusiastically contribute to school life and co-curricular programmes—having served as **Head of Code for Girls’ Hockey**, **Manager of the Creative Writing Club** and **Woman Up Society**, and **Co-Manager of the School Magazine**.

In addition to my classroom experience, my professional background in **Learning & Development Coordination (PSG Financial Services)** and **Project Management (Novque Digital Agency)** has strengthened my administrative precision, stakeholder communication, and educational technology fluency (including **Interactive Whiteboard Training, 2026** and online resource design).

I confirm that I hold a **valid SACE certificate** and a **clear criminal record**. I would warmly welcome the opportunity to discuss how my skills in **${matchedList}** can support the learners and staff at **${job.company}**.

Yours sincerely,

**Courtney James**
UCT PGCE | BA (English Language & Literature and Linguistics) | SACE Registered`;
  } else if (tone === 'npo') {
    tailoredCvSummary = `**Education, Youth Development & NPO Programme Coordinator** combining a **UCT PGCE & BA (English & Linguistics)** with proven non-profit leadership at **SHAWCO Education** (Head of Senior Curriculum & Volunteer Development) and **African Scholars Fund** (Administrative Assistant). Skilled in **curriculum design, volunteer training, learner wellbeing, neurodiversity/Autism support, budget & expense tracking, and financial/programme reporting**—backed by corporate L&D and Project Management discipline at PSG Financial Services and Novque Digital Agency.`;

    highlightedBullets = [
      `**NPO Curriculum & Volunteer Leadership (SHAWCO Education):** Led senior curriculum development and volunteer educator training (2019) following two years as a Volunteer Teacher (2017–2019) serving under-resourced Cape Town communities.`,
      `**Non-Profit & Scholar Administration (African Scholars Fund, 2020–2022):** Managed administrative workflows, scholar documentation, and programme coordination supporting deserving Western Cape high school learners.`,
      `**Programme Coordination, Budgets & Reporting (PSG & Novque, 2023–2026):** Managed cross-functional project delivery, resource/logistics coordination, **budget & expense tracking**, external stakeholder management, and **financial & programme reporting**.`,
      `**Youth Mental Health & Inclusive Support:** Direct experience mentoring a high-support-needs learner on the **Autism spectrum**, strengthened by the **Little Lions Fellowship (2025)**, **Transformation Coaching (2025–2026)**, and **Born This Way Foundation Be There Certificate (2026)**.`,
    ];

    coverLetter = `**COURTNEY JAMES**
Cape Town, Western Cape • ${courtneyProfile.phone} • ${courtneyProfile.email}

${today}

**Hiring Manager / Programme Director**
${job.company}
${job.location}
Re: Application for **${job.title}**${job.referenceCode ? ` (Ref: ${job.referenceCode})` : ''}

Dear Hiring Team,

I am writing with genuine enthusiasm to apply for the **${job.title}** role at **${job.company}**. My career sits at the intersection of **inclusive education, youth wellbeing, and structured programme delivery**—a combination shaped by my **UCT PGCE and BA (English Language, Literature & Linguistics)**, my grassroots NPO experience in Cape Town, and my recent corporate coordination roles.

Community impact has been a constant thread throughout my journey in the Western Cape. As **Head of Senior Curriculum & Volunteer Development at SHAWCO Education**, I led curriculum design and mentored volunteer educators working with learners from under-resourced schools. Concurrently, as an **Administrative Assistant at the African Scholars Fund (2020–2022)**, I supported the day-to-day operational and scholar administration essential to sustaining high-impact education bursary programmes. I also bring hands-on inclusive support experience as a **Mentor & Learning Facilitator for a learner on the Autism spectrum**, alongside recent certifications in **Little Lions Child Coaching (2025)**, **Transformation Coaching (2025–2026)**, and the **Be There Youth Mental Health Certificate (2026)**.

Equally important for an NPO environment, I bring strong operational, administrative, and reporting rigour:
• **Programme & Stakeholder Coordination:** As **Learning & Development Coordinator at PSG Financial Services (2024–2025)**, I coordinated multi-cohort training programmes, managed external stakeholders, oversaw CPD accreditation, and produced accurate **financial and programme reporting**.
• **Project Delivery & Budget Tracking:** As **Project Manager at Novque Digital Agency (2025–2026)**, I managed cross-functional communication, progress monitoring, resource logistics, and **budget and expense tracking**.
• **Learner-Centred Facilitation:** As a **SACE-registered English & Life Orientation Educator** (Bergvliet High School, Westerford High School, International School of Choueifat), I communicate warmly and effectively with young people, families, educators, and community partners alike.

I am deeply drawn to **${job.company}**'s mission in the Western Cape and would value the opportunity to bring my passion for inclusive youth development and my strengths in **${matchedList}** to your team.

Thank you for your time and consideration. I look forward to hearing from you.

Yours sincerely,

**Courtney James**
Education & NPO Programme Coordinator | UCT PGCE & BA (English & Linguistics)`;
  } else {
    // corporate / admin / L&D / PM / EA
    tailoredCvSummary = `**Learning & Development Coordinator, Project Manager & Executive/HR Administrator** holding a **UCT PGCE and BA (English Language, Literature & Linguistics)**. Proven Western Cape track record at **PSG Financial Services** (L&D Coordinator; Executive Assistant & HR Support) and **Novque Digital Agency** (Project Manager) driving **staff & graduate training programmes, CPD accreditation, cross-functional project delivery, budget & expense tracking, executive calendar & event coordination, HR operations, and stakeholder reporting**.`;

    highlightedBullets = [
      `**Project Management & Delivery (Novque Digital Agency, 2025–2026):** Led cross-functional communication, progress monitoring, logistics and resource management, and **budget & expense tracking** across concurrent client projects.`,
      `**Learning & Development Coordination (PSG Financial Services, 2024–2025):** Owned end-to-end staff and graduate training programme coordination, **CPD accreditation**, external vendor/stakeholder management, logistical coordination, and **financial & programme reporting**.`,
      `**Executive Assistant & HR Support (PSG Financial Services, 2023–2024):** Managed senior executive calendars, corporate events, HR operations, **graduate recruitment support**, and performance management administration.`,
      `**Academic & NPO Administrative Foundation:** Supported scholar operations at **African Scholars Fund (2020–2022)** and brings exceptional written communication, presentation, and facilitation skills anchored by a **UCT BA (English & Linguistics)** and **PGCE**.`,
    ];

    coverLetter = `**COURTNEY JAMES**
Cape Town, Western Cape • ${courtneyProfile.phone} • ${courtneyProfile.email}

${today}

**Talent Acquisition / Hiring Manager**
${job.company}
${job.location}
Re: Application for **${job.title}**${job.referenceCode ? ` (Ref: ${job.referenceCode})` : ''}

Dear Hiring Team,

I am excited to submit my application for the **${job.title}** position at **${job.company}**. With direct Cape Town experience spanning **Project Management (Novque Digital Agency)**, **Learning & Development Coordination**, and **Executive Assistant & HR Support (PSG Financial Services)**—paired with a **PGCE and BA in English Language, Literature & Linguistics from UCT**—I bring a blend of operational precision, articulate communication, and people-centred leadership.

Across my corporate and educational roles, I have consistently stepped into high-trust coordination positions requiring structured execution and calm stakeholder management:
• **Project & Resource Delivery:** At **Novque Digital Agency (2025–2026)**, I managed cross-functional communication, tracked project milestones, coordinated logistics and resources, and maintained tight **budget and expense tracking**.
• **Learning, Training & CPD Operations:** As **Learning & Development Coordinator at PSG Financial Services (2024–2025)**, I coordinated staff and graduate training programmes, oversaw **CPD accreditation**, liaised with external training providers, and delivered timely **financial and programme reports**.
• **Executive Support & HR Administration:** Previously as **Executive Assistant & HR Support at PSG Financial Services (2023–2024)**, I managed executive calendars, coordinated corporate events, supported **graduate recruitment**, and administered HR operations and performance reporting.
• **Education & Non-Profit Administration:** My background as a qualified **High School Educator (Bergvliet High School)** and **Administrative Assistant (African Scholars Fund)** adds deep empathy, facilitation confidence, and adaptability across academic, corporate, and social-impact teams.

My strengths in **${matchedList}** directly mirror what **${job.company}** needs in this role. I pride myself on being highly organised, proactive, and dependable—someone who keeps both intricate administrative details and bigger-picture team goals moving seamlessly.

Thank you for considering my application. I would welcome the opportunity to discuss how I can add immediate operational value to **${job.company}**.

Kind regards,

**Courtney James**
L&D, Project & Administrative Coordinator | UCT BA (English & Linguistics) & PGCE`;
  }

  return {
    coverLetter,
    tailoredCvSummary,
    highlightedBullets,
    tone,
    lastGeneratedAt: new Date().toISOString(),
  };
}
