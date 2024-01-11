import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import "/public/assets/css/login.css";

const Login = () => {
  const [token, setToken] = useState("");
  const [callSign, setCallSign] = useState("");
  const [isRegisterView, setRegisterView] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authToken = Cookies.get("authToken");
    if (authToken) {
      authenticateAndNavigate(authToken);
    }
  }, []);

  const authenticateAndNavigate = async (token) => {
    try {
      const playerSymbol = await authenticateUserAndGetSymbol(token);
      if (playerSymbol) {
        Cookies.set("authToken", token, { expires: 7 });
        navigate(`/passerelle/${playerSymbol}`);
      } else {
        console.error("Player is undefined");
      }
    } catch (error) {
      console.error("Authentication error:", error);

      if (error.message.includes("Unauthorized")) {
        console.error(
          "Unauthorized access. Redirect to login or handle accordingly."
        );
      }
    }
  };

  const handleTokenInput = (event) => {
    setToken(event.target.value);
  };

  const handleCallSignInput = (event) => {
    setCallSign(event.target.value);
  };

  const handleLogin = () => {
    try {
      const playerSymbol = authenticateUserAndGetSymbol(token);
      if (playerSymbol) {
        Cookies.set("authToken", token, { expires: 7 });
        navigate(`/passerelle/${playerSymbol}`);
      } else {
        console.error("Player symbol is undefined");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      console.error(
        "Unauthorized access. Redirect to login or handle accordingly."
      );
    }
  };

  const handleRegister = async () => {
    try {
      const response = await registerNewAgent(callSign);

      if (response.status === 201) {
        console.log("Agent registered successfully");
        const registrationData = await response.json();
        const registrationToken = registrationData.data.token;
        setToken(registrationToken);
        authenticateAndNavigate(registrationToken);
      } else {
        console.error("Agent registration failed:", response.statusText);

        if (response.status === 401) {
          console.error(
            "Unauthorized access. Redirect to login or handle accordingly."
          );
        } else if (response.status === 400) {
          console.error("Bad request. Handle accordingly.");
        }

        console.error("Error response:", response);
      }
    } catch (error) {
      console.error("Agent registration failed:", error);

      const errorText = error.response
        ? await error.response.text()
        : error.message;
      console.error("Error response:", errorText);

      throw new Error("Agent registration failed");
    }
  };

  const authenticateUserAndGetSymbol = async (inputToken) => {
    try {
      const response = await fetch("https://api.spacetraders.io/v2/my/agent", {
        headers: {
          Authorization: `Bearer ${inputToken}`,
        },
        timeout: 1000,
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = await response.json();
        return responseData.data.symbol;
      } else {
        console.error("Authentication failed. Response:", response);
        throw new Error(`Authentication failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      console.error("Error details:", error.response || error.message || error);
      throw new Error("Authentication failed");
    }
  };

  const registerNewAgent = async (inputCallSign) => {
    try {
      const response = await fetch("https://api.spacetraders.io/v2/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: inputCallSign,
          faction: "COSMIC",
        }),
      });

      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("Error during agent registration:", error);
      throw new Error("Agent registration failed");
    }
  };

  const switchToRegisterView = () => {
    setRegisterView(true);
  };

  const switchToLoginView = () => {
    setRegisterView(false);
  };

  return (
    <div className="login">
      <div id="switch" className="switch">
        <div
          className={`switch-choix ${
            !isRegisterView ? "switch-actif" : ""
          } button`}
          onClick={switchToLoginView}
        >
          Login
        </div>
        <div
          className={`switch-choix ${
            isRegisterView ? "switch-actif" : ""
          } button`}
          onClick={switchToRegisterView}
        >
          Register
        </div>
      </div>

      {isRegisterView ? (
        <form className="register-form">
          <label>
            Call Sign:
            <input
              type="text"
              value={callSign}
              onChange={handleCallSignInput}
            />
          </label>
          <button className="button" onClick={handleRegister}>
            Register
          </button>
        </form>
      ) : (
        <form className="login-form">
          <label>
            Token:
            <input type="text" value={token} onChange={handleTokenInput} />
          </label>

          <button className="button" onClick={handleLogin}>
            Login
          </button>
        </form>
      )}
    </div>
  );
};

export default Login;
