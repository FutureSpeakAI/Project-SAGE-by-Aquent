// Test the enhanced sophisticated prompt generation
const { EmergencyFallback } = require('./server/emergency-fallback.ts');

const testPrompt = "Nike x Volkswagen Beetle Shoe collaboration brief: Create blog post content about the limited-edition Beetle Shoe. Product Images needed: Angle 1: A close-up shot showcasing the shoes unique design details, highlighting the retro color schemes. Angle 2: A lifestyle image of the shoe being worn in an urban setting, capturing its versatility and style. Angle 3: An overhead view displaying the shoe alongside a miniature Volkswagen Beetle model, emphasizing the collaboration.";

console.log("Testing Enhanced Emergency Fallback Prompt Generation:");
console.log("=" * 60);

const contentType = EmergencyFallback.detectContentType(testPrompt);
console.log(`Detected content type: ${contentType}`);

if (contentType === 'brief_execution') {
  const content = EmergencyFallback.generateBriefExecutionContent(testPrompt);
  console.log("\nGenerated Content:");
  console.log(content);
} else {
  console.log("Content type not detected as brief_execution");
}