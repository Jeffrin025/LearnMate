import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const TakeTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        if (!userData || userData.role !== "student") {
          navigate("/");
          return;
        }

        // 1. Start test attempt
        const attemptResponse = await axios.post(
          `http://localhost:5000/api/test-attempts/${id}/start`,
          { studentId: userData.userId }
        );
        setAttemptId(attemptResponse.data.attemptId);

        // 2. Get test details and questions
        const testResponse = await axios.get(
          `http://localhost:5000/api/tests/${id}`
        );
        
        setTest(testResponse.data.test);
        setQuestions(testResponse.data.questions);
        
        // 3. Initialize empty answers
        const initialAnswers = {};
        testResponse.data.questions.forEach(q => {
          initialAnswers[q.id] = "";
        });
        setAnswers(initialAnswers);
        
        // 4. Set timer if duration exists
        if (testResponse.data.test.duration_minutes) {
          setTimeLeft(testResponse.data.test.duration_minutes * 60);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading test:", err);
        setError("Failed to load test. Please try again.");
        setLoading(false);
      }
    };

    fetchTest();
  }, [id, navigate]);

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
const handleSubmit = async () => {
  try {
    setLoading(true);
    setError("");
    setSubmissionStatus("Submitting...");

    const answerList = Object.entries(answers).map(([questionId, answerText]) => ({
      questionId,
      answerText
    }));

    const response = await axios.post(
      `http://localhost:5000/api/test-attempts/${attemptId}/submit`,
      {
        studentId: JSON.parse(localStorage.getItem("user")).userId,
        answers: answerList
      }
    );

    if (response.data.requiresGrading) {
      setSubmissionStatus("Test submitted! Grading in progress...");
      // Poll for results
      const checkResults = async () => {
        try {
          const statusResponse = await axios.get(
            `http://localhost:5000/api/test-attempts/${attemptId}/grading-status`
          );
          if (!statusResponse.data.pending_grading) {
            navigate(`/student/tests/${id}/results`);
          } else {
            setTimeout(checkResults, 2000); // Check again after 2 seconds
          }
        } catch (err) {
          console.error("Error checking grading status:", err);
        }
      };
      checkResults();
    } else {
      navigate(`/student/tests/${id}/results`);
    }
  } catch (err) {
    setLoading(false);
    setSubmissionStatus(null);
    setError("Failed to submit test. Please try again.");
  }
};

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading test...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>{error}</div>;
  }

  if (!test) {
    return <div style={{ padding: "20px" }}>Test not found</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>{test.title}</h2>
        {timeLeft !== null && (
          <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
            Time Left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        )}
      </div>
      
      <p><strong>Topic:</strong> {test.topic}</p>
      <p><strong>Description:</strong> {test.description}</p>
      
      <div style={{ margin: "20px 0" }}>
        {questions.map((question, index) => (
          <div key={question.id} style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
            <h3>Question {index + 1} ({question.marks} marks)</h3>
            <p>{question.question_text}</p>
            
            {question.question_type === "mcq" ? (
              <div>
                {Object.entries(question.options || {}).map(([option, text]) => (
                  <div key={option} style={{ margin: "10px 0" }}>
                    <label>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => handleAnswerChange(question.id, option)}
                        style={{ marginRight: "10px" }}
                      />
                      {option}: {text}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[question.id] || ""}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                style={{ width: "100%", minHeight: "100px", padding: "10px" }}
                placeholder="Type your answer here..."
              />
            )}
          </div>
        ))}
      </div>
      
      <button 
        onClick={handleSubmit}
        style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white" }}
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Test"}
      </button>
      {submissionStatus && (
  <div style={{ margin: "10px 0", color: "#2196F3" }}>
    {submissionStatus}
  </div>
)}
    </div>
  );
};

export default TakeTest;