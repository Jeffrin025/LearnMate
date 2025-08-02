import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/login", form);
      const { role, username, userId } = response.data;
      
      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify({
        role,
        username,
        userId
      }));

      if (role === "student") {
        navigate("/student");
      } else if (role === "staff") {
        navigate("/staff");
      } else {
        setError("Unknown role.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="email" 
          name="email" 
          placeholder="Email" 
          value={form.email} 
          onChange={handleChange} 
          required 
          style={{ padding: "8px", width: "300px" }}
        /><br /><br />
        <input 
          type="password" 
          name="password" 
          placeholder="Password" 
          value={form.password} 
          onChange={handleChange} 
          required 
          style={{ padding: "8px", width: "300px" }}
        /><br /><br />
        <button type="submit" style={{ padding: "10px 20px" }}>Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Login;