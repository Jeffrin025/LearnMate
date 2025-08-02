import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const StaffTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        if (!userData || userData.role !== "staff") {
          navigate("/");
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/api/tests/staff/${userData.userId}`
        );
        setTests(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch tests");
        setLoading(false);
      }
    };

    fetchTests();
  }, [navigate]);

  const handleViewTest = (testId) => {
    navigate(`/staff/tests/${testId}`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Your Tests</h2>
        <button 
          onClick={() => navigate("/staff/tests/create")}
          style={{ padding: "10px 15px", backgroundColor: "#4CAF50", color: "white" }}
        >
          Create New Test
        </button>
      </div>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : tests.length === 0 ? (
        <p>No tests found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Title</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Topic</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Type</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Total Marks</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Deadline</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Status</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id}>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{test.title}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{test.topic}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{test.test_type.toUpperCase()}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{test.total_marks}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {test.deadline ? new Date(test.deadline).toLocaleString() : "-"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {test.is_published ? (
                    <span style={{ color: "green" }}>Published</span>
                  ) : (
                    <span style={{ color: "orange" }}>Draft</span>
                  )}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  <button onClick={() => handleViewTest(test.id)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StaffTests;