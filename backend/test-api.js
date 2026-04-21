const https = require('https');

function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ error: data });
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log('=== TESTING REMOTE API ===\n');
  
  // Test student results
  console.log('1. Student Results (attempt 13)...');
  try {
    const result = await fetchAPI('https://vijeta-api.onrender.com/api/exam-attempts/13');
    console.log('   ✓ Exam:', result.attempt?.exam_name);
    console.log('   ✓ Student:', result.attempt?.student_name);
    console.log('   ✓ Total:', result.performance?.total_questions);
    console.log('   ✓ Correct:', result.performance?.correct_answers);
    console.log('   ✓ Wrong:', result.performance?.wrong_answers);
    console.log('   ✓ Percentage:', result.performance?.percentage, '%');
    
    // Sample questions (convert stored answers to display)
    const numberToLabel = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
    console.log('\n   Sample Questions:');
    result.responses?.slice(0, 5).forEach((r, i) => {
      const status = r.is_correct ? '✓ Correct' : '✗ Wrong';
      const yourAns = typeof r.selected_answer === 'number' ? numberToLabel[r.selected_answer] || r.selected_answer : r.selected_answer;
      console.log(`   Q${i+1}: ${status} | Your: ${yourAns} | Correct: ${r.correct_option_label}`);
    });
    
    console.log('\n   Full Stats:');
    console.log('   Correct (recounted):', correctRecount);
    console.log('   Wrong (recounted):', wrongRecount);
  } catch(e) {
    console.log('   ✗ Error:', e.message);
  }
  
  // Test admin results
  console.log('\n2. Admin Results List...');
  try {
    const adminResults = await fetchAPI('https://vijeta-api.onrender.com/api/admin-results');
    console.log('   ✓ Total Results:', adminResults.length);
    if (adminResults.length > 0) {
      const r = adminResults[0];
      console.log('   ✓ Sample:', r.exam_name, '-', r.student_name, '-', r.percentage, '%');
    }
  } catch(e) {
    console.log('   ✗ Error:', e.message);
  }
  
  console.log('\n=== TESTS COMPLETE ===');
}

test();