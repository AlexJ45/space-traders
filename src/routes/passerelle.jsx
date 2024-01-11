import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const Passerelle = ({ children }) => {
  const { symbol } = useParams();
  const [agentData, setAgentData] = useState(null);
  const [isTokenCopied, setTokenCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const authToken = Cookies.get("authToken");
        const response = await fetch(
          "https://api.spacetraders.io/v2/my/agent",
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (response.ok) {
          const responseData = await response.json();
          setAgentData(responseData.data);

          // Move the comparison inside the try block
          if (symbol !== responseData.data.symbol) {
            navigate(`/passerelle/${responseData.data.symbol}`);
          }
        } else {
          console.error("Error fetching agent data:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching agent data:", error);
      }
    };

    fetchAgentData();
  }, [symbol, navigate]);

  const handleCopyToken = () => {
    const authToken = Cookies.get("authToken");
    navigator.clipboard.writeText(authToken);
    setTokenCopied(true);

    setTimeout(() => {
      setTokenCopied(false);
    }, 1000);
  };

  const handleLogout = () => {
    Cookies.remove("authToken");
    navigate("/");
  };

  return (
    <div className="passerelle">
      {agentData ? (
        <div className="menu">
          <div className="profile">
            <h1>{agentData.symbol}</h1>
            <span>Headquarters: {agentData.headquarters}</span>
            <span>{agentData.credits} credits</span>
            <span>Ships: {agentData.shipCount}</span>
            <button className="button" onClick={handleCopyToken}>
              Token
            </button>
            {isTokenCopied && <p>Copied!</p>}
            <button className="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="menu">
          <span>Loading...</span>
        </div>
      )}
      <div className="passerelle__content">{children}</div>
    </div>
  );
};

export default Passerelle;
