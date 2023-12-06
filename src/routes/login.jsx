import React, { useState } from "react";
import { Form } from "react-router-dom";
import axios from "axios";

export async function action(token) {
  try {
    const response = await axios.get(
      "https://api.spacetraders.io/v2/my/agent",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error making API request:", error);
    throw error;
  }
}

export default function Login() {
  const [token, setToken] = useState("");
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await action(token);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleTokenChange = (e) => {
    setToken(e.target.value);
  };

  return (
    <div>
      <h1>/connect</h1>
      <div>
        <Form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Token"
            value={token}
            onChange={handleTokenChange}
          />
          <button type="submit">Connexion</button>
        </Form>
      </div>
    </div>
  );
}
