import { BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { VolunteerProvider } from "@/lib/volunteer-context";
import { routeElements } from "@/routes";

export default function App() {
  return (
    <AuthProvider>
      <VolunteerProvider>
        <BrowserRouter>
          <Routes>{routeElements()}</Routes>
        </BrowserRouter>
      </VolunteerProvider>
    </AuthProvider>
  );
}
