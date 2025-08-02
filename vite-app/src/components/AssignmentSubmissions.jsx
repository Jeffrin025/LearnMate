import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const AssignmentSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [gradingStatus, setGradingStatus] = useState({}); // Track grading status per student

  useEffect(() => { 
    const fetchData = async () => {
      try {
        const titleResponse = await axios.get(
          `http://localhost:5000/api/assignments/${id}/pdf`,
          { responseType: "blob" }
        );
        
        const contentDisposition = titleResponse.headers["content-disposition"];
        let filename = "assignment.pdf";
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename=(.+)/);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1].replace(/"/g, '');
          }
        }
        setAssignmentTitle(filename.replace('.pdf', ''));

        // Fetch submissions
        const submissionsResponse = await axios.get(
          `http://localhost:5000/api/assignments/${id}/submissions`
        );
        setSubmissions(submissionsResponse.data);
        
        // Initialize grading status
        const status = {};
        submissionsResponse.data.forEach(sub => {
          status[sub.student_id] = sub.grade ? 'graded' : (sub.submitted ? 'pending' : 'not-submitted');
        });
        setGradingStatus(status);
        
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch submissions");
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDownload = async (assignmentId, studentId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/submissions/${assignmentId}/${studentId}/pdf`,
        { responseType: "blob" }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      
      const contentDisposition = response.headers["content-disposition"];
      let filename = "submission.pdf";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download submission");
    }
  };

 const handleAutoGrade = async (studentId) => {
  try {
    setGradingStatus(prev => ({ ...prev, [studentId]: 'grading-in-progress' }));

    // 1. Get all required data in parallel
    const [submissionRes, assignmentDetails] = await Promise.all([
      axios.get(`http://localhost:5000/api/submissions/${id}/${studentId}/pdf`, { 
        responseType: "arraybuffer",
        timeout: 30000
      }),
      axios.get(`http://localhost:5000/api/assignments/${id}`) // New endpoint to get assignment details
    ]);

    // 2. Prepare form data with all assignment information
    const formData = new FormData();
    const pdfBlob = new Blob(
      [submissionRes.data], 
      { type: submissionRes.headers['content-type'] || 'application/pdf' }
    );
    
    formData.append("file", pdfBlob, "submission.pdf");
    formData.append("assignmentTitle", assignmentDetails.data.title);
    formData.append("assignmentDescription", assignmentDetails.data.description);
    
    // Also include the original assignment PDF if needed
    const assignmentPdfRes = await axios.get(
      `http://localhost:5000/api/assignments/${id}/pdf`,
      { responseType: "arraybuffer" }
    );
    const assignmentPdfBlob = new Blob(
      [assignmentPdfRes.data],
      { type: assignmentPdfRes.headers['content-type'] || 'application/pdf' }
    );
    formData.append("assignmentPdf", assignmentPdfBlob, "original_assignment.pdf");

    // 3. Send to grading service
    const gradeResponse = await axios.post(
      "http://localhost:5001/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 40000
      }
    );

    // Rest of the function remains the same...
    if (!gradeResponse.data?.success) {
      throw new Error(gradeResponse.data?.error || "Grading failed");
    }

    // 5. Save grade to database
    await axios.post(
      `http://localhost:5000/api/assignments/${id}/grade`, 
      {
        studentId,
        grade: gradeResponse.data.grade,
        feedback: gradeResponse.data.feedback
      },
      { timeout: 10000 }
    );

    // 6. Update UI immediately
    setSubmissions(prev => prev.map(sub => 
      sub.student_id === studentId 
        ? { 
            ...sub, 
            grade: gradeResponse.data.grade,
            feedback: gradeResponse.data.feedback
          }
        : sub
    ));
    
    setGradingStatus(prev => ({ ...prev, [studentId]: 'graded' }));

  } catch (err) {
    console.error("Auto grading failed:", err);
    setGradingStatus(prev => ({ ...prev, [studentId]: 'grading-failed' }));
    
    const errorMsg = err.response?.data?.error || 
                    err.message || 
                    "Auto-grading failed due to an unknown error";
    
    alert(`Auto-grading failed: ${errorMsg}`);
  }
};
  const handleGradeSubmit = async (studentId, grade, feedback) => {
    try {
      setGradingStatus(prev => ({ ...prev, [studentId]: 'grading-in-progress' }));
      
      await axios.post(`http://localhost:5000/api/assignments/${id}/grade`, {
        studentId,
        grade,
        feedback
      });
      
      // Refresh submissions
      const response = await axios.get(
        `http://localhost:5000/api/assignments/${id}/submissions`
      );
      setSubmissions(response.data);
      setGradingStatus(prev => ({ ...prev, [studentId]: 'graded' }));
    } catch (err) {
      console.error("Grading failed:", err);
      setGradingStatus(prev => ({ ...prev, [studentId]: 'grading-failed' }));
      alert("Failed to submit grade");
    }
  };

  const getStatusBadge = (submission) => {
    const status = gradingStatus[submission.student_id] || 
                 (submission.grade ? 'graded' : (submission.submitted ? 'pending' : 'not-submitted'));
    
    const statusStyles = {
      'not-submitted': { color: '#ff4d4f', text: 'Not Submitted' },
      'pending': { color: '#faad14', text: 'Pending Grading' },
      'grading-in-progress': { color: '#1890ff', text: 'Grading...' },
      'graded': { color: '#52c41a', text: `Graded (${submission.grade})` },
      'grading-failed': { color: '#ff4d4f', text: 'Grading Failed' }
    };

    return (
      <span style={{ 
        color: statusStyles[status].color,
        fontWeight: 'bold'
      }}>
        {statusStyles[status].text}
      </span>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <button onClick={() => navigate("/staff/assignments")} style={{ marginBottom: "20px" }}>
        Back to Assignments
      </button>
      <h2>Submissions for: {assignmentTitle}</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : submissions.length === 0 ? (
        <p>No submissions found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Student</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Email</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Status</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Submitted At</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Grade</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Feedback</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.student_id}>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{submission.username}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{submission.email}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {getStatusBadge(submission)}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "-"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {submission.grade || "-"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {submission.feedback || "-"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {submission.submitted && (
                    <>
                      <button 
                        onClick={() => handleDownload(id, submission.student_id)}
                        style={{ marginRight: "5px" }}
                      >
                        Download
                      </button>
                      {gradingStatus[submission.student_id] === 'pending' && (
                        <button
                          onClick={() => handleAutoGrade(submission.student_id)}
                          style={{ marginRight: "5px", backgroundColor: "#1890ff", color: "white" }}
                        >
                          Auto Grade
                        </button>
                      )}
                      <GradeForm 
                        currentGrade={submission.grade}
                        currentFeedback={submission.feedback}
                        onSubmit={(grade, feedback) => 
                          handleGradeSubmit(submission.student_id, grade, feedback)
                        }
                        disabled={gradingStatus[submission.student_id] === 'grading-in-progress'}
                      />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
const GradeForm = ({ currentGrade, currentFeedback, onSubmit, disabled }) => {
  const [grade, setGrade] = useState(currentGrade || "");
  const [feedback, setFeedback] = useState(currentFeedback || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(grade, feedback);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "inline-block" }}>
      <input
        type="number"
        step="0.1"
        min="0"
        max="10"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        placeholder="Grade"
        style={{ width: "60px", marginRight: "5px" }}
        disabled={disabled}
      />
      <input
        type="text"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Feedback"
        style={{ width: "150px", marginRight: "5px" }}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled}>
        {disabled ? "Processing..." : "Submit"}
      </button>
    </form>
  );
};

export default AssignmentSubmissions;