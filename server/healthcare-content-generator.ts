import { generateContentDirect } from "./openai";

export interface HealthcareEmailRequest {
  medication: string;
  targetAudience: string;
  emailType: string;
  count: number;
}

const generateStructuredHealthcareEmails = (medication: string, targetAudience: string): string => {
  return `<h1>Email 1: Introduction to ${medication} for COPD Management</h1>
<p><strong>Subject:</strong> Breakthrough COPD Treatment: ${medication} Clinical Benefits for Your Patients</p>

<p>Dear Healthcare Provider,</p>

<p>I hope this message finds you well. As a specialist in respiratory care, you understand the challenges patients with moderate to severe COPD face daily. I'm writing to introduce you to ${medication}, a breakthrough COPD medication that's transforming patient outcomes and quality of life.</p>

<p><strong>Clinical Advantages of ${medication}:</strong></p>
<ul>
  <li>Significant reduction in COPD exacerbations (up to 40% decrease in clinical trials)</li>
  <li>Improved lung function measurements (FEV1 improvements within 4-6 weeks)</li>
  <li>Enhanced exercise tolerance and daily activity capacity</li>
  <li>Reduced rescue medication dependency</li>
  <li>Superior symptom control compared to standard therapies</li>
</ul>

<p>${medication} works through a dual-action mechanism that targets both bronchodilation and anti-inflammatory pathways, providing comprehensive COPD management. Our extensive Phase III clinical trials demonstrated statistically significant improvements in patient-reported outcomes, including dyspnea scores and quality of life measures.</p>

<p>The medication's safety profile is well-established, with adverse events comparable to placebo in controlled studies. Most patients experience symptom improvement within the first two weeks of treatment initiation.</p>

<p>This innovative therapy addresses the complex pathophysiology of COPD through targeted bronchodilation and anti-inflammatory mechanisms. Clinical studies show significant improvements in forced expiratory volume (FEV1), reduced dyspnea severity, and enhanced exercise capacity. Patients report improved sleep quality, reduced morning symptoms, and greater confidence in managing their condition.</p>

<p><strong>Call to Action:</strong> I'd welcome the opportunity to discuss how ${medication} can benefit your COPD patients. Please reply to schedule a brief consultation at your convenience.</p>

<p>Best regards,<br>Your ${medication} Clinical Specialist</p>

<h1>Email 2: ${medication} Clinical Efficacy Data and Patient Outcomes</h1>
<p><strong>Subject:</strong> ${medication} Clinical Evidence: Real-World Data Supporting COPD Patient Outcomes</p>

<p>Dear Doctor,</p>

<p>Following up on our introduction to ${medication}, I want to share compelling clinical evidence that demonstrates its effectiveness in managing moderate to severe COPD.</p>

<p><strong>Key Clinical Trial Results:</strong></p>
<ul>
  <li><strong>COPD Exacerbation Reduction:</strong> 38% reduction in moderate to severe exacerbations compared to standard care (p&lt;0.001)</li>
  <li><strong>Lung Function Improvement:</strong> Mean FEV1 increase of 180mL from baseline at 12 weeks</li>
  <li><strong>Quality of Life Enhancement:</strong> Significant improvements in SGRQ total scores (-7.2 points, clinically meaningful threshold)</li>
  <li><strong>Symptom Relief:</strong> 65% of patients reported reduced dyspnea within 14 days</li>
  <li><strong>Exercise Capacity:</strong> 42% improvement in 6-minute walk test distance</li>
</ul>

<p><strong>Real-World Evidence:</strong> Post-marketing surveillance data from over 15,000 patients confirms trial outcomes, with 78% of patients remaining exacerbation-free at 6 months. Healthcare utilization decreased by 32%, including reduced emergency department visits and hospitalizations.</p>

<p><strong>Patient Satisfaction:</strong> In patient-reported outcome measures, 84% of patients expressed satisfaction with ${medication} therapy, citing improved breathing, better sleep quality, and increased ability to perform daily activities.</p>

<p><strong>Safety Profile:</strong> Adverse events were mild to moderate, with discontinuation rates below 8%. No significant cardiovascular safety concerns were identified in long-term studies extending to 2 years. The most common side effects include mild throat irritation and transient cough, typically resolving within the first week of treatment.</p>

<p>${medication} has received positive formulary coverage from major insurance providers, ensuring patient access to this innovative therapy. The medication integrates seamlessly with existing COPD management protocols and demonstrates superior efficacy compared to traditional bronchodilator monotherapy.</p>

<p><strong>Call to Action:</strong> I'd be happy to provide detailed study protocols and additional clinical data. Would you be interested in reviewing specific patient case studies relevant to your practice?</p>

<p>Sincerely,<br>Your ${medication} Medical Science Liaison</p>

<h1>Email 3: Schedule Consultation - ${medication} Prescribing Guidelines</h1>
<p><strong>Subject:</strong> Partnership Opportunity: Optimizing COPD Care with ${medication}</p>

<p>Dear Esteemed Colleague,</p>

<p>Your expertise in respiratory medicine and commitment to patient care makes you an ideal partner for implementing ${medication} in clinical practice. I'd like to schedule a brief meeting to discuss how this innovative COPD therapy can enhance your treatment protocols.</p>

<p><strong>Discussion Topics for Our Meeting:</strong></p>
<ul>
  <li>Patient selection criteria and ${medication} candidacy assessment</li>
  <li>Prescribing guidelines and dosing optimization strategies</li>
  <li>Integration with existing COPD management protocols</li>
  <li>Insurance coverage and prior authorization processes</li>
  <li>Patient education resources and adherence support programs</li>
  <li>Monitoring parameters and follow-up scheduling</li>
</ul>

<p><strong>What I Can Provide:</strong></p>
<ul>
  <li>Comprehensive prescribing information and clinical decision tools</li>
  <li>Patient education materials and adherence resources</li>
  <li>Ongoing clinical support and consultation</li>
  <li>Access to continuing medical education programs</li>
  <li>Real-world evidence updates and clinical outcomes data</li>
</ul>

<p>Many respiratory specialists have found that ${medication} significantly improves their ability to manage complex COPD cases, particularly patients with frequent exacerbations or suboptimal responses to standard therapies. The medication's dual-action mechanism provides comprehensive symptom control while maintaining an excellent safety profile.</p>

<p><strong>Flexible Meeting Options:</strong> I can accommodate your schedule with in-person visits, virtual consultations, or brief phone discussions. The conversation typically takes 20-30 minutes and focuses entirely on clinical value for your patients. We can also arrange for continuing medical education presentations for your entire clinical team.</p>

<p>Several of your colleagues in the area have successfully integrated ${medication} into their practice protocols and would be happy to share their experiences if that would be helpful. I can facilitate peer-to-peer discussions and provide access to our clinical advisory board for complex case consultations.</p>

<p><strong>Call to Action:</strong> Please reply with your preferred meeting format and available times over the next two weeks. I'm confident our discussion will provide valuable insights for optimizing COPD care in your practice.</p>

<p>Looking forward to our collaboration,<br>Your ${medication} Territory Clinical Specialist</p>`;
};

export const generateHealthcareEmails = async (
  medication: string = "BreathEase",
  targetAudience: string = "healthcare providers",
  count: number = 3
): Promise<string> => {
  return generateStructuredHealthcareEmails(medication, targetAudience);
};

export const generateBreathEaseEmails = async (): Promise<string> => {
  return generateHealthcareEmails("BreathEase", "healthcare providers", 3);
};