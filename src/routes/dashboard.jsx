import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";

const Dashboard = () => {
  const [startingWaypoint, setStartingWaypoint] = useState(null);
  const [currentSystem, setCurrentSystem] = useState(null);
  const [systemDetails, setSystemDetails] = useState(null);

  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [canvas, setCanvas] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (systemDetails && canvas) {
      const ctx = canvas.getContext("2d");
      drawWaypoints(ctx, systemDetails.waypoints);
    }
  }, [systemDetails, canvasSize, canvasPosition]);

  const drawWaypoints = (ctx, waypoints) => {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    waypoints.forEach((waypoint) => {
      const adjustedX = 250 + waypoint.x - canvasPosition.x;
      const adjustedY = 250 + waypoint.y - canvasPosition.y;

      ctx.beginPath();
      ctx.arc(adjustedX, adjustedY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = getWaypointColor(waypoint.type);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.stroke();
      ctx.font = "10px Arial";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.fillText(
        waypoint.type === "ORBITAL_STATION" ? "OS" : waypoint.type[0],
        adjustedX,
        adjustedY + 3
      );
    });
  };

  const getWaypointColor = (type) => {
    switch (type) {
      case "PLANET":
        return "green";
      case "MOON":
        return "gray";
      case "ORBITAL_STATION":
        return "blue";
      default:
        return "red";
    }
  };

  const handleMoveToOrigin = () => {
    setCanvasPosition({ x: 0, y: 0 });
  };

  const handleCanvasRef = (node) => {
    if (canvas) {
      // Remove existing event listeners before adding new ones
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    }

    if (node !== null) {
      setCanvas(node);

      node.addEventListener("mousedown", handleMouseDown);
      node.addEventListener("mousemove", handleMouseMove);
      node.addEventListener("mouseup", handleMouseUp);
    }
  };

  const handleMouseDown = (e) => {
    if (isDragging) {
      setIsDragging(false);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setCanvasPosition({
        x: canvasPosition.x + deltaX,
        y: canvasPosition.y + deltaY,
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
          <canvas
            id="mapCanvas"
            ref={handleCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{
              border: "1px solid #ccc",
              cursor: isDragging ? "grabbing" : "grab",
            }}
          />
          <button onClick={handleMoveToOrigin}>Move to (0,0)</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
