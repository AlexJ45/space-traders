import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";

const Dashboard = () => {
  const [startingWaypoint, setStartingWaypoint] = useState(null);
  const [currentSystem, setCurrentSystem] = useState(null);
  const [systemDetails, setSystemDetails] = useState(null);

  useEffect(() => {
    const authToken = Cookies.get("authToken");
    fetch("https://api.spacetraders.io/v2/my/agent", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const startingWaypointSymbol = data.data.headquarters;
        setStartingWaypoint(startingWaypointSymbol);

        const [sector, system] = startingWaypointSymbol.split("-");

        fetch(`https://api.spacetraders.io/v2/systems/${sector}-${system}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
          .then((response) => response.json())
          .then((systemData) => {
            setCurrentSystem(systemData.data);

            fetch(
              `https://api.spacetraders.io/v2/systems/${systemData.data.symbol}`,
              {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                },
              }
            )
              .then((response) => response.json())
              .then((details) => setSystemDetails(details.data))
              .catch((error) =>
                console.error("Error fetching system details:", error)
              );
          })
          .catch((error) =>
            console.error("Error fetching system details:", error)
          );
      })
      .catch((error) => console.error("Error fetching agent details:", error));
  }, []);

  return (
    <div>
      <h2>Waypoints Dashboard</h2>
      {startingWaypoint && currentSystem && systemDetails && (
        <div>
          <h3>{currentSystem.symbol}</h3>
          <p>Type: {currentSystem.type}</p>
          <p>
            Coordinates: ({currentSystem.x}, {currentSystem.y})
          </p>
          <h4>Starting Waypoint:</h4>
          <p>{startingWaypoint}</p>

          <h4>System Details:</h4>
          <p>Sector Symbol: {systemDetails.sectorSymbol}</p>
          <p>Waypoints:</p>
          <ul>
            {systemDetails.waypoints.map((waypoint) => (
              <li key={waypoint.symbol}>
                <p>Symbol: {waypoint.symbol}</p>
                <p>Type: {waypoint.type}</p>
                <p>
                  Coordinates: ({waypoint.x}, {waypoint.y})
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
