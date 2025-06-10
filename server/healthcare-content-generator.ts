import { generateContentDirect } from "./openai";

export interface HealthcareEmailRequest {
  medication: string;
  targetAudience: string;
  emailType: string;
  count: number;
}

export const generateHealthcareEmails = async (
  medication: string = "BreathEase",
  targetAudience: string = "healthcare providers",
  count: number = 3
): Promise<string> => {
  
  const streamlinedPrompt = `Create ${count} professional healthcare emails for ${medication} COPD medication targeting ${targetAudience}.

Email 1: Product introduction with clinical benefits
Email 2: Efficacy data and patient outcomes  
Email 3: Meeting request for prescribing discussion

Requirements:
- Each email: 300-500 words
- Include subject lines, body copy, and CTAs
- Professional medical terminology
- Clinical evidence focus
- Publication-ready content`;

  const systemPrompt = `You are a medical content specialist. Create comprehensive, detailed healthcare emails with:
- Professional subject lines
- Detailed body copy (300-500 words each)
- Clinical benefits and efficacy data
- Strong calls to action
- Proper medical terminology
- HTML formatting for structure`;

  try {
    // Use GPT-4o-mini for reliability with healthcare content
    const result = await generateContentDirect(streamlinedPrompt, systemPrompt, 'gpt-4o-mini');
    return result;
  } catch (error) {
    console.error('Healthcare content generation error:', error);
    throw new Error('Failed to generate comprehensive healthcare emails');
  }
};

export const generateBreathEaseEmails = async (): Promise<string> => {
  return generateHealthcareEmails("BreathEase", "healthcare providers", 3);
};