import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Exam.module.css';

export default function ExamResult() {
    const router = useRouter();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const { attemptId } = router.query;
        if (attemptId) {
            fetchExamResult(attemptId);
        }
    }, [router.query]);

    const fetchExamResult = async (attemptId) => {
        try {
            const response = await fetch(`https://vijeta-api.onrender.com/api/exam-attempts/${attemptId}`);
            const data = await response.json();

            if (response.ok) {
                setResult(data);
                setLoading(false);
            } else {
                setError(data.error || 'Error fetching results');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching exam result:', err);
            setError('Error fetching results');
            setLoading(false);
        }
    };

    const goToDashboard = () => {
        router.push('/student-dashboard');
    };

    const printResult = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <h3>Loading results...</h3>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <div className={styles.errorBox}>
                        <h3>Error</h3>
                        <p>{error}</p>
                        <button 
                            className={styles.button}
                            onClick={goToDashboard}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <h3>No results found</h3>
                    <button 
                        className={styles.button}
                        onClick={goToDashboard}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const { attempt, responses, performance } = result;
    const percentage = parseFloat(performance?.percentage || 0);

    const getResultColor = (score) => {
        if (score >= 80) return '#28a745';
        if (score >= 60) return '#ffc107';
        if (score >= 40) return '#fd7e14';
        return '#dc3545';
    };

    const getResultGrade = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Average';
        return 'Need Improvement';
    };

    return (
        <div className={styles.container}>
            <div className={styles.examContainer}>
                {/* Result Header */}
                <div className={styles.examHeader}>
                    <div className={styles.examInfo}>
                        <h2>Exam Results</h2>
                        <p><strong>Exam:</strong> {attempt.exam_name}</p>
                        <p><strong>Student:</strong> {attempt.student_name}</p>
                        <p><strong>Exam Type:</strong> {attempt.exam_type}</p>
                    </div>
                    <div className={styles.timer}>
                        <div 
                            className={styles.timeDisplay}
                            style={{ 
                                color: getResultColor(percentage),
                                fontSize: '32px'
                            }}
                        >
                            {percentage.toFixed(2)}%
                        </div>
                        <p>{getResultGrade(percentage)}</p>
                    </div>
                </div>

                {/* Performance Summary */}
                <div className={styles.performanceSummary}>
                    <h3>Performance Summary</h3>
                    <div className={styles.summaryGrid}>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryValue}>{performance?.total_questions || 0}</div>
                            <div className={styles.summaryLabel}>Total Questions</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryValue}>{performance?.correct_answers || 0}</div>
                            <div className={styles.summaryLabel}>Correct Answers</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryValue}>{performance?.total_questions - (performance?.correct_answers || 0)}</div>
                            <div className={styles.summaryLabel}>Wrong Answers</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <div 
                                className={styles.summaryValue}
                                style={{ color: getResultColor(percentage) }}
                            >
                                {percentage.toFixed(1)}%
                            </div>
                            <div className={styles.summaryLabel}>Percentage</div>
                        </div>
                    </div>
                </div>

                {/* Detailed Answers */}
                <div className={styles.detailedAnswers}>
                    <h3>Detailed Answers</h3>
                    <div className={styles.answersContainer}>
                        {responses.map((response, index) => (
                            <div 
                                key={response.question_id} 
                                className={`${styles.answerCard} ${response.is_correct ? styles.correctAnswer : styles.wrongAnswer}`}
                            >
                                <div className={styles.answerHeader}>
                                    <span className={styles.questionNumber}>
                                        Q{index + 1}
                                    </span>
                                    <span className={`${styles.answerStatus} ${response.is_correct ? styles.correct : styles.wrong}`}>
                                        {response.is_correct ? '✓ Correct' : '✗ Wrong'}
                                    </span>
                                </div>
                                
                                <div className={styles.questionText}>
                                    {response.question_text}
                                </div>
                                
                                {response.image_path && (
                                    <div style={{ marginTop: "15px", textAlign: "center" }}>
                                        <img 
                                            src={response.image_path} 
                                            alt="Question illustration" 
                                            style={{ 
                                                maxWidth: "100%", 
                                                maxHeight: "400px",
                                                borderRadius: "8px",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                            }} 
                                        />
                                    </div>
                                )}
                                
                                <div className={styles.answerDetails}>
                                    <div className={styles.selectedAnswer}>
                                        <strong>Your Answer:</strong> {response.correct_option_label ? response.correct_option_label : response.selected_answer}
                                    </div>
                                    <div className={styles.correctAnswer}>
                                        <strong>Correct Answer:</strong> {response.correct_option_label || response.correct_option_text}
                                    </div>
                                    {response.explanation && (
                                        <div className={styles.explanation}>
                                            <strong>Explanation:</strong> {response.explanation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.submitContainer}>
                    <button 
                        className={styles.button}
                        onClick={goToDashboard}
                        style={{ marginRight: '10px' }}
                    >
                        Back to Dashboard
                    </button>
                    <button 
                        className={`${styles.button} ${styles.printButton}`}
                        onClick={printResult}
                        style={{ background: '#6c757d' }}
                    >
                        Print Results
                    </button>
                </div>
            </div>
        </div>
    );
}


