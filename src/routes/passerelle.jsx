import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Cookies from 'js-cookie';

const Passerelle = ({ children }) => {
  const { symbol } = useParams();
  const [agentData, setAgentData] = useState(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const authToken = Cookies.get("authToken");
        const response = await fetch('https://api.spacetraders.io/v2/my/agent', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        const data = await response.json();
        setAgentData(data.data);
      } catch (error) {
        console.error('Error fetching agent data:', error);
      }
    };

    fetchAgentData();
  }, []);

  return (
    <div>
      <h1>Passerelle Page</h1>
      {agentData ? (
        <div>
          <p>Welcome! Your symbol: {symbol}</p>
          <p>Account ID: {agentData.accountId}</p>
          <p>Symbol: {agentData.symbol}</p>
          <p>Headquarters: {agentData.headquarters}</p>
          <p>Credits: {agentData.credits}</p>
          <p>Starting Faction: {agentData.startingFaction}</p>
          <p>Ship Count: {agentData.shipCount}</p>
          
          {children}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default Passerelle;