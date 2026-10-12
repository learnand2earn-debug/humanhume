import {
  ChecklistItem,
  TargetedQuestion,
  TaskUnderstanding,
  UploadedIntakeFile,
  FileContradiction,
} from './types';

export class QuestionEngine {
  /**
   * Formulate high-value targeted follow-up questions for missing or uncertain items.
   * Strictly prevents asking questions that are already answered or available in the session.
   */
  static generateQuestions(
    checklist: ChecklistItem[],
    task: TaskUnderstanding,
    files: UploadedIntakeFile[],
    existingQuestions: TargetedQuestion[] = [],
    contradictions: FileContradiction[] = []
  ): TargetedQuestion[] {
    const questions: TargetedQuestion[] = [...existingQuestions];
    const existingQuestionIds = new Set(questions.map((q) => q.id));
    const alreadyAnsweredChecklistIds = new Set(
      questions.filter((q) => q.answered).map((q) => q.checklistItemId).filter(Boolean)
    );

    // 1. If there are unresolved contradictions between multiple files, ask about them first!
    contradictions.forEach((c) => {
      if (!c.resolved) {
        const qId = `q_${c.id}`;
        if (!existingQuestionIds.has(qId)) {
          questions.push({
            id: qId,
            question: `Which data source should be prioritized regarding "${c.topic}"?`,
            context: c.description,
            whyNeeded: 'Source files have conflicting values; explicit direction is required to prevent inaccuracies.',
            type: 'choice',
            options: c.values.map((v) => `Use values from ${v.file}: "${v.value}"`),
            answered: false,
          });
          existingQuestionIds.add(qId);
        }
      }
    });

    // 2. Identify missing & uncertain checklist items that require user input
    const pendingItems = checklist.filter(
      (item) =>
        (item.status === 'missing' || item.status === 'uncertain') &&
        (item.priority === 'critical' || item.priority === 'high') &&
        !alreadyAnsweredChecklistIds.has(item.id)
    );

    pendingItems.forEach((item) => {
      const qId = `q_${item.id}`;
      if (existingQuestionIds.has(qId)) return;

      const questionData = this.buildQuestionForItem(item, task, files);
      if (questionData) {
        questions.push({
          id: qId,
          checklistItemId: item.id,
          ...questionData,
          answered: false,
        });
        existingQuestionIds.add(qId);
      }
    });

    return questions;
  }

