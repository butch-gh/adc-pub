import React from "react";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div>
      <h1>Welcome to the Protected Home Page</h1>
      <p>If you see this, you are authenticated!</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Home;