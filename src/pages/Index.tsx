// Update this page (the content is just a fallback if you fail to update the page)
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/explore", { replace: true });
  }, [navigate]);
  return null;
}
