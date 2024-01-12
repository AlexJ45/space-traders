import React, { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import "/public/assets/css/dashboard.css";

const Dashboard = () => {
  const [startingWaypoint, setStartingWaypoint] = useState(null);
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
  const [ship, setShip] = useState(null);
  const [selectedShip, setSelectedShip] = useState(null);
  const [shipsAtWaypoint, setShipsAtWaypoint] = useState([]);
  const [orbitalsDetails, setOrbitalsDetails] = useState(null);
  const [canNavigate, setCanNavigate] = useState(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);
  const [accessibleWaypoints, setAccessibleWaypoints] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authToken = Cookies.get("authToken");

        const agentResponse = await fetch(
          "https://api.spacetraders.io/v2/my/agent",
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        const agentData = await agentResponse.json();
        const headquarters = agentData.data.headquarters;
        setStartingWaypoint(headquarters);

        const [sector, system] = headquarters.split("-");
        const systemUrl = `https://api.spacetraders.io/v2/systems/${sector}-${system}`;
        const systemResponse = await fetch(systemUrl, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const systemData = await systemResponse.json();

        localStorage.setItem("SystemDetails", JSON.stringify(systemData.data));
        setSystemDetails(systemData.data);

        const shipsResponse = await fetch(
          "https://api.spacetraders.io/v2/my/ships/",
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            timeout: 1000,
          }
        );
        const shipsData = await shipsResponse.json();
        const ships = shipsData.data;
        setShip(ships);

        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        });

        const initialPosition = { x: 0, y: 0 };
        const initialScale = 1;

        setCanvasPosition(initialPosition);
        setCanvasScale(initialScale);

        const handleResize = () => {
          setCanvasSize({
            width: canvasRef.current.offsetWidth,
            height: canvasRef.current.offsetHeight,
          });
        };

        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
        };
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

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

  useEffect(() => {
    if (waypointDetails && waypointDetails.orbitals) {
      const fetchOrbitalsData = async () => {
        try {
          const details = await fetchOrbitalsDetails(waypointDetails.orbitals);
          setOrbitalsDetails(details);
        } catch (error) {
          console.error("Error fetching orbitals details:", error);
        }
      };

      fetchOrbitalsData();
    }
  }, [waypointDetails]);

  useEffect(() => {
    if (systemDetails && canvasRef.current) {
      const waypointsToDraw = filterWaypoints(systemDetails.waypoints);
      const ctx = canvasRef.current.getContext("2d");
      drawWaypoints(ctx, waypointsToDraw);
    }
  }, [systemDetails, canvasSize, canvasPosition, canvasScale, clickedWaypoint]);

  const filterWaypoints = (waypoints) => {
    return waypoints.filter((waypoint) => !waypoint.orbits);
  };

  const imageSources = {
    PLANET: "/assets/medias/icons/island.svg",
    GAS_GIANT: "/assets/medias/icons/storm.svg",
    FUEL_STATION: "/assets/medias/icons/tavern.svg",
    GRAVITY_WELL: "/assets/medias/icons/typhoon.svg",
    DEBRIS_FIELD: "/assets/medias/icons/shipwreck.svg",
    ARTIFICIAL_GRAVITY_WELL: "/assets/medias/icons/typhoon.svg",
    JUMP_GATE: "/assets/medias/icons/portal.svg",
    DEFAULT: "/assets/medias/icons/default.svg",
  };

  const preloadImages = () => {
    const images = {};
    Object.keys(imageSources).forEach((key) => {
      const img = new Image();
      img.src = imageSources[key];
      images[key] = img;
    });
    return images;
  };

  const images = preloadImages();

  const drawCustomWaypoint = (ctx, adjustedX, adjustedY, type) => {
    const img = images[type] || images.DEFAULT;
    ctx.drawImage(
      img,
      adjustedX - 15 * canvasScale,
      adjustedY - 15 * canvasScale,
      30 * canvasScale,
      30 * canvasScale
    );

    ctx.fillStyle = getWaypointColor(type);
    ctx.fill();
  };
  const drawWaypoints = (ctx, waypoints) => {
    ctx.canvas.waypoints = [];
    ctx.fillStyle = "#f9ffb5";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (!waypoints || waypoints.length === 0) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(0, canvasSize.height / 2);
    ctx.lineTo(canvasSize.width, canvasSize.height / 2);
    ctx.moveTo(canvasSize.width / 2, 0);
    ctx.lineTo(canvasSize.width / 2, canvasSize.height);
    ctx.strokeStyle = "rgba(218, 165, 32, 0.50)";
    ctx.stroke();

    const systemX = canvasSize.width / 2 - canvasPosition.x * canvasScale;
    const systemY = canvasSize.height / 2 - canvasPosition.y * canvasScale;
    ctx.beginPath();
    ctx.moveTo(systemX, 0);
    ctx.lineTo(systemX, canvasSize.height);
    ctx.moveTo(0, systemY);
    ctx.lineTo(canvasSize.width, systemY);
    ctx.strokeStyle = "#5d350a";
    ctx.stroke();

    waypoints.forEach((waypoint) => {
      const adjustedX =
        canvasSize.width / 2 + (waypoint.x - canvasPosition.x) * canvasScale;
      const adjustedY =
        canvasSize.height / 2 + (waypoint.y - canvasPosition.y) * canvasScale;

      ctx.beginPath();
      drawCustomWaypoint(ctx, adjustedX, adjustedY, waypoint.type);
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

  const handleCanvasMouseDown = async (e) => {
    const clickX = e.nativeEvent.offsetX - canvasSize.width / 2;
    const clickY = e.nativeEvent.offsetY - canvasSize.height / 2;

    if (isDragging) {
      setIsDragging(false);
    } else {
      const currentClickedWaypoint = findClickedWaypoint(clickX, clickY);

      if (currentClickedWaypoint) {
        if (selectedShip) {
          try {
            const waypointsResult = await findWaypointsAtCoordinates(
              currentClickedWaypoint.waypointData
            );
            console.log(waypointsResult);
            const filteredWaypoints = waypointsResult.waypoints.filter(
              (waypoint) => {
                return waypoint.symbol != selectedShip.nav.waypointSymbol;
              }
            );
            console.log(filteredWaypoints);
            setAccessibleWaypoints(filteredWaypoints);
            console.log(accessibleWaypoints);
          } catch (error) {
            console.error("Error fetching and filtering waypoints:", error);
          }
        } else {
          fetchWaypointDetails(currentClickedWaypoint.waypointData);
          setClickedWaypoint(currentClickedWaypoint.waypointData);
        }
      } else {
        setSelectedShip(null);
        setClickedWaypoint(null);
        setIsDragging(true);
        setDragStart({
          x: e.clientX,
          y: e.clientY,
        });
      }
    }
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

  const findClickedWaypoint = (clickX, clickY) => {
    for (const waypoint of canvasRef.current.waypoints) {
      const distance = Math.sqrt(
        (clickX - (waypoint.x - canvasSize.width / 2)) ** 2 +
          (clickY - (waypoint.y - canvasSize.height / 2)) ** 2
      );

      if (distance <= 8 * canvasScale) {
        return waypoint;
      }
    }
    return null;
  };
  const findWaypointsAtCoordinates = async (clickedWaypointCurrent) => {
    try {
      const authToken = Cookies.get("authToken");
      const response = await fetch(
        `https://api.spacetraders.io/v2/systems/${systemDetails.symbol}/waypoints/${clickedWaypointCurrent.symbol}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();
      const currentPoint = data.data;

      const filteredWaypoints = currentPoint.orbitals;

      const result = {
        waypoints: [currentPoint, ...filteredWaypoints],
      };

      return result;
    } catch (error) {
      console.error(
        `Error fetching details for orbitals and current point`,
        error
      );
      throw error;
    }
  };

  const fetchWaypointDetails = (waypoint) => {
    const authToken = Cookies.get("authToken");
    if (waypoint) {
      const [sector, system] = waypoint.symbol.split("-");

      fetch(
        `https://api.spacetraders.io/v2/systems/${sector}-${system}/waypoints/${waypoint.symbol}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      )
        .then((response) => response.json())
        .then((details) => {
          setWaypointDetails(details.data);
          handleShipWaypoint(details.data);
        })
        .catch((error) =>
          console.error("Error fetching waypoint details:", error)
        );
    } else {
      console.error("Invalid waypoint data:", waypoint);
    }
  };

  const fetchOrbitalsDetails = async (orbitals) => {
    const authToken = Cookies.get("authToken");

    const detailsPromises = orbitals.map(async (orbital) => {
      const [sector, system] = orbital.symbol.split("-");

      try {
        const response = await fetch(
          `https://api.spacetraders.io/v2/systems/${sector}-${system}/waypoints/${orbital.symbol}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        const data = await response.json();
        return data.data;
      } catch (error) {
        console.error(`Error fetching details for ${orbital.symbol}:`, error);
        throw error;
      }
    });

    try {
      const orbitalsDetails = await Promise.all(detailsPromises);
      return orbitalsDetails;
    } catch (error) {
      console.error("Error fetching orbitals details:", error);
      throw error;
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

  const handleShipWaypoint = (waypoint) => {
    const shipsAtClickedWaypoint = ship.filter(
      (ship) => ship.nav.waypointSymbol === waypoint.symbol
    );

    setShipsAtWaypoint(shipsAtClickedWaypoint);
  };
  const navigateShipToWaypoint = async (ship, waypointSymbol) => {
    try {
      const authToken = Cookies.get("authToken");

      if (ship.nav.status != "IN_ORBIT") {
        await fetch(
          `https://api.spacetraders.io/v2/my/ships/${ship.symbol}/orbit`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      }

      await fetch(
        `https://api.spacetraders.io/v2/my/ships/${ship.symbol}/navigate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            waypointSymbol: waypointSymbol,
          }),
        }
      );

      setSelectedShip(null);
      setSelectedWaypoint(null);
      setCanNavigate(false);
    } catch (error) {
      console.error("Error navigating ship:", error);
    }
  };
  const handleShipClick = (ship) => {
    setSelectedShip(ship);
    setSelectedWaypoint(null);
  };

  const handleLaunchShip = (waypoint) => {
    setSelectedWaypoint(waypoint.symbol);
    if (selectedWaypoint && selectedShip) {
      verifyFuelAndNavigate(clickedWaypoint.waypointData);
    }
  };
  function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }
  const verifyFuelAndNavigate = (waypoint) => {
    const distance = calculateDistance(
      waypoint.x,
      waypoint.y,
      selectedShip.nav.route.destination.x,
      selectedShip.nav.route.destination.y
    );

    if (selectedShip.fuel.current > distance) {
      setCanNavigate(true);
    }
    if (canNavigate) {
      navigateShipToWaypoint(selectedShip, waypoint.symbol);
    } else {
      console.error("Ship does not have enough fuel to navigate.");
    }
  };

  return (
    <>
      {startingWaypoint && systemDetails && (
        <div className=" map-info">
          <div className="tabs">
            <div className="tab">
              <input
                type="radio"
                name="tab-menu"
                id="tab-1"
                defaultChecked={!clickedWaypoint}
                className="tab-switch"
              />
              <label htmlFor="tab-1" className="tab-label">
                {systemDetails.symbol}
              </label>
              <div className="tab-content">
                <h3>{systemDetails.symbol}</h3>
                <p>Type: {systemDetails.type}</p>
                <p>
                  Coordinates: {systemDetails.x}, {systemDetails.y}
                </p>
              </div>
            </div>
            {clickedWaypoint && (
              <div className="tab">
                <input
                  type="radio"
                  name="tab-menu"
                  id="tab-2"
                  defaultChecked={clickedWaypoint != null}
                  className="tab-switch"
                  onClick={() => handleShipWaypoint(clickedWaypoint)}
                />
                <label htmlFor="tab-2" className="tab-label">
                  {clickedWaypoint.symbol}
                </label>
                <div className="tab-content">
                  <p>{clickedWaypoint.symbol}</p>
                  <p>Type: {clickedWaypoint.type}</p>
                  <p>
                    Coordinates: {clickedWaypoint.x}, {clickedWaypoint.y}
                  </p>
                  {ship && shipsAtWaypoint.length > 0 && (
                    <ul className="ships-at-waypoint">
                      {shipsAtWaypoint.map((ship) => (
                        <li
                          key={ship.symbol}
                          onClick={() => handleShipClick(ship)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 595.3 841.9"
                            height={24}
                            width={24}
                            className="boat-icon"
                          >
                            <path
                              d="M446,442.3c11.3-0.8,22.9-1.6,34.4-2.7c2-0.2,4.1-1.9,5.5-3.5c29.5-31.9,59-63.9,88.5-95.9c1.8-1.9,3.5-4,5.2-6.1
		c3.8,4.6,3.9,8.5-0.1,14.1c-9.1,13-18.3,25.8-27.7,38.6c-13.1,17.9-26.4,35.6-39.6,53.4c-0.9,1.3-1.5,3.5-1.1,4.9
		c12,41.5,2.5,79-21.1,113.9c-8.6,12.7-17.5,25.1-26.4,37.5c-12.7,17.8-24.2,36.3-31.7,57c-0.3,0.7-0.7,1.4-1.1,2.3
		c-6.8-3.9-13.4-7.8-20-11.5c-20.3-11.6-41.7-16.2-64.8-10.2c-11.3,2.9-22.9,4.4-34.2,7.4c-52,13.4-104.9,18-158.5,17.1
		c-28-0.4-56-0.5-84-0.6c-3.7,0-5.5-1.3-7.2-4.6c-13.8-28-23.9-57.1-27.1-88.3c-0.2-2.1-0.3-4.3-0.5-6.9c9.1-1.4,17.9-3,26.8-4.2
		c25.2-3.4,50.5-6.7,75.7-9.7c7.9-1,8.8,0.1,11.3,7.9c5.1,16,6.9,17.5,23.4,16.4c28.2-1.9,54.8-10.3,81-20.5
		c35.3-13.8,66.9-34.3,97.7-56c21.4-15.1,42.7-30.3,65.8-39.7c3.1-23.5,1.2-45.7-9.2-66.6c4.3,15.9,5.2,32,4.5,48.3
		c-0.2,4.3-0.8,8.6-1.1,12.9c-0.2,2.5-1,3.7-3.9,4c-15.1,1.4-30.1,3-45.7,4.7c4.4-26.5-0.1-52.2-13.7-76.6c2.3,9.9,4.9,19.4,6.6,29
		c2.7,15.3,3.7,30.8,0.7,46.2c-0.3,1.6-1.6,3.9-2.9,4.3c-19.7,6.5-39.5,12.7-59.5,19.1c5.8-17.5,7.9-36,6.2-54.9
		c-1.7-19-8.1-36.4-17.7-53.8c2.7,10.1,5.7,19.2,7.4,28.5c5.2,27.3,6.1,54.5-4.3,81.1c-1.3,3.4-3.2,5.4-6.5,6.9
		c-24.8,11.6-48.4,25.2-69.8,42.4c-0.3,0.3-0.8,0.4-0.9,0.4c6.1-15.9,12.3-32,19.1-49.7c-15.5,0-29.5,0-42.5,0
		c0,9.8-0.1,19.8,0,29.8c0.1,8,0.7,16,1,24c0.1,1.8-0.2,3.7-0.7,5.4c-1.1,4.1-3.7,6.8-8,7.2c-4.3,0.4-7.5-1.8-9.1-5.7
		c-1-2.5-1.5-5.5-1.6-8.2c-0.1-15.3-0.1-30.7-0.1-46c0-1.8,0-3.6,0-5.7c-5.2,0.8-9.7,1.5-15,2.4c6.2-32,1.2-61.8-14.8-89.8
		c0.1,0.8,0.3,1.6,0.5,2.4c0.2,0.8,0.5,1.6,0.8,2.4c8.3,27.1,12.1,54.6,6.7,82.8c-0.6,3.2-1.9,4.8-5.1,5.7
		c-16.8,4.5-32.7,11.2-47.9,19.8c-0.9,0.5-1.7,1-2.7,1.4c-4.2,1.5-5.8,0.1-5-4.4c1.5-9.2,3-18.4,4.5-27.6c5.6-34.8-1-68-13.3-100.3
		c-4-10.6-8.9-20.8-13.5-31.1c-2.4-5.3-1.3-7.3,4.4-6.8c36.3,3.2,72.7,6.5,109,9.7c5.5,0.5,10.9,1.4,16.4,1.4
		c4.9,0,7.9,2.2,10.9,5.7c16.2,18.6,24.6,40.9,30,64.5c0.2,1.1,0.7,2.1,1.2,3.1c0.1-16.1-4-31.3-8.9-46.3
		c-5.5-16.9-12-33.5-18.4-50.1c-2.1-5.4-2.3-9.5,2-14.5c14.5-16.7,21.6-37,25-58.5c1.5-9.5,2.2-19.2,2.1-28.8
		c-0.2-17.7-4.1-34.3-18-48.7c11.5,2.5,21.5,4.6,31.5,6.8c38.2,8.4,76.4,16.8,114.6,25.4c4.6,1,9.2,3.2,13,5.9
		c24.1,17.7,38.3,42.1,46.9,70.2c4,12.8,5.8,26,5.1,39.5c-0.1,1.3-0.2,2.7-0.3,4c0,0.3-0.3,0.5-1.5,2.4c-0.2-1.2-0.1-2-0.5-2.5
		c-10.5-15.4-24.9-25.8-42.4-31.8c-4.4-1.5-5.8-3.7-6.2-8c-1.5-17.2-7-33.1-15-48.3c-0.4-0.8-1-1.5-1.9-2.2c6,17.6,9.4,35.5,10.2,53
		c-18-1-35.7-2.1-54.1-3.1c-0.1-21.8-6.4-43-17.5-63.1c2.6,10.8,5.6,21.3,7.5,32c1.7,9.6,1.9,19.5,2.9,29.3c0.3,3.2-0.8,4.4-4,4.6
		c-3.6,0.2-7.2,1.1-10.3,1.7c0,10.2,0,19.8,0,29.8c11,1.1,21.4,2.2,31.8,3.2c28.8,2.8,57.7,5.5,86.6,8.4c8.6,0.9,15.5,5.6,20.7,11.9
		c4.7,5.7,9.2,12,12.1,18.8c9.2,21.9,11,44.8,5.9,68.1C449.5,434,447.4,438.4,446,442.3z M486.4,481.5c0-0.5,0-1,0-1.6
		c-4.8-0.8-9.7-2-14.5-2.5c-20.5-1.8-39.2,4.5-57.2,13.2c-24.3,11.7-45.8,27.7-67.3,43.8c-4.2,3.1-8.4,6.3-12.6,9.4
		c1.9,0.2,3.5-0.2,4.9-1c14.8-8.6,30.1-16.4,44.4-25.9C415.1,496.2,448.5,482.4,486.4,481.5z M276.9,291.7
		c-17.6,6.6-34.1,12.7-50.6,18.9c0.2,0.6,0.3,1.3,0.5,1.9c16.6,1.6,33.2,3.3,50.2,4.9C276.9,309.2,276.9,301.5,276.9,291.7z
		 M305.4,557.6c0.1-3.9-3.2-7.3-7.2-7.4c-4.4-0.2-7.7,3-7.7,7.3c0,4.1,3,7.4,7.1,7.5C301.6,565.2,305.3,561.7,305.4,557.6z
		 M252.3,567.2c-3.7-0.1-6.7,2.8-6.7,6.5c0,3.6,3.1,6.8,6.6,6.5c3.8-0.3,6.1-2.4,6.4-6.3C258.9,570.3,256.1,567.3,252.3,567.2z
		 M94.7,577.5c0-0.8,0.1-1.6,0.1-2.4c-2.1-1.5-4-3.9-6.3-4.4c-3.4-0.8-5.6,1.5-5.7,5.1c-0.1,3.6,2.2,6.1,5.3,5.9
		C90.3,581.5,92.5,579,94.7,577.5z M116.3,566.5c-0.8-0.1-1.6-0.1-2.4-0.2c-1.6,2.1-4.2,3.9-4.7,6.2c-0.7,3.3,1.8,6.2,5.2,5.6
		c2.1-0.3,5.2-2.9,5.5-4.9C120.1,571.2,117.6,568.7,116.3,566.5z M62.6,573.8c-0.8,0-1.6,0-2.4,0c-1.5,2.2-3.9,4.3-4.2,6.7
		c-0.4,3.3,2.3,5.5,5.8,5.3c3.3-0.1,5.7-2.4,5.1-5.5C66.5,578,64.1,576,62.6,573.8z M217.9,583.2c-1.6-1-3.7-3.3-6.1-3.5
		c-3.4-0.3-5.4,2.4-5.1,5.9c0.2,3.3,2.3,5.1,5.6,5C216,590.6,217.6,588.4,217.9,583.2z M169.5,590.5c0,0.8,0.1,1.6,0.1,2.4
		c2.2,1.4,4.5,4.1,6.6,3.9c1.9-0.2,4.6-3.2,5.1-5.3c0.7-3.3-2.1-6-5.4-5.5C173.6,586.4,171.7,588.9,169.5,590.5z"
                            />
                            <path
                              d="M199.6,309.7c-42.9-3.5-84.1,2.3-124.2,16.3c-3.6,1.3-7.3,2.3-11,3.2c-1.1,0.3-3.1,0-3.5-0.7c-0.6-1-0.7-3-0.1-4.1
		c1.2-2.1,2.9-4,4.5-5.9c8.3-10,17.5-19.3,24.9-29.9c12.9-18.6,19.2-39.5,15.7-62.4c-0.7-4.5-2.9-8.8-4-13.2
		c-0.5-1.9-0.8-4.5,0.1-5.9c0.7-1.1,3.5-1.4,5.3-1.1c15.6,2.2,31.3,4.6,47.6,7.1c0-2.9,0-5.2,0-7.5c0-13.3-0.1-26.7,0.1-40
		c0-3.1,1-6.2,1.5-9.3c0.9,0,1.8-0.1,2.6-0.1c0.8,3.3,2,6.6,2.2,10c0.7,13.1,1.2,26.3,1.7,39.4c0.3,8.4,0.3,8.4,8.6,9.5
		c14.4,1.9,28.7,3.8,43.1,5.4c4.5,0.5,6,2.4,6.3,6.9c1.7,25.2-5,48.5-15.6,70.9C203.3,302.3,201.4,306.1,199.6,309.7z"
                            />
                            <path
                              d="M341.2,186.8c-2.7-2-4.3-3.2-5.9-4.4c-27-21-57.7-30.6-91.6-29c-8.8,0.4-17.5,4.6-26.3,7c-1.8,0.5-3.7,0.8-5.5,1.2
		c0.1-2.2-0.3-4.6,0.5-6.6c2.7-6.6,6.2-12.9,8.6-19.6c5.6-15.5,6.4-31.5,3-47.7c-0.3-1.4-0.4-2.9-0.6-4.6c8,0,15.6-0.5,23.1,0.1
		c7.6,0.6,15.1,2.2,23.8,3.6c0-7.9-0.1-15.9,0-23.8c0.2-8.2,0.5-16.3,1.1-24.4c0.1-1.3,1.4-2.5,2.2-3.8c1.2,1.1,3,2,3.3,3.3
		c0.8,3.4,1.1,6.9,1.3,10.4c0.8,12.6,1.6,25.3,2.2,37.9c0.1,3,0.8,4.8,3.9,5.9c17.2,6.2,29.6,18.1,38.5,33.9
		c9.4,16.7,15.7,34.5,18.2,53.5C341.4,181.5,341.2,183.4,341.2,186.8z"
                            />
                            <path
                              d="M431.3,671.5c-53,13.9-106.6,23.4-161.6,21.7c-33.1-1-65.4-7.1-96.9-17.4c-3.2-1-6.2-2.6-9.4-3.9c0.1-0.6,0.2-1.3,0.3-1.9
		c3.5,0,7-0.3,10.4,0c24.4,2.4,48.8,3.6,73.3,1.5c11.7-1,23.6-1.2,34.5-6.8c1.3-0.7,3.6-0.2,5.1,0.4c8.9,3.7,17.6,3.7,25.7-1.8
		c5.2-3.5,10.2-4.5,16.4-2.8c13.1,3.5,25-1.4,36.4-7.1c4.6-2.3,7.6-2,10.6,2c10.8,14.5,25.4,17.6,42.2,14.3c2.6-0.5,5.3-1,7.9-1
		c1.8,0,3.6,0.8,5.5,1.2C431.6,670.4,431.4,671,431.3,671.5z"
                            />
                            <path
                              d="M219.9,734.7c55,6.1,106-5.4,155.5-26.6c16.8-7.2,33.9-13.8,51.5-18.8c19.1-5.5,38.8-4,58.5,0.2c-2.3,0.4-4.7,0.8-7,1.2
		c-17.5,3.2-33.9,9.4-49.4,18.1c-35.1,19.7-72.3,33.9-112.2,40c-29.4,4.4-58.4,3.8-86.2-8.4c-2.9-1.3-5.7-2.8-8.5-4.2
		C221.5,736.1,221.2,735.7,219.9,734.7z"
                            />
                            <path
                              d="M13.1,700c12.5-9.1,25.4-14.9,39.3-18.6c19.2-5.1,38.4-3.2,57.5,0.6c34.9,7,69.7,14.8,104.6,21.8
		c28.5,5.7,57.3,8.8,86.4,6.5c6.4-0.5,12.7-1.3,19-2c0.2,0.4,0.3,0.9,0.5,1.3c-3.4,1.6-6.6,3.8-10.1,4.5
		c-13.5,2.6-27.1,5.7-40.7,6.9c-30.9,2.6-60.9-4-91-10.1c-26.9-5.5-53.8-11.3-80.9-15.6c-27.6-4.4-55.1-1.9-82.3,4.4
		C15,699.9,14.5,699.9,13.1,700z"
                            />
                            <path
                              d="M450.5,654.1c14.2-19.4,37.7-27.7,61.3-21.3c5.9,1.6,11.7,3.9,17.5,5.9c15.1,5.1,30.2,10.2,45.3,15.3
		c0.9,0.3,1.8,0.6,2.5,1.9c-12-1.3-24.1-2.4-36.1-3.9c-11.2-1.3-22.4-3.2-33.7-4.4c-19.1-2-37.9-0.2-56,6.7
		C451.2,654.3,450.9,654.2,450.5,654.1z"
                            />
                          </svg>
                          {ship.symbol}
                          {selectedShip === ship.symbol &&
                            accessibleWaypoints.map((waypoint) => (
                              <div key={waypoint.symbol}>
                                <p>{waypoint.symbol}</p>
                                <p>Type: {waypoint.type}</p>
                                <button
                                  onClick={() => handleLaunchShip(waypoint)}
                                >
                                  Launch Ship here
                                </button>
                              </div>
                            ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {clickedWaypoint &&
              orbitalsDetails &&
              orbitalsDetails.map((orbital, index) => (
                <div className="tab" key={`tab-${index + 3}`}>
                  <input
                    type="radio"
                    name="tab-menu"
                    id={`tab-${index + 3}`}
                    className="tab-switch"
                    onClick={() => handleShipWaypoint(orbital)}
                  />
                  <label htmlFor={`tab-${index + 3}`} className="tab-label">
                    {orbital.symbol}
                  </label>
                  <div className="tab-content">
                    <div className="orbitals-information">
                      <ul>
                        <li key={orbital.symbol}>
                          <p>{orbital.symbol}</p>
                          <p>{orbital.type}</p>
                        </li>
                      </ul>

                      {ship && shipsAtWaypoint.length > 0 && (
                        <ul className="ships-at-waypoint">
                          {shipsAtWaypoint.map((ship) => (
                            <li
                              key={ship.symbol}
                              onClick={() => handleShipClick(ship)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 595.3 841.9"
                                height={24}
                                width={24}
                                className="boat-icon"
                              >
                                <path
                                  d="M446,442.3c11.3-0.8,22.9-1.6,34.4-2.7c2-0.2,4.1-1.9,5.5-3.5c29.5-31.9,59-63.9,88.5-95.9c1.8-1.9,3.5-4,5.2-6.1
		c3.8,4.6,3.9,8.5-0.1,14.1c-9.1,13-18.3,25.8-27.7,38.6c-13.1,17.9-26.4,35.6-39.6,53.4c-0.9,1.3-1.5,3.5-1.1,4.9
		c12,41.5,2.5,79-21.1,113.9c-8.6,12.7-17.5,25.1-26.4,37.5c-12.7,17.8-24.2,36.3-31.7,57c-0.3,0.7-0.7,1.4-1.1,2.3
		c-6.8-3.9-13.4-7.8-20-11.5c-20.3-11.6-41.7-16.2-64.8-10.2c-11.3,2.9-22.9,4.4-34.2,7.4c-52,13.4-104.9,18-158.5,17.1
		c-28-0.4-56-0.5-84-0.6c-3.7,0-5.5-1.3-7.2-4.6c-13.8-28-23.9-57.1-27.1-88.3c-0.2-2.1-0.3-4.3-0.5-6.9c9.1-1.4,17.9-3,26.8-4.2
		c25.2-3.4,50.5-6.7,75.7-9.7c7.9-1,8.8,0.1,11.3,7.9c5.1,16,6.9,17.5,23.4,16.4c28.2-1.9,54.8-10.3,81-20.5
		c35.3-13.8,66.9-34.3,97.7-56c21.4-15.1,42.7-30.3,65.8-39.7c3.1-23.5,1.2-45.7-9.2-66.6c4.3,15.9,5.2,32,4.5,48.3
		c-0.2,4.3-0.8,8.6-1.1,12.9c-0.2,2.5-1,3.7-3.9,4c-15.1,1.4-30.1,3-45.7,4.7c4.4-26.5-0.1-52.2-13.7-76.6c2.3,9.9,4.9,19.4,6.6,29
		c2.7,15.3,3.7,30.8,0.7,46.2c-0.3,1.6-1.6,3.9-2.9,4.3c-19.7,6.5-39.5,12.7-59.5,19.1c5.8-17.5,7.9-36,6.2-54.9
		c-1.7-19-8.1-36.4-17.7-53.8c2.7,10.1,5.7,19.2,7.4,28.5c5.2,27.3,6.1,54.5-4.3,81.1c-1.3,3.4-3.2,5.4-6.5,6.9
		c-24.8,11.6-48.4,25.2-69.8,42.4c-0.3,0.3-0.8,0.4-0.9,0.4c6.1-15.9,12.3-32,19.1-49.7c-15.5,0-29.5,0-42.5,0
		c0,9.8-0.1,19.8,0,29.8c0.1,8,0.7,16,1,24c0.1,1.8-0.2,3.7-0.7,5.4c-1.1,4.1-3.7,6.8-8,7.2c-4.3,0.4-7.5-1.8-9.1-5.7
		c-1-2.5-1.5-5.5-1.6-8.2c-0.1-15.3-0.1-30.7-0.1-46c0-1.8,0-3.6,0-5.7c-5.2,0.8-9.7,1.5-15,2.4c6.2-32,1.2-61.8-14.8-89.8
		c0.1,0.8,0.3,1.6,0.5,2.4c0.2,0.8,0.5,1.6,0.8,2.4c8.3,27.1,12.1,54.6,6.7,82.8c-0.6,3.2-1.9,4.8-5.1,5.7
		c-16.8,4.5-32.7,11.2-47.9,19.8c-0.9,0.5-1.7,1-2.7,1.4c-4.2,1.5-5.8,0.1-5-4.4c1.5-9.2,3-18.4,4.5-27.6c5.6-34.8-1-68-13.3-100.3
		c-4-10.6-8.9-20.8-13.5-31.1c-2.4-5.3-1.3-7.3,4.4-6.8c36.3,3.2,72.7,6.5,109,9.7c5.5,0.5,10.9,1.4,16.4,1.4
		c4.9,0,7.9,2.2,10.9,5.7c16.2,18.6,24.6,40.9,30,64.5c0.2,1.1,0.7,2.1,1.2,3.1c0.1-16.1-4-31.3-8.9-46.3
		c-5.5-16.9-12-33.5-18.4-50.1c-2.1-5.4-2.3-9.5,2-14.5c14.5-16.7,21.6-37,25-58.5c1.5-9.5,2.2-19.2,2.1-28.8
		c-0.2-17.7-4.1-34.3-18-48.7c11.5,2.5,21.5,4.6,31.5,6.8c38.2,8.4,76.4,16.8,114.6,25.4c4.6,1,9.2,3.2,13,5.9
		c24.1,17.7,38.3,42.1,46.9,70.2c4,12.8,5.8,26,5.1,39.5c-0.1,1.3-0.2,2.7-0.3,4c0,0.3-0.3,0.5-1.5,2.4c-0.2-1.2-0.1-2-0.5-2.5
		c-10.5-15.4-24.9-25.8-42.4-31.8c-4.4-1.5-5.8-3.7-6.2-8c-1.5-17.2-7-33.1-15-48.3c-0.4-0.8-1-1.5-1.9-2.2c6,17.6,9.4,35.5,10.2,53
		c-18-1-35.7-2.1-54.1-3.1c-0.1-21.8-6.4-43-17.5-63.1c2.6,10.8,5.6,21.3,7.5,32c1.7,9.6,1.9,19.5,2.9,29.3c0.3,3.2-0.8,4.4-4,4.6
		c-3.6,0.2-7.2,1.1-10.3,1.7c0,10.2,0,19.8,0,29.8c11,1.1,21.4,2.2,31.8,3.2c28.8,2.8,57.7,5.5,86.6,8.4c8.6,0.9,15.5,5.6,20.7,11.9
		c4.7,5.7,9.2,12,12.1,18.8c9.2,21.9,11,44.8,5.9,68.1C449.5,434,447.4,438.4,446,442.3z M486.4,481.5c0-0.5,0-1,0-1.6
		c-4.8-0.8-9.7-2-14.5-2.5c-20.5-1.8-39.2,4.5-57.2,13.2c-24.3,11.7-45.8,27.7-67.3,43.8c-4.2,3.1-8.4,6.3-12.6,9.4
		c1.9,0.2,3.5-0.2,4.9-1c14.8-8.6,30.1-16.4,44.4-25.9C415.1,496.2,448.5,482.4,486.4,481.5z M276.9,291.7
		c-17.6,6.6-34.1,12.7-50.6,18.9c0.2,0.6,0.3,1.3,0.5,1.9c16.6,1.6,33.2,3.3,50.2,4.9C276.9,309.2,276.9,301.5,276.9,291.7z
		 M305.4,557.6c0.1-3.9-3.2-7.3-7.2-7.4c-4.4-0.2-7.7,3-7.7,7.3c0,4.1,3,7.4,7.1,7.5C301.6,565.2,305.3,561.7,305.4,557.6z
		 M252.3,567.2c-3.7-0.1-6.7,2.8-6.7,6.5c0,3.6,3.1,6.8,6.6,6.5c3.8-0.3,6.1-2.4,6.4-6.3C258.9,570.3,256.1,567.3,252.3,567.2z
		 M94.7,577.5c0-0.8,0.1-1.6,0.1-2.4c-2.1-1.5-4-3.9-6.3-4.4c-3.4-0.8-5.6,1.5-5.7,5.1c-0.1,3.6,2.2,6.1,5.3,5.9
		C90.3,581.5,92.5,579,94.7,577.5z M116.3,566.5c-0.8-0.1-1.6-0.1-2.4-0.2c-1.6,2.1-4.2,3.9-4.7,6.2c-0.7,3.3,1.8,6.2,5.2,5.6
		c2.1-0.3,5.2-2.9,5.5-4.9C120.1,571.2,117.6,568.7,116.3,566.5z M62.6,573.8c-0.8,0-1.6,0-2.4,0c-1.5,2.2-3.9,4.3-4.2,6.7
		c-0.4,3.3,2.3,5.5,5.8,5.3c3.3-0.1,5.7-2.4,5.1-5.5C66.5,578,64.1,576,62.6,573.8z M217.9,583.2c-1.6-1-3.7-3.3-6.1-3.5
		c-3.4-0.3-5.4,2.4-5.1,5.9c0.2,3.3,2.3,5.1,5.6,5C216,590.6,217.6,588.4,217.9,583.2z M169.5,590.5c0,0.8,0.1,1.6,0.1,2.4
		c2.2,1.4,4.5,4.1,6.6,3.9c1.9-0.2,4.6-3.2,5.1-5.3c0.7-3.3-2.1-6-5.4-5.5C173.6,586.4,171.7,588.9,169.5,590.5z"
                                />
                                <path
                                  d="M199.6,309.7c-42.9-3.5-84.1,2.3-124.2,16.3c-3.6,1.3-7.3,2.3-11,3.2c-1.1,0.3-3.1,0-3.5-0.7c-0.6-1-0.7-3-0.1-4.1
		c1.2-2.1,2.9-4,4.5-5.9c8.3-10,17.5-19.3,24.9-29.9c12.9-18.6,19.2-39.5,15.7-62.4c-0.7-4.5-2.9-8.8-4-13.2
		c-0.5-1.9-0.8-4.5,0.1-5.9c0.7-1.1,3.5-1.4,5.3-1.1c15.6,2.2,31.3,4.6,47.6,7.1c0-2.9,0-5.2,0-7.5c0-13.3-0.1-26.7,0.1-40
		c0-3.1,1-6.2,1.5-9.3c0.9,0,1.8-0.1,2.6-0.1c0.8,3.3,2,6.6,2.2,10c0.7,13.1,1.2,26.3,1.7,39.4c0.3,8.4,0.3,8.4,8.6,9.5
		c14.4,1.9,28.7,3.8,43.1,5.4c4.5,0.5,6,2.4,6.3,6.9c1.7,25.2-5,48.5-15.6,70.9C203.3,302.3,201.4,306.1,199.6,309.7z"
                                />
                                <path
                                  d="M341.2,186.8c-2.7-2-4.3-3.2-5.9-4.4c-27-21-57.7-30.6-91.6-29c-8.8,0.4-17.5,4.6-26.3,7c-1.8,0.5-3.7,0.8-5.5,1.2
		c0.1-2.2-0.3-4.6,0.5-6.6c2.7-6.6,6.2-12.9,8.6-19.6c5.6-15.5,6.4-31.5,3-47.7c-0.3-1.4-0.4-2.9-0.6-4.6c8,0,15.6-0.5,23.1,0.1
		c7.6,0.6,15.1,2.2,23.8,3.6c0-7.9-0.1-15.9,0-23.8c0.2-8.2,0.5-16.3,1.1-24.4c0.1-1.3,1.4-2.5,2.2-3.8c1.2,1.1,3,2,3.3,3.3
		c0.8,3.4,1.1,6.9,1.3,10.4c0.8,12.6,1.6,25.3,2.2,37.9c0.1,3,0.8,4.8,3.9,5.9c17.2,6.2,29.6,18.1,38.5,33.9
		c9.4,16.7,15.7,34.5,18.2,53.5C341.4,181.5,341.2,183.4,341.2,186.8z"
                                />
                                <path
                                  d="M431.3,671.5c-53,13.9-106.6,23.4-161.6,21.7c-33.1-1-65.4-7.1-96.9-17.4c-3.2-1-6.2-2.6-9.4-3.9c0.1-0.6,0.2-1.3,0.3-1.9
		c3.5,0,7-0.3,10.4,0c24.4,2.4,48.8,3.6,73.3,1.5c11.7-1,23.6-1.2,34.5-6.8c1.3-0.7,3.6-0.2,5.1,0.4c8.9,3.7,17.6,3.7,25.7-1.8
		c5.2-3.5,10.2-4.5,16.4-2.8c13.1,3.5,25-1.4,36.4-7.1c4.6-2.3,7.6-2,10.6,2c10.8,14.5,25.4,17.6,42.2,14.3c2.6-0.5,5.3-1,7.9-1
		c1.8,0,3.6,0.8,5.5,1.2C431.6,670.4,431.4,671,431.3,671.5z"
                                />
                                <path
                                  d="M219.9,734.7c55,6.1,106-5.4,155.5-26.6c16.8-7.2,33.9-13.8,51.5-18.8c19.1-5.5,38.8-4,58.5,0.2c-2.3,0.4-4.7,0.8-7,1.2
		c-17.5,3.2-33.9,9.4-49.4,18.1c-35.1,19.7-72.3,33.9-112.2,40c-29.4,4.4-58.4,3.8-86.2-8.4c-2.9-1.3-5.7-2.8-8.5-4.2
		C221.5,736.1,221.2,735.7,219.9,734.7z"
                                />
                                <path
                                  d="M13.1,700c12.5-9.1,25.4-14.9,39.3-18.6c19.2-5.1,38.4-3.2,57.5,0.6c34.9,7,69.7,14.8,104.6,21.8
		c28.5,5.7,57.3,8.8,86.4,6.5c6.4-0.5,12.7-1.3,19-2c0.2,0.4,0.3,0.9,0.5,1.3c-3.4,1.6-6.6,3.8-10.1,4.5
		c-13.5,2.6-27.1,5.7-40.7,6.9c-30.9,2.6-60.9-4-91-10.1c-26.9-5.5-53.8-11.3-80.9-15.6c-27.6-4.4-55.1-1.9-82.3,4.4
		C15,699.9,14.5,699.9,13.1,700z"
                                />
                                <path
                                  d="M450.5,654.1c14.2-19.4,37.7-27.7,61.3-21.3c5.9,1.6,11.7,3.9,17.5,5.9c15.1,5.1,30.2,10.2,45.3,15.3
		c0.9,0.3,1.8,0.6,2.5,1.9c-12-1.3-24.1-2.4-36.1-3.9c-11.2-1.3-22.4-3.2-33.7-4.4c-19.1-2-37.9-0.2-56,6.7
		C451.2,654.3,450.9,654.2,450.5,654.1z"
                                />
                              </svg>
                              {ship.symbol}
                              {selectedShip === ship.symbol &&
                                accessibleWaypoints.map((waypoint) => (
                                  <div key={waypoint.symbol}>
                                    <p>{waypoint.symbol}</p>
                                    <p>Type: {waypoint.type}</p>
                                    <button
                                      onClick={() => handleLaunchShip(waypoint)}
                                    >
                                      Launch Ship here
                                    </button>
                                  </div>
                                ))}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      <button className="recenter" onClick={handleMoveToOrigin}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 198.07352 196.47248"
          height={24}
          width={24}
          className="recenter__icon"
        >
          <path d="M159.47644,153.59408c.75633.95052,1.50408,1.89022,2.2518,2.82995l-.09873.1269-3.06856-1.9937c-15.8761,15.75154-34.927,24.04523-57.29346,24.02545-22.36918-.01978-41.40158-8.35074-57.27313-24.1531-1.0378.66927-2.09067,1.34824-3.14353,2.02719l-.10223-.10121,2.3261-2.89713c-14.61935-16.00783-22.03328-34.83126-21.56334-56.516.47035-21.70357,8.76958-40.15595,24.107-55.554l-1.49492-2.107.11272-.11116,2.11821,1.52061c1.2807-1.11949,2.4989-2.2275,3.762-3.28172a77.18936,77.18936,0,0,1,38.72751-17.5876c22.62991-3.35114,43.14661,1.8558,61.40108,15.71607,1.72877,1.31261,3.34848,2.77248,4.98157,4.20638,1.29169,1.13414,1.26631,1.16307,2.69129.13133q.78235-.56646,1.56465-1.133l.10738.12326c-.70216.97038-1.4043,1.94077-2.11819,2.92739,15.17793,15.43453,23.33586,33.89289,23.70533,55.53C181.54581,118.92144,174.09554,137.64805,159.47644,153.59408ZM174.39109,97.551a72.80421,72.80421,0,0,0-21.3069-50.57241c-6.76072,6.73809-13.45107,13.406-20.17416,20.10659.10573.111.35082.3677.59516.62509a44.096,44.096,0,0,1,12.06023,25.418c.07755.61132.26181.8081.87713.88442,6.71488.833,13.42491,1.70545,20.13687,2.5621C169.13972,96.90152,171.70172,97.21528,174.39109,97.551Zm-42.45173,33.30732c-.27878.228-.388.3099-.489.401a44.08949,44.08949,0,0,1-25.69168,11.46683c-.55306.05592-.87472.21469-.8483.82454a3.97765,3.97765,0,0,1-.08927.65259q-1.29062,10.15029-2.57944,20.30079c-.29011,2.28545-.57723,4.57129-.886,7.01785,20.04913-.29041,37.13407-7.41075,51.55218-21.29784ZM101.24468,25.433c.05618.54916.08832.95621.14058,1.36065q1.71777,13.294,3.42851,26.58887c.07134.55915.25015.77072.84288.83081a44.15937,44.15937,0,0,1,24.5927,10.434c.53719.4542,1.06448.92007,1.43637,1.242,6.76-6.73826,13.45155-13.40842,20.203-20.13823A73.17506,73.17506,0,0,0,101.24468,25.433Zm52.387,124.052c13.32777-14.07628,20.2847-30.67963,20.7925-50.066-.38239.03787-.6.05418-.81615.08161q-4.86931.61774-9.73833,1.238c-5.78318.73517-11.56522,1.47978-17.35128,2.19161-.66327.08159-.87971.3104-.96763.99629a44.14667,44.14667,0,0,1-12.217,25.51227c-.18531.19368-.36262.39505-.63865.69659ZM69.151,67.49511c-6.16621-6.91762-12.68092-13.79352-19.08988-20.84027A73.03042,73.03042,0,0,0,32.53983,74.336a71.41883,71.41883,0,0,0-4.08367,23.07513c.28858-.01342.47525-.00872.6582-.03254Q42.82,95.594,56.5269,93.8199c.57858-.07409.691-.32389.75541-.831a42.45282,42.45282,0,0,1,6.22731-17.67679C65.17207,72.70049,67.12923,70.27649,69.151,67.49511Zm.63874,62.46349-20.58739,19.533c13.91253,13.78091,30.47771,21.12855,50.0282,21.98991-.35754-2.81414-.68987-5.43107-1.02252-8.04795-.84621-6.65684-1.70351-13.31234-2.52275-19.97251-.08665-.70439-.36091-.93364-1.04251-1.0382a43.17759,43.17759,0,0,1-19.12988-7.82733C73.56247,133.17584,71.75484,131.56,69.78974,129.9586Zm-21.28008,18.762,20.4149-19.85029c-.18828-.22455-.28962-.35272-.39846-.47419a43.9432,43.9432,0,0,1-11.16173-24.01647c-.13-.98039-.51929-1.32523-1.41274-1.30555a1.09808,1.09808,0,0,1-.16426-.01578Q44.5772,101.59765,33.367,100.13729c-1.59964-.20808-3.20062-.40592-4.91131-.62246a71.5694,71.5694,0,0,0,4.0641,23.05628A72.98259,72.98259,0,0,0,48.50966,148.72064Zm2.2649-102.80458L70.0955,66.89278c.25911-.23641.42384-.38159.583-.53266A44.35327,44.35327,0,0,1,93.50166,54.70584c.69656-.13059,1.62-.06864,2.01761-.49149.40184-.42738.29414-1.34491.38618-2.05078q1.45642-11.17,2.90373-22.34119c.18191-1.40338.35032-2.8085.54139-4.345A73.18284,73.18284,0,0,0,50.77456,45.91606ZM22.39618,98.72042c.48461,23.02748,8.82716,42.50414,25.68963,58.08086,14.5893,13.47689,32.00469,20.23131,51.93155,20.833-.23685-1.82834-.448-3.45829-.66146-5.106-.28883-.03065-.50444-.06724-.721-.0745a69.60085,69.60085,0,0,1-12.11375-1.4545,73.13833,73.13833,0,0,1-41.2423-24.35135A71.92488,71.92488,0,0,1,28.347,110.05968c-.51-3.28114-.62507-6.62315-.95112-9.93429-.028-.28458-.2422-.75542-.42971-.78724C25.50821,99.09076,24.0356,98.92992,22.39618,98.72042Zm153.08217.54547c-.562,20.21664-7.73442,37.63088-22.10109,51.82988-14.39,14.222-31.92008,21.177-52.16062,21.4744-.20953,1.68445-.41118,3.30557-.614,4.93628a77.625,77.625,0,0,0,58.84049-25.52226c13.719-15.04346,20.52021-32.85789,20.80976-53.32117ZM27.354,97.60282c.57562-19.83926,7.5252-36.97609,21.42618-51.068C62.678,32.44622,79.71458,25.2552,99.5018,24.41427l.56852-4.5104c-42.66386.12854-77.99271,36.62947-77.51981,78.31768Zm152.85548.69032a77.18052,77.18052,0,0,0-8.78985-35.71047,78.32864,78.32864,0,0,0-38.85624-36.29323,77.403,77.403,0,0,0-32.06913-6.468c.1768,1.35108.38707,2.57127.47754,3.80028.051.69239.3145.83741.96285.83824a67.23057,67.23057,0,0,1,14.50169,1.52184q31.81623,7.05485,48.71935,34.94514a70.62067,70.62067,0,0,1,9.86754,30.00612c.19733,1.99679.247,4.00788.39836,6.00983.02065.27341.20323.73789.36842.76515C177.21711,97.94363,178.65736,98.09924,180.2095,98.29314ZM101.0042,98.133a4.08808,4.08808,0,0,0-.38232.27746c-2.94205,2.93434-5.89033,5.86258-8.80577,8.82315a1.38452,1.38452,0,0,0-.26513,1.015c.48788,4.04087,1.012,8.07735,1.52438,12.11527q1.4386,11.33718,2.87544,22.67461,1.70237,13.3827,3.41314,26.76436c.21691,1.69906.44109,3.3972.66192,5.09576l.13476-.01534C100.44123,149.35309,100.72184,123.82292,101.0042,98.133Zm.66651-.35832a2.83963,2.83963,0,0,0,.20471.39492c2.40707,2.93591,4.80836,5.87673,7.24489,8.788a1.18784,1.18784,0,0,0,.91845.26653c3.57656-.42953,7.14879-.8951,10.72251-1.34846q12.64494-1.60411,25.29016-3.20636,12.808-1.62726,25.615-3.26236c1.67187-.21331,3.34218-.43884,5.0132-.65874l-.01421-.13659Zm-1.05114-.34309c-.36056-.32962-.54613-.51529-.7479-.68128-2.67693-2.20242-5.36591-4.39041-8.02569-6.61334a1.74767,1.74767,0,0,0-1.50211-.40932c-3.56872.48973-7.14142.95056-10.71354,1.41534q-11.73961,1.52743-23.47989,3.04992Q44.32879,95.73119,32.508,97.27583q-3.17172.41418-6.34194.8396l.01353.1512Zm.0524-73.50809-.15849.02288q.41546,36.49842.83226,73.11478a3.07845,3.07845,0,0,0,.37-.24859c2.35646-2.35218,4.7225-4.69509,7.04584-7.07961a1.51286,1.51286,0,0,0,.267-1.09992c-.27116-2.34929-.59766-4.69215-.90048-7.03784q-1.60575-12.4383-3.20821-24.877-1.53736-11.90609-3.0797-23.81154Q101.25873,28.41475,100.672,23.92353ZM141.0819,93.3213a40.16512,40.16512,0,0,0-10.88828-22.599c-4.30346,6.55894-8.54131,13.01787-12.84479,19.57687Zm-10.84526,32.88254a40.24013,40.24013,0,0,0,10.84-22.56107l-23.70822,3.02211C121.70547,113.25021,125.9323,119.66814,130.23664,126.20384Zm-2.23523-57.594a40.05353,40.05353,0,0,0-22.48791-9.93764c.98663,7.63069,1.95631,15.13027,2.94384,22.76787Zm-19.53162,46.94655c-.97163,7.64759-1.92382,15.14215-2.88806,22.73158a40.18066,40.18066,0,0,0,22.37166-9.9ZM73.52371,69.82653,92.10444,81.60437c.98537-7.62425,1.94615-15.05812,2.92408-22.6248A40.18539,40.18539,0,0,0,73.52371,69.82653Zm.235,57.5294a40.12759,40.12759,0,0,0,21.207,10.60921c-.96431-7.56522-1.90648-14.9568-2.86654-22.48872Zm9.66942-37.05609L71.668,71.75212a40.09413,40.09413,0,0,0-9.88571,21.367C69.056,92.17178,76.16437,91.24592,83.42817,90.29984ZM61.77994,103.84362a40.15031,40.15031,0,0,0,9.682,21.12544c3.97657-6.14157,7.8711-12.15645,11.8589-18.31539ZM132.05916,130.633l.08323-.10541q-1.51021-1.56117-3.02034-3.12242-9.32-9.64456-18.64777-19.28159a3.32973,3.32973,0,0,0-.80382-.459,4.06215,4.06215,0,0,0-.28312.79743c-.26895,1.96147-.49909,3.92837-.77879,5.88822a1.13119,1.13119,0,0,0,.58083,1.27927q11.1468,7.30342,22.26555,14.64969C131.64957,130.40741,131.85744,130.51555,132.05916,130.633ZM91.221,107.7234c-.46007-.08074-.77875-.1494-1.10093-.19111-1.88237-.24372-3.77079-.44758-5.64539-.74039a1.015,1.015,0,0,0-1.19287.54562q-6.84216,10.61525-13.71789,21.20888c-.10784.16666-.17981.35652-.32578.65113a2.013,2.013,0,0,0,.34179-.18073q10.62919-10.26844,21.24728-20.54833A3.06342,3.06342,0,0,0,91.221,107.7234Zm19.20393-18.31357c2.06226.26886,3.88744.48141,5.703.75712a1.17392,1.17392,0,0,0,1.32859-.64649q7.05793-10.81588,14.15991-21.603c.13563-.20674.25163-.42637.37677-.64l-.11408-.07238C124.77514,74.55757,117.67117,81.91006,110.42492,89.40983ZM71.11486,68.71841l-.12221.14934c6.705,6.47143,13.41,12.94287,20.23339,19.52865.26173-2.047.47058-3.87514.743-5.69372a.9647.9647,0,0,0-.53539-1.12114q-7.95381-5.00687-15.882-10.05448Q73.33421,70.12126,71.11486,68.71841Zm73.50193,25.04307a43.66086,43.66086,0,0,0-12.48144-25.98856,13.7847,13.7847,0,0,1-.85785,1.27959c-.45959.53955-.39259.91469.10114,1.44116a38.62877,38.62877,0,0,1,8.66176,14.26559c.83893,2.51524,1.30584,5.15387,1.96506,7.73052.09.35165.24837.87772.49554.95962A11.69271,11.69271,0,0,0,144.61679,93.76148Zm-.0597,9.456a11.41564,11.41564,0,0,1-1.44809.15353c-.75343-.01605-1.01776.32325-1.12363,1.05428a40.30366,40.30366,0,0,1-8.79964,19.98108c-.74331.9142-1.539,1.78579-2.3427,2.71425l1.31063,1.97421A42.89633,42.89633,0,0,0,144.55709,103.21749ZM130.97084,66.64994a43.64084,43.64084,0,0,0-25.8649-11.46616,8.54251,8.54251,0,0,1,.119,1.3053c-.06588.97311.4568,1.20123,1.313,1.29557a38.4362,38.4362,0,0,1,10.48928,2.742,41.5974,41.5974,0,0,1,11.254,6.93151,1.18149,1.18149,0,0,0,.94315.30613A12.63044,12.63044,0,0,0,130.97084,66.64994ZM105.1653,141.77137a43.58607,43.58607,0,0,0,25.75842-11.42547l-2.05623-1.34881c-.22549.1878-.37437.30842-.51965.43323a40.90764,40.90764,0,0,1-21.16288,9.68614c-1.717.24965-1.71521.2681-1.96932,2.00881C105.19232,141.285,105.18977,141.44773,105.1653,141.77137Zm-9.70244-86.345A43.6991,43.6991,0,0,0,70.5474,67.92856a16.47928,16.47928,0,0,1,1.38307.90332c.51283.41312.85018.30314,1.30743-.13928A39.37315,39.37315,0,0,1,80.44766,63.212,41.47113,41.47113,0,0,1,94.5202,57.99172c.24786-.04463.62162-.23507.6645-.42055A20.22721,20.22721,0,0,0,95.46286,55.42638ZM70.79058,129.28591a43.64034,43.64034,0,0,0,24.61431,12.225c-.06937-.58909-.15879-1.02267-.163-1.45708-.00729-.74626-.29781-1.05779-1.08823-1.19577A38.92085,38.92085,0,0,1,78.604,132.54939c-2.00907-1.38353-3.87779-2.97083-5.8806-4.51992ZM58.2436,93.552a11.45136,11.45136,0,0,1,1.59344-.17075c.77108.02847.93715-.39677,1.02981-1.04463A39.70992,39.70992,0,0,1,64.5777,80.41241a41.83812,41.83812,0,0,1,5.97262-8.97771c.19732-.228.41276-.66842.32-.87643a14.87072,14.87072,0,0,0-1.111-1.80814A43.69758,43.69758,0,0,0,58.2436,93.552Zm11.27546,34.40149a14.80645,14.80645,0,0,1,.86311-1.30057c.44191-.53389.39826-.91573-.07323-1.45936a38.04553,38.04553,0,0,1-7.5711-13.12339c-.80031-2.44266-1.2596-4.9964-1.899-7.49328-.08278-.32329-.26186-.7989-.49849-.87165a13.079,13.079,0,0,0-2.09535-.30944A43.644,43.644,0,0,0,69.51906,127.95347Z" />
          <path d="M5.84793,92.51692h5.01191c-.12146.14185-.16016.23339-.21541.24479-1.31222.271-1.421.45186-.94459,1.69811q1.17843,3.08294,2.37721,6.15808c.07692.19836.18107.38618.36094.765.8937-2.52116,1.73839-4.86677,2.55275-7.22289.26237-.7591-.05741-1.22128-.85593-1.35095-.11109-.01806-.21338-.09032-.29357-.27736h3.56665c-1.45808.52735-1.55435,1.90186-1.9649,3.04614-1.05879,2.951-2.08422,5.91389-3.12626,8.87089-.08736.24792-.19934.48717-.29988.73045l-.23049.03172L8.75351,97.2127l-3.00965,8.22193c-.22775-.5075-.36981-.77821-.47383-1.06285Q3.47166,99.45094,1.6816,94.52706A2.78385,2.78385,0,0,0,0,92.55624H4.50378l.02973.11481a3.91524,3.91524,0,0,1-.47152.15159.72811.72811,0,0,0-.6137,1.09556c.90686,2.41706,1.83789,4.82505,2.851,7.474a52.35975,52.35975,0,0,0,1.87129-5.2091c.158-.62559-.43321-1.43186-.65466-2.16418a1.77409,1.77409,0,0,0-1.725-1.2963Z" />
          <path d="M99.1536,12.42476H94.83015l-.05-.16779a4.21491,4.21491,0,0,1,.601-.20183A1.28466,1.28466,0,0,0,96.544,10.68156c.0279-2.99835.08212-5.99817-.001-8.99391-.012-.4321-.69959-.867-1.11708-1.25475-.14836-.13779-.42319-.13941-.64028-.20319l.0272-.22159c1.02069,0,2.043-.02993,3.06073.02514.2045.01107.41518.32594.583.53314q3.09089,3.8154,6.17,7.64036c.163.20179.34221.39043.5941.67617,0-2.4771.01857-4.80106-.01034-7.12443A1.29088,1.29088,0,0,0,103.94219.3912a.56974.56974,0,0,1-.40957-.30933h4.351l.05685.12961a1.43307,1.43307,0,0,1-.20114.1143c-1.50647.56576-1.606.69372-1.61,2.31476-.00748,3.02638-.00242,6.05279-.00259,9.0792,0,.30025,0,.60051,0,1.09318a11.66013,11.66013,0,0,1-2.24557-2.47007c-.74106-.84913-1.42238-1.75037-2.13023-2.62852q-1.03581-1.285-2.07249-2.56935c-.68714-.85174-1.37439-1.70339-2.176-2.69691-.04272.37107-.08433.5667-.08483.76244-.00477,1.89838-.0296,3.79729.0064,5.695C97.45057,10.30648,97.02588,11.97581,99.1536,12.42476Z" />
          <path d="M186.952,93.72492h10.09729V96.368l-.2142.06829a4.35373,4.35373,0,0,1-.33653-.70982,1.54143,1.54143,0,0,0-1.54127-1.24959c-1.2367-.04365-2.47548-.066-3.712-.03734-.21072.00489-.58807.30427-.594.47766-.04857,1.42191-.02742,2.84621-.02742,4.31425,1.2606,0,2.43783.01956,3.614-.008a1.20122,1.20122,0,0,0,1.17469-.98231c.07829-.27184.189-.53433.285-.80107l.22055.03637v4.31921l-.1991.05469c-.09962-.25291-.22053-.49976-.29472-.75992a1.26252,1.26252,0,0,0-1.30706-1.03479c-1.12387-.004-2.24779-.00108-3.47112-.00108,0,1.64242-.01969,3.25163.02906,4.85878.00514.1694.41068.46272.63467.46679,1.234.02252,2.47312.02481,3.70288-.06743a2.85944,2.85944,0,0,0,2.28076-1.70377,4.76449,4.76449,0,0,1,.52259-.65126l.25741.1492c-.25225.94093-.492,1.88562-.772,2.81819a.545.545,0,0,1-.42834.2574c-3.2183.00514-6.43661-.00772-9.65491-.0217-.0369-.00016-.07354-.0607-.13061-.11095.04841-.06532.07949-.15615.13484-.17475,1.47244-.49482,1.47291-.49355,1.47309-2.08041q.00045-3.87982.00022-7.75965c-.00095-1.50438-.00371-1.503-1.46154-1.99835C187.17054,94.015,187.1299,93.92541,186.952,93.72492Z" />
          <path d="M96.8666,192.289c.1883.337.38378.67022.56359,1.01168a3.96,3.96,0,0,0,2.91081,2.3266,2.31957,2.31957,0,0,0,2.58588-1.16467,2.22549,2.22549,0,0,0-.75032-2.79309c-1.06144-.78137-2.19851-1.45992-3.30129-2.18531a3.26,3.26,0,0,1,2.16679-6.099,9.24231,9.24231,0,0,1,1.271.34967c.99358.32134.9916.32747,1.87091-.55038l.42433,4.09126-.275.08855a5.422,5.422,0,0,1-.36412-.69119,3.64,3.64,0,0,0-2.57091-2.4603,2.1089,2.1089,0,0,0-2.46517.83561,1.9184,1.9184,0,0,0,.723,2.4656c.69241.53806,1.4629.97523,2.19507,1.46267.54933.36571,1.113.71391,1.63532,1.11541a3.30106,3.30106,0,0,1,1.40865,3.821,3.579,3.579,0,0,1-3.3278,2.41489,8.81643,8.81643,0,0,1-2.427-.33676c-.7-.17834-1.357-.53224-1.80938.48128l-.19218-.11809-.5767-3.95613Z" />
          <path d="M36.02613,161.91005l-.95663-1.06762c.562.368.77908-.13022.98717-.58052.45823-.99162.89161-1.9947,1.44511-3.24068-1.39623.64941-2.58448,1.18142-3.74606,1.76636-.16.08059-.18774.42386-.2873.6719L32.26,158.05525c1.62867.13291,2.10017-.657,2.83924-3.12338-1.217.56344-2.361,1.0664-3.47228,1.63358-.18708.09548-.23256.46842-.36731.76579l-1.10134-1.37519a10.50515,10.50515,0,0,0,1.4208-.455c1.35044-.61474,2.67593-1.28418,4.01323-1.92793.23315-.11225.47529-.20579.90114-.38864-.35786.80428-.63127,1.42153-.907,2.03773-.2675.59778-.5374,1.19451-.90959,2.02131l4.10592-1.87768c-.30252.67573-.5035,1.13772-.71514,1.59479-.54283,1.17227-1.1112,2.33334-1.62577,3.51783A10.90889,10.90889,0,0,0,36.02613,161.91005Z" />
          <path d="M47.96511,35.29771l-3.84325-1.94307,1.65007,4.09906c-2.30566-.96412-4.168-2.43312-6.44172-3.09457l1.33685-1.20634c.15743.2919.23571.68981.46554.81981,1.05.59391,2.14248,1.11266,3.24865,1.67307-.37272-2.10285-1.05234-3.43573-3.01612-3.11987L43.11938,30.921c-.3461.61714.02231.866.48464,1.09268a27.8142,27.8142,0,0,0,3.24545,1.43293c-.48028-1.14753-.93249-2.30842-1.46676-3.43024-.096-.20164-.53036-.24218-.843-.37133l1.07072-.96952a14.837,14.837,0,0,0,.45686,1.68058c.61788,1.55817,1.28343,3.09742,1.9264,4.6457C48.01165,35.045,47.98545,35.10642,47.96511,35.29771Z" />
          <path d="M159.50305,28.62809a1.79053,1.79053,0,0,1,.98618,2.025c-.19024,1.44048-.245,2.89885-.35985,4.381,1.38307-.72015,2.72464-2.59322,2.40393-3.63174l1.51458,1.44591a1.353,1.353,0,0,0-1.56051.546,39.09123,39.09123,0,0,1-3.43769,3.378l.46121-6.24544-.18148-.09757c-.88009.95918-1.78459,1.89787-2.62024,2.89432-.17291.20619-.0898.6271-.13313,1.0268l-1.34053-1.24984a1.34793,1.34793,0,0,0,1.5543-.57173c.70355-.7732,1.43269-1.5231,2.151-2.28286C159.63826,29.50827,159.63822,29.50824,159.50305,28.62809Z" />
          <path d="M42.14988,40.23563l-6.23348-.41572-.1239.15734c1.01039.89694,2.00227,1.81657,3.04854,2.66949.18424.1502.596.02132,1.00729.02132l-1.28246,1.38178a1.4002,1.4002,0,0,0-.61309-1.5258c-.84027-.75214-1.62857-1.565-2.49682-2.28189a5.261,5.261,0,0,0-1.2954-.57557,1.62881,1.62881,0,0,1,1.79507-.83811c1.46626.19926,2.95489.23389,4.46986.3411-.683-1.34165-2.61414-2.69955-3.63006-2.37543l1.37131-1.48752c-.28292.86932.35078,1.26274.841,1.72127q1.61644,1.512,3.23767,3.01878Z" />
          <path d="M165.53074,34.52116l3.38468,3.19008-.74587.83134a6.46405,6.46405,0,0,0-.54637-1.50529,8.53428,8.53428,0,0,0-1.28963-1.254L164.73166,37.473c1.14875,1.40252,1.37033,1.51355,2.55867,1.202L165.855,40.23274c.43084-1.3458-.80177-1.63776-1.41008-2.43089-.55141.57607-1.08173,1.08212-1.54073,1.6462a.71585.71585,0,0,0,.08474.68c.79.8432,1.57414,1.76449,2.99219,1.14162l.02538.20686-1.26641.82063c-.22138-.1917-.41144-.3449-.58871-.5117-.99827-.93926-1.99345-1.88178-2.87585-2.71563a5.35955,5.35955,0,0,0,1.24078-.679c.891-.85486,1.73959-1.7589,2.54546-2.6947A4.08589,4.08589,0,0,0,165.53074,34.52116Z" />
          <path d="M165.948,162.236c-.85172,1.04687-1.836,2.25661-2.87737,3.5366l-1.01842-.77441c1.65711.3818,1.84452-1.14945,2.76541-1.89137-.66965-.54653-1.253-1.02266-1.82636-1.49053-1.222,1.01015-1.41535,1.45619-1.04088,2.61127-.62655-.50812-1.13895-.92364-1.65132-1.33916,1.41187.33066,1.58089-.94033,2.31882-1.5765-.63073-.51459-1.15923-.996-1.74623-1.3905a.76266.76266,0,0,0-.7233.1248c-.76694.83162-1.59959,1.6716-.90427,3.00935l-.2215.05445-.89535-1.22389c1.03879-1.278,2.05678-2.5304,2.97377-3.65854a4.67165,4.67165,0,0,0,.70155,1.15887c.9184.82738,1.88405,1.60737,2.87686,2.34441A5.30459,5.30459,0,0,0,165.948,162.236Z" />
          <path d="M40.56945,159.86242l1.36764-1.0784c.35817.29771.65432.52072.92327.77275a5.4738,5.4738,0,0,1,1.18715,1.20675,1.63053,1.63053,0,0,1-1.60773,2.45092,16.44332,16.44332,0,0,1-1.70682-.27559,2.56316,2.56316,0,0,0-.97-.11993c-.35666.09426-.87843.32969-.93722.59186a1.23291,1.23291,0,0,0,.4213,1.08866,3.75865,3.75865,0,0,0,1.55586.27031c.218.01258.44656-.158.774-.08847l-1.32524,1.12362a9.852,9.852,0,0,0-1.00167-.795,1.80548,1.80548,0,0,1-1.01083-2.18735c.31421-.88143,1.02195-1.21421,2.1529-1.0021.56751.10643,1.1295.24472,1.69914.33684a1.16969,1.16969,0,1,0,.55826-2.26644A10.53716,10.53716,0,0,0,40.56945,159.86242Z" />
          <path d="M167.62589,160.25943l-1.35222-.90737.06314-.14954a1.90043,1.90043,0,0,0,.65867.12767,3.73268,3.73268,0,0,0,1.43781-.41653,1.10984,1.10984,0,0,0,.32676-1.03747,1.31087,1.31087,0,0,0-1.042-.54068,15.55126,15.55126,0,0,0-1.73788.48026,3.59843,3.59843,0,0,1-1.67822.08756c-1.3768-.45215-1.41772-2.2419-.13486-3.26614.33517-.26759.64159-.57111,1.05533-.94265l1.4436.90659a11.71862,11.71862,0,0,0-1.57362.01247,1.40352,1.40352,0,0,0-1.27064,1.54562c.17325.68127.85827.97558,1.75076.72793.52925-.14686,1.04428-.34507,1.57363-.49141a1.60262,1.60262,0,0,1,2.09011.80388,1.72736,1.72736,0,0,1-.68527,2.16339A12.36116,12.36116,0,0,0,167.62589,160.25943Z" />
          <path d="M163.57225,68.30554l-4.35134,2.1042-.18136-.377,4.36225-2.105Z" />
          <path d="M165.61873,73.04833l-4.50339,1.78044-.15529-.38718,4.518-1.77962Z" />
          <path d="M156.76654,65.79773l4.18579-2.4277.21061.358-4.176,2.42636Z" />
          <path d="M154.19247,61.7345l4.10766-2.81052C158.11789,59.67327,154.97041,61.87851,154.19247,61.7345Z" />
          <path d="M170.15494,93.13308l-4.7886.37282-.03194-.365c1.58808-.213,3.18887-.29179,4.78836-.38447Z" />
          <path d="M168.637,82.92474l-4.69223,1.06892-.08948-.3864,4.69162-1.07749Z" />
          <path d="M151.31264,57.88434l3.77925-3.02533.258.32029q-1.8864,1.51676-3.77282,3.03353Z" />
          <path d="M169.58107,88.00484l-4.73434.71755-.05986-.39784,4.74323-.71386Z" />
          <path d="M162.61309,78.95841l4.59415-1.42012.11706.38152-4.607,1.43138Z" />
          <path d="M148.162,54.2508l3.54539-3.29365.285.30566-3.54493,3.293Z" />
          <path d="M141.42262,148.61175l3.01636,3.78358-.31814.25353q-1.50853-1.89146-3.01711-3.78293Z" />
          <path d="M129.28163,156.3555q1.05106,2.18247,2.10211,4.36495l-.36625.17914-2.118-4.36636Z" />
          <path d="M110.99042,162.10092q.36316,2.38888.7263,4.77779l-.39893.062q-.36267-2.38522-.72536-4.77043Z" />
          <path d="M139.963,155.73078l-2.78047-4.05732c.62117.05728,2.71329,2.915,2.99,3.90155Z" />
          <path d="M135.57927,158.45714c-.82289-1.38829-1.63564-2.78235-2.42572-4.18933l.35574-.2029,2.42239,4.19145Z" />
          <path d="M126.26307,162.93248c-.58947-1.494-1.17894-2.988-1.81753-4.60656.60661.26312,1.9924,3.49193,2.07133,4.49661Z" />
          <path d="M120.355,159.92043q.71019,2.31041,1.42043,4.62079l-.38238.11714q-.718-2.31129-1.436-4.62257Z" />
          <path d="M145.05378,145.46307l3.29635,3.5529-.30765.28947q-1.64543-1.77768-3.29081-3.55539Z" />
          <path d="M106.1777,167.44624c-.12283-1.57847-.24566-3.15695-.37726-4.84805C106.31694,163.01423,106.67276,166.80336,106.1777,167.44624Z" />
          <path d="M115.71023,161.17766q.53895,2.34794,1.07789,4.69588l-.39069.09141q-.54384-2.35057-1.0877-4.70113Z" />
          <path d="M141.09261,47.73986q1.5125-1.89533,3.025-3.79063l.329.263q-1.50978,1.89146-3.01955,3.78293Z" />
          <path d="M144.61255,51.01073c1.22871-1.32461,2.3282-2.5099,3.42769-3.69519C148.087,48.06869,145.44026,50.90189,144.61255,51.01073Z" />
          <path d="M106.576,29.16436q-.18169,2.40724-.36338,4.81448l-.39914-.02926.36594-4.81414Z" />
          <path d="M140.30629,41.11507l-2.74236,4.0143-.34717-.2361q1.37261-2.00624,2.74523-4.01246Z" />
          <path d="M124.49088,38.17707q.8859-2.25185,1.77183-4.50368l.39239.15408q-.89225,2.25192-1.78449,4.50386Z" />
          <path d="M119.96026,36.56292q.71361-2.28937,1.4272-4.57876l.37531.11632L120.34964,36.692Z" />
          <path d="M133.14218,42.3432c.80768-1.39319,1.61539-2.78638,2.46753-4.2562.22672.59351-1.58186,3.89636-2.27035,4.36444Z" />
          <path d="M129.27885,40.25752c-.26851-.735,1.4441-4.18835,2.16539-4.47315C130.67869,37.36582,129.97877,38.81167,129.27885,40.25752Z" />
          <path d="M111.70926,29.76813l-.71791,4.74152-.40332-.06334q.36267-2.372.72537-4.744Z" />
          <path d="M116.83052,30.57509c-.41571,1.79145-.77369,3.334-1.13164,4.87656C115.31544,34.77527,116.17544,31.10616,116.83052,30.57509Z" />
          <path d="M151.7038,145.65683l-3.54-3.29824.28269-.304q1.77191,1.64577,3.54376,3.29155Z" />
          <path d="M154.41689,134.52443l4.0027,2.74317-.233.34492q-2.00217-1.37022-4.00432-2.74047Z" />
          <path d="M167.21182,119.07982l-4.61081-1.42655.1215-.39663,4.61161,1.431Z" />
          <path d="M170.125,103.87982l-4.81372-.37767.02964-.39044,4.82859.35771Z" />
          <path d="M163.94007,112.60684l4.683,1.0786-.07617.35656c-1.58172-.26409-3.13173-.67656-4.68928-1.05369Z" />
          <path d="M159.12,126.15846c1.56091.75382,3.00763,1.45251,4.54272,2.19388C162.99727,128.64772,159.37384,126.911,159.12,126.15846Z" />
          <path d="M156.97878,130.45636l4.27177,2.47956C160.58067,133.1361,157.2295,131.26023,156.97878,130.45636Z" />
          <path d="M155.46,141.50111c-.728.093-3.78185-2.288-3.90645-3.09293Z" />
          <path d="M165.47491,123.95609l-4.50177-1.78862.14605-.37949,4.49129,1.77175Z" />
          <path d="M169.52883,109.01205l-4.74674-.72557.05675-.39664q2.3754.35946,4.75082.71892Z" />
          <path d="M38.61977,67.92964l4.35687,2.09972-.18073.38343q-2.1752-1.05672-4.35036-2.11346Z" />
          <path d="M46.495,55.05508c.78751.00626,3.70882,2.25941,4.11158,2.96472l-.15.194Z" />
          <path d="M40.90664,74.83043l-4.5113-1.78312.14616-.37414q2.25627.884,4.51254,1.768Z" />
          <path d="M41.57236,62.4606l4.20454,2.4415-.20538.35629L41.378,62.83692Z" />
          <path d="M43.85523,59.01779,47.9796,61.84c-.75046.09078-3.86851-1.97613-4.26532-2.64545Z" />
          <path d="M32.49473,87.6115l4.74049.7127-.057.39916-4.74991-.71721Z" />
          <path d="M33.47421,82.52588,38.14389,83.609l-.08759.38119-4.67393-1.06475Z" />
          <path d="M31.89628,92.74448l4.79691.36605-.02912.39648-4.79613-.37109Z" />
          <path d="M34.81488,77.53755l4.60224,1.43819-.11809.38283-4.601-1.42934Z" />
          <path d="M53.57505,54.55858,50.032,51.26686l.28417-.306,3.5391,3.29591Z" />
          <path d="M73.12634,156.52361,70.95213,161.005C70.71722,160.30266,72.34514,156.83229,73.12634,156.52361Z" />
          <path d="M57.58206,152.39461l3.06169-3.83387c.15269.61194-2.14691,3.63283-2.89751,3.98127Z" />
          <path d="M90.3077,166.87284l.72143-4.77081.40171.0629q-.36316,2.38707-.72633,4.77414Z" />
          <path d="M80.24764,164.54122l1.461-4.75094c.311.5977-.66733,4.08124-1.22753,4.81715Z" />
          <path d="M61.72109,155.48632q1.36221-1.99024,2.72444-3.98047l.32871.226-2.71049,4.00379Z" />
          <path d="M77.52237,158.46077l-1.77943,4.5111C75.39268,162.461,76.73534,158.84747,77.52237,158.46077Z" />
          <path d="M57.26915,145.74577l-3.29105,3.55839-.304-.27608c1.09665-1.189,2.16205-2.40592,3.32667-3.534Z" />
          <path d="M85.24921,165.87392q.52821-2.34709,1.05641-4.6942l.3724.08075c-.29132,1.57785-.67131,3.13657-1.0645,4.69242Z" />
          <path d="M96.21182,162.693l-.37129,4.76926-.39327-.0297.36342-4.76986Z" />
          <path d="M66.08949,158.2462l2.46494-4.25084c.2101.59724-1.48572,3.73978-2.23663,4.37329Z" />
          <path d="M50.71843,138.72544q-1.89444,1.51443-3.7889,3.02884l-.26347-.326,3.77738-3.023Z" />
          <path d="M50.02925,145.34945l3.54405-3.29354.29114.30788-3.5469,3.29079Z" />
          <path d="M34.68889,118.68735l4.61691-1.42957.11985.3932L34.808,119.0836Z" />
          <path d="M47.82335,134.8852l-4.08667,2.79357C43.87362,136.96143,47.017,134.74907,47.82335,134.8852Z" />
          <path d="M36.68594,103.50639l-4.96365.38353C32.24974,103.37067,36.0156,103.0287,36.68594,103.50639Z" />
          <path d="M40.875,132.87572l4.26608-2.46947C44.98461,131.08085,41.69877,133.058,40.875,132.87572Z" />
          <path d="M37.22542,108.29118l-4.75005.71734-.05885-.39775,4.76413-.72155Z" />
          <path d="M38.1684,113.00858q-2.34974.53871-4.69946,1.07742l-.09169-.39712,4.697-1.07624Z" />
          <path d="M41.03579,122.18231l-4.48885,1.76989-.14518-.37123,4.50132-1.78152Z" />
          <path d="M42.99169,126.11114c-.40786.80091-3.90612,2.48566-4.72293,2.28643Z" />
          <path d="M95.81511,33.98568l-.36794-4.8085.38526-.03355q.19254,2.39824.385,4.79649Z" />
          <path d="M56.96806,51.15251l-3.294-3.55008.28424-.26962c1.1501,1.13737,2.20632,2.36511,3.32221,3.53543Z" />
          <path d="M77.14643,38.33235l-1.77285-4.50364.38325-.1545q.8886,2.25634,1.77721,4.51271Z" />
          <path d="M72.74731,40.26983l-2.129-4.4c.59536.10541,2.31731,3.41322,2.33778,4.30015Z" />
          <path d="M91.0277,34.51166,90.31307,29.765l.39015-.06385q.36474,2.36958.72945,4.73917Z" />
          <path d="M66.46039,38.167q1.20789,2.08953,2.41582,4.17907l-.36185.20187q-1.21515-2.09444-2.4303-4.18885Z" />
          <path d="M64.44427,45.11008,61.6169,40.97881C62.37052,41.18442,64.52708,44.25037,64.44427,45.11008Z" />
          <path d="M57.89935,43.94959l3.03087,3.79386-.322.26245-3.0281-3.78135Z" />
          <path d="M85.63835,30.68744q.53662,2.34024,1.07325,4.68046l-.389.09318q-.54222-2.344-1.08445-4.688Z" />
          <path d="M81.66589,36.69882l-1.41843-4.59913.38339-.12353,1.43366,4.5948Z" />
        </svg>
      </button>

      <canvas
        className="map"
        id="mapCanvas"
        width={canvasSize.width}
        height={canvasSize.height}
        ref={canvasRef}
        style={{
          border: "1px solid #ccc",
          cursor: isDragging ? "move" : "pointer",
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
