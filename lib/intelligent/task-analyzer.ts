import { TaskUnderstanding, UploadedIntakeFile } from './types';

export class TaskAnalyzer {
  /**
   * Understand the user's intended goal, requirements, and output preferences.
   */
  static analyzeTask(
    userPrompt: string,
    files: UploadedIntakeFile[]
  ): TaskUnderstanding {
    const promptLower = userPrompt.toLowerCase();
    const fileNames = files.map((f) => f.fileName.toLowerCase()).join(' ');
    const combinedSample = files.map((f) => f.extractedText.slice(0, 1500)).join(' ').toLowerCase();

    // 1. Identify Task Type
    let taskType = 'general_deliverable';
    let deliverableTitle = 'Completed Task Deliverable';
    let targetFormat: 'markdown' | 'docx' | 'pdf' | 'html' | 'txt' | 'json' = 'markdown';
    let goal = 'Deliver an intelligent, fully verified output meeting all specified user requirements.';
    let targetAudience = 'Professional Stakeholders';
    let toneAndStyle = 'Clear, authoritative, professional, and well-structured';

    if (promptLower.includes('cv') || promptLower.includes('resume') || fileNames.includes('cv') || fileNames.includes('resume') || combinedSample.includes('curriculum vitae')) {
      taskType = 'complete_cv';
      deliverableTitle = 'Executive Professional Resume / CV';
      goal = 'Complete and optimize professional CV, resolving gaps in employment dates, quantifiable achievements, core competencies, and contact details.';
      targetAudience = 'Hiring Managers & Executive Recruiters';
      toneAndStyle = 'Impact-oriented, ATS-optimized, metric-driven with strong active verbs';
      targetFormat = 'markdown';
    } else if (promptLower.includes('video') || promptLower.includes('audio') || files.some((f) => f.category === 'video' || f.category === 'audio')) {
      taskType = 'video_audio_repurpose';
      deliverableTitle = 'Multimedia Production Package & Transcripts';
      goal = 'Synthesize audio/video content into structured chapters, timestamps, social clips, captions, and distribution copy.';
      targetAudience = 'Audience Viewers & Content Production Teams';
      toneAndStyle = 'Engaging, concise, timestamp-indexed, and action-driven';
      targetFormat = 'markdown';
    } else if (promptLower.includes('sheet') || promptLower.includes('excel') || promptLower.includes('csv') || files.some((f) => f.category === 'spreadsheet')) {
      taskType = 'spreadsheet_audit';
      deliverableTitle = 'Audited Tabular Dataset & Data Report';
      goal = 'Audit tabular datasets, detect anomalous empty values, validate calculation formulas, and produce clean structured outputs.';
      targetAudience = 'Data Analysts & Finance Managers';
      toneAndStyle = 'Rigorous, data-centric, and analytical';
      targetFormat = 'markdown';
    } else if (promptLower.includes('design') || promptLower.includes('recreate') || promptLower.includes('mockup') || files.some((f) => f.category === 'image')) {
      taskType = 'recreate_design';
      deliverableTitle = 'UI/UX Design Specification & Component Assets';
      goal = 'Translate visual references and assets into structured layout specifications, typography scales, color palettes, and responsive components.';
      targetAudience = 'Frontend Developers & Product Designers';
      toneAndStyle = 'Design-system compliant, modern, responsive, and token-oriented';
      targetFormat = 'markdown';
    } else if (promptLower.includes('proposal') || promptLower.includes('bid') || promptLower.includes('pitch') || combinedSample.includes('scope of work')) {
      taskType = 'business_proposal';
      deliverableTitle = 'Comprehensive Commercial Business Proposal';
      goal = 'Draft a complete, persuasive business proposal with clear deliverables, timeline, milestones, investment schedule, and terms.';
      targetAudience = 'Client Decision Makers & Enterprise Buyers';
      toneAndStyle = 'Value-focused, persuasive, transparent, and authoritative';
      targetFormat = 'markdown';
    } else if (promptLower.includes('spec') || promptLower.includes('architecture') || promptLower.includes('prd') || promptLower.includes('requirements') || promptLower.includes('api')) {
      taskType = 'technical_spec';
      deliverableTitle = 'Technical Architecture & Implementation Specification';
      goal = 'Formulate rigorous engineering specifications with component architecture, data contracts, edge-case protocols, and security requirements.';
      targetAudience = 'Software Engineers, Architects, and Tech Leads';
      toneAndStyle = 'Precise, modular, unambiguous, and developer-friendly';
      targetFormat = 'markdown';
    } else if (promptLower.includes('fill') || promptLower.includes('placeholder') || promptLower.includes('complete') || files.some((f) => f.potentialGaps.some((g) => g.includes('placeholder')))) {
      taskType = 'complete_document';
      deliverableTitle = 'Fully Resolved Document with Eliminated Placeholders';
      goal = 'Eliminate all pending placeholders and empty clauses, populating every variable with verified factual information.';
      targetAudience = 'Signatories & Corporate Stakeholders';
      toneAndStyle = 'Exhaustive, polished, and ready for publication';
      targetFormat = 'markdown';
    }

    // 2. Format preferences from user request
    if (promptLower.includes('docx') || promptLower.includes('word')) targetFormat = 'docx';
    else if (promptLower.includes('pdf')) targetFormat = 'pdf';
    else if (promptLower.includes('html')) targetFormat = 'html';
    else if (promptLower.includes('json')) targetFormat = 'json';
    else if (promptLower.includes('txt') || promptLower.includes('text')) targetFormat = 'txt';

    // 3. Extract explicit requirements
    const explicitRequirements: string[] = [];
    if (userPrompt.trim()) {
      explicitRequirements.push(`User request: "${userPrompt.trim()}"`);
    }
    const lines = userPrompt.split('\n').map((l) => l.trim()).filter((l) => l.length > 5);
    lines.forEach((l) => {
      if (/^[-*•0-9]/.test(l)) {
        explicitRequirements.push(l.replace(/^[-*•0-9.)\s]+/, ''));
      }
    });

    // 4. Extract implicit requirements & constraints
    const implicitRequirements: string[] = [
      'Preserve all factual details, names, numbers, and dates from source files.',
      'Ensure zero unresolved placeholder markers (e.g. [TBD], {{...}}) in final output.',
      'Provide clear heading hierarchy and modern formatting.',
      'Validate completeness against all generated checklist criteria.',
    ];

    const constraints: string[] = [
      'Do not invent non-existent factual entities without user confirmation.',
      'Honor explicit user instructions over generic defaults.',
      'Maintain version history for all iterations.',
    ];

    const completionCriteria: string[] = [
      'All critical checklist items marked complete or explicitly acknowledged.',
      'Zero fatal syntax or placeholder gaps in generated deliverable.',
      'Post-generation verification audit score >= 90%.',
    ];

    return {
      taskType,
      deliverableTitle,
      goal,
      targetAudience,
      toneAndStyle,
      explicitRequirements,
      implicitRequirements,
      constraints,
      targetFormat,
      completionCriteria,
    };
  }
}
