import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const TestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("questions");

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch test details and questions
        const testResponse = await axios.get(
          `http://localhost:5000/api/tests/${id}`
        );
        
        setTest(testResponse.data.test);
        setQuestions(testResponse.data.questions);

        // Fetch student attempts
        const attemptsResponse = await axios.get(
          `http://localhost:5000/api/tests/${id}/attempts`
        );
        
        setAttempts(attemptsResponse.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch test details");
        setLoading(false);
      }
    };

    fetchTestDetails();
  }, [id]);

  const handleDeleteQuestion = async (questionId) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/test-questions/${questionId}`
      );
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (err) {
      setError("Failed to delete question");
    }
  };

  const handleViewAttempt = (attemptId) => {
    navigate(`/staff/tests/${id}/attempts/${attemptId}`);
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading test details...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <button 
        onClick={() => navigate("/staff/tests")}
        style={{ marginBottom: "20px" }}
      >
        Back to Tests
      </button>

      <h2>Test Details: {test.title}</h2>
      <p><strong>Topic:</strong> {test.topic}</p>
      <p><strong>Type:</strong> {test.test_type.toUpperCase()}</p>
      <p><strong>Total Marks:</strong> {test.total_marks}</p>
      <p><strong>Deadline:</strong> {test.deadline ? new Date(test.deadline).toLocaleString() : "None"}</p>
      <p><strong>Status:</strong> {test.is_published ? "Published" : "Draft"}</p>

      <div style={{ margin: "20px 0", display: "flex", borderBottom: "1px solid #ddd" }}>
        <button
          style={{
            padding: "10px 15px",
            backgroundColor: activeTab === "questions" ? "#f0f0f0" : "transparent",
            border: "none",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("questions")}
        >
          Questions
        </button>
        <button
          style={{
            padding: "10px 15px",
            backgroundColor: activeTab === "attempts" ? "#f0f0f0" : "transparent",
            border: "none",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("attempts")}
        >
          Student Attempts ({attempts.length})
        </button>
      </div>

      {activeTab === "questions" && (
        <div>
          <h3>Questions</h3>
          {questions.length === 0 ? (
            <p>No questions added yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Question</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Type</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Marks</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {question.question_text}
                      {question.question_type === "mcq" && (
                        <div style={{ marginTop: "5px", fontSize: "0.9em" }}>
                          <p><strong>Options:</strong></p>
                          <ul>
                            {Object.entries(question.options || {}).map(([key, value]) => (
                              <li key={key}>
                                {key}: {value} {key === question.correct_answer && "(Correct)"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {question.question_type.toUpperCase()}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {question.marks}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      <button 
                        onClick={() => handleDeleteQuestion(question.id)}
                        style={{ color: "red" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "attempts" && (
        <div>
          <h3>Student Attempts</h3>
          {attempts.length === 0 ? (
            <p>No student attempts yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Student</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Status</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Marks Obtained</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Submitted At</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {attempt.username} ({attempt.email})
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {attempt.is_submitted ? (
                        attempt.total_marks_obtained !== null ? (
                          <span style={{ color: "green" }}>Graded</span>
                        ) : (
                          <span style={{ color: "orange" }}>Submitted (Pending Grading)</span>
                        )
                      ) : (
                        <span style={{ color: "red" }}>Not Submitted</span>
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {attempt.total_marks_obtained !== null ? (
                        `${attempt.total_marks_obtained}/${test.total_marks}`
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {attempt.submitted_at ? (
                        new Date(attempt.submitted_at).toLocaleString()
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {attempt.is_submitted && (
                        <button onClick={() => handleViewAttempt(attempt.id)}>
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default TestDetails;