const EnhancedQuestionParser = require('./enhanced-question-parser');

async function testEnhancedParser() {
    try {
        console.log('=== TESTING ENHANCED QUESTION PARSER ===');
        
        // Read the test content
        const fs = require('fs');
        const text = fs.readFileSync('test-word-content.txt', 'utf8');
        
        console.log('Test content loaded, length:', text.length);
        console.log('First 100 characters:', text.substring(0, 100));
        
        // Create parser instance
        const parser = new EnhancedQuestionParser();
        
        // Parse the content
        parser.parseDocumentContent(text);
        
        const parsedData = {
            sections: parser.sections,
            questions: parser.questions
        };
        
        console.log('\n=== PARSING RESULTS ===');
        console.log('Sections found:', parsedData.sections.length);
        console.log('Questions found:', parsedData.questions.length);
        
        // Display sections
        console.log('\n=== SECTIONS ===');
        parsedData.sections.forEach((section, index) => {
            console.log(`Section ${index + 1}: ${section.name}`);
            console.log(`  Questions: ${section.questions.length}`);
        });
        
        // Display questions
        console.log('\n=== QUESTIONS ===');
        parsedData.questions.forEach((question, index) => {
            console.log(`\nQuestion ${index + 1}:`);
            console.log(`  Text: ${question.question_text.substring(0, 50)}...`);
            console.log(`  Section: ${question.section}`);
            console.log(`  Options: ${question.options.length}`);
            console.log(`  Correct Answer: ${question.correct_answer}`);
            if (question.explanation) {
                console.log(`  Explanation: ${question.explanation.substring(0, 30)}...`);
            }
            
            question.options.forEach((option, optIndex) => {
                console.log(`    ${option.label}: ${option.text}`);
            });
        });
        
        console.log('\n=== PARSING TEST COMPLETED SUCCESSFULLY ===');
        process.exit(0);
        
    } catch (error) {
        console.error('Error testing enhanced parser:', error);
        process.exit(1);
    }
}

testEnhancedParser();
