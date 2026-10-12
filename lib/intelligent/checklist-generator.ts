import { ChecklistItem, TaskUnderstanding, UploadedIntakeFile, TargetedQuestion } from './types';

export class ChecklistGenerator {
  /**
   * Generates dynamic, content-aware checklist items tailored to the exact task and source files.
   */
  static generateChecklist(
    task: TaskUnderstanding,
    files: UploadedIntakeFile[],
    answeredQuestions: TargetedQuestion[] = [],
    existingChecklist: ChecklistItem[] = []
  ): ChecklistItem[] {
    const items: ChecklistItem[] = [];
    const combinedText = files.map((f) => f.extractedText).join('\n\n');
    const existingMap = new Map<string, ChecklistItem>();
    existingChecklist.forEach((item) => existingMap.set(item.id, item));

    // Map of answers already provided
    const answersMap = new Map<string, string>();
    answeredQuestions.forEach((q) => {
      if (q.answered && q.answer) {
        answersMap.set(q.id, q.answer);
        if (q.checklistItemId) {
          answersMap.set(q.checklistItemId, q.answer);
        }
      }
    });

    // Helper to add or preserve item
    const addItem = (item: ChecklistItem) => {
      const existing = existingMap.get(item.id);
      if (existing) {
        // Retain user decision or manual status updates
        items.push({
          ...item,
          status: existing.status === 'complete' || existing.status === 'not_applicable' ? existing.status : item.status,
          userDecision: existing.userDecision || item.userDecision,
          resolvedInVersion: existing.resolvedInVersion || item.resolvedInVersion,
          evidence: existing.evidence || item.evidence,
          sourceEvidence: existing.sourceEvidence || item.sourceEvidence || existing.evidence || item.evidence,
          answer: existing.answer !== undefined ? existing.answer : (item.answer !== undefined ? item.answer : null),
          answerConfirmed: existing.answerConfirmed ?? item.answerConfirmed ?? (existing.status === 'complete'),
          resolution: existing.resolution || item.resolution || null,
        });
      } else {
        items.push({
          ...item,
          required: item.required ?? (item.priority === 'critical' || item.priority === 'high'),
          sourceEvidence: item.sourceEvidence || item.evidence,
          answer: item.answer ?? null,
          answerConfirmed: item.answerConfirmed ?? (item.status === 'complete'),
          resolution: item.resolution ?? (item.status === 'complete' ? 'Satisfied from source data' : null),
        });
      }
    };

    // 1. Task-Specific Dynamic Categories & Items
    switch (task.taskType) {
      case 'complete_cv':
        this.buildCvChecklist(combinedText, files, answersMap, addItem);
        break;

      case 'business_proposal':
        this.buildProposalChecklist(combinedText, files, answersMap, addItem);
        break;

      case 'technical_spec':
        this.buildTechnicalSpecChecklist(combinedText, files, answersMap, addItem);
        break;

      case 'video_audio_repurpose':
        this.buildMultimediaChecklist(combinedText, files, answersMap, addItem);
        break;

      case 'spreadsheet_audit':
        this.buildSpreadsheetChecklist(combinedText, files, answersMap, addItem);
        break;

      case 'recreate_design':
        this.buildDesignChecklist(combinedText, files, answersMap, addItem);
        break;

      case 'complete_document':
      default:
        this.buildDocumentCompletionChecklist(combinedText, files, answersMap, addItem);
        break;
    }

    // 2. Add Universal Quality & Format Items
    this.buildUniversalChecklist(task, combinedText, files, answersMap, addItem);

    return items;
  }

  // ==========================================
  // TASK SPECIFIC BUILDERS
  // ==========================================
  private static buildCvChecklist(
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    // 1. Personal & Contact Details
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text) || answers.has('cv_contact_email');
    add({
      id: 'cv_contact_info',
      title: 'Full Contact Details & Professional Links',
      description: 'Candidate full name, phone number, professional email, location, and LinkedIn/GitHub profiles.',
      category: 'content',
      status: hasEmail ? 'complete' : 'missing',
      priority: 'critical',
      source: 'Source file analysis',
      validationRule: 'Must contain valid email, phone, location, and headline',
      evidence: hasEmail ? 'Email address and contact details identified' : undefined,
    });

    // 2. Executive Summary / Value Proposition
    const hasSummary = /summary|profile|about me|objective/i.test(text) || answers.has('cv_summary');
    add({
      id: 'cv_executive_summary',
      title: 'Executive Professional Summary',
      description: 'Concise 3-4 sentence value proposition highlighting core domain leadership and measurable impacts.',
      category: 'content',
      status: hasSummary ? 'complete' : 'missing',
      priority: 'high',
      source: 'Resume best practices',
      validationRule: 'Must include target role alignment and years of experience',
    });

    // 3. Work Experience with Quantifiable Metrics
    const hasMetrics = /\d+%\s|\$\d+|\b\d+\s*(?:users|clients|projects|million|k)\b/i.test(text) || answers.has('cv_metrics');
    add({
      id: 'cv_quantifiable_achievements',
      title: 'Quantifiable Career Metrics & Achievements',
      description: 'Each role should feature measurable impact metrics (revenue growth %, efficiency gains, team size).',
      category: 'data',
      status: hasMetrics ? 'complete' : 'uncertain',
      priority: 'high',
      source: 'CV content scan',
      validationRule: 'Bullet points should follow Action Verb + Task + Quantifiable Result structure',
      evidence: hasMetrics ? 'Identified performance figures in experience section' : undefined,
    });

    // 4. Skills & Competencies Architecture
    const hasSkills = /skills|technologies|proficiencies|tools/i.test(text) || answers.has('cv_skills');
    add({
      id: 'cv_categorized_skills',
      title: 'Categorized Technical & Core Competencies',
      description: 'Organized taxonomy of tools, frameworks, languages, and soft skills tailored for ATS indexing.',
      category: 'technical',
      status: hasSkills ? 'complete' : 'missing',
      priority: 'high',
      source: 'ATS standard',
      validationRule: 'Categorized by domain (e.g. Languages, Frameworks, Cloud, Methodologies)',
    });

    // 5. Education & Certifications
    const hasEdu = /education|university|degree|bachelor|master|certification/i.test(text) || answers.has('cv_education');
    add({
      id: 'cv_education_credentials',
      title: 'Education, Degrees & Professional Certifications',
      description: 'Accredited degrees, institutions, graduation years, and relevant professional credentials.',
      category: 'content',
      status: hasEdu ? 'complete' : 'missing',
      priority: 'medium',
      source: 'Academic validation',
      validationRule: 'Includes degree title, university name, and graduation year',
    });

    // 6. Blank Experience & Role Verification (Prompt Section 7 example)
    const hasBlankExp =
      /blank experience|blank period|employment gap|unemployed|\[experience\]|\[insert company\]|role:\s*_{2,}|gap in employment|not listed|responsibilities not listed/i.test(text) ||
      (text.includes('Experience:') && !/\b(20\d\d|19\d\d)\b/.test(text.slice(text.indexOf('Experience:'))));
    if (hasBlankExp || text.toLowerCase().includes('blank experience') || text.toLowerCase().includes('blank period')) {
      const hasAnswer = answers.has('cv_blank_experience');
      add({
        id: 'cv_blank_experience',
        title: 'Work Experience Gap & Role Verification',
        description: 'Verify role, organization, and dates for unpopulated career periods in the CV.',
        category: 'content',
        status: hasAnswer ? 'complete' : 'missing',
        priority: 'critical',
        required: true,
        location: 'Experience Section',
        reason: 'Recruiters require complete, accurate career timelines without invented history',
        question: 'What role or activity should cover this period? Please provide the job title, organization and dates. If you were not employed during this period, tell me whether to leave it blank or include another activity.',
        source: 'CV timeline inspection',
        validationRule: 'Must provide genuine company, job title, and date range or acknowledge intentional gap',
        answer: answers.get('cv_blank_experience') || null,
        evidence: hasAnswer ? `Resolved: "${answers.get('cv_blank_experience')}"` : undefined,
      });
    }
  }

  private static buildProposalChecklist(
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    // 1. Executive Summary
    const hasExec = /executive summary|project background|introduction/i.test(text) || answers.has('prop_exec');
    add({
      id: 'prop_executive_summary',
      title: 'Executive Summary & Business Objectives',
      description: 'Clear statement of the client problem, market opportunity, and proposed solution architecture.',
      category: 'content',
      status: hasExec ? 'complete' : 'missing',
      priority: 'critical',
      source: 'Proposal structure',
      validationRule: 'Outlines business context and strategic ROI',
    });

    // 2. Deliverables & Scope of Work
    const hasScope = /scope of work|deliverables|key features/i.test(text) || answers.has('prop_scope');
    add({
      id: 'prop_scope_of_work',
      title: 'Detailed Scope of Work & Deliverables Matrix',
      description: 'Numbered breakdown of tangible deliverables, system modules, integrations, and non-goals.',
      category: 'content',
      status: hasScope ? 'complete' : 'missing',
      priority: 'critical',
      source: 'SOW requirement',
      validationRule: 'Unambiguous list of deliverables without vague generalizations',
    });

    // 3. Pricing & Payment Schedule
    const hasPricing = /(?:\$|€|£|PKR|USD)\s*[\d,]+/i.test(text) || answers.has('prop_pricing');
    add({
      id: 'prop_investment_schedule',
      title: 'Investment Schedule & Milestone Payments',
      description: 'Transparent fee structure, milestone tranches (Deposit, Milestone 1, Final sign-off), and payment terms.',
      category: 'data',
      status: hasPricing ? 'complete' : 'missing',
      priority: 'critical',
      source: 'Commercial terms',
      validationRule: 'Itemized totals with defined due triggers',
      evidence: hasPricing ? 'Pricing figures found in uploaded files' : undefined,
    });

    // 4. Project Timeline & Milestones
    const hasTimeline = /timeline|phases|weeks|milestone|delivery date/i.test(text) || answers.has('prop_timeline');
    add({
      id: 'prop_project_timeline',
      title: 'Implementation Schedule & Milestones',
      description: 'Week-by-week delivery roadmap, client review cycles, acceptance testing, and launch date.',
      category: 'technical',
      status: hasTimeline ? 'complete' : 'uncertain',
      priority: 'high',
      source: 'Project management',
      validationRule: 'Includes milestone dates and dependencies',
    });
  }

  private static buildTechnicalSpecChecklist(
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    // 1. Architecture Overview
    add({
      id: 'tech_arch_overview',
      title: 'High-Level System Architecture & Component Diagram',
      description: 'System boundary, frontend/backend separation, microservices/modules, and storage mechanisms.',
      category: 'technical',
      status: /architecture|system design|components/i.test(text) ? 'complete' : 'missing',
      priority: 'critical',
      source: 'Spec engineering',
      validationRule: 'Defines runtime tiers, tech stack choices, and data flow',
    });

    // 2. Data Models & API Contracts
    add({
      id: 'tech_data_models',
      title: 'Data Models, Database Schema & API Contracts',
      description: 'Entity relationship schemas, request/response payload examples, status codes, and error formats.',
      category: 'data',
      status: /schema|interface|api route|endpoint|database/i.test(text) ? 'complete' : 'missing',
      priority: 'critical',
      source: 'API contract',
      validationRule: 'Explicit types and validation constraints for endpoints',
    });

    // 3. Edge Cases & Fault Tolerance
    add({
      id: 'tech_fault_tolerance',
      title: 'Failure Recovery, Rate Limits & Edge Case Protocol',
      description: 'Retries, exponential backoff, circuit breaking, concurrent write conflicts, and graceful degradation.',
      category: 'technical',
      status: /retry|fault|rate limit|edge case|error handling/i.test(text) ? 'complete' : 'uncertain',
      priority: 'high',
      source: 'Reliability engineering',
      validationRule: 'Detailed handling of network timeouts, corrupt inputs, and scale thresholds',
    });
  }

  private static buildMultimediaChecklist(
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    add({
      id: 'media_aspect_ratio',
      title: 'Target Aspect Ratio & Resolution Specification',
      description: '16:9 Landscape (YouTube/Web) vs 9:16 Vertical (TikTok/Reels/Shorts) vs 1:1 Square.',
      category: 'design',
      status: answers.has('media_aspect_ratio') ? 'complete' : 'missing',
      priority: 'critical',
      source: 'Video production',
      validationRule: 'Explicit pixel dimensions and aspect ratio specified',
    });

    add({
      id: 'media_subtitles_captions',
      title: 'Captions, Transcripts & Subtitle Timing',
      description: 'Accurate time-synced transcript cues, open/closed caption burn-in specifications.',
      category: 'content',
      status: /transcript|captions|subtitles/i.test(text) ? 'complete' : 'uncertain',
      priority: 'high',
      source: 'Accessibility & Engagement',
      validationRule: 'Includes timestamp markers and speaker identification',
    });

    add({
      id: 'media_hook_cta',
      title: 'Introduction Hook & Call-to-Action (CTA)',
      description: 'First 3-5 seconds retention hook, body narrative pacing, and closing viewer conversion CTA.',
      category: 'content',
      status: answers.has('media_cta') ? 'complete' : 'uncertain',
      priority: 'high',
      source: 'Audience retention',
      validationRule: 'Strong verbal/visual hook and clear closing action',
    });

    // 4. Closing Screen / Outro verification
    const hasOutroAnswer = answers.has('video_closing_screen');
    add({
      id: 'video_closing_screen',
      title: 'Closing Screen, Outro & Final Frame Specification',
      description: 'Define closing screen branding, contact details, call to action card, or freeze frame.',
      category: 'content',
      status: hasOutroAnswer ? 'complete' : 'missing',
      priority: 'high',
      required: true,
      location: 'Final Frame / Outro',
      reason: 'Prevents abrupt video termination and ensures viewer knows next action or brand owner',
      question: 'Should the video end with your brand logo, contact details, a call to action, or the existing final frame?',
      source: 'Video analysis',
      validationRule: 'Confirmed ending asset or instruction (logo, contacts, CTA, or existing frame)',
      answer: answers.get('video_closing_screen') || null,
      evidence: hasOutroAnswer ? `Resolved: "${answers.get('video_closing_screen')}"` : undefined,
    });
  }

  private static buildSpreadsheetChecklist(
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    const hasBlanks = files.some((f) => f.potentialGaps.some((g) => g.includes('empty or unpopulated')));
    add({
      id: 'sheet_missing_cell_reconciliation',
      title: 'Missing & Blank Cell Reconciliation',
      description: 'Distinguish between intentionally omitted cells vs corrupted/missing source data.',
      category: 'data',
      status: hasBlanks ? 'missing' : 'complete',
      priority: 'critical',
      source: 'Data integrity audit',
      validationRule: 'Every blank cell confirmed as intentional or filled with computed fallback',
    });

    add({
      id: 'sheet_calculation_validation',
      title: 'Formula & Mathematical Aggregation Verification',
      description: 'Verify row sums, column totals, cross-sheet references, and business rule formulas.',
      category: 'technical',
      status: 'uncertain',
      priority: 'high',
      source: 'Financial validation',
      validationRule: 'Formulas and totals reconcile with 100% precision',
    });
  }

  private static buildDesignChecklist(
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    add({
      id: 'design_color_palette',
      title: 'Brand Color Palette & Design Tokens',
      description: 'Primary, secondary, neutral, and accent hex codes extracted and aligned with brand guidelines.',
      category: 'design',
      status: /#([0-9a-f]{3}|[0-9a-f]{6})\b/i.test(text) ? 'complete' : 'uncertain',
      priority: 'high',
      source: 'Design system',
      validationRule: 'Hex color codes documented with contrast ratios',
    });

    add({
      id: 'design_responsive_layouts',
      title: 'Mobile, Tablet & Desktop Layout Breakpoints',
      description: 'Grid systems, flex alignments, and responsive behavior across screen form factors.',
      category: 'design',
      status: answers.has('design_breakpoints') ? 'complete' : 'missing',
      priority: 'critical',
      source: 'UI specification',
      validationRule: 'Defines mobile (375px), tablet (768px), and desktop (1280px) adaptation',
    });

    // Lower area empty whitespace resolution
    const hasEmptyAreaAnswer = answers.has('design_empty_area');
    add({
      id: 'design_empty_area',
      title: 'Unpopulated Lower Design Area / Whitespace Resolution',
      description: 'Resolve intentional whitespace vs missing logo, contact information, or CTA element in the lower region.',
      category: 'design',
      status: hasEmptyAreaAnswer ? 'complete' : 'missing',
      priority: 'high',
      required: true,
      location: 'Bottom Section (Y: 800-1080px)',
      reason: 'Distinguishes an intentionally empty design area from a genuinely missing element',
      question: 'Should this area contain a logo, contact information, a call to action, or should it remain empty?',
      source: 'Visual analysis',
      validationRule: 'Explicit user confirmation whether space is intentional or requires content',
      answer: answers.get('design_empty_area') || null,
      evidence: hasEmptyAreaAnswer ? `Resolved: "${answers.get('design_empty_area')}"` : undefined,
    });
  }

  private static buildDocumentCompletionChecklist(
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    const hasPlaceholders = /\[(?:insert|tbd|todo|fill in|\.\.\.)\]|\{\{[^}]+\}\}/i.test(text);
    add({
      id: 'doc_placeholder_elimination',
      title: 'Template Placeholder Elimination',
      description: 'Identify and replace every placeholder tag ([Insert Date], {{CLIENT_NAME}}, [TBD]) with verified facts.',
      category: 'content',
      status: hasPlaceholders ? 'missing' : 'complete',
      priority: 'critical',
      source: 'Document inspection',
      validationRule: 'Zero unreplaced bracketed or mustache placeholder tokens',
      evidence: hasPlaceholders ? 'Unfilled placeholders detected in source document' : 'No placeholder markers detected',
    });

    add({
      id: 'doc_party_signatures',
      title: 'Signatories & Execution Clause Verification',
      description: 'Names, designations, corporate entities, and signature lines verified for all executing parties.',
      category: 'content',
      status: /signature|signatory|authorized representative/i.test(text) ? 'complete' : 'uncertain',
      priority: 'high',
      source: 'Legal execution',
      validationRule: 'Includes party names, title, date line, and signature field',
    });

    // Project completion date verification
    const hasDate = /(?:completion date|effective date|target date)[:\s]+(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i.test(text) || answers.has('doc_completion_date');
    if (!hasDate || text.toLowerCase().includes('completion date')) {
      const hasDateAns = answers.has('doc_completion_date');
      add({
        id: 'doc_completion_date',
        title: 'Project Completion Date Verification',
        description: 'Verify project completion / target delivery date referenced in contract terms.',
        category: 'data',
        status: hasDateAns ? 'complete' : (hasDate ? 'complete' : 'missing'),
        priority: 'critical',
        required: true,
        location: 'Schedule & Execution Terms',
        reason: 'The document references a project completion date that does not appear in the supplied material',
        question: 'What is the correct completion date?',
        source: 'Document terms analysis',
        validationRule: 'Explicit date string verified or supplied',
        answer: answers.get('doc_completion_date') || null,
        evidence: hasDateAns ? `Resolved: "${answers.get('doc_completion_date')}"` : undefined,
      });
    }
  }

  // ==========================================
  // UNIVERSAL QUALITY ITEMS
  // ==========================================
  private static buildUniversalChecklist(
    task: TaskUnderstanding,
    text: string,
    files: UploadedIntakeFile[],
    answers: Map<string, string>,
    add: (item: ChecklistItem) => void
  ) {
    // 1. Fact Preservation
    add({
      id: 'qual_fact_preservation',
      title: 'Strict Factual & Numeric Preservation',
      description: 'Ensure dates, prices, quantities, email addresses, and legal terms from original files are preserved 100% verbatim.',
      category: 'verification',
      status: 'complete',
      priority: 'critical',
      source: 'Quality Guard system',
      validationRule: 'Numbers and extracted entities match source files without hallucination',
      evidence: `${files.reduce((acc, f) => acc + f.extractedFacts.length, 0)} extracted factual entities tracked`,
    });

    // 2. Deliverable Export Fidelity
    add({
      id: 'qual_format_compliance',
      title: `Export Format & Delivery Fidelity (${task.targetFormat.toUpperCase()})`,
      description: `Format the final output strictly in accordance with target format ${task.targetFormat.toUpperCase()} and proper layout rules.`,
      category: 'format',
      status: 'in_progress',
      priority: 'high',
      source: 'User delivery requirement',
      validationRule: `Valid syntax and high-fidelity rendering for .${task.targetFormat}`,
    });

    // 3. User Decisions & Guidance Conformance
    add({
      id: 'qual_user_intent_conformance',
      title: 'User Prompt & Goal Alignment',
      description: `Satisfy the explicit objective: "${task.goal}"`,
      category: 'content',
      status: 'in_progress',
      priority: 'critical',
      source: 'User Prompt',
      validationRule: 'Output directly fulfills all explicit prompts and feedback answers',
    });
  }
}
