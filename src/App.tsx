import { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { SplashScreen } from "./features/splash/SplashScreen";
import { UpdaterDialog } from "./tauri/UpdaterDialog";
import { useAuthStore } from "./store/authStore";
import { isTauri } from "./lib/helpers";
import { initUpdater } from "./tauri/updater";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      if (isTauri()) {
        initUpdater().catch(console.error);
      }
    };
    init();
  }, [initializeAuth]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <UpdaterDialog />
    </>
  );
}
