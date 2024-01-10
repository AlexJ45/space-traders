import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Cookies from "js-cookie";

const Passerelle = ({ children }) => {
  const { symbol } = useParams();
  const [agentData, setAgentData] = useState(null);

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
        const data = await response.json();
        setAgentData(data.data);
      } catch (error) {
        console.error("Error fetching agent data:", error);
      }
    };

    fetchAgentData();
  }, []);

  return (
    <div className="passerelle">
      {agentData ? (
        <div className="menu">
          <div className="profile">
            <h1>{symbol}</h1>

            <span>ID: {agentData.accountId}</span>
            <span>Headquarters: {agentData.headquarters}</span>

            <span>{agentData.credits} credits</span>
            <span>Ships : {agentData.shipCount}</span>
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
