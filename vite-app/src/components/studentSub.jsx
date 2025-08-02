// StudentSubmission.jsx
import React, { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const StudentSubmission = () => {
  const { assignmentId } = useParams();
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!file) {
    setError("Please select a file to upload");
    return;
  }

  setIsSubmitting(true);
  setError("");
  setSuccess("");

  try {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || userData.role !== "student") {
      window.location.href = "/";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);  // This must match the Multer field name
    formData.append("studentId", userData.userId);

    // Submit to your backend
    await axios.post(
      `http://localhost:5000/api/assignments/${assignmentId}/submit`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setSuccess("Assignment submitted successfully!");
  } catch (err) {
    console.error("Submission error:", err);
    setError(err.response?.data?.message || "Submission failed");
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>Submit Assignment</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Upload your solution (PDF):
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: "10px 15px" }}
        >
          {isSubmitting ? "Submitting..." : "Submit Assignment"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
};

export default StudentSubmission;