import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const TestResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        if (!userData || userData.role !== "student") {
          navigate("/");
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/api/test-attempts/${id}`
        );
        
        setResults(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch test results");
        setLoading(false);
      }
    };

    fetchResults();
  }, [id, navigate]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading results...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <button 
        onClick={() => navigate("/student/tests")}
        style={{ marginBottom: "20px" }}
      >
        Back to Tests
      </button>
      
      <h2>Test Results: {results.attempt.title}</h2>
      <p><strong>Topic:</strong> {results.attempt.topic}</p>
      
      <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#f5f5f5",color:"black" }}>
        <h3>Summary</h3>
        <p>
          <strong>Total Marks:</strong> {results.attempt.total_marks_obtained || "Pending"} / {results.attempt.total_marks}
        </p>
        <p>
          <strong>Submitted At:</strong> {new Date(results.attempt.submitted_at).toLocaleString()}
        </p>
      </div>
      
      <div style={{ margin: "20px 0" }}>
        <h3>Question-wise Results</h3>
        
        {results.answers.map((answer, index) => (
          <div key={answer.id} style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px" }}>
            <h4>Question {index + 1}</h4>
            <p>{answer.question_text}</p>
            
            <div style={{ margin: "10px 0", padding: "10px", backgroundColor: "#f9f9f9",color:"black" }}>
              <p><strong>Your Answer:</strong></p>
              <p>{answer.answer_text || "No answer provided"}</p>
            </div>
            
            <div style={{ margin: "10px 0" }}>
              <p>
                <strong>Marks:</strong> {answer.marks_awarded !== null ? answer.marks_awarded : "Pending"} / {answer.marks}
              </p>
              {answer.feedback && (
                <div style={{ marginTop: "10px" }}>
                  <p><strong>Feedback:</strong></p>
                  <p>{answer.feedback}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestResults;