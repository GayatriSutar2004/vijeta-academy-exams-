const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class EnhancedQuestionParser {
    constructor() {
        this.sections = [];
        this.currentSection = null;
        this.currentQuestion = null;
        this.questions = [];
        this.answerKeyMap = new Map();
        this.extractedImages = [];
    }

    async parseWordDocument(filePath) {
        try {
            console.log('=== ENHANCED WORD DOCUMENT PARSING STARTED ===');
            
            const result = await mammoth.extractRawText({ path: filePath });
            const text = result.value;
            
            console.log('Document text length:', text.length);
            console.log('First 200 characters:', text.substring(0, 200));
            
            this.extractImagesFromDocx(filePath);
            
            // First, extract Answer Key if present
            this.parseAnswerKey(text);
            
            this.parseDocumentContent(text);
            
            console.log('=== PARSING RESULTS ===');
            console.log('Sections found:', this.sections.length);
            console.log('Total questions extracted:', this.questions.length);
            console.log('Images extracted:', this.extractedImages.length);
            
            this.linkImagesToQuestions();
            
            return {
                sections: this.sections,
                questions: this.questions
            };
            
        } catch (error) {
            console.error('Error parsing Word document:', error);
            throw error;
        }
    }
    
    extractImagesFromDocx(filePath) {
        try {
            const zip = new AdmZip(filePath);
            const mediaFiles = zip.getEntries().filter(entry => {
                const entryName = entry.entryName.toLowerCase();
                return entryName.startsWith('word/media/') && 
                       (entryName.match(/\.(png|jpg|jpeg|gif|bmp|svg)$/i));
            });
            
            const imagesDir = path.join(__dirname, '..', 'public', 'question-images');
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
            }
            
            this.extractedImages = [];
            
            mediaFiles.forEach((mediaEntry, index) => {
                const originalName = path.basename(mediaEntry.entryName);
                const ext = path.extname(originalName);
                const timestamp = Date.now();
                const newFileName = `image_${timestamp}_${index}${ext}`;
                const outputPath = path.join(imagesDir, newFileName);
                
                fs.writeFileSync(outputPath, mediaEntry.getData());
                
                this.extractedImages.push({
                    originalName,
                    storedName: newFileName,
                    path: `/question-images/${newFileName}`,
                    index: index
                });
                
                console.log(`Extracted image: ${newFileName} (${originalName})`);
            });
            
        } catch (error) {
            console.warn('Could not extract images from docx:', error.message);
            this.extractedImages = [];
        }
    }
    
    linkImagesToQuestions() {
        if (this.extractedImages.length === 0) return;
        
        let imageIndex = 0;
        for (const question of this.questions) {
            if (imageIndex < this.extractedImages.length) {
                question.image_path = this.extractedImages[imageIndex].path;
                imageIndex++;
            }
        }
    }

    parseDocumentContent(text) {
        this.sections = [];
        this.currentSection = null;
        this.currentQuestion = null;
        this.questions = [];
        this.answerKeyMap = new Map();

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let inAnswerKey = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (this.isAnswerKeyHeader(line)) {
                this.finalizeCurrentQuestion();
                inAnswerKey = true;
                continue;
            }

            if (inAnswerKey) {
                this.collectAnswerKey(line);
                continue;
            }
            
            if (this.isSectionHeader(line)) {
                this.startNewSection(line);
            }
            else if (this.isQuestionStart(line)) {
                this.startNewQuestion(line);
            }
            else if (this.isOption(line)) {
                this.addOption(line);
            }
            else if (this.isCorrectAnswer(line)) {
                this.setCorrectAnswer(line);
            }
            else if (this.isExplanation(line)) {
                this.addExplanation(line);
            }
            else if (this.currentQuestion) {
                this.addQuestionContent(line);
            }
        }
        
        this.finalizeCurrentQuestion();
        this.applyAnswerKey();
    }

    // Handle Answer Key section parsing
    parseAnswerKey(text) {
        const lines = text.split('\n');
        let inAnswerKeySection = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Detect Answer Key section
            if (trimmed.match(/^Answer\s*Key/i) || trimmed.match(/^ANSWER\s*KEY/i)) {
                inAnswerKeySection = true;
                this.currentSection = { name: 'Answer Key', questions: [] };
                console.log('Found Answer Key section');
                continue;
            }
            
            if (inAnswerKeySection && trimmed) {
                // Format may be like "Q1. A" or "1. A" or just "A" for each question
                const qMatch = trimmed.match(/^(?:Q\.?)?\s*(\d+)[\.\)]\s*([A-D])/i);
                if (qMatch) {
                    const qNum = parseInt(qMatch[1]);
                    const answer = qMatch[2].toUpperCase();
                    this.answerKeyMap.set(qNum, answer);
                    console.log('Answer Key: Q' + qNum + ' = ' + answer);
                }
            }
        }
    }

    isSectionHeader(line) {
        const sectionPatterns = [
            /^Section\s*\d+\s*[:\-–]/i,
            /^Section\d+\s*[:\-–]/i,
            /^Part\s*\d+\s*[:\-–]/i,
            /^[A-Z]+\s+SECTION\b/i,
            /^UNIT\s+\d+\b/i,
            /^CHAPTER\s+\d+\b/i
        ];
        
        return sectionPatterns.some(pattern => pattern.test(line)) && !this.isQuestionStart(line);
    }

    isQuestionStart(line) {
        // More flexible patterns for question detection
        const questionPatterns = [
            /^Q\.?\s*\d+/i,
            /^Q\s*\.\s*\d+/i,
            /^Question\s*\d+/i,
            /^\d+[\.\)]\s*/i,
            /^Que\.?\s*\d+/i,
            /^\(\d+\)\s*/i,
            /^\[\d+\]\s*/i,
            /^QNO\s*\.?\s*\d+/i,
            /^QUESTION\s*NO\s*\.?\s*\d+/i,
            /^\d+\.\s+\w/  // e.g., "1. What is..." - questions starting with number followed by text
        ];
        
        if (questionPatterns.some(pattern => pattern.test(line)) && !this.isSectionHeader(line)) {
            return true;
        }
        
        const flexiblePattern = /^([Qq]|[Qq]uestion|[Qq]ue)\s*[\.\:\-\)]*\s*\d+/;
        if (flexiblePattern.test(line)) {
            return true;
        }
        
        return false;
    }

    isOption(line) {
        // More flexible patterns for option detection
        const optionPatterns = [
            /^[A-D]\)\s*/i,
            /^[A-D]\.\s*/i,
            /^\([A-D]\)\s*/i,
            /^[a-d]\)\s*/i,
            /^[a-d]\.\s*/i,
            /^Option\s*[A-D]/i,
            /^Ans\s*[A-D]/i,
            /^[A-D]\s*\)/i,
            /^[A-D]\s*\./i,
            /^\s*[A-D]\s*[\.\)]\s*/i,
            /^\(\s*[A-D]\s*\)\s*/i,
            /^\s*\[\s*[A-D]\s*\]\s*/i,
            /^a\.\s*/i,
            /^b\.\s*/i,
            /^c\.\s*/i,
            /^d\.\s*/i,
            /^A\.\s+/i,
            /^B\.\s+/i,
            /^C\.\s+/i,
            /^D\.\s+/i
        ];
        
        if (optionPatterns.some(pattern => pattern.test(line))) {
            return true;
        }
        
        const flexibleOptionPattern = /^\s*[A-Da-d]\s*[\.\)\:\-]\s*\w/;
        if (flexibleOptionPattern.test(line)) {
            return true;
        }
        
        return false;
    }

    isCorrectAnswer(line) {
        // More flexible patterns for answer detection
        const answerPatterns = [
            /^Correct\s*[:\-]/i,
            /^Answer\s*[:\-]/i,
            /^Ans\s*[:\-]/i,
            /^Solution\s*[:\-]/i,
            /^[A-D]\s*is\s*correct/i,
            /^The\s*correct\s*answer\s*is/i,
            /^Ans\s*\.\s*[A-D]/i,
            /^Correct\s*Ans\s*[:\-]/i,
            /^Right\s*Ans/i,
            /^\s*[A-D]\s+Correct/i,
            /^\s*Correct\s+[A-D]/i,
            /^Correct:\s*[A-D]/i,
            /^Answer:\s*[A-D]/i,
            /^Ans:\s*[A-D]/i,
            /^Ans\s+[A-D]/i,
            /^Correct\s+[A-D]/i,
            /^Answer\s+[A-D]/i,
            /^(Correct|Answer)\s+(?:is\s+)?([A-D])/i
        ];
        
        return answerPatterns.some(pattern => pattern.test(line));
    }
            /^\([A-D]\)\s*/i,
            /^[a-d]\)\s*/i,
            /^[a-d]\.\s*/i,
            /^Option\s*[A-D]/i,
            /^Ans\s*[A-D]/i,
            /^[A-D]\s*\)/i,
            /^[A-D]\s*\./i,
            /^\s*[A-D]\s*[\.\)]\s*/i,
            /^\(\s*[A-D]\s*\)\s*/i,
            /^\s*\[\s*[A-D]\s*\]\s*/i
        ];
        
        if (optionPatterns.some(pattern => pattern.test(line))) {
            return true;
        }
        
        const flexibleOptionPattern = /^\s*[A-Da-d]\s*[\.\)\:\-]\s*\w/;
        if (flexibleOptionPattern.test(line)) {
            return true;
        }
        
        return false;
    }

    isCorrectAnswer(line) {
        const answerPatterns = [
            /^Correct\s*[:\-]/i,
            /^Answer\s*[:\-]/i,
            /^Ans\s*[:\-]/i,
            /^Solution\s*[:\-]/i,
            /^[A-D]\s*is\s*correct/i,
            /^The\s*correct\s*answer\s*is/i,
            /^Ans\s*\.\s*[A-D]/i,
            /^Correct\s*Ans\s*[:\-]/i,
            /^Right\s*Ans/i,
            /^\s*[A-D]\s+Correct/i,
            /^\s*Correct\s+[A-D]/i
        ];
        
        return answerPatterns.some(pattern => pattern.test(line));
    }

    isAnswerKeyHeader(line) {
        return /^(Answer\s*Key|AnswerKey|Anser\s*Key|AnserKey)\s*[:\-]*/i.test(line);
    }

    isExplanation(line) {
        const explanationPatterns = [
            /^Explanation\s*[:\-]/i,
            /^Reason\s*[:\-]/i,
            /^Solution\s*[:\-]/i,
            /^Note\s*[:\-]/i,
            /^Hint\s*[:\-]/i,
            /^Exp\.?\s*[:\-]/i,
            /^Explain\s*[:\-]/i
        ];
        
        return explanationPatterns.some(pattern => pattern.test(line));
    }

    startNewSection(line) {
        this.finalizeCurrentQuestion();
        
        this.currentSection = {
            name: line,
            questions: []
        };
        
        this.sections.push(this.currentSection);
        console.log('Started new section:', line);
    }

    startNewQuestion(line) {
        this.finalizeCurrentQuestion();

        const parsedQuestion = this.extractQuestionMetadata(line);
        
        this.currentQuestion = {
            question_number: parsedQuestion.number,
            question_text: parsedQuestion.text,
            options: [],
            correct_answer: null,
            explanation: null,
            section: this.currentSection ? this.currentSection.name : 'General'
        };
        
        console.log('Started new question:', line.substring(0, 50));
    }

    addOption(line) {
        if (!this.currentQuestion) return;
        
        // Handle Hindi format "A) शेरB) बाघC) हाथीD) घोड़ा" - all options on one line
        // Split by finding A) B) C) D) markers
        const allOptionsPattern = /^([A-D])\)\s*(\S+?)\s*([A-D])\)\s*(\S+?)\s*([A-D])\)\s*(\S+?)\s*([A-D])\)\s*(\S+)$/i;
        const allMatch = line.match(allOptionsPattern);
        
        if (allMatch && allMatch[2] && allMatch[4] && allMatch[6]) {
            this.currentQuestion.options.push({ label: 'A', text: allMatch[2] });
            this.currentQuestion.options.push({ label: 'B', text: allMatch[4] });
            this.currentQuestion.options.push({ label: 'C', text: allMatch[6] });
            this.currentQuestion.options.push({ label: 'D', text: allMatch[8] });
            console.log('Added 4 combined Hindi options:', allMatch[2], allMatch[4], allMatch[6], allMatch[8]);
            return;
        }
        
        // Alternative: Split by regex looking for "A) " pattern at specific positions
        // Match: letter)text where text can contain Hindi characters
        const segments = [];
        const segmentRegex = /([A-D])\)\s*([^(A-D)]+)/gi;
        let match;
        while ((match = segmentRegex.exec(line)) !== null) {
            segments.push({ label: match[1].toUpperCase(), text: match[2].trim() });
        }
        
        if (segments.length >= 2) {
            for (const seg of segments) {
                if (seg.label >= 'A' && seg.label <= 'D' && seg.text) {
                    this.currentQuestion.options.push(seg);
                }
            }
            console.log('Added', segments.length, 'options from combined line');
            return;
        }
        
        // Try simple single option format
        let cleanOption = line;
        let optionLetter = null;
        
        const patterns = [
            /^\(?\s*([A-Da-d])\s*[\.\)\:\-]\s*(.+)$/i,
            /^\[\s*([A-Da-d])\s*\]\s*(.+)$/i,
            /^[A-Da-d]\s*\)\s*(.+)$/i,
            /^[A-Da-d]\s*\.\s*(.+)$/i,
            /^(?:Option|Ans)\s*[A-Da-d]\s*[\.\)\:\-]\s*(.+)$/i
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                optionLetter = match[1].toUpperCase();
                cleanOption = match[2].trim();
                break;
            }
        }
        
        if (!optionLetter) {
            const letterMatch = line.match(/^([A-Da-d])/i);
            if (letterMatch) {
                optionLetter = letterMatch[1].toUpperCase();
                cleanOption = line.replace(/^[A-Da-d][\.\)\:\-]\s*/, '').trim();
            }
        }
        
        if (optionLetter) {
            this.currentQuestion.options.push({
                label: optionLetter,
                text: cleanOption
            });
            
            console.log('Added option:', optionLetter, '-', cleanOption.substring(0, 30));
        }
    }

    setCorrectAnswer(line) {
        if (!this.currentQuestion) return;
        
        const patterns = [
            /Correct\s*[:\-]\s*([A-D])/i,
            /Answer\s*[:\-]\s*([A-D])/i,
            /Ans\s*[:\.\-]\s*([A-D])/i,
            /Solution\s*[:\-]\s*([A-D])/i,
            /^([A-D])\s*is\s*correct/i,
            /The\s*correct\s*answer\s*is\s*([A-D])/i,
            /Correct\s*Ans\s*[:\-]\s*([A-D])/i,
            /^([A-D])\s+Correct/i,
            /Correct\s+([A-D])\s*$/i,
            /^\s*([A-D])\s*$/i
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                const correctLetter = match[1].toUpperCase();
                if (['A', 'B', 'C', 'D'].includes(correctLetter)) {
                    this.currentQuestion.correct_answer = correctLetter;
                    console.log('Set correct answer:', correctLetter);
                    return;
                }
            }
        }
        
        const fallbackMatch = line.match(/[A-D]/i);
        if (fallbackMatch) {
            const correctLetter = fallbackMatch[0].toUpperCase();
            this.currentQuestion.correct_answer = correctLetter;
            console.log('Set correct answer (fallback):', correctLetter);
        }
    }

    addExplanation(line) {
        if (!this.currentQuestion) return;
        
        const cleanExplanation = line.replace(/^(Explanation|Reason|Solution|Note|Hint)\s*[:\-]\s*/i, '').trim();
        this.currentQuestion.explanation = cleanExplanation;
        console.log('Added explanation:', cleanExplanation.substring(0, 50));
    }

    addQuestionContent(line) {
        if (!this.currentQuestion) return;
        
        this.currentQuestion.question_text += ' ' + line;
    }

    finalizeCurrentQuestion() {
        if (this.currentQuestion && this.currentQuestion.options.length > 0) {
            if (this.currentSection) {
                this.currentSection.questions.push(this.currentQuestion);
            }
            
            this.questions.push(this.currentQuestion);
            
            console.log('Finalized question with', this.currentQuestion.options.length, 'options');
            
            this.currentQuestion = null;
        }
    }

    extractQuestionMetadata(line) {
        const patterns = [
            /^Q\.?\s*(\d+)\s*[\.\):\-]?\s*(.+)$/i,
            /^Q\s*\.\s*(\d+)\s*[\.\):\-]?\s*(.+)$/i,
            /^Question\s*(\d+)\s*[:\.\)-]?\s*(.+)$/i,
            /^Que\.?\s*(\d+)\s*[:\.\)-]?\s*(.+)$/i,
            /^(\d+)\s*[\.\)]\s*(.+)$/i,
            /^\(\s*(\d+)\s*\)\s*(.+)$/i,
            /^\[\s*(\d+)\s*\]\s*(.+)$/i,
            /^([Qq]|[Qq]uestion)\s*[\.\:\-\)]*\s*(\d+)\s*[:\.\)]?\s*(.+)$/i
        ];

        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    number: Number(match[1]),
                    text: match[match.length - 1].trim()
                };
            }
        }

        return {
            number: null,
            text: line.trim()
        };
    }

    collectAnswerKey(line) {
        const answerMatches = line.matchAll(/Q\.?\s*(\d+)\s*[\.\):\-]?\s*([A-D])/gi);

        for (const match of answerMatches) {
            this.answerKeyMap.set(Number(match[1]), match[2].toUpperCase());
        }
    }

    applyAnswerKey() {
        if (this.answerKeyMap.size === 0) return;

        for (const question of this.questions) {
            if (question.question_number && this.answerKeyMap.has(question.question_number)) {
                question.correct_answer = this.answerKeyMap.get(question.question_number);
            }
        }
    }

    parseAlternativeFormat(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const questions = [];
        
        let currentQuestion = null;
        let questionNumber = 0;
        
        for (const line of lines) {
            const questionMatch = line.match(/^(\d+)\s*[\.\)\:\-]?\s*(.+)/);
            if (questionMatch) {
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                
                questionNumber++;
                currentQuestion = {
                    question_number: questionNumber,
                    question_text: questionMatch[2],
                    options: [],
                    correct_answer: null,
                    explanation: null
                };
            }
            else if (currentQuestion && line.match(/^[A-Da-d][\.\)\:\-]?\s*\w/i)) {
                const optionMatch = line.match(/^([A-Da-d])\s*[\.\)\:\-]?\s*(.+)/);
                if (optionMatch) {
                    currentQuestion.options.push({
                        label: optionMatch[1].toUpperCase(),
                        text: optionMatch[2]
                    });
                }
            }
            else if (currentQuestion && line.match(/correct|answer/i)) {
                const answerMatch = line.match(/([A-D])/i);
                if (answerMatch) {
                    currentQuestion.correct_answer = answerMatch[1].toUpperCase();
                }
            }
        }
        
        if (currentQuestion) {
            questions.push(currentQuestion);
        }
        
        return questions;
    }
}

module.exports = EnhancedQuestionParser;
