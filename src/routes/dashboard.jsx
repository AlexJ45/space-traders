import React, { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import "/public/assets/css/dashboard.css";

const Dashboard = () => {
  const [startingWaypoint, setStartingWaypoint] = useState(null);
  const [currentSystem, setCurrentSystem] = useState(null);
  const [systemDetails, setSystemDetails] = useState(null);

  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [canvasPosition, setCanvasPosition] = useState({
    x: canvasSize.width / 2,
    y: canvasSize.height / 2,
  });
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clickedWaypoint, setClickedWaypoint] = useState(null);
  const [waypointDetails, setWaypointDetails] = useState(null);

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
        const systemUrl = `https://api.spacetraders.io/v2/systems/${sector}-${system}`;

        fetch(systemUrl, { headers: { Authorization: `Bearer ${authToken}` } })
          .then((response) => response.json())
          .then((systemData) => {
            setCurrentSystem(systemData.data);

            fetch(
              `https://api.spacetraders.io/v2/systems/${systemData.data.symbol}`,
              {
                headers: { Authorization: `Bearer ${authToken}` },
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

    const centerCanvas = () => {
      setCanvasPosition({
        x: canvasSize.width / 2,
        y: canvasSize.height / 2,
      });
    };
    setCanvasSize({
      width: canvasRef.current.offsetWidth,
      height: canvasRef.current.offsetHeight,
    });
    const handleResize = () => {
      setCanvasSize({
        width: canvasRef.current.offsetWidth,
        height: canvasSize.height,
      });
    };
    centerCanvas();
    handleMoveToOrigin();
    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (systemDetails && canvasRef.current) {
      const waypointsToDraw = filterWaypoints(systemDetails.waypoints);
      const ctx = canvasRef.current.getContext("2d");
      drawWaypoints(ctx, waypointsToDraw, currentSystem);
    }
  }, [systemDetails, canvasSize, canvasPosition, canvasScale, clickedWaypoint]);

  const filterWaypoints = (waypoints) => {
    return waypoints.filter((waypoint) => !waypoint.orbits);
  };

  useEffect(() => {
    const handleMouseLeave = () => {
      setIsDragging(false);
    };

    if (canvasRef.current) {
      canvasRef.current.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  const drawWaypoints = (ctx, waypoints, system) => {
    ctx.canvas.waypoints = [];

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    if (!system || !system.waypoints || system.waypoints.length === 0) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(0, canvasSize.height / 2);
    ctx.lineTo(canvasSize.width, canvasSize.height / 2);
    ctx.moveTo(canvasSize.width / 2, 0);
    ctx.lineTo(canvasSize.width / 2, canvasSize.height);
    ctx.strokeStyle = "rgba(92, 67, 0, 0.3)";
    ctx.stroke();

    const systemX = canvasSize.width / 2 - canvasPosition.x * canvasScale;
    const systemY = canvasSize.height / 2 - canvasPosition.y * canvasScale;
    ctx.beginPath();
    ctx.moveTo(systemX, 0);
    ctx.lineTo(systemX, canvasSize.height);
    ctx.moveTo(0, systemY);
    ctx.lineTo(canvasSize.width, systemY);
    ctx.strokeStyle = "rgba(92, 67, 0, 0.6)";
    ctx.stroke();

    waypoints.forEach((waypoint) => {
      const adjustedX =
        canvasSize.width / 2 + (waypoint.x - canvasPosition.x) * canvasScale;
      const adjustedY =
        canvasSize.height / 2 + (waypoint.y - canvasPosition.y) * canvasScale;

      ctx.beginPath();
      ctx.arc(adjustedX, adjustedY, 5 * canvasScale, 0, 2 * Math.PI);
      ctx.fillStyle = getWaypointColor(waypoint.type);
      ctx.fill();

      ctx.canvas.waypoints.push({
        x: adjustedX,
        y: adjustedY,
        waypointData: waypoint,
      });
    });
  };

  const getWaypointColor = (type) => {
    switch (type) {
      case "PLANET":
        return "greenyellow";
      case "GAS_GIANT":
        return "blue";
      case "ASTEROID":
        return "grey";
      case "ASTEROID_BASE":
        return "dimgrey";
      case "ENGINEERED_ASTEROID":
        return "darkslategrey";
      case "FUEL_STATION":
        return "red";
      case "JUMP_GATE":
        return "aqua";
      default:
        return "grey";
    }
  };

  const handleMoveToOrigin = () => {
    const targetPosition = { x: 0, y: 0 };
    const animationDuration = 500;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      setCanvasPosition({
        x: lerp(canvasPosition.x, targetPosition.x, progress),
        y: lerp(canvasPosition.y, targetPosition.y, progress),
      });
      setCanvasScale(lerp(canvasScale, 1, progress));

      if (progress < 1) {
        window.requestAnimationFrame(animate);
      }
    };

    window.requestAnimationFrame(animate);
  };

  const lerp = (start, end, progress) => {
    return start + progress * (end - start);
  };

  const handleCanvasMouseDown = (e) => {
    if (isDragging) {
      setIsDragging(false);
    } else {
      const clickX = e.nativeEvent.offsetX - canvasSize.width / 2;
      const clickY = e.nativeEvent.offsetY - canvasSize.height / 2;

      console.log("Clicked Coordinates (Canvas):", clickX, clickY);

      const clickedWaypoint = findClickedWaypoint(clickX, clickY);

      if (clickedWaypoint) {
        setClickedWaypoint(clickedWaypoint.waypointData);
        fetchWaypointDetails(clickedWaypoint.waypointData);
      } else {
        setClickedWaypoint(null);
        setIsDragging(true);
        setDragStart({
          x: e.clientX,
          y: e.clientY,
        });
      }
    }
  };

  const findClickedWaypoint = (clickX, clickY) => {
    console.log(canvasRef.current.waypoints);
    for (const waypoint of canvasRef.current.waypoints) {
      const distance = Math.sqrt(
        (clickX - (waypoint.x - canvasSize.width / 2)) ** 2 +
          (clickY - (waypoint.y - canvasSize.height / 2)) ** 2
      );

      if (distance <= 7 * canvasScale) {
        console.log("finded");
        return waypoint;
      }
    }
    return null;
  };

  const handleCanvasMouseMove = (e) => {
    if (isDragging && canvasRef.current) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setCanvasPosition((prevPosition) => ({
        x: prevPosition.x - deltaX / canvasScale,
        y: prevPosition.y - deltaY / canvasScale,
      }));

      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasWheel = (e) => {
    const zoomSpeed = 0.1;
    const newScale =
      e.deltaY > 0 ? canvasScale - zoomSpeed : canvasScale + zoomSpeed;

    const minScale = 0.4;
    const maxScale = 4;
    const clampedScale = Math.min(Math.max(newScale, minScale), maxScale);

    setCanvasScale(clampedScale);
  };

  const fetchWaypointDetails = (waypoint) => {
    const authToken = Cookies.get("authToken");

    if (waypoint && waypoint.systemSymbol && waypoint.symbol) {
      fetch(
        `https://api.spacetraders.io/v2/systems/${waypoint.systemSymbol}/waypoints/${waypoint.symbol}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )
        .then((response) => response.json())
        .then((details) => {
          setWaypointDetails(details.data);
        })
        .catch((error) =>
          console.error("Error fetching waypoint details:", error)
        );
    } else {
      console.error("Invalid waypoint data:", waypoint);
    }
  };

  return (
    <>
      {startingWaypoint && currentSystem && systemDetails && (
        <div className="map-info">
          {clickedWaypoint == null ? (
            <>
              <h3>{currentSystem.symbol}</h3>
              <p>Type: {currentSystem.type}</p>
              <p>
                Coordinates: ({currentSystem.x}, {currentSystem.y})
              </p>
              <h3>Starting Waypoint:</h3>
              <p>{startingWaypoint}</p>

              <h3>System Details:</h3>
              <p>Sector Symbol: {systemDetails.sectorSymbol}</p>
            </>
          ) : (
            <>
              <h4>Clicked Waypoint Details:</h4>
              <p>Type: {clickedWaypoint.type}</p>
              <p>
                Coordinates: ({clickedWaypoint.x}, {clickedWaypoint.y})
              </p>
              {waypointDetails && (
                <div>
                  <p>System Symbol: {waypointDetails.systemSymbol}</p>
                  <p>Symbol: {waypointDetails.symbol}</p>
                  <p>Type: {waypointDetails.type}</p>
                  <p>
                    Coordinates: ({waypointDetails.x}, {waypointDetails.y})
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <button className="recenter" onClick={handleMoveToOrigin}>
        Move to (0,0)
      </button>

      <canvas
        className="map"
        id="mapCanvas"
        width={canvasSize.width}
        height={canvasSize.height}
        ref={canvasRef}
        style={{
          border: "1px solid #ccc",
          cursor: isDragging ? "grabbing" : "pointer",
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={handleCanvasWheel}
      />
    </>
  );
};

export default Dashboard;
