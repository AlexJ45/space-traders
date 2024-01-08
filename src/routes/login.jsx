import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const Login = () => {
  const [token, setToken] = useState("");
  const navigate = useNavigate();

  const handleTokenInput = (event) => {
    setToken(event.target.value);
  };

  const handleLogin = async () => {
    try {
      const playerSymbol = await authenticateUserAndGetSymbol(token);
      if (playerSymbol) {
        Cookies.set("authToken", token, { expires: 7 });
        navigate(`/passerelle/${playerSymbol}`);
      } else {
        console.error("Player symbol is undefined");
      }
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  const authenticateUserAndGetSymbol = async (inputToken) => {
    try {
      const response = await fetch("https://api.spacetraders.io/v2/my/agent", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${inputToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      return responseData.data.symbol;
    } catch (error) {
      console.error("Error during authentication:", error);
      throw new Error("Authentication failed");
    }
  };

  return (
    <div>
      <h1>Login Page</h1>
      <label>
        Token:
        <input type="text" value={token} onChange={handleTokenInput} />
      </label>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;