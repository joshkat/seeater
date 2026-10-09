import { RouterProvider, createBrowserRouter } from "react-router";

import { NotFoundPage } from "./components/NotFoundPage";
import { Dashboard } from "./features/dashboard/components/Dashboard";
import { EditorRoute } from "./features/editor/components/EditorRoute";

/**
 * URL routes. Real URLs mean refresh keeps your place, the back button works,
 * and an event can be linked to directly. (Static hosts must rewrite unknown
 * paths to index.html — see "Deploying" in the README.)
 */
const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/events/:eventId", element: <EditorRoute /> },
  { path: "*", element: <NotFoundPage /> },
]);

/** Root shell. */
export function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
