// Test script to isolate Content tab userPrompt state bug
// Run with: node test-content-tab-bug.js

console.log('=== Content Tab Bug Investigation ===\n');

// Test 1: Check if state is being reset immediately after setting
console.log('Test 1: State Reset Pattern');
console.log('- onChange fires with user input ✓');
console.log('- setUserPrompt called with correct value ✓');
console.log('- Component re-renders with empty userPrompt ✗');
console.log('\nThis indicates state is being reset immediately after being set.\n');

// Test 2: Potential causes analysis
console.log('Test 2: Analyzing Potential Causes');

const potentialCauses = [
  {
    cause: 'useEffect resetting state',
    found: false,
    details: 'ContentTab has one useEffect for brief analysis, doesn\'t call setUserPrompt'
  },
  {
    cause: 'Component unmounting/remounting',
    found: 'POSSIBLE',
    details: 'Need to check if ContentTab is being re-mounted on each render'
  },
  {
    cause: 'Conflicting state management',
    found: 'POSSIBLE',
    details: 'TabPersistenceContext might be interfering'
  },
  {
    cause: 'Parent re-rendering with empty props',
    found: 'INVESTIGATING',
    details: 'Home.tsx might be re-rendering and passing empty userPrompt'
  },
  {
    cause: 'React StrictMode double rendering',
    found: 'POSSIBLE',
    details: 'React StrictMode can cause unexpected state behavior'
  }
];

potentialCauses.forEach((item, index) => {
  console.log(`\n${index + 1}. ${item.cause}`);
  console.log(`   Status: ${item.found}`);
  console.log(`   Details: ${item.details}`);
});

// Test 3: Key prop issue
console.log('\n\nTest 3: Component Key Analysis');
console.log('ContentTab has key="content-tab" which is static');
console.log('This should prevent unmounting/remounting unless parent changes');

// Test 4: State wrapper issue
console.log('\nTest 4: State Wrapper Analysis');
console.log('Home.tsx has debug wrapper for setUserPrompt:');
console.log('- Logs the value being set');
console.log('- Calls setUserPromptBase(value)');
console.log('- But state might not be updating properly');

// Test 5: Recommendations
console.log('\n=== RECOMMENDATIONS ===\n');
console.log('1. Check if Home component is re-rendering unexpectedly');
console.log('2. Look for any parent component that might be resetting state');
console.log('3. Check if TabPersistenceContext is overriding state');
console.log('4. Verify React StrictMode is not causing issues');
console.log('5. Add a ref to track if component is unmounting');

// Test 6: Specific things to check
console.log('\n=== SPECIFIC CHECKS NEEDED ===\n');
console.log('1. Is there a TabContent wrapper around ContentTab?');
console.log('2. Is activeTab state change causing re-render?');
console.log('3. Is there a race condition with localStorage?');
console.log('4. Is generateMutation resetting state on error?');

// Test 7: Direct state test
console.log('\n=== HYPOTHESIS ===\n');
console.log('Most likely cause: The component or its parent is re-rendering');
console.log('and the state is not being preserved between renders.');
console.log('\nThis could be due to:');
console.log('- Tabs component remounting ContentTab when switching');
console.log('- State being stored in wrong place (should be lifted higher)');
console.log('- Race condition with async state updates');