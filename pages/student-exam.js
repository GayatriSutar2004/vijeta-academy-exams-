import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Exam.module.css';

const MAX_TAB_SWITCH_WARNINGS = 3;
const VIOLATION_COOLDOWN_MS = 1500;

const parseOption = (option) => {
    const match = option.match(/^([A-Z])\)\s*(.*)$/);
    if (!match) {
        return { label: option, text: option };
    }

    return {
        label: match[1],
        text: match[2]
    };
};

const getFullscreenElement = () =>
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null;

    const isQuestionAnswered = (questionId, answersObj) => {
        return answersObj[questionId] !== undefined && answersObj[questionId] !== null && answersObj[questionId] !== '';
    };

    const getSectionQuestionCount = (sectionName, questionsBySection) => {
        return (questionsBySection[sectionName] || []).length;
    };

    const getSectionAnsweredCount = (sectionName, questionsBySection, answersObj) => {
        const sectionQuestions = questionsBySection[sectionName] || [];
        return sectionQuestions.filter(q => isQuestionAnswered(q.question_id, answersObj)).length;
    };

    export default function StudentExam() {
    const router = useRouter();
    const answersRef = useRef({});
    const timeRemainingRef = useRef(null);
    const studentDataRef = useRef(null);
    const examDataRef = useRef(null);
    const timerRef = useRef(null);
    const submitInProgressRef = useRef(false);
    const violationTimestampRef = useRef(0);
    const violationCountRef = useRef(0);
    const examStartedRef = useRef(false);

    const [examData, setExamData] = useState(null);
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentSection, setCurrentSection] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [examStarted, setExamStarted] = useState(false);
    const [warningCount, setWarningCount] = useState(0);
    const [warningMessage, setWarningMessage] = useState('');
    const [fullscreenRequired, setFullscreenRequired] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        examStartedRef.current = examStarted;
    }, [examStarted]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        timeRemainingRef.current = timeRemaining;
    }, [timeRemaining]);

    useEffect(() => {
        studentDataRef.current = studentData;
    }, [studentData]);

    useEffect(() => {
        examDataRef.current = examData;
    }, [examData]);

    useEffect(() => {
        const storedStudentData = localStorage.getItem('student');
        if (!storedStudentData) {
            router.push('/student-login');
            return;
        }

        const student = JSON.parse(storedStudentData);
        setStudentData(student);

        const { examId } = router.query;
        if (examId) {
            checkExamAccess(examId, student.student_id);
        }
    }, [router, router.query]);

    useEffect(() => {
        if (!examStarted) {
            return undefined;
        }

        timerRef.current = setInterval(() => {
            const currentTime = timeRemainingRef.current;
            if (currentTime === null) {
                return;
            }

            if (currentTime <= 1) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                timeRemainingRef.current = 0;
                setTimeRemaining(0);
                submitExam('Time expired');
                return;
            }

            const nextTime = currentTime - 1;
            timeRemainingRef.current = nextTime;
            setTimeRemaining(nextTime);
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [examStarted]);

    useEffect(() => {
        if (!examStarted) {
            return undefined;
        }

        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordViolation('Tab switch detected');
            }
        };

        const handleFullscreenChange = () => {
            const inFullscreen = Boolean(getFullscreenElement());
            setFullscreenRequired(!inFullscreen);

            if (!inFullscreen && examStartedRef.current && !submitInProgressRef.current) {
                recordViolation('Fullscreen mode exited');
            }
        };

        const handleBeforeUnload = (event) => {
            if (!submitInProgressRef.current) {
                event.preventDefault();
                event.returnValue = 'Leaving this page will interrupt your exam.';
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [examStarted]);

    useEffect(() => () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, []);

    const checkExamAccess = async (examId, studentId) => {
        try {
            const response = await fetch(`https://vijeta-api.onrender.com/api/student-exams/${examId}/check-access/${studentId}`);
            const data = await response.json();

            if (response.status === 403 || response.status === 404) {
                setError(data.error);
                setLoading(false);
                return;
            }

            if (data.access_status === 'ELIGIBLE') {
                loadExamQuestions(examId, studentId);
            } else {
                setError('You are not eligible for this exam. This exam has not been assigned to your account.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error checking exam access:', err);
            setError('Error verifying exam access');
            setLoading(false);
        }
    };

    const loadExamQuestions = async (examId, studentId) => {
        try {
            const response = await fetch(`https://vijeta-api.onrender.com/api/student-exams/${examId}/questions/${studentId}`);
            const data = await response.json();

            if (response.ok) {
                setExamData(data);
                setTimeRemaining(data.exam.duration_minutes * 60);
                setLoading(false);
            } else {
                setError(data.error || 'Error loading exam questions');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error loading exam questions:', err);
            setError('Error loading exam questions');
            setLoading(false);
        }
    };

    const requestFullscreen = async () => {
        const element = document.documentElement;
        const requestMethod =
            element.requestFullscreen ||
            element.webkitRequestFullscreen ||
            element.msRequestFullscreen;

        if (!requestMethod) {
            setError('Fullscreen mode is not supported in this browser.');
            return false;
        }

        try {
            await requestMethod.call(element);
            setFullscreenRequired(false);
            return true;
        } catch (err) {
            console.error('Error entering fullscreen:', err);
            setError('Fullscreen permission is required to continue the exam.');
            return false;
        }
    };

    const exitFullscreen = async () => {
        const exitMethod =
            document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.msExitFullscreen;

        if (exitMethod && getFullscreenElement()) {
            try {
                await exitMethod.call(document);
            } catch (err) {
                console.error('Error exiting fullscreen:', err);
            }
        }
    };

    const formatTime = (seconds) => {
        const safeSeconds = Math.max(seconds || 0, 0);
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const secs = safeSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (questionId, optionLabel) => {
        setAnswers((prev) => {
            const nextAnswers = {
                ...prev,
                [questionId]: optionLabel
            };
            answersRef.current = nextAnswers;
            return nextAnswers;
        });
    };

    const submitExam = async (reason = 'Manual submit') => {
        const currentStudentData = studentDataRef.current;
        const currentExamData = examDataRef.current;

        if (submitInProgressRef.current || !currentStudentData || !currentExamData) {
            return;
        }

        submitInProgressRef.current = true;
        setSubmitting(true);
        setWarningMessage(reason === 'Manual submit' ? '' : reason);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        try {
            console.log('Submitting exam with answers:', answersRef.current);
            const totalDuration = currentExamData.exam.duration_minutes * 60;
            const timeTaken = totalDuration - (timeRemainingRef.current || 0);

            const response = await fetch('https://vijeta-api.onrender.com/api/exam-attempts', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_id: currentStudentData.student_id,
                    exam_id: currentExamData.exam.exam_id,
                    answers: answersRef.current,
                    time_taken: Math.max(0, timeTaken)
                })
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('Non-JSON response received:', text);
                throw new Error('Server returned an invalid response format.');
            }

            const result = await response.json();
            if (response.ok) {
                console.log('Exam submitted successfully:', result);
                await exitFullscreen();
                router.push(`/exam-result?attemptId=${result.attempt_id}`);
                return;
            }

            setError(result.error || 'Error submitting exam');
        } catch (err) {
            console.error('Error submitting exam:', err);
            setError(`Error submitting exam: ${err.message}`);
        } finally {
            submitInProgressRef.current = false;
            setSubmitting(false);
        }
    };

    const recordViolation = (reason) => {
        const now = Date.now();
        if (now - violationTimestampRef.current < VIOLATION_COOLDOWN_MS) {
            return;
        }

        violationTimestampRef.current = now;
        const nextCount = violationCountRef.current + 1;
        violationCountRef.current = nextCount;
        setWarningCount(nextCount);

        const warningsLeft = Math.max(MAX_TAB_SWITCH_WARNINGS - nextCount, 0);
        const message = warningsLeft > 0
            ? `${reason}. Warning ${nextCount} of ${MAX_TAB_SWITCH_WARNINGS}. ${warningsLeft} warning${warningsLeft === 1 ? '' : 's'} left before auto-submit.`
            : `${reason}. Maximum warnings reached. Submitting exam automatically.`;

        setWarningMessage(message);
        window.alert(message);

        if (nextCount >= MAX_TAB_SWITCH_WARNINGS) {
            submitExam('Exam auto-submitted after repeated tab or fullscreen violations.');
        }
    };

    const startExam = async () => {
        setError('');
        const enteredFullscreen = await requestFullscreen();
        if (!enteredFullscreen) {
            return;
        }

        setWarningMessage('');
        setWarningCount(0);
        violationCountRef.current = 0;
        setExamStarted(true);
    };

    const sections = examData?.sections || [];
    const questionsBySection = examData?.questions_by_section || {};
    const answeredCount = Object.keys(answers).length;
    const firstSectionKey = Object.keys(questionsBySection)[0];
    const firstQuestionMarks = firstSectionKey
        ? questionsBySection[firstSectionKey]?.[0]?.marks || 1
        : 1;

    const getAllQuestionsFlat = () => {
        const allQuestions = [];
        sections.forEach(sectionName => {
            const sectionQuestions = questionsBySection[sectionName] || [];
            sectionQuestions.forEach((q, idx) => {
                allQuestions.push({
                    ...q,
                    sectionIndex: sections.indexOf(sectionName),
                    questionIndex: idx
                });
            });
        });
        return allQuestions;
    };

    const allQuestionsList = getAllQuestionsFlat();

    const goToQuestion = (question) => {
        setCurrentSection(question.sectionIndex);
        setTimeout(() => {
            const questionElement = document.getElementById(`question-${question.question_id}`);
            if (questionElement) {
                questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <h3>Loading exam...</h3>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <div className={styles.errorBox}>
                        <h3>Access Denied</h3>
                        <p>{error}</p>
                        <button
                            className={styles.button}
                            onClick={() => router.push('/student-dashboard')}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!examStarted) {
        return (
            <div className={styles.container}>
                <div className={styles.examContainer}>
                    <div className={styles.examHeader}>
                        <h2>{examData.exam.exam_name}</h2>
                        <p><strong>Exam Type:</strong> {examData.exam.exam_type}</p>
                        <p><strong>Total Questions:</strong> {examData.total_questions}</p>
                        <p><strong>Duration:</strong> {examData.exam.duration_minutes} minutes</p>
                        <p><strong>Marks:</strong> Each question carries {firstQuestionMarks} marks</p>
                    </div>

                    <div className={styles.instructions}>
                        <h3>Exam Instructions</h3>
                        <ul>
                            <li>This exam contains {examData.total_questions} questions</li>
                            <li>Fullscreen mode is mandatory throughout the exam</li>
                            <li>Tab switches or fullscreen exits generate warnings</li>
                            <li>After 3 warnings the exam is auto-submitted</li>
                            <li>Select only one answer for each question</li>
                            <li>The timer starts only after fullscreen is enabled</li>
                            <li>The exam is submitted automatically when time expires</li>
                        </ul>
                    </div>

                    <button
                        className={`${styles.button} ${styles.startButton}`}
                        onClick={startExam}
                    >
                        Start Exam in Fullscreen
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {fullscreenRequired && (
                <div className={styles.fullscreenOverlay}>
                    <div className={styles.fullscreenDialog}>
                        <h3>Fullscreen Required</h3>
                        <p>Return to fullscreen mode immediately to continue the exam.</p>
                        <button
                            className={`${styles.button} ${styles.startButton}`}
                            onClick={requestFullscreen}
                        >
                            Re-enter Fullscreen
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.examContainer}>
                <div className={styles.examHeader}>
                    <div className={styles.examInfo}>
                        <h2>{examData.exam.exam_name}</h2>
                        <p><strong>Student:</strong> {studentData.student_name}</p>
                        <p><strong>Exam Type:</strong> {examData.exam.exam_type}</p>
                        <p><strong>Answered:</strong> {answeredCount} / {examData.total_questions}</p>
                    </div>
                    <div className={styles.timer}>
                        <div className={styles.timeDisplay}>
                            {formatTime(timeRemaining)}
                        </div>
                        <p>Time Remaining</p>
                    </div>
                </div>

                <div className={styles.securityBanner}>
                    <div>
                        <strong>Security Monitoring:</strong> {warningCount} / {MAX_TAB_SWITCH_WARNINGS} warnings used
                    </div>
                    <div>{warningMessage || 'Stay in fullscreen and keep this tab active to avoid warnings.'}</div>
                </div>

                <div className={styles.sectionNav}>
                    <div className={styles.sectionTabsContainer}>
                        <div className={styles.sectionTabs}>
                            <h3>Sections</h3>
                            {sections.map((section, index) => {
                                const totalInSection = getSectionQuestionCount(section, questionsBySection);
                                const answeredInSection = getSectionAnsweredCount(section, questionsBySection, answers);
                                return (
                                    <button
                                        key={section}
                                        className={`${styles.sectionTab} ${currentSection === index ? styles.activeTab : ''}`}
                                        onClick={() => setCurrentSection(index)}
                                    >
                                        <span className={styles.sectionTabName}>{section}</span>
                                        <span className={styles.sectionTabCount}>
                                            {answeredInSection}/{totalInSection}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.questionPalette}>
                            <h3>Question Palette</h3>
                            <div className={styles.paletteGrid}>
                                {allQuestionsList.map((q, idx) => (
                                    <button
                                        key={q.question_id}
                                        className={`${styles.paletteButton} ${isQuestionAnswered(q.question_id, answers) ? styles.paletteAnswered : ''}`}
                                        onClick={() => goToQuestion(q)}
                                        title={`Q${idx + 1}${isQuestionAnswered(q.question_id, answers) ? ' (Answered)' : ''}`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.paletteLegend}>
                                <span className={styles.legendItem}>
                                    <span className={`${styles.legendBox} ${styles.legendAnswered}`}></span>
                                    Answered
                                </span>
                                <span className={styles.legendItem}>
                                    <span className={`${styles.legendBox} ${styles.legendNotAnswered}`}></span>
                                    Not Answered
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.questionsContainer}>
                    {sections.map((sectionName, sectionIndex) => (
                        <div
                            key={sectionName}
                            className={`${styles.section} ${currentSection === sectionIndex ? styles.activeSection : styles.hiddenSection}`}
                        >
                            <h3 className={styles.sectionTitle}>{sectionName}</h3>

                            {(questionsBySection[sectionName] || []).map((question, questionIndex) => {
                                const globalIndex = sections.slice(0, sectionIndex).reduce((acc, sec) => acc + (questionsBySection[sec] || []).length, 0) + questionIndex + 1;
                                return (
                                <div key={question.question_id} id={`question-${question.question_id}`} className={styles.questionCard}>
                                    <div className={styles.questionHeader}>
                                        <span className={styles.questionNumber}>
                                            Q{globalIndex}
                                        </span>
                                        <span className={styles.marks}>
                                            ({question.marks} marks)
                                        </span>
                                    </div>

                                    <div className={styles.questionText}>
                                        {question.question_text}
                                    </div>

                                    {question.image_path && (
                                        <div style={{ marginTop: "15px", textAlign: "center" }}>
                                            <img 
                                                src={question.image_path} 
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

                                    <div className={styles.optionsContainer}>
                                        {question.options.map((option, optionIndex) => {
                                            const parsedOption = parseOption(option);

                                            return (
                                                <label
                                                    key={`${question.question_id}-${parsedOption.label}-${optionIndex}`}
                                                    className={styles.optionLabel}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question_${question.question_id}`}
                                                        value={parsedOption.label}
                                                        checked={answers[question.question_id] === parsedOption.label}
                                                        onChange={() => handleAnswerChange(question.question_id, parsedOption.label)}
                                                        className={styles.optionInput}
                                                    />
                                                    <span className={styles.optionText}>
                                                        <strong>{parsedOption.label})</strong> {parsedOption.text}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className={styles.submitContainer}>
                    <button
                        className={`${styles.button} ${styles.submitButton}`}
                        onClick={() => submitExam('Exam submitted manually')}
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
}