  /**
   * Builds targeted questions tailored to the specific checklist requirement.
   */
  private static buildQuestionForItem(
    item: ChecklistItem,
    task: TaskUnderstanding,
    files: UploadedIntakeFile[]
  ): {
    question: string;
    context: string;
    whyNeeded: string;
    type: 'text' | 'choice' | 'boolean' | 'multiselect';
    options?: string[];
    defaultChoice?: string;
  } | null {
    switch (item.id) {
      case 'cv_contact_info':
        return {
          question: 'What contact details and professional links should be displayed on the CV?',
          context: 'No verified phone number or email was found in the uploaded documents.',
          whyNeeded: 'Recruiters and ATS scanners require direct candidate contact points.',
          type: 'text',
        };

      case 'cv_executive_summary':
        return {
          question: 'What is the target role title and senior leadership focus for this CV?',
          context: 'An executive summary requires tailoring to your target industry or job title.',
          whyNeeded: 'Aligns the value proposition with hiring expectations.',
          type: 'choice',
          options: [
            'Lead Full-Stack / AI Systems Architect',
            'Senior Product Engineering Manager',
            'Executive Technical Director',
            'General Senior Software Engineer',
          ],
          defaultChoice: 'Lead Full-Stack / AI Systems Architect',
        };

      case 'prop_investment_schedule':
        return {
          question: 'What is the preferred pricing structure and total budget for this proposal?',
          context: 'The source materials did not define explicit investment totals or currency.',
          whyNeeded: 'Proposals require transparent milestones and budget deliverables.',
          type: 'choice',
          options: [
            'Milestone-based (30% deposit, 40% milestone delivery, 30% sign-off)',
            'Time & Materials monthly retainer',
            'Fixed-price turnkey delivery with 50% upfront',
          ],
          defaultChoice: 'Milestone-based (30% deposit, 40% milestone delivery, 30% sign-off)',
        };

      case 'prop_project_timeline':
        return {
          question: 'What is the target delivery timeframe for project completion?',
          context: 'The project schedule currently lacks explicit calendar milestone dates.',
          whyNeeded: 'Sets delivery expectations and contractual milestones.',
          type: 'choice',
          options: ['2 Weeks (Rapid Sprint)', '4-6 Weeks (Standard Enterprise)', '8-12 Weeks (Multi-Phase Rollout)'],
          defaultChoice: '4-6 Weeks (Standard Enterprise)',
        };

      case 'media_aspect_ratio':
        return {
          question: 'What is the target distribution format and aspect ratio?',
          context: 'Video distribution platforms have distinct resolution requirements.',
          whyNeeded: 'Prevents black bars or clipping when rendering media deliverables.',
          type: 'choice',
          options: [
            '16:9 Landscape (YouTube, LinkedIn, Website)',
            '9:16 Vertical (TikTok, Instagram Reels, Shorts)',
            '1:1 Square (Feed Carousel)',
          ],
          defaultChoice: '16:9 Landscape (YouTube, LinkedIn, Website)',
        };

      case 'design_responsive_layouts':
        return {
          question: 'Which screen form factors must be explicitly accommodated?',
          context: 'Design specifications must define layout grid scaling rules.',
          whyNeeded: 'Ensures developers implement exact responsive breakpoint behavior.',
          type: 'choice',
          options: [
            'Mobile First (375px) + Desktop (1440px)',
            'Universal: Mobile (375px), Tablet (768px), Desktop (1280px), Large (1920px)',
            'Desktop Optimized Only',
          ],
          defaultChoice: 'Universal: Mobile (375px), Tablet (768px), Desktop (1280px), Large (1920px)',
        };

      case 'cv_blank_experience':
        return {
          question: 'What role or activity should cover this period? Please provide the job title, organization and dates. If you were not employed during this period, tell me whether to leave it blank or include another activity.',
          context: 'The CV contains a blank experience period.',
          whyNeeded: 'Factual career timelines cannot be fabricated.',
          type: 'text',
        };

      case 'design_empty_area':
        return {
          question: 'Should this area contain a logo, contact information, a call to action, or should it remain empty?',
          context: 'The design includes a large empty area near the bottom.',
          whyNeeded: 'Distinguishes an intentionally empty design area from a genuinely missing element.',
          type: 'choice',
          options: [
            'Include brand logo and tagline',
            'Include contact information and links',
            'Include a Call to Action (CTA)',
            'Leave as intentional whitespace',
          ],
          defaultChoice: 'Leave as intentional whitespace',
        };

      case 'video_closing_screen':
        return {
          question: 'Should the video end with your brand logo, contact details, a call to action, or the existing final frame?',
          context: 'The video contains no confirmed closing screen.',
          whyNeeded: 'Ensures proper outro branding and viewer direction.',
          type: 'choice',
          options: [
            'Brand logo and contact details',
            'Call to action (Subscribe / Visit Website)',
            'The existing final frame',
          ],
          defaultChoice: 'The existing final frame',
        };

      case 'doc_completion_date':
        return {
          question: 'What is the correct completion date?',
          context: 'The document references a project completion date that does not appear anywhere in the supplied material.',
          whyNeeded: 'Required contractual timelines cannot be safely inferred.',
          type: 'text',
        };

      case 'doc_placeholder_elimination':
        return {
          question: 'How should unresolved placeholders ([Insert Date], {{CLIENT_NAME}}) be resolved?',
          context: 'Source template contains unfilled bracketed placeholder tags.',
          whyNeeded: 'Professional deliverables must not contain raw template tags.',
          type: 'choice',
          options: [
            'Fill with realistic standard enterprise defaults (e.g. current date, standard terms)',
            'Prompt for specific names and dates now',
          ],
          defaultChoice: 'Fill with realistic standard enterprise defaults (e.g. current date, standard terms)',
        };

      default:
        return {
          question: `Regarding ${item.title}: How would you prefer to handle this requirement?`,
          context: item.description,
          whyNeeded: item.validationRule || item.description,
          type: 'text',
        };
    }
  }

  /**
   * Merges user answers into the checklist and task state.
   */
  static mergeAnswers(
    answers: Record<string, string>,
    checklist: ChecklistItem[],
    questions: TargetedQuestion[]
  ): { updatedChecklist: ChecklistItem[]; updatedQuestions: TargetedQuestion[] } {
    const updatedQuestions = questions.map((q) => {
      const ansVal = answers[q.id] ?? (q.checklistItemId ? answers[q.checklistItemId] : undefined);
      if (ansVal !== undefined) {
        return {
          ...q,
          answered: true,
          answer: ansVal,
          answeredAt: new Date().toISOString(),
        };
      }
      return q;
    });

    const updatedChecklist = checklist.map((item) => {
      // Find question linked to this item, or direct answer
      const linkedQ = updatedQuestions.find((q) => q.checklistItemId === item.id);
      const directAnswer = answers[item.id];
      const answerVal = linkedQ?.answer || directAnswer;

      if (answerVal) {
        return {
          ...item,
          status: 'complete' as const,
          userDecision: answerVal,
          evidence: `Resolved by user decision: "${answerVal}"`,
          answer: answerVal,
          answerConfirmed: true,
          resolution: `Confirmed and satisfied by user answer: "${answerVal}"`,
        };
      }
      return item;
    });

    return { updatedChecklist, updatedQuestions };
  }
}
