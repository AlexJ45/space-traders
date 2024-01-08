import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "/public/assets/css/main.css";
import Login from "./routes/login.jsx";
import Passerelle from "./routes/passerelle.jsx";
import ErrorPage from "./routes/error-page";

const routes = [
  {
    path: "/",
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/passerelle/:symbol",
    element: <Passerelle />,
  },
];

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
