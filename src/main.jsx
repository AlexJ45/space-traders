import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./../public/assets/css/main.css";
import Login, { action as loginConnected } from "./routes/login.jsx";
/* import Passerelle from "./routes/passerelle"; */
import ErrorPage from "./routes/error-page";
const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <ErrorPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
