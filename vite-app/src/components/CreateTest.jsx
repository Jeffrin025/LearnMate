import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const CreateTest = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    testType: "mcq",
    topic: "",
    totalMarks: "",
    durationMinutes: "",
    deadline: ""
  });
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testId, setTestId] = useState(null);
  const [step, setStep] = useState(1); // 1: Create test, 2: Add questions, 3: Publish
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData || userData.role !== "staff") {
        navigate("/");
        return;
      }

      const response = await axios.post("http://localhost:5000/api/tests", {
        ...form,
        staffId: userData.userId,
        totalMarks: parseInt(form.totalMarks),
        durationMinutes: parseInt(form.durationMinutes)
      });

      setTestId(response.data.testId);
      setSuccess("Test created successfully! Add questions next.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create test");
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      setError("");
      setSuccess("");

      const response = await axios.post(
        `http://localhost:5000/api/tests/${testId}/generate-questions`,
        { numQuestions, difficulty,totalMarks: form.totalMarks  }
      );

      setSuccess(`Generated ${response.data.count} questions successfully!`);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate questions");
    }
  };

  const handlePublishTest = async () => {
    try {
      setError("");
      setSuccess("");

      const userData = JSON.parse(localStorage.getItem("user"));
      const response = await axios.post(
        `http://localhost:5000/api/tests/${testId}/publish`,
        { staffId: userData.userId }
      );

      setSuccess(`Test published to ${response.data.assignedStudents} students!`);
      navigate("/staff/tests");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish test");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Create New Test</h2>
      
      {step === 1 && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Title:</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Description:</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px", minHeight: "100px" }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Test Type:</label>
            <select
              name="testType"
              value={form.testType}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="mcq">Multiple Choice (MCQ)</option>
              <option value="written">Written Answer</option>
            </select>
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Topic:</label>
            <input
              type="text"
              name="topic"
              value={form.topic}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Total Marks:</label>
            <input
              type="number"
              name="totalMarks"
              value={form.totalMarks}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Duration (minutes):</label>
            <input
              type="number"
              name="durationMinutes"
              value={form.durationMinutes}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Deadline:</label>
            <input
              type="datetime-local"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          
          <button type="submit" style={{ padding: "10px 15px" }}>
            Create Test
          </button>
        </form>
      )}
      
      {step === 2 && (
        <div>
          <h3>Generate Questions</h3>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Number of Questions:</label>
            <input
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              min="1"
              max="20"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Difficulty:</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          
          <button 
            onClick={handleGenerateQuestions}
            style={{ padding: "10px 15px", marginRight: "10px" }}
          >
            Generate Questions
          </button>
          
          <button 
            onClick={() => setStep(1)}
            style={{ padding: "10px 15px" }}
          >
            Back
          </button>
        </div>
      )}
      
      {step === 3 && (
        <div>
          <h3>Publish Test</h3>
          <p>Your test is ready to be published to students.</p>
          
          <button 
            onClick={handlePublishTest}
            style={{ padding: "10px 15px", backgroundColor: "#4CAF50", color: "white" }}
          >
            Publish Test
          </button>
        </div>
      )}
      
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
};

export default CreateTest;